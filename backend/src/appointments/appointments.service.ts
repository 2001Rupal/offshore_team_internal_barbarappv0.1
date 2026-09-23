import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import { Appointment, AppointmentDocument } from './schemas/appointment.schema';
import { AppointmentStatus } from './enums/appointment-status.enum';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UsersService } from '../users/users.service';
import { ShopsService } from '../shops/shops.service';
import { Barber, BarberDocument } from '../barbers/schemas/barber.schema';
import { ServiceEntity, ServiceDocument } from '../services/schemas/service.schema';
import { BarberService, BarberServiceDocument } from '../barber-services/schemas/barber-service.schema';
import { AvailabilityService } from '../availability/availability.service';
import { RemindersService } from './reminders/reminders.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

const TOKEN_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Barber.name)
    private readonly barberModel: Model<BarberDocument>,
    @InjectModel(ServiceEntity.name)
    private readonly serviceModel: Model<ServiceDocument>,
    @InjectModel(BarberService.name)
    private readonly barberServiceModel: Model<BarberServiceDocument>,
    private readonly usersService: UsersService,
    private readonly shopsService: ShopsService,
    private readonly availabilityService: AvailabilityService,
    private readonly remindersService: RemindersService,
  ) {}

  async createAppointment(
    customerId: string,
    dto: CreateAppointmentDto,
    idempotencyKey?: string,
  ): Promise<AppointmentDocument> {
    // 1. Idempotency Check: Prevent duplicate bookings on mobile retries / double-taps
    if (idempotencyKey) {
      const existingAppt = await this.appointmentModel.findOne({
        idempotencyKey,
        customerId: new Types.ObjectId(customerId),
      });
      if (existingAppt) {
        return existingAppt;
      }
    }

    // 2. Validate Customer
    const customer = await this.usersService.findById(customerId);
    if (!customer || !customer.isActive) {
      throw new BadRequestException('Customer account is invalid or inactive');
    }

    // 3. Resolve configured single shop server-side (Never trust client shopId)
    const shop = await this.shopsService.findSingleActiveShop();

    // 4. Validate Service
    if (!isValidObjectId(dto.serviceId)) {
      throw new BadRequestException('Invalid service ID format');
    }
    const service = await this.serviceModel.findById(dto.serviceId).exec();
    if (!service || !service.isActive || service.shopId.toString() !== shop._id.toString()) {
      throw new BadRequestException('Selected service is not available');
    }

    // 5. Parse and validate requested startAt and endAt
    const startAt = new Date(dto.startAt);
    if (isNaN(startAt.getTime())) {
      throw new BadRequestException('Invalid startAt date-time');
    }

    const now = new Date();
    if (startAt < now) {
      throw new BadRequestException('Cannot book appointments in the past');
    }

    const durationMinutes = service.durationMinutes || 30;
    const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);

    // Convert startAt to shop timezone date (YYYY-MM-DD) and time (HH:mm)
    const tz = shop.timezone || 'Asia/Kolkata';
    const dateParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(startAt);

    const getP = (type: string) => dateParts.find((p) => p.type === type)?.value ?? '00';
    const dateStr = `${getP('year')}-${getP('month')}-${getP('day')}`;
    const timeStr = `${getP('hour')}:${getP('minute')}`;

    // 6. Find eligible candidate barbers assigned to this service
    const assignments = await this.barberServiceModel
      .find({ serviceId: service._id })
      .exec();
    const assignedBarberIds = assignments.map((a) => a.barberId);

    if (assignedBarberIds.length === 0) {
      throw new BadRequestException('No barbers assigned to perform this service');
    }

    let candidateBarbers: BarberDocument[] = [];

    if (dto.barberId && dto.barberId !== 'ANY' && dto.barberId !== 'any') {
      // Specific barber requested
      if (!isValidObjectId(dto.barberId)) {
        throw new BadRequestException('Invalid barber ID format');
      }
      const barber = await this.barberModel
        .findOne({
          _id: new Types.ObjectId(dto.barberId),
          shopId: shop._id,
          isActive: true,
        })
        .exec();

      if (!barber) {
        throw new NotFoundException('Requested barber not found or inactive');
      }

      const isAssigned = assignedBarberIds.some(
        (id) => id.toString() === barber._id.toString(),
      );
      if (!isAssigned) {
        throw new BadRequestException('Requested barber is not assigned to this service');
      }

      candidateBarbers = [barber];
    } else {
      // Any Barber: Query all active barbers assigned to this service
      candidateBarbers = await this.barberModel
        .find({
          _id: { $in: assignedBarberIds },
          shopId: shop._id,
          isActive: true,
        })
        .sort({ _id: 1 })
        .exec();

      if (candidateBarbers.length === 0) {
        throw new BadRequestException('No active barbers available for this service');
      }
    }

    // 7. Deterministically find an eligible barber who has this slot available and no conflicts
    let chosenBarber: BarberDocument | null = null;

    for (const barber of candidateBarbers) {
      // Re-verify availability via the Level 2.3 Availability Engine
      const availability = await this.availabilityService.getAvailability(
        barber._id.toString(),
        dateStr,
        service._id.toString(),
        undefined,
        now,
      );

      const hasSlot = availability.slots.some(
        (s) => s.startTime === timeStr && s.status === 'AVAILABLE',
      );

      if (!hasSlot) {
        continue;
      }

      // Pre-insert concurrency overlap check:
      // candidate.start < existing.end && candidate.end > existing.start
      const conflict = await this.appointmentModel.findOne({
        barberId: barber._id,
        status: { $in: [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING] },
        startAt: { $lt: endAt },
        endAt: { $gt: startAt },
      });

      if (!conflict) {
        chosenBarber = barber;
        break;
      }
    }

    if (!chosenBarber) {
      throw new ConflictException(
        'That time was just taken. Please choose another time.',
      );
    }

    // 8. Generate unique short human-friendly booking token
    const bookingToken = await this.generateUniqueBookingToken();

    // 9. Persist Appointment with stable snapshot fields
    const appointment = new this.appointmentModel({
      bookingToken,
      customerId: customer._id,
      shopId: shop._id,
      barberId: chosenBarber._id,
      serviceId: service._id,
      startAt,
      endAt,
      timezone: tz,
      status: AppointmentStatus.CONFIRMED,
      idempotencyKey: idempotencyKey || undefined,
      customerNameSnapshot: customer.name || 'Customer',
      customerPhoneSnapshot: customer.phone || '',
      serviceNameSnapshot: service.name,
      barberNameSnapshot: chosenBarber.name,
      serviceDurationSnapshot: durationMinutes,
      servicePriceSnapshot: service.price,
    });

    const saved = await appointment.save();

    // 10. Schedule 24-Hour Reminder in shop timezone
    await this.remindersService.schedule24HourReminder({
      _id: saved._id,
      customerId: saved.customerId,
      customerPhoneSnapshot: saved.customerPhoneSnapshot,
      bookingToken: saved.bookingToken,
      serviceNameSnapshot: saved.serviceNameSnapshot,
      barberNameSnapshot: saved.barberNameSnapshot,
      shopName: shop.name,
      startAt: saved.startAt,
      timezone: saved.timezone,
    });

    return saved;
  }

  async getById(id: string, user: AuthenticatedUser): Promise<AppointmentDocument> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid appointment ID format');
    }

    const appointment = await this.appointmentModel.findById(id).exec();
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Customer can only view their own appointments
    if (user.role === Role.CUSTOMER) {
      if (appointment.customerId.toString() !== user.id) {
        throw new ForbiddenException('You do not have access to this appointment');
      }
    } else if (user.role === Role.OWNER) {
      // Owner can only view appointments belonging to their own shop
      const shop = await this.shopsService.findMyOrNull(user.id);
      if (!shop || shop._id.toString() !== appointment.shopId.toString()) {
        throw new ForbiddenException('You do not have access to this appointment');
      }
    }

    return appointment;
  }

  async getCustomerAppointments(customerId: string): Promise<AppointmentDocument[]> {
    return this.appointmentModel
      .find({ customerId: new Types.ObjectId(customerId) })
      .sort({ startAt: -1 })
      .exec();
  }

  async cancelAppointment(
    id: string,
    user: AuthenticatedUser,
    _reason?: string,
  ): Promise<AppointmentDocument> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid appointment ID format');
    }

    const appointment = await this.appointmentModel.findById(id).exec();
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (user.role === Role.CUSTOMER) {
      if (appointment.customerId.toString() !== user.id) {
        throw new ForbiddenException('You can only cancel your own appointments');
      }
    } else if (user.role === Role.OWNER) {
      const shop = await this.shopsService.findMyOrNull(user.id);
      if (!shop || shop._id.toString() !== appointment.shopId.toString()) {
        throw new ForbiddenException('You can only cancel appointments for your own shop');
      }
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      return appointment;
    }

    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel an already completed appointment');
    }

    appointment.status = AppointmentStatus.CANCELLED;
    const saved = await appointment.save();

    try {
      await this.remindersService.cancelRemindersForAppointment(appointment._id.toString());
    } catch {
      // Non-blocking
    }

    return saved;
  }

  async getShopAppointments(
    ownerId: string,
    query?: { status?: string; date?: string; barberId?: string },
  ): Promise<AppointmentDocument[]> {
    const shop = await this.shopsService.findMyOrNull(ownerId);
    if (!shop) {
      return [];
    }

    const filter: any = { shopId: shop._id };

    if (query?.status) {
      filter.status = query.status;
    }

    if (query?.barberId && isValidObjectId(query.barberId)) {
      filter.barberId = new Types.ObjectId(query.barberId);
    }

    if (query?.date) {
      const startOfDay = new Date(`${query.date}T00:00:00.000Z`);
      const endOfDay = new Date(`${query.date}T23:59:59.999Z`);
      filter.startAt = { $gte: startOfDay, $lte: endOfDay };
    }

    return this.appointmentModel.find(filter).sort({ startAt: -1 }).exec();
  }

  async updateAppointmentStatus(
    id: string,
    ownerId: string,
    status: AppointmentStatus,
  ): Promise<AppointmentDocument> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid appointment ID format');
    }

    const shop = await this.shopsService.findMyOrNull(ownerId);
    if (!shop) {
      throw new ForbiddenException('Shop not found');
    }

    const appointment = await this.appointmentModel.findById(id).exec();
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.shopId.toString() !== shop._id.toString()) {
      throw new ForbiddenException('You can only update appointments for your own shop');
    }

    appointment.status = status;
    const saved = await appointment.save();

    if (status === AppointmentStatus.CANCELLED || status === AppointmentStatus.COMPLETED) {
      try {
        await this.remindersService.cancelRemindersForAppointment(appointment._id.toString());
      } catch {
        // Non-blocking
      }
    }

    return saved;
  }

  private async generateUniqueBookingToken(): Promise<string> {
    let token = '';
    let isUnique = false;

    for (let attempts = 0; attempts < 10; attempts++) {
      let code = '';
      for (let i = 0; i < 5; i++) {
        const idx = Math.floor(Math.random() * TOKEN_ALPHABET.length);
        code += TOKEN_ALPHABET[idx];
      }
      token = `RC-${code}`;

      const existing = await this.appointmentModel.findOne({ bookingToken: token });
      if (!existing) {
        isUnique = true;
        break;
      }
    }

    if (!isUnique) {
      // Fallback with timestamp tail
      token = `RC-${Date.now().toString(36).slice(-5).toUpperCase()}`;
    }

    return token;
  }
}
