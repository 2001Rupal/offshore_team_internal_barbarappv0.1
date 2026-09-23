import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import { Barber, BarberDocument } from '../barbers/schemas/barber.schema';
import { Shop, ShopDocument } from '../shops/schemas/shop.schema';
import { ServiceEntity, ServiceDocument } from '../services/schemas/service.schema';
import { BarberService, BarberServiceDocument } from '../barber-services/schemas/barber-service.schema';
import { BarberSchedule, BarberScheduleDocument } from '../schedules/schemas/barber-schedule.schema';
import { ScheduleException, ScheduleExceptionDocument } from '../schedules/schemas/schedule-exception.schema';
import { DayOfWeek } from '../schedules/enums/day-of-week.enum';
import { ScheduleExceptionType } from '../schedules/enums/schedule-exception-type.enum';
import { ShopsService } from '../shops/shops.service';
import {
  APPOINTMENT_CONFLICT_REPOSITORY,
  IAppointmentConflictRepository,
} from './repositories/appointment-conflict.repository';
import {
  AvailabilityResult,
  AvailabilitySlot,
  TimeIntervalMinutes,
} from './types/availability.types';

const SLOT_INTERVAL_MINUTES = 30;

const ORDERED_DAYS: DayOfWeek[] = [
  DayOfWeek.SUNDAY,
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
];

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectModel(Barber.name)
    private readonly barberModel: Model<BarberDocument>,
    @InjectModel(Shop.name)
    private readonly shopModel: Model<ShopDocument>,
    @InjectModel(ServiceEntity.name)
    private readonly serviceModel: Model<ServiceDocument>,
    @InjectModel(BarberService.name)
    private readonly barberServiceModel: Model<BarberServiceDocument>,
    @InjectModel(BarberSchedule.name)
    private readonly barberScheduleModel: Model<BarberScheduleDocument>,
    @InjectModel(ScheduleException.name)
    private readonly scheduleExceptionModel: Model<ScheduleExceptionDocument>,
    @Inject(APPOINTMENT_CONFLICT_REPOSITORY)
    private readonly appointmentRepo: IAppointmentConflictRepository,
    private readonly shopsService: ShopsService,
  ) {}

  async getAvailability(
    barberId: string,
    date: string,
    serviceId: string,
    ownerId?: string,
    now: Date = new Date(),
  ): Promise<AvailabilityResult> {
    // 1. Validate ID formats
    if (!isValidObjectId(barberId) || !isValidObjectId(serviceId)) {
      throw new BadRequestException('Invalid barber ID or service ID format');
    }

    // 2. Validate calendar date (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new BadRequestException('Invalid date format. Expected YYYY-MM-DD');
    }

    const [yearStr, monthStr, dayStr] = date.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);
    const parsedDate = new Date(Date.UTC(year, month - 1, day));
    if (
      parsedDate.getUTCFullYear() !== year ||
      parsedDate.getUTCMonth() + 1 !== month ||
      parsedDate.getUTCDate() !== day
    ) {
      throw new BadRequestException('Invalid calendar date');
    }

    // 3. Load & verify Barber
    const barber = await this.barberModel.findById(barberId).exec();
    if (!barber) {
      throw new NotFoundException('Barber not found');
    }
    if (!barber.isActive) {
      throw new BadRequestException('Barber is inactive');
    }

    // 4. Load & verify Shop and Tenant Ownership
    const shop = await this.shopModel.findById(barber.shopId).exec();
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }
    if (!shop.isActive) {
      throw new BadRequestException('Shop is inactive');
    }
    if (ownerId) {
      await this.shopsService.verifyOwnership(shop._id.toString(), ownerId);
    }

    // 5. Load & verify Service
    const service = await this.serviceModel.findById(serviceId).exec();
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    if (service.shopId.toString() !== shop._id.toString()) {
      throw new ForbiddenException('Service belongs to a different shop');
    }
    if (!service.isActive) {
      throw new BadRequestException('Service is inactive');
    }

    // 6. Verify Barber-Service Assignment
    const assignment = await this.barberServiceModel
      .findOne({
        barberId: barber._id,
        serviceId: service._id,
      })
      .exec();
    if (!assignment) {
      throw new NotFoundException('Barber is not assigned to this service');
    }

    // 7. Resolve Shop Timezone
    let timezone = shop.timezone || 'Asia/Kolkata';
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    } catch {
      timezone = 'Asia/Kolkata';
    }

    // 8. Service duration & buffer calculation
    const serviceDurationMinutes = service.durationMinutes ?? 30;
    const bufferMinutes = (service as any).bufferTime ?? 0;
    const totalOccupancyMinutes = serviceDurationMinutes + bufferMinutes;

    const baseResult: Omit<AvailabilityResult, 'slots'> = {
      date,
      timezone,
      barberId: barber._id.toString(),
      serviceId: service._id.toString(),
      serviceDurationMinutes,
      bufferMinutes,
    };

    // 9. Day of Week & Weekly Schedule Resolution
    const dayOfWeek = ORDERED_DAYS[parsedDate.getUTCDay()];
    const weeklySchedule = await this.barberScheduleModel
      .findOne({ barberId: barber._id, dayOfWeek })
      .exec();

    // 10. Date-Specific Exception Resolution
    const exception = await this.scheduleExceptionModel
      .findOne({ barberId: barber._id, date })
      .exec();

    let workingInterval: { startTime: string; endTime: string } | null = null;
    let breaks: { startTime: string; endTime: string }[] = [];

    if (exception) {
      // OFF or DAY_OFF exception -> No slots available
      if (
        exception.type === ScheduleExceptionType.OFF ||
        (exception.type as string) === 'DAY_OFF'
      ) {
        return { ...baseResult, slots: [] };
      }

      // CUSTOM_HOURS exception -> Overrides weekly working hours
      if (exception.type === ScheduleExceptionType.CUSTOM_HOURS) {
        if (!exception.startTime || !exception.endTime) {
          return { ...baseResult, slots: [] };
        }
        workingInterval = {
          startTime: exception.startTime,
          endTime: exception.endTime,
        };
        // Apply weekly breaks (if configured)
        breaks = weeklySchedule?.breaks || [];
      }
    } else {
      // No exception -> Use weekly recurring schedule
      if (!weeklySchedule || !weeklySchedule.isWorking) {
        return { ...baseResult, slots: [] };
      }
      if (!weeklySchedule.startTime || !weeklySchedule.endTime) {
        return { ...baseResult, slots: [] };
      }
      workingInterval = {
        startTime: weeklySchedule.startTime,
        endTime: weeklySchedule.endTime,
      };
      breaks = weeklySchedule.breaks || [];
    }

    if (!workingInterval) {
      return { ...baseResult, slots: [] };
    }

    // 11. Calculate continuous working intervals after subtracting breaks
    const shiftStart = timeToMinutes(workingInterval.startTime);
    const shiftEnd = timeToMinutes(workingInterval.endTime);
    if (shiftEnd <= shiftStart) {
      return { ...baseResult, slots: [] };
    }

    // Sanitize and clamp breaks within shift
    const validBreaks: TimeIntervalMinutes[] = [];
    for (const b of breaks) {
      const bStart = timeToMinutes(b.startTime);
      const bEnd = timeToMinutes(b.endTime);
      if (bStart < bEnd && bStart < shiftEnd && bEnd > shiftStart) {
        validBreaks.push({
          start: Math.max(shiftStart, bStart),
          end: Math.min(shiftEnd, bEnd),
        });
      }
    }

    // Sort breaks by start time
    validBreaks.sort((a, b) => a.start - b.start);

    // Merge overlapping or contiguous breaks
    const mergedBreaks: TimeIntervalMinutes[] = [];
    for (const b of validBreaks) {
      if (mergedBreaks.length === 0) {
        mergedBreaks.push({ ...b });
      } else {
        const last = mergedBreaks[mergedBreaks.length - 1];
        if (b.start <= last.end) {
          last.end = Math.max(last.end, b.end);
        } else {
          mergedBreaks.push({ ...b });
        }
      }
    }

    // Build continuous working windows
    const continuousWindows: TimeIntervalMinutes[] = [];
    let cursor = shiftStart;
    for (const b of mergedBreaks) {
      if (b.start > cursor) {
        continuousWindows.push({ start: cursor, end: b.start });
      }
      cursor = Math.max(cursor, b.end);
    }
    if (cursor < shiftEnd) {
      continuousWindows.push({ start: cursor, end: shiftEnd });
    }

    if (continuousWindows.length === 0) {
      return { ...baseResult, slots: [] };
    }

    // 12. Generate candidate slots (30-minute start increments)
    const candidateSlots: TimeIntervalMinutes[] = [];
    for (const window of continuousWindows) {
      let candidateStart = window.start;
      while (candidateStart + totalOccupancyMinutes <= window.end) {
        candidateSlots.push({
          start: candidateStart,
          end: candidateStart + totalOccupancyMinutes,
        });
        candidateStart += SLOT_INTERVAL_MINUTES;
      }
    }

    if (candidateSlots.length === 0) {
      return { ...baseResult, slots: [] };
    }

    // 13. Check appointment conflicts via repository abstraction
    // Overlap condition: newStart < existingEnd && newEnd > existingStart
    const bookedAppointments = await this.appointmentRepo.findBookedIntervals(
      barber._id.toString(),
      date,
    );

    const nonConflictingSlots = candidateSlots.filter((candidate) => {
      for (const booked of bookedAppointments) {
        const bStart = timeToMinutes(booked.startTime);
        const bEnd = timeToMinutes(booked.endTime);
        const hasConflict = candidate.start < bEnd && candidate.end > bStart;
        if (hasConflict) {
          return false;
        }
      }
      return true;
    });

    // 14. Past-slot filtering for today's shop-local date
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);

    const getPart = (type: string) =>
      parts.find((p) => p.type === type)?.value ?? '00';
    const todayInShop = `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
    const currentHour = parseInt(getPart('hour'), 10);
    const currentMinute = parseInt(getPart('minute'), 10);
    const currentMinutesInShop = currentHour * 60 + currentMinute;

    let eligibleSlots = nonConflictingSlots;
    if (date < todayInShop) {
      // Past date -> No available slots
      return { ...baseResult, slots: [] };
    } else if (date === todayInShop) {
      // Today -> Only include slots starting in the future
      eligibleSlots = nonConflictingSlots.filter(
        (slot) => slot.start >= currentMinutesInShop,
      );
    }
    // Future dates -> Keep all non-conflicting slots

    // 15. Format slots chronologically
    const slots: AvailabilitySlot[] = eligibleSlots.map((s) => ({
      startTime: minutesToTime(s.start),
      endTime: minutesToTime(s.end),
      status: 'AVAILABLE',
    }));

    return {
      ...baseResult,
      slots,
    };
  }
}
