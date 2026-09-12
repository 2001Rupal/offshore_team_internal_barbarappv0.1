import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BarbersService } from './barbers.service';
import { Barber } from './schemas/barber.schema';
import { ShopsService } from '../shops/shops.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('BarbersService', () => {
  let service: BarbersService;
  let barberModel: any;
  let shopsService: Partial<Record<keyof ShopsService, jest.Mock>>;

  const ownerAId = new Types.ObjectId().toString();
  const ownerBId = new Types.ObjectId().toString();
  const shopId = new Types.ObjectId();
  const barberId = new Types.ObjectId().toString();

  beforeEach(async () => {
    barberModel = jest.fn();
    barberModel.findById = jest.fn();
    barberModel.find = jest.fn();

    shopsService = {
      verifyOwnership: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BarbersService,
        {
          provide: getModelToken(Barber.name),
          useValue: barberModel,
        },
        {
          provide: ShopsService,
          useValue: shopsService,
        },
      ],
    }).compile();

    service = module.get<BarbersService>(BarbersService);
  });

  it('should throw ForbiddenException if Owner B tries to update a barber in Owner A shop', async () => {
    const mockBarber = {
      _id: barberId,
      name: 'Rahul',
      shopId,
      save: jest.fn(),
    };

    barberModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockBarber),
    });

    (shopsService.verifyOwnership as jest.Mock).mockRejectedValue(
      new ForbiddenException('You do not have permission to access resources in this shop'),
    );

    await expect(
      service.update(barberId, ownerBId, { name: 'New Name' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should toggle barber status (soft deactivation) when requested by owner', async () => {
    const mockBarber = {
      _id: barberId,
      name: 'Rahul',
      shopId,
      isActive: true,
      save: jest.fn().mockResolvedValue({ _id: barberId, isActive: false }),
    };

    barberModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockBarber),
    });

    (shopsService.verifyOwnership as jest.Mock).mockResolvedValue(true);

    const result = await service.updateStatus(barberId, ownerAId, false);
    expect(mockBarber.isActive).toBe(false);
    expect(mockBarber.save).toHaveBeenCalled();
  });
});
