import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ShopsService } from './shops.service';
import { Shop } from './schemas/shop.schema';
import { ForbiddenException, ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('ShopsService', () => {
  let service: ShopsService;
  let shopModel: any;

  const ownerAId = new Types.ObjectId().toString();
  const ownerBId = new Types.ObjectId().toString();
  const shopId = new Types.ObjectId().toString();

  beforeEach(async () => {
    shopModel = jest.fn();
    shopModel.findOne = jest.fn();
    shopModel.findById = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopsService,
        {
          provide: getModelToken(Shop.name),
          useValue: shopModel,
        },
      ],
    }).compile();

    service = module.get<ShopsService>(ShopsService);
  });

  it('should throw ConflictException if owner already has a shop created', async () => {
    shopModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: shopId, ownerId: ownerAId }),
    });

    await expect(
      service.create(ownerAId, {
        name: 'Second Shop',
        address: 'Test Address',
        city: 'Bhopal',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should throw ForbiddenException if Owner B tries to update Owner A shop', async () => {
    const mockShop = {
      _id: shopId,
      ownerId: { toString: () => ownerAId },
      save: jest.fn(),
    };

    shopModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockShop),
    });

    await expect(
      service.update(shopId, ownerBId, { name: 'Hacked Shop' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should allow Owner A to update their own shop', async () => {
    const mockShop = {
      _id: shopId,
      name: 'Original Shop',
      ownerId: { toString: () => ownerAId },
      save: jest.fn().mockResolvedValue({ _id: shopId, name: 'Updated Shop' }),
    };

    shopModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockShop),
    });

    const updated = await service.update(shopId, ownerAId, { name: 'Updated Shop' });
    expect(mockShop.save).toHaveBeenCalled();
    expect(updated.name).toBe('Updated Shop');
  });
});
