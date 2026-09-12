import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import { Shop, ShopDocument } from './schemas/shop.schema';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';

@Injectable()
export class ShopsService {
  constructor(
    @InjectModel(Shop.name) private shopModel: Model<ShopDocument>,
  ) {}

  async create(ownerId: string, dto: CreateShopDto): Promise<ShopDocument> {
    const existing = await this.shopModel.findOne({ ownerId: new Types.ObjectId(ownerId) });
    if (existing) {
      throw new ConflictException('This account already has a shop configured.');
    }

    const created = new this.shopModel({
      ...dto,
      ownerId: new Types.ObjectId(ownerId),
      isActive: true,
    });

    return created.save();
  }

  async findMyOrNull(ownerId: string): Promise<ShopDocument | null> {
    return this.shopModel.findOne({ ownerId: new Types.ObjectId(ownerId) }).exec();
  }

  async findMy(ownerId: string): Promise<ShopDocument> {
    const shop = await this.shopModel.findOne({ ownerId: new Types.ObjectId(ownerId) }).exec();
    if (!shop) {
      throw new NotFoundException('No shop found for this owner');
    }
    return shop;
  }

  async findById(shopId: string, ownerId: string): Promise<ShopDocument> {
    if (!isValidObjectId(shopId)) {
      throw new BadRequestException('Invalid shop ID format');
    }

    const shop = await this.shopModel.findById(shopId).exec();
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    if (shop.ownerId.toString() !== ownerId) {
      throw new ForbiddenException('You do not have access to this shop');
    }

    return shop;
  }

  async update(shopId: string, ownerId: string, dto: UpdateShopDto): Promise<ShopDocument> {
    if (!isValidObjectId(shopId)) {
      throw new BadRequestException('Invalid shop ID format');
    }

    const shop = await this.shopModel.findById(shopId).exec();
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    if (shop.ownerId.toString() !== ownerId) {
      throw new ForbiddenException('You do not have permission to update this shop');
    }

    Object.assign(shop, dto);
    return shop.save();
  }

  // Verification helper for child resources (Barber, Service)
  async verifyOwnership(shopId: string | Types.ObjectId, ownerId: string): Promise<ShopDocument> {
    const sId = shopId.toString();
    if (!isValidObjectId(sId)) {
      throw new BadRequestException('Invalid shop ID format');
    }

    const shop = await this.shopModel.findById(sId).exec();
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    if (shop.ownerId.toString() !== ownerId) {
      throw new ForbiddenException('You do not have permission to access resources in this shop');
    }

    return shop;
  }
}
