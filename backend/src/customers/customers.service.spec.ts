import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CustomersService } from './customers.service';
import { UsersService } from '../users/users.service';
import { Role } from '../common/enums/role.enum';

describe('CustomersService', () => {
  let service: CustomersService;
  let mockUsersService: any;

  const mockCustomerId = new Types.ObjectId();
  const mockCustomerUser = {
    _id: mockCustomerId,
    name: 'Rahul Sharma',
    email: 'rahul@example.com',
    phone: '9876543210',
    role: Role.CUSTOMER,
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$somehash',
    isActive: true,
  };

  beforeEach(async () => {
    mockUsersService = {
      findById: jest.fn().mockResolvedValue({ ...mockCustomerUser }),
      updateProfile: jest.fn().mockImplementation((id, data) =>
        Promise.resolve({
          ...mockCustomerUser,
          ...data,
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  describe('getProfile', () => {
    it('should return sanitized customer profile without passwordHash', async () => {
      const profile = await service.getProfile(mockCustomerId.toString());

      expect(profile).toEqual({
        id: mockCustomerId.toString(),
        name: 'Rahul Sharma',
        email: 'rahul@example.com',
        phone: '9876543210',
        role: Role.CUSTOMER,
      });
      expect((profile as any).passwordHash).toBeUndefined();
    });

    it('should throw UnauthorizedException if customer is not found', async () => {
      mockUsersService.findById.mockResolvedValueOnce(null);

      await expect(service.getProfile('non-existent')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if customer is inactive', async () => {
      mockUsersService.findById.mockResolvedValueOnce({
        ...mockCustomerUser,
        isActive: false,
      });

      await expect(
        service.getProfile(mockCustomerId.toString()),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('updateProfile', () => {
    it('should update name and phone and return sanitized profile', async () => {
      const updated = await service.updateProfile(mockCustomerId.toString(), {
        name: 'Rahul Updated',
        phone: '9123456780',
      });

      expect(updated).toEqual({
        id: mockCustomerId.toString(),
        name: 'Rahul Updated',
        email: 'rahul@example.com',
        phone: '9123456780',
        role: Role.CUSTOMER,
      });
      expect((updated as any).passwordHash).toBeUndefined();
    });

    it('should throw NotFoundException if customer to update is not found', async () => {
      mockUsersService.updateProfile.mockResolvedValueOnce(null);

      await expect(
        service.updateProfile('non-existent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
