import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly usersService: UsersService) {}

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Customer not found or inactive');
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      age: (user as any).age,
      gender: (user as any).gender,
      role: user.role,
    };
  }

  async updateProfile(userId: string, dto: UpdateCustomerDto) {
    const updated = await this.usersService.updateProfile(userId, {
      name: dto.name,
      phone: dto.phone,
      age: dto.age,
      gender: dto.gender,
    });

    if (!updated || !updated.isActive) {
      throw new NotFoundException('Customer not found');
    }

    return {
      id: updated._id.toString(),
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      age: (updated as any).age,
      gender: (updated as any).gender,
      role: updated.role,
    };
  }
}
