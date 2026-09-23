import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import { ShopsService } from '../shops/shops.service';
import { Barber, BarberDocument } from '../barbers/schemas/barber.schema';
import { ServiceEntity, ServiceDocument } from '../services/schemas/service.schema';
import { BarberService, BarberServiceDocument } from '../barber-services/schemas/barber-service.schema';
import { AvailabilityService } from '../availability/availability.service';

@Injectable()
export class PublicService {
  constructor(
    private readonly shopsService: ShopsService,
    @InjectModel(Barber.name) private readonly barberModel: Model<BarberDocument>,
    @InjectModel(ServiceEntity.name) private readonly serviceModel: Model<ServiceDocument>,
    @InjectModel(BarberService.name) private readonly barberServiceModel: Model<BarberServiceDocument>,
    private readonly availabilityService: AvailabilityService,
  ) {}

  async getShop() {
    const shop = await this.shopsService.findSingleActiveShop();
    return {
      id: shop._id.toString(),
      name: shop.name,
      description: shop.description,
      address: shop.address,
      city: shop.city,
      state: shop.state,
      country: shop.country,
      postalCode: shop.postalCode,
      phone: shop.phone,
      timezone: shop.timezone,
      isActive: shop.isActive,
    };
  }

  async getShopBarbers() {
    const shop = await this.shopsService.findSingleActiveShop();
    const barbers = await this.barberModel
      .find({ shopId: shop._id, isActive: true })
      .sort({ createdAt: 1 })
      .exec();

    return barbers.map((barber) => ({
      id: barber._id.toString(),
      name: barber.name,
      bio: barber.bio,
      experienceYears: barber.experienceYears,
      phone: barber.phone,
      isActive: barber.isActive,
    }));
  }

  async getShopServices() {
    const shop = await this.shopsService.findSingleActiveShop();
    const services = await this.serviceModel
      .find({ shopId: shop._id, isActive: true })
      .sort({ createdAt: 1 })
      .exec();

    return services.map((service) => ({
      id: service._id.toString(),
      name: service.name,
      description: service.description,
      durationMinutes: service.durationMinutes,
      price: service.price,
      isActive: service.isActive,
    }));
  }

  async getBarberServices(barberId: string) {
    const shop = await this.shopsService.findSingleActiveShop();

    if (!isValidObjectId(barberId)) {
      throw new BadRequestException('Invalid barber ID format');
    }

    const barber = await this.barberModel
      .findOne({ _id: new Types.ObjectId(barberId), shopId: shop._id, isActive: true })
      .exec();

    if (!barber) {
      throw new NotFoundException('Barber not found or inactive');
    }

    const assignments = await this.barberServiceModel
      .find({ barberId: barber._id })
      .exec();

    const serviceIds = assignments.map((a) => a.serviceId);
    const services = serviceIds.length
      ? await this.serviceModel.find({ _id: { $in: serviceIds }, isActive: true }).exec()
      : [];

    return {
      barberId: barber._id.toString(),
      services: services.map((s) => ({
        id: s._id.toString(),
        name: s.name,
        description: s.description,
        durationMinutes: s.durationMinutes,
        price: s.price,
        isActive: s.isActive,
      })),
    };
  }

  async getAvailability(barberId: string, date: string, serviceId: string) {
    return this.availabilityService.getAvailability(barberId, date, serviceId);
  }

  async getAnyBarberAvailability(date: string, serviceId: string) {
    if (!isValidObjectId(serviceId)) {
      throw new BadRequestException('Invalid service ID format');
    }

    const shop = await this.shopsService.findSingleActiveShop();

    const service = await this.serviceModel
      .findOne({ _id: new Types.ObjectId(serviceId), shopId: shop._id, isActive: true })
      .exec();

    if (!service) {
      throw new NotFoundException('Service not found or inactive');
    }

    const assignments = await this.barberServiceModel
      .find({ serviceId: service._id })
      .exec();

    const barberIds = assignments.map((a) => a.barberId);
    if (barberIds.length === 0) {
      return {
        shopId: shop._id.toString(),
        serviceId,
        date,
        isOff: true,
        slots: [],
      };
    }

    const barbers = await this.barberModel
      .find({ _id: { $in: barberIds }, shopId: shop._id, isActive: true })
      .exec();

    if (barbers.length === 0) {
      return {
        shopId: shop._id.toString(),
        serviceId,
        date,
        isOff: true,
        slots: [],
      };
    }

    const results = await Promise.all(
      barbers.map((barber) =>
        this.availabilityService
          .getAvailability(barber._id.toString(), date, serviceId)
          .catch(() => null),
      ),
    );

    const slotMap = new Map<string, { startTime: string; endTime: string; isAnyAvailable: boolean }>();

    for (const res of results) {
      if (!res || res.isOff || !res.slots) continue;
      for (const slot of res.slots) {
        const isAvail = slot.status === 'AVAILABLE';
        const existing = slotMap.get(slot.startTime);
        if (!existing) {
          slotMap.set(slot.startTime, {
            startTime: slot.startTime,
            endTime: slot.endTime,
            isAnyAvailable: isAvail,
          });
        } else if (isAvail) {
          existing.isAnyAvailable = true;
        }
      }
    }

    const sortedSlots = Array.from(slotMap.values())
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map((s) => ({
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.isAnyAvailable ? 'AVAILABLE' : 'UNAVAILABLE',
        isAvailable: s.isAnyAvailable,
      }));

    const isAllOff = results.every((r) => !r || r.isOff);

    return {
      shopId: shop._id.toString(),
      serviceId,
      date,
      isOff: isAllOff && sortedSlots.length === 0,
      slots: sortedSlots,
    };
  }
}
