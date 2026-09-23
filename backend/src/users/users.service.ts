import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(data: {
    name: string;
    email: string;
    passwordHash: string;
    phone?: string;
    role?: Role;
  }): Promise<UserDocument> {
    const existing = await this.userModel.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const created = new this.userModel({
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      phone: data.phone?.trim(),
      role: data.role || Role.OWNER,
      isActive: true,
    });

    return created.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  async findByPhone(phone: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phone: phone.trim() }).exec();
  }

  async createCustomerWithPhone(data: {
    phone: string;
    name?: string;
    email?: string;
    age?: number;
    gender?: string;
  }): Promise<UserDocument> {
    const existing = await this.userModel.findOne({ phone: data.phone.trim() });
    if (existing) {
      throw new ConflictException('Phone number already registered');
    }

    if (data.email) {
      const existingEmail = await this.userModel.findOne({ email: data.email.toLowerCase().trim() });
      if (existingEmail) {
        throw new ConflictException('Email already registered');
      }
    }

    const created = new this.userModel({
      name: data.name?.trim() || 'Customer',
      phone: data.phone.trim(),
      email: data.email ? data.email.toLowerCase().trim() : undefined,
      age: data.age !== undefined && data.age !== null ? Number(data.age) : undefined,
      gender: data.gender ? data.gender.trim() : undefined,
      role: Role.CUSTOMER,
      isActive: true,
    });

    return created.save();
  }

  async createCustomerWithEmail(data: {
    email: string;
    name?: string;
    phone?: string;
    age?: number;
    gender?: string;
  }): Promise<UserDocument> {
    const existing = await this.userModel.findOne({ email: data.email.toLowerCase().trim() });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    if (data.phone) {
      const existingPhone = await this.userModel.findOne({ phone: data.phone.trim() });
      if (existingPhone) {
        throw new ConflictException('Phone number already registered');
      }
    }

    const created = new this.userModel({
      name: data.name?.trim() || 'Customer',
      email: data.email.toLowerCase().trim(),
      phone: data.phone ? data.phone.trim() : undefined,
      age: data.age !== undefined && data.age !== null ? Number(data.age) : undefined,
      gender: data.gender ? data.gender.trim() : undefined,
      role: Role.CUSTOMER,
      isActive: true,
    });

    return created.save();
  }

  async createCustomer(data: {
    name?: string;
    email: string;
    phone?: string;
    age?: number;
    gender?: string;
  }): Promise<UserDocument> {
    return this.createCustomerWithEmail(data);
  }

  async findById(id: string | Types.ObjectId): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async updateProfile(
    id: string | Types.ObjectId,
    data: { name?: string; phone?: string; age?: number; gender?: string },
  ): Promise<UserDocument | null> {
    const updateFields: any = {};
    if (data.name !== undefined && data.name !== null) {
      updateFields.name = data.name.trim();
    }
    if (data.phone !== undefined && data.phone !== null) {
      updateFields.phone = data.phone.trim();
    }
    if (data.age !== undefined && data.age !== null && !isNaN(Number(data.age))) {
      updateFields.age = Number(data.age);
    }
    if (data.gender !== undefined && data.gender !== null) {
      updateFields.gender = data.gender.trim();
    }

    return this.userModel
      .findByIdAndUpdate(id, { $set: updateFields }, { new: true })
      .exec();
  }
}
