import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { NotFoundException } from '@nestjs/common';
import { PublicService } from './public.service';
import { ShopsService } from '../shops/shops.service';
import { AvailabilityService } from '../availability/availability.service';
import { Barber } from '../barbers/schemas/barber.schema';
import { ServiceEntity } from '../services/schemas/service.schema';
import { BarberService } from '../barber-services/schemas/barber-service.schema';

describe('PublicService', () => {
  let service: PublicService;
  let shopsService: Partial<Record<keyof ShopsService, jest.Mock>>;
  let availabilityService: Partial<Record<keyof AvailabilityService, jest.Mock>>;
  let barberModel: any;
  let serviceModel: any;
  let barberServiceModel: any;

  const mockShopId = new Types.ObjectId();
  const mockShop = {
    _id: mockShopId,
    name: 'Royal Cuts',
    description: "Premier men's grooming",
    address: 'Main Road',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    country: 'India',
    postalCode: '462001',
    phone: '9999999999',
    timezone: 'Asia/Kolkata',
    isActive: true,
  };

  beforeEach(async () => {
    shopsService = {
      findSingleActiveShop: jest.fn().mockResolvedValue(mockShop),
    };

    availabilityService = {
      getAvailability: jest.fn().mockResolvedValue({
        date: '2026-09-22',
        slots: [{ startTime: '10:00', endTime: '10:30', isAvailable: true }],
      }),
    };

    barberModel = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            {
              _id: new Types.ObjectId(),
              name: 'Rahul',
              bio: 'Specialist in fades',
              experienceYears: 5,
              phone: '9876543210',
              isActive: true,
            },
          ]),
        }),
      }),
      findOne: jest.fn(),
    };

    serviceModel = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            {
              _id: new Types.ObjectId(),
              name: 'Haircut',
              description: 'Classic cut',
              durationMinutes: 30,
              price: 250,
              isActive: true,
            },
          ]),
        }),
      }),
    };

    barberServiceModel = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicService,
        { provide: ShopsService, useValue: shopsService },
        { provide: AvailabilityService, useValue: availabilityService },
        { provide: getModelToken(Barber.name), useValue: barberModel },
        { provide: getModelToken(ServiceEntity.name), useValue: serviceModel },
        { provide: getModelToken(BarberService.name), useValue: barberServiceModel },
      ],
    }).compile();

    service = module.get<PublicService>(PublicService);
  });

  describe('getShop', () => {
    it('should return public details for the single active shop', async () => {
      const shop = await service.getShop();

      expect(shop).toEqual({
        id: mockShopId.toString(),
        name: 'Royal Cuts',
        description: "Premier men's grooming",
        address: 'Main Road',
        city: 'Bhopal',
        state: 'Madhya Pradesh',
        country: 'India',
        postalCode: '462001',
        phone: '9999999999',
        timezone: 'Asia/Kolkata',
        isActive: true,
      });
      expect(shopsService.findSingleActiveShop).toHaveBeenCalled();
    });

    it('should throw NotFoundException if no active shop is configured', async () => {
      shopsService.findSingleActiveShop!.mockRejectedValueOnce(
        new NotFoundException('No active shop found'),
      );

      await expect(service.getShop()).rejects.toThrow(NotFoundException);
    });
  });

  describe('getShopBarbers', () => {
    it('should return only active barbers for the single shop', async () => {
      const barbers = await service.getShopBarbers();

      expect(barbers).toHaveLength(1);
      expect(barbers[0].name).toBe('Rahul');
      expect(barbers[0].isActive).toBe(true);
      expect(barberModel.find).toHaveBeenCalledWith({
        shopId: mockShopId,
        isActive: true,
      });
    });
  });

  describe('getShopServices', () => {
    it('should return only active services for the single shop', async () => {
      const services = await service.getShopServices();

      expect(services).toHaveLength(1);
      expect(services[0].name).toBe('Haircut');
      expect(services[0].price).toBe(250);
      expect(serviceModel.find).toHaveBeenCalledWith({
        shopId: mockShopId,
        isActive: true,
      });
    });
  });

  describe('getBarberServices', () => {
    it('should return assigned services for an active barber', async () => {
      const barberId = new Types.ObjectId();
      const serviceId = new Types.ObjectId();

      barberModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: barberId,
          name: 'Rahul',
          isActive: true,
        }),
      });

      barberServiceModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ barberId, serviceId }]),
      });

      serviceModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            _id: serviceId,
            name: 'Haircut',
            description: 'Classic cut',
            durationMinutes: 30,
            price: 250,
            isActive: true,
          },
        ]),
      });

      const res = await service.getBarberServices(barberId.toString());

      expect(res.barberId).toBe(barberId.toString());
      expect(res.services).toHaveLength(1);
      expect(res.services[0].name).toBe('Haircut');
    });

    it('should throw NotFoundException if barber does not exist or is inactive', async () => {
      barberModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.getBarberServices(new Types.ObjectId().toString()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAvailability', () => {
    it('should delegate to AvailabilityService for slot calculation', async () => {
      const barberId = new Types.ObjectId().toString();
      const serviceId = new Types.ObjectId().toString();

      const result = await service.getAvailability(barberId, '2026-09-22', serviceId);

      expect(availabilityService.getAvailability).toHaveBeenCalledWith(
        barberId,
        '2026-09-22',
        serviceId,
      );
      expect(result.slots).toHaveLength(1);
    });
  });
});
