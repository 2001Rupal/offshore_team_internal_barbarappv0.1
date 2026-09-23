import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import { Barber, BarberDocument } from '../barbers/schemas/barber.schema';
import { ServiceDocument, ServiceEntity } from '../services/schemas/service.schema';
import { ShopsService } from '../shops/shops.service';
import { UpdateBarberServicesDto } from './dto/update-barber-services.dto';
import { BarberService, BarberServiceDocument } from './schemas/barber-service.schema';

@Injectable()
export class BarberServicesService {
  constructor(
    @InjectModel(BarberService.name) private readonly assignmentModel: Model<BarberServiceDocument>,
    @InjectModel(Barber.name) private readonly barberModel: Model<BarberDocument>,
    @InjectModel(ServiceEntity.name) private readonly serviceModel: Model<ServiceDocument>,
    private readonly shopsService: ShopsService,
  ) {}

  private async getAndVerifyBarber(barberId: string, ownerId: string): Promise<BarberDocument> {
    if (!isValidObjectId(barberId)) throw new BadRequestException('Invalid barber ID format');
    const barber = await this.barberModel.findById(barberId).exec();
    if (!barber) throw new NotFoundException('Barber not found');
    await this.shopsService.verifyOwnership(barber.shopId, ownerId);
    return barber;
  }

  private async getAndVerifyActiveBarber(barberId: string, ownerId: string): Promise<BarberDocument> {
    const barber = await this.getAndVerifyBarber(barberId, ownerId);
    if (!barber.isActive) throw new BadRequestException('Inactive barbers cannot manage services');
    return barber;
  }

  private toResponse(barberId: string, services: ServiceDocument[]) {
    return {
      barberId,
      services: services.map((service) => ({
        id: service._id.toString(),
        name: service.name,
        description: service.description,
        durationMinutes: service.durationMinutes,
        duration: service.durationMinutes,
        price: service.price,
        isActive: service.isActive,
        status: service.isActive ? 'ACTIVE' : 'INACTIVE',
      })),
    };
  }

  async getBarberServices(barberId: string, ownerId: string) {
    await this.getAndVerifyBarber(barberId, ownerId);
    const assignments = await this.assignmentModel.find({ barberId: new Types.ObjectId(barberId) }).exec();
    const ids = assignments.map((assignment) => assignment.serviceId);
    const services = ids.length ? await this.serviceModel.find({ _id: { $in: ids } }).exec() : [];
    const order = new Map(ids.map((id, index) => [id.toString(), index]));
    services.sort((a, b) => order.get(a._id.toString())! - order.get(b._id.toString())!);
    return this.toResponse(barberId, services);
  }

  async updateBarberServices(barberId: string, ownerId: string, dto: UpdateBarberServicesDto) {
    const barber = await this.getAndVerifyActiveBarber(barberId, ownerId);
    const serviceIds = dto.serviceIds;
    if (new Set(serviceIds).size !== serviceIds.length) throw new BadRequestException('serviceIds must not contain duplicates');
    if (serviceIds.some((id) => !isValidObjectId(id))) throw new BadRequestException('Each serviceId must be a valid MongoDB ObjectId');
    const services = serviceIds.length ? await this.serviceModel.find({ _id: { $in: serviceIds } }).exec() : [];
    if (services.length !== serviceIds.length) throw new NotFoundException('One or more services were not found');
    for (const service of services) {
      if (service.shopId.toString() !== barber.shopId.toString()) throw new ForbiddenException('Services must belong to the barber shop');
      if (!service.isActive) throw new BadRequestException('Inactive services cannot be assigned');
    }
    // Validation happens before writes. Standalone MongoDB does not offer multi-document transactions.
    await this.assignmentModel.deleteMany({ barberId: barber._id }).exec();
    if (services.length) await this.assignmentModel.insertMany(services.map((service) => ({ barberId: barber._id, serviceId: service._id })), { ordered: true });
    return this.toResponse(barberId, services);
  }
}
