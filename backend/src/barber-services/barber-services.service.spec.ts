import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Barber } from '../barbers/schemas/barber.schema';
import { ServiceEntity } from '../services/schemas/service.schema';
import { ShopsService } from '../shops/shops.service';
import { BarberServicesService } from './barber-services.service';
import { BarberService, BarberServiceSchema } from './schemas/barber-service.schema';

describe('BarberServicesService', () => {
  let service: BarberServicesService;
  let assignments: any;
  let barbers: any;
  let catalog: any;
  let shops: any;

  const barberId = new Types.ObjectId().toString();
  const shopId = new Types.ObjectId();
  const serviceA = new Types.ObjectId();
  const serviceB = new Types.ObjectId();
  const barber = { _id: new Types.ObjectId(barberId), shopId, isActive: true };

  const item = (id: Types.ObjectId, active = true, itemShop = shopId) => ({
    _id: id,
    shopId: itemShop,
    isActive: active,
    name: 'Haircut',
    durationMinutes: 30,
    price: 250,
  });

  beforeEach(async () => {
    assignments = {
      find: jest.fn(),
      deleteMany: jest.fn(),
      insertMany: jest.fn(),
    };
    barbers = {
      findById: jest.fn(),
    };
    catalog = {
      find: jest.fn(),
    };
    shops = {
      verifyOwnership: jest.fn().mockResolvedValue(true),
    };

    const module = await Test.createTestingModule({
      providers: [
        BarberServicesService,
        { provide: getModelToken(BarberService.name), useValue: assignments },
        { provide: getModelToken(Barber.name), useValue: barbers },
        { provide: getModelToken(ServiceEntity.name), useValue: catalog },
        { provide: ShopsService, useValue: shops },
      ],
    }).compile();

    service = module.get(BarberServicesService);
    barbers.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(barber) });
    assignments.deleteMany.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });
    assignments.insertMany.mockResolvedValue([]);
  });

  it('declares the database-level unique barber/service pair index', () => {
    expect(BarberServiceSchema.indexes()).toContainEqual([
      { barberId: 1, serviceId: 1 },
      { unique: true, background: true },
    ]);
  });

  it('successfully gets assigned services for a barber', async () => {
    assignments.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([{ barberId: barber._id, serviceId: serviceA }]),
    });
    catalog.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([item(serviceA)]),
    });

    const result = await service.getBarberServices(barberId, 'owner');
    expect(result.barberId).toBe(barberId);
    expect(result.services).toHaveLength(1);
    expect(result.services[0].id).toBe(serviceA.toString());
    expect(result.services[0].duration).toBe(30);
    expect(result.services[0].durationMinutes).toBe(30);
    expect(result.services[0].status).toBe('ACTIVE');
    expect(result.services[0].isActive).toBe(true);
  });

  it('assigns a single service to a barber', async () => {
    catalog.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([item(serviceA)]),
    });

    const result = await service.updateBarberServices(barberId, 'owner', {
      serviceIds: [serviceA.toString()],
    });
    expect(result.services).toHaveLength(1);
    expect(assignments.deleteMany).toHaveBeenCalledWith({ barberId: barber._id });
    expect(assignments.insertMany).toHaveBeenCalledWith(
      [{ barberId: barber._id, serviceId: serviceA }],
      { ordered: true },
    );
  });

  it('assigns and replaces multiple services atomically after validating', async () => {
    catalog.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([item(serviceA), item(serviceB)]),
    });

    const result = await service.updateBarberServices(barberId, 'owner', {
      serviceIds: [serviceA.toString(), serviceB.toString()],
    });
    expect(result.services).toHaveLength(2);
    expect(assignments.deleteMany).toHaveBeenCalledWith({ barberId: barber._id });
    expect(assignments.insertMany).toHaveBeenCalledTimes(1);
  });

  it('removes all assignments for an empty replacement array', async () => {
    const result = await service.updateBarberServices(barberId, 'owner', { serviceIds: [] });
    expect(result.services).toEqual([]);
    expect(assignments.deleteMany).toHaveBeenCalledWith({ barberId: barber._id });
    expect(assignments.insertMany).not.toHaveBeenCalled();
  });

  it('rejects duplicate or malformed service IDs before writes', async () => {
    await expect(
      service.updateBarberServices(barberId, 'owner', {
        serviceIds: [serviceA.toString(), serviceA.toString()],
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.updateBarberServices(barberId, 'owner', { serviceIds: ['bad-id'] }),
    ).rejects.toThrow(BadRequestException);

    expect(assignments.deleteMany).not.toHaveBeenCalled();
  });

  it('rejects missing, inactive, and cross-shop services without partial replacement', async () => {
    catalog.find
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue([]) })
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue([item(serviceA, false)]) })
      .mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([item(serviceA, true, new Types.ObjectId())]),
      });

    // 1. Missing service
    await expect(
      service.updateBarberServices(barberId, 'owner', { serviceIds: [serviceA.toString()] }),
    ).rejects.toThrow(NotFoundException);

    // 2. Inactive service
    await expect(
      service.updateBarberServices(barberId, 'owner', { serviceIds: [serviceA.toString()] }),
    ).rejects.toThrow(BadRequestException);

    // 3. Cross-shop service
    await expect(
      service.updateBarberServices(barberId, 'owner', { serviceIds: [serviceA.toString()] }),
    ).rejects.toThrow(ForbiddenException);

    expect(assignments.deleteMany).not.toHaveBeenCalled();
  });

  it('rejects another owner, invalid barber ID, nonexistent barber, or inactive barber', async () => {
    // Other owner
    shops.verifyOwnership.mockRejectedValueOnce(new ForbiddenException('Forbidden'));
    await expect(service.getBarberServices(barberId, 'other_owner')).rejects.toThrow(
      ForbiddenException,
    );

    // Bad barber ID
    await expect(service.getBarberServices('invalid_id', 'owner')).rejects.toThrow(
      BadRequestException,
    );

    // Nonexistent barber
    barbers.findById.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) });
    await expect(service.getBarberServices(barberId, 'owner')).rejects.toThrow(
      NotFoundException,
    );

    // Inactive barber cannot manage services
    barbers.findById.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue({ _id: barber._id, shopId, isActive: false }),
    });
    await expect(
      service.updateBarberServices(barberId, 'owner', { serviceIds: [serviceA.toString()] }),
    ).rejects.toThrow(BadRequestException);
  });
});
