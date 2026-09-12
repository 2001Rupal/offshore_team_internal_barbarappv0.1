import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ServicesService } from './services.service';
import { ServiceEntity } from './schemas/service.schema';
import { ShopsService } from '../shops/shops.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('ServicesService', () => {
  let service: ServicesService;
  let serviceModel: any;
  let shopsService: Partial<Record<keyof ShopsService, jest.Mock>>;

  const ownerAId = new Types.ObjectId().toString();
  const ownerBId = new Types.ObjectId().toString();
  const shopId = new Types.ObjectId();
  const serviceId = new Types.ObjectId().toString();

  beforeEach(async () => {
    serviceModel = jest.fn();
    serviceModel.findById = jest.fn();
    serviceModel.find = jest.fn();

    shopsService = {
      verifyOwnership: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        {
          provide: getModelToken(ServiceEntity.name),
          useValue: serviceModel,
        },
        {
          provide: ShopsService,
          useValue: shopsService,
        },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
  });

  it('should throw ForbiddenException if Owner B tries to update a service in Owner A shop', async () => {
    const mockService = {
      _id: serviceId,
      name: 'Haircut',
      shopId,
      save: jest.fn(),
    };

    serviceModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockService),
    });

    (shopsService.verifyOwnership as jest.Mock).mockRejectedValue(
      new ForbiddenException('You do not have permission to access resources in this shop'),
    );

    await expect(
      service.update(serviceId, ownerBId, { price: 500 }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should deactivate service (isActive: false) when requested by owner', async () => {
    const mockService = {
      _id: serviceId,
      name: 'Beard',
      shopId,
      isActive: true,
      save: jest.fn().mockResolvedValue({ _id: serviceId, isActive: false }),
    };

    serviceModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockService),
    });

    (shopsService.verifyOwnership as jest.Mock).mockResolvedValue(true);

    const result = await service.updateStatus(serviceId, ownerAId, false);
    expect(mockService.isActive).toBe(false);
    expect(mockService.save).toHaveBeenCalled();
  });
});
