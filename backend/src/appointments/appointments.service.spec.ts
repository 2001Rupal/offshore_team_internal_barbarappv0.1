import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AppointmentsService } from './appointments.service';
import { Appointment } from './schemas/appointment.schema';
import { AppointmentStatus } from './enums/appointment-status.enum';
import { Barber } from '../barbers/schemas/barber.schema';
import { ServiceEntity } from '../services/schemas/service.schema';
import { BarberService } from '../barber-services/schemas/barber-service.schema';
import { UsersService } from '../users/users.service';
import { ShopsService } from '../shops/shops.service';
import { AvailabilityService } from '../availability/availability.service';
import { RemindersService } from './reminders/reminders.service';
import { Role } from '../common/enums/role.enum';

describe('AppointmentsService', () => {
  let service: AppointmentsService;

  const mockCustomerId = new Types.ObjectId().toString();
  const mockOtherCustomerId = new Types.ObjectId().toString();
  const mockOwnerId = new Types.ObjectId().toString();
  const mockShopId = new Types.ObjectId();
  const mockBarber1Id = new Types.ObjectId();
  const mockBarber2Id = new Types.ObjectId();
  const mockServiceId = new Types.ObjectId();

  const mockCustomer = {
    _id: new Types.ObjectId(mockCustomerId),
    name: 'Aarav Sharma',
    phone: '+919876543210',
    role: Role.CUSTOMER,
    isActive: true,
  };

  const mockShop = {
    _id: mockShopId,
    ownerId: mockOwnerId,
    name: 'Royal Cuts Studio',
    timezone: 'Asia/Kolkata',
    isActive: true,
  };

  const mockBarber1 = {
    _id: mockBarber1Id,
    shopId: mockShopId,
    name: 'Vikram Barber',
    isActive: true,
  };

  const mockBarber2 = {
    _id: mockBarber2Id,
    shopId: mockShopId,
    name: 'Rohit Barber',
    isActive: true,
  };

  const mockServiceEntity = {
    _id: mockServiceId,
    shopId: mockShopId,
    name: 'Classic Haircut',
    durationMinutes: 30,
    price: 350,
    isActive: true,
  };

  let mockAppointmentModel: any;
  let mockBarberModel: any;
  let mockServiceModel: any;
  let mockBarberServiceModel: any;
  let mockUsersService: any;
  let mockShopsService: any;
  let mockAvailabilityService: any;
  let mockRemindersService: any;

  beforeEach(async () => {
    mockAppointmentModel = jest.fn().mockImplementation((dto) => {
      const instance = {
        ...dto,
        _id: new Types.ObjectId(),
        save: jest.fn().mockResolvedValue({
          ...dto,
          _id: new Types.ObjectId(),
        }),
      };
      return instance;
    });

    mockAppointmentModel.findOne = jest.fn();
    mockAppointmentModel.findById = jest.fn();
    mockAppointmentModel.find = jest.fn().mockReturnThis();
    mockAppointmentModel.sort = jest.fn().mockReturnThis();
    mockAppointmentModel.exec = jest.fn();

    mockBarberModel = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([mockBarber1, mockBarber2]),
        }),
      }),
      findOne: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockImplementation(() => {
          const id = query?._id?.toString();
          if (id === mockBarber1Id.toString()) return Promise.resolve(mockBarber1);
          if (id === mockBarber2Id.toString()) return Promise.resolve(mockBarber2);
          return Promise.resolve(mockBarber1);
        }),
      })),
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockImplementation((id) => {
          if (id.toString() === mockBarber1Id.toString()) return Promise.resolve(mockBarber1);
          if (id.toString() === mockBarber2Id.toString()) return Promise.resolve(mockBarber2);
          return Promise.resolve(null);
        }),
      }),
    };

    mockServiceModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockServiceEntity),
      }),
    };

    mockBarberServiceModel = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { barberId: mockBarber1Id, serviceId: mockServiceId },
          { barberId: mockBarber2Id, serviceId: mockServiceId },
        ]),
      }),
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          barberId: mockBarber1Id,
          serviceId: mockServiceId,
        }),
      }),
    };

    mockUsersService = {
      findById: jest.fn().mockImplementation((id: string) => {
        if (id === mockCustomerId) return Promise.resolve(mockCustomer);
        return Promise.resolve(null);
      }),
    };

    mockShopsService = {
      findSingleActiveShop: jest.fn().mockResolvedValue(mockShop),
    };

    mockAvailabilityService = {
      getAvailability: jest.fn().mockResolvedValue({
        slots: [
          { startTime: '10:00', endTime: '10:30', status: 'AVAILABLE' },
          { startTime: '10:30', endTime: '11:00', status: 'AVAILABLE' },
        ],
      }),
    };

    mockRemindersService = {
      schedule24HourReminder: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: getModelToken(Appointment.name), useValue: mockAppointmentModel },
        { provide: getModelToken(Barber.name), useValue: mockBarberModel },
        { provide: getModelToken(ServiceEntity.name), useValue: mockServiceModel },
        { provide: getModelToken(BarberService.name), useValue: mockBarberServiceModel },
        { provide: UsersService, useValue: mockUsersService },
        { provide: ShopsService, useValue: mockShopsService },
        { provide: AvailabilityService, useValue: mockAvailabilityService },
        { provide: RemindersService, useValue: mockRemindersService },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAppointment', () => {
    const futureDate = new Date(Date.now() + 86400000); // tomorrow
    const isoDateStr = futureDate.toISOString().split('T')[0];
    const requestedIso = `${isoDateStr}T04:30:00.000Z`; // 10:00 AM IST

    it('should successfully book with Any Barber (no barberId specified)', async () => {
      mockAppointmentModel.findOne.mockResolvedValue(null); // no conflict

      const result = await service.createAppointment(mockCustomerId, {
        serviceId: mockServiceId.toString(),
        startAt: requestedIso,
      });

      expect(result).toBeDefined();
      expect(mockAppointmentModel).toHaveBeenCalled();
      const createArgs = mockAppointmentModel.mock.calls[0][0];
      expect(createArgs.bookingToken).toMatch(/^RC-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/);
      expect(createArgs.barberNameSnapshot).toBe('Vikram Barber');
      expect(createArgs.customerNameSnapshot).toBe('Aarav Sharma');
      expect(mockRemindersService.schedule24HourReminder).toHaveBeenCalled();
    });

    it('should return existing appointment if idempotency key matches', async () => {
      const existingAppt = {
        _id: new Types.ObjectId(),
        bookingToken: 'RC-11111',
        idempotencyKey: 'idem-key-1',
      };
      mockAppointmentModel.findOne.mockResolvedValueOnce(existingAppt);

      const result = await service.createAppointment(
        mockCustomerId,
        { serviceId: mockServiceId.toString(), startAt: requestedIso },
        'idem-key-1',
      );

      expect(result).toBe(existingAppt);
      expect(mockAppointmentModel).not.toHaveBeenCalled();
    });

    it('should reject past appointment date-time', async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();

      await expect(
        service.createAppointment(mockCustomerId, {
          serviceId: mockServiceId.toString(),
          startAt: pastDate,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if requested slot is unavailable across all barbers', async () => {
      mockAppointmentModel.findOne.mockResolvedValue(null);
      mockAvailabilityService.getAvailability.mockResolvedValue({
        slots: [
          { startTime: '12:00', endTime: '12:30', status: 'AVAILABLE' },
        ],
      });

      await expect(
        service.createAppointment(mockCustomerId, {
          serviceId: mockServiceId.toString(),
          startAt: requestedIso,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if specific barber is not assigned to service', async () => {
      mockAppointmentModel.findOne.mockResolvedValue(null);
      // Return assignments that don't include mockBarber1Id
      mockBarberServiceModel.find.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([
          { barberId: mockBarber2Id, serviceId: mockServiceId },
        ]),
      });

      await expect(
        service.createAppointment(mockCustomerId, {
          serviceId: mockServiceId.toString(),
          barberId: mockBarber1Id.toString(),
          startAt: requestedIso,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException on overlapping appointment for the barber', async () => {
      mockAppointmentModel.findOne.mockResolvedValueOnce({ _id: new Types.ObjectId() }); // conflict check finds collision

      await expect(
        service.createAppointment(mockCustomerId, {
          serviceId: mockServiceId.toString(),
          barberId: mockBarber1Id.toString(),
          startAt: requestedIso,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getById', () => {
    it('should allow customer to access their own appointment', async () => {
      const appt = {
        _id: new Types.ObjectId(),
        customerId: new Types.ObjectId(mockCustomerId),
        shopId: mockShopId,
      };
      mockAppointmentModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(appt),
      });

      const result = await service.getById(
        appt._id.toString(),
        { id: mockCustomerId, role: Role.CUSTOMER } as any,
      );

      expect(result).toBe(appt);
    });

    it('should forbid other customers from accessing the appointment', async () => {
      const appt = {
        _id: new Types.ObjectId(),
        customerId: new Types.ObjectId(mockCustomerId),
        shopId: mockShopId,
      };
      mockAppointmentModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(appt),
      });

      await expect(
        service.getById(
          appt._id.toString(),
          { id: mockOtherCustomerId, role: Role.CUSTOMER } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow owner of the shop to access the appointment', async () => {
      const appt = {
        _id: new Types.ObjectId(),
        customerId: new Types.ObjectId(mockCustomerId),
        shopId: mockShopId,
      };
      mockAppointmentModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(appt),
      });
      mockShopsService.findMyOrNull = jest.fn().mockResolvedValue(mockShop);

      const result = await service.getById(
        appt._id.toString(),
        { id: mockOwnerId, role: Role.OWNER } as any,
      );

      expect(result).toBe(appt);
    });
  });

  describe('getCustomerAppointments', () => {
    it('should return appointments for the given customer', async () => {
      const appts = [{ _id: new Types.ObjectId(), customerId: new Types.ObjectId(mockCustomerId) }];
      mockAppointmentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(appts),
        }),
      });

      const result = await service.getCustomerAppointments(mockCustomerId);
      expect(result).toBe(appts);
      expect(mockAppointmentModel.find).toHaveBeenCalledWith({
        customerId: new Types.ObjectId(mockCustomerId),
      });
    });
  });
});
