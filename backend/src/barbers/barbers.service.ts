import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import { Barber, BarberDocument } from './schemas/barber.schema';
import { CreateBarberDto } from './dto/create-barber.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';
import { ShopsService } from '../shops/shops.service';

@Injectable()
export class BarbersService {
  constructor(
    @InjectModel(Barber.name) private barberModel: Model<BarberDocument>,
    private shopsService: ShopsService,
  ) {}

  async create(shopId: string, ownerId: string, dto: CreateBarberDto): Promise<BarberDocument> {
    await this.shopsService.verifyOwnership(shopId, ownerId);

    const barber = new this.barberModel({
      ...dto,
      shopId: new Types.ObjectId(shopId),
      isActive: true,
    });

    return barber.save();
  }

  async findByShop(
    shopId: string,
    ownerId: string,
    activeOnly?: boolean,
  ): Promise<BarberDocument[]> {
    await this.shopsService.verifyOwnership(shopId, ownerId);

    const query: any = { shopId: new Types.ObjectId(shopId) };
    if (activeOnly !== undefined) {
      query.isActive = activeOnly;
    }

    return this.barberModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findById(barberId: string, ownerId: string): Promise<BarberDocument> {
    if (!isValidObjectId(barberId)) {
      throw new BadRequestException('Invalid barber ID format');
    }

    const barber = await this.barberModel.findById(barberId).exec();
    if (!barber) {
      throw new NotFoundException('Barber not found');
    }

    await this.shopsService.verifyOwnership(barber.shopId, ownerId);

    return barber;
  }

  async update(barberId: string, ownerId: string, dto: UpdateBarberDto): Promise<BarberDocument> {
    if (!isValidObjectId(barberId)) {
      throw new BadRequestException('Invalid barber ID format');
    }

    const barber = await this.barberModel.findById(barberId).exec();
    if (!barber) {
      throw new NotFoundException('Barber not found');
    }

    await this.shopsService.verifyOwnership(barber.shopId, ownerId);

    Object.assign(barber, dto);
    return barber.save();
  }

  async updateStatus(
    barberId: string,
    ownerId: string,
    isActive: boolean,
  ): Promise<BarberDocument> {
    if (!isValidObjectId(barberId)) {
      throw new BadRequestException('Invalid barber ID format');
    }

    const barber = await this.barberModel.findById(barberId).exec();
    if (!barber) {
      throw new NotFoundException('Barber not found');
    }

    await this.shopsService.verifyOwnership(barber.shopId, ownerId);

    barber.isActive = isActive;
    return barber.save();
  }
}
