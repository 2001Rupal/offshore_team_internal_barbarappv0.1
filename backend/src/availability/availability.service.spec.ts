import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AvailabilityService } from './availability.service';
import { APPOINTMENT_CONFLICT_REPOSITORY } from './repositories/appointment-conflict.repository';
import { Barber } from '../barbers/schemas/barber.schema';
import { Shop } from '../shops/schemas/shop.schema';
import { ServiceEntity } from '../services/schemas/service.schema';
import { BarberService } from '../barber-services/schemas/barber-service.schema';
import { BarberSchedule } from '../schedules/schemas/barber-schedule.schema';
import { ScheduleException } from '../schedules/schemas/schedule-exception.schema';
import { ScheduleExceptionType } from '../schedules/enums/schedule-exception-type.enum';
import { DayOfWeek } from '../schedules/enums/day-of-week.enum';
import { ShopsService } from '../shops/shops.service';

describe('AvailabilityService', () => {
  let service: AvailabilityService;

  const mockOwnerId = new Types.ObjectId().toString();
  const mockShopId = new Types.ObjectId();
  const mockBarberId = new Types.ObjectId();
  const mockServiceId = new Types.ObjectId();

  const mockShop = {
    _id: mockShopId,
    ownerId: mockOwnerId,
    name: 'Royal Cuts',
    timezone: 'Asia/Kolkata',
    isActive: true,
  };

  const mockBarber = {
    _id: mockBarberId,
    shopId: mockShopId,
    name: 'Rahul Barber',
    isActive: true,
  };

  const mockServiceEntity = {
    _id: mockServiceId,
    shopId: mockShopId,
    name: 'Classic Haircut',
    durationMinutes: 30,
    bufferTime: 0,
    isActive: true,
  };

  const mockAssignment = {
    barberId: mockBarberId,
    serviceId: mockServiceId,
  };

  // Mock Mongoose Models
  let mockBarberModel: any;
  let mockShopModel: any;
  let mockServiceModel: any;
  let mockBarberServiceModel: any;
  let mockBarberScheduleModel: any;
  let mockScheduleExceptionModel: any;
  let mockShopsService: any;
  let mockAppointmentRepo: any;

  beforeEach(async () => {
    mockBarberModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockBarber }),
      }),
    };

    mockShopModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockShop }),
      }),
    };

    mockServiceModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockServiceEntity }),
      }),
    };

    mockBarberServiceModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockAssignment }),
      }),
    };

    mockBarberScheduleModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          barberId: mockBarberId,
          dayOfWeek: DayOfWeek.SUNDAY,
          isWorking: true,
          startTime: '10:00',
          endTime: '20:00',
          breaks: [{ startTime: '13:00', endTime: '14:00' }],
        }),
      }),
    };

    mockScheduleExceptionModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    };

    mockShopsService = {
      verifyOwnership: jest.fn().mockResolvedValue(true),
    };

    mockAppointmentRepo = {
      findBookedIntervals: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        {
          provide: getModelToken(Barber.name),
          useValue: mockBarberModel,
        },
        {
          provide: getModelToken(Shop.name),
          useValue: mockShopModel,
        },
        {
          provide: getModelToken(ServiceEntity.name),
          useValue: mockServiceModel,
        },
        {
          provide: getModelToken(BarberService.name),
          useValue: mockBarberServiceModel,
        },
        {
          provide: getModelToken(BarberSchedule.name),
          useValue: mockBarberScheduleModel,
        },
        {
          provide: getModelToken(ScheduleException.name),
          useValue: mockScheduleExceptionModel,
        },
        {
          provide: APPOINTMENT_CONFLICT_REPOSITORY,
          useValue: mockAppointmentRepo,
        },
        {
          provide: ShopsService,
          useValue: mockShopsService,
        },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
  });

  describe('Validation and Security', () => {
    it('should throw BadRequestException if barberId format is invalid', async () => {
      await expect(
        service.getAvailability('invalid-id', '2026-09-20', mockServiceId.toString(), mockOwnerId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if date format is invalid', async () => {
      await expect(
        service.getAvailability(mockBarberId.toString(), '20-09-2026', mockServiceId.toString(), mockOwnerId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for impossible calendar date', async () => {
      await expect(
        service.getAvailability(mockBarberId.toString(), '2026-02-31', mockServiceId.toString(), mockOwnerId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if barber is not found', async () => {
      mockBarberModel.findById.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) });
      await expect(
        service.getAvailability(mockBarberId.toString(), '2026-09-20', mockServiceId.toString(), mockOwnerId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if barber is inactive', async () => {
      mockBarberModel.findById.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({ ...mockBarber, isActive: false }),
      });
      await expect(
        service.getAvailability(mockBarberId.toString(), '2026-09-20', mockServiceId.toString(), mockOwnerId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user does not own the shop', async () => {
      mockShopsService.verifyOwnership.mockRejectedValueOnce(
        new ForbiddenException('You do not have permission to access this resource'),
      );
      await expect(
        service.getAvailability(mockBarberId.toString(), '2026-09-20', mockServiceId.toString(), 'other-owner'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if service belongs to a different shop', async () => {
      mockServiceModel.findById.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({
          ...mockServiceEntity,
          shopId: new Types.ObjectId(),
        }),
      });
      await expect(
        service.getAvailability(mockBarberId.toString(), '2026-09-20', mockServiceId.toString(), mockOwnerId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if barber is not assigned to service', async () => {
      mockBarberServiceModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) });
      await expect(
        service.getAvailability(mockBarberId.toString(), '2026-09-20', mockServiceId.toString(), mockOwnerId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Slot Generation and Schedule Calculation', () => {
    // 2026-09-20 is Sunday
    // Mock schedule: Sunday 10:00 to 20:00, break 13:00 to 14:00
    // Service: 30 min, buffer: 0
    it('should generate continuous slots subtracting breaks on a normal working day', async () => {
      // Future date relative to mock time
      const mockNow = new Date('2026-09-19T00:00:00Z');
      const result = await service.getAvailability(
        mockBarberId.toString(),
        '2026-09-20',
        mockServiceId.toString(),
        mockOwnerId,
        mockNow,
      );

      expect(result.date).toBe('2026-09-20');
      expect(result.timezone).toBe('Asia/Kolkata');
      expect(result.serviceDurationMinutes).toBe(30);
      expect(result.bufferMinutes).toBe(0);

      // 10:00 to 13:00 has 6 slots: 10:00, 10:30, 11:00, 11:30, 12:00, 12:30 (12:30 ends at 13:00)
      // 14:00 to 20:00 has 12 slots: 14:00 ... 19:30 (19:30 ends at 20:00)
      // Total 18 slots
      expect(result.slots.length).toBe(18);
      expect(result.slots[0]).toEqual({
        startTime: '10:00',
        endTime: '10:30',
        status: 'AVAILABLE',
      });
      expect(result.slots[5]).toEqual({
        startTime: '12:30',
        endTime: '13:00',
        status: 'AVAILABLE',
      });
      // Slot crossing or during break must NOT appear
      expect(result.slots.some((s) => s.startTime === '13:00' || s.startTime === '13:30')).toBe(false);
      expect(result.slots[6]).toEqual({
        startTime: '14:00',
        endTime: '14:30',
        status: 'AVAILABLE',
      });
      expect(result.slots[result.slots.length - 1]).toEqual({
        startTime: '19:30',
        endTime: '20:00',
        status: 'AVAILABLE',
      });
    });

    it('should return 0 slots if weekly schedule has isWorking = false', async () => {
      mockBarberScheduleModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({
          barberId: mockBarberId,
          dayOfWeek: DayOfWeek.SUNDAY,
          isWorking: false,
        }),
      });

      const result = await service.getAvailability(
        mockBarberId.toString(),
        '2026-09-20',
        mockServiceId.toString(),
        mockOwnerId,
      );

      expect(result.slots).toEqual([]);
    });

    it('should return 0 slots if date exception is OFF / DAY_OFF', async () => {
      mockScheduleExceptionModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({
          barberId: mockBarberId,
          date: '2026-09-20',
          type: ScheduleExceptionType.OFF,
        }),
      });

      const result = await service.getAvailability(
        mockBarberId.toString(),
        '2026-09-20',
        mockServiceId.toString(),
        mockOwnerId,
      );

      expect(result.slots).toEqual([]);
    });

    it('should apply CUSTOM_HOURS exception overriding shift times', async () => {
      mockScheduleExceptionModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({
          barberId: mockBarberId,
          date: '2026-09-20',
          type: ScheduleExceptionType.CUSTOM_HOURS,
          startTime: '12:00',
          endTime: '17:00',
        }),
      });

      // Weekly schedule has break 14:00 to 14:30
      mockBarberScheduleModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({
          barberId: mockBarberId,
          dayOfWeek: DayOfWeek.SUNDAY,
          isWorking: true,
          breaks: [{ startTime: '14:00', endTime: '14:30' }],
        }),
      });

      const mockNow = new Date('2026-09-19T00:00:00Z');
      const result = await service.getAvailability(
        mockBarberId.toString(),
        '2026-09-20',
        mockServiceId.toString(),
        mockOwnerId,
        mockNow,
      );

      // Window 1: 12:00–14:00 (12:00, 12:30, 13:00, 13:30 -> 4 slots)
      // Window 2: 14:30–17:00 (14:30, 15:00, 15:30, 16:00, 16:30 -> 5 slots)
      // Total 9 slots
      expect(result.slots.length).toBe(9);
      expect(result.slots[0].startTime).toBe('12:00');
      expect(result.slots.find((s) => s.startTime === '10:00')).toBeUndefined();
      expect(result.slots.find((s) => s.startTime === '14:00')).toBeUndefined();
      expect(result.slots.find((s) => s.startTime === '14:30')).toBeDefined();
    });

    it('should account for service duration + buffer time', async () => {
      // Service with 30m duration + 10m buffer = 40m occupancy
      mockServiceModel.findById.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({
          ...mockServiceEntity,
          durationMinutes: 30,
          bufferTime: 10,
        }),
      });

      const mockNow = new Date('2026-09-19T00:00:00Z');
      const result = await service.getAvailability(
        mockBarberId.toString(),
        '2026-09-20',
        mockServiceId.toString(),
        mockOwnerId,
        mockNow,
      );

      expect(result.serviceDurationMinutes).toBe(30);
      expect(result.bufferMinutes).toBe(10);
      // First slot starts 10:00 and ends at 10:40 (10:00 + 40m)
      expect(result.slots[0]).toEqual({
        startTime: '10:00',
        endTime: '10:40',
        status: 'AVAILABLE',
      });
      // Second slot starts at 10:30 and ends at 11:10
      expect(result.slots[1]).toEqual({
        startTime: '10:30',
        endTime: '11:10',
        status: 'AVAILABLE',
      });
      // Slot at 12:30 ends at 13:10, which crosses the 13:00 break, so 12:30 must NOT be generated!
      // In 10:00-13:00 window (180 mins):
      // 10:00 (ends 10:40 <= 13:00) -> OK
      // 10:30 (ends 11:10 <= 13:00) -> OK
      // 11:00 (ends 11:40 <= 13:00) -> OK
      // 11:30 (ends 12:10 <= 13:00) -> OK
      // 12:00 (ends 12:40 <= 13:00) -> OK
      // 12:30 (ends 13:10 > 13:00) -> EXCEEDS WINDOW -> Rejected!
      expect(result.slots.find((s) => s.startTime === '12:30')).toBeUndefined();
    });
  });

  describe('Appointment Conflict Handling', () => {
    it('should reject candidate slots overlapping booked appointments and allow adjacent', async () => {
      // Existing appointments:
      // Appt 1: 10:00 to 11:00
      // Appt 2: 15:00 to 15:30
      mockAppointmentRepo.findBookedIntervals.mockResolvedValueOnce([
        { startTime: '10:00', endTime: '11:00' },
        { startTime: '15:00', endTime: '15:30' },
      ]);

      const mockNow = new Date('2026-09-19T00:00:00Z');
      const result = await service.getAvailability(
        mockBarberId.toString(),
        '2026-09-20',
        mockServiceId.toString(),
        mockOwnerId,
        mockNow,
      );

      // Candidate 10:00-10:30 -> overlaps 10:00-11:00 -> REJECTED
      expect(result.slots.find((s) => s.startTime === '10:00')).toBeUndefined();
      // Candidate 10:30-11:00 -> overlaps 10:00-11:00 -> REJECTED
      expect(result.slots.find((s) => s.startTime === '10:30')).toBeUndefined();
      // Candidate 11:00-11:30 -> ADJACENT to 10:00-11:00 (11:00 < 11:00 is false) -> ALLOWED!
      expect(result.slots.find((s) => s.startTime === '11:00')).toBeDefined();

      // Candidate 14:30-15:00 -> ADJACENT to 15:00-15:30 (15:00 > 15:00 is false) -> ALLOWED!
      expect(result.slots.find((s) => s.startTime === '14:30')).toBeDefined();
      // Candidate 15:00-15:30 -> overlaps 15:00-15:30 -> REJECTED
      expect(result.slots.find((s) => s.startTime === '15:00')).toBeUndefined();
      // Candidate 15:30-16:00 -> ADJACENT to 15:00-15:30 -> ALLOWED!
      expect(result.slots.find((s) => s.startTime === '15:30')).toBeDefined();
    });
  });

  describe('Past-Slot Filtering in Shop Timezone', () => {
    it('should filter out slots starting in the past for today in shop timezone', async () => {
      // Shop timezone is Asia/Kolkata (UTC+5:30)
      // Suppose local date is 2026-09-20, and current time is 15:20
      // In UTC: 2026-09-20T09:50:00Z -> In Asia/Kolkata: 2026-09-20 15:20
      const mockNow = new Date('2026-09-20T09:50:00Z');

      const result = await service.getAvailability(
        mockBarberId.toString(),
        '2026-09-20',
        mockServiceId.toString(),
        mockOwnerId,
        mockNow,
      );

      // Slots before 15:20 (e.g. 10:00, 14:00, 15:00) must be filtered out
      expect(result.slots.find((s) => s.startTime === '15:00')).toBeUndefined();
      expect(result.slots.find((s) => s.startTime === '10:00')).toBeUndefined();
      // Slot at 15:30 is in the future relative to 15:20 -> Must be retained!
      expect(result.slots.find((s) => s.startTime === '15:30')).toBeDefined();
      expect(result.slots[0].startTime).toBe('15:30');
    });

    it('should return empty slots if requested date is entirely in the past', async () => {
      // Today is 2026-09-20
      const mockNow = new Date('2026-09-20T09:50:00Z');
      const result = await service.getAvailability(
        mockBarberId.toString(),
        '2026-09-18',
        mockServiceId.toString(),
        mockOwnerId,
        mockNow,
      );

      expect(result.slots).toEqual([]);
    });

    it('should keep all slots without past filtering if date is in the future', async () => {
      // Today is 2026-09-20, request is for 2026-09-27 (next Sunday)
      const mockNow = new Date('2026-09-20T09:50:00Z');
      const result = await service.getAvailability(
        mockBarberId.toString(),
        '2026-09-27',
        mockServiceId.toString(),
        mockOwnerId,
        mockNow,
      );

      // Morning slots should still be present
      expect(result.slots.find((s) => s.startTime === '10:00')).toBeDefined();
    });
  });
});
