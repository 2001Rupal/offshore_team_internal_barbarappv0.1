import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import { ServiceEntity, ServiceDocument } from './schemas/service.schema';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ShopsService } from '../shops/shops.service';

@Injectable()
export class ServicesService {
  constructor(
    @InjectModel(ServiceEntity.name) private serviceModel: Model<ServiceDocument>,
    private shopsService: ShopsService,
  ) {}

  async create(shopId: string, ownerId: string, dto: CreateServiceDto): Promise<ServiceDocument> {
    await this.shopsService.verifyOwnership(shopId, ownerId);

    const service = new this.serviceModel({
      ...dto,
      shopId: new Types.ObjectId(shopId),
      isActive: true,
    });

    return service.save();
  }

  async findByShop(
    shopId: string,
    ownerId: string,
    activeOnly?: boolean,
  ): Promise<ServiceDocument[]> {
    await this.shopsService.verifyOwnership(shopId, ownerId);

    const query: any = { shopId: new Types.ObjectId(shopId) };
    if (activeOnly !== undefined) {
      query.isActive = activeOnly;
    }

    return this.serviceModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findById(serviceId: string, ownerId: string): Promise<ServiceDocument> {
    if (!isValidObjectId(serviceId)) {
      throw new BadRequestException('Invalid service ID format');
    }

    const service = await this.serviceModel.findById(serviceId).exec();
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    await this.shopsService.verifyOwnership(service.shopId, ownerId);

    return service;
  }

  async update(serviceId: string, ownerId: string, dto: UpdateServiceDto): Promise<ServiceDocument> {
    if (!isValidObjectId(serviceId)) {
      throw new BadRequestException('Invalid service ID format');
    }

    const service = await this.serviceModel.findById(serviceId).exec();
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    await this.shopsService.verifyOwnership(service.shopId, ownerId);

    Object.assign(service, dto);
    return service.save();
  }

  async updateStatus(
    serviceId: string,
    ownerId: string,
    isActive: boolean,
  ): Promise<ServiceDocument> {
    if (!isValidObjectId(serviceId)) {
      throw new BadRequestException('Invalid service ID format');
    }

    const service = await this.serviceModel.findById(serviceId).exec();
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    await this.shopsService.verifyOwnership(service.shopId, ownerId);

    service.isActive = isActive;
    return service.save();
  }
}
