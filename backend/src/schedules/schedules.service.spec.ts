import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SchedulesService } from './schedules.service';
import { BarberSchedule } from './schemas/barber-schedule.schema';
import { ScheduleException } from './schemas/schedule-exception.schema';
import { Barber } from '../barbers/schemas/barber.schema';
import { ShopsService } from '../shops/shops.service';
import { DayOfWeek } from './enums/day-of-week.enum';
import { ScheduleExceptionType } from './enums/schedule-exception-type.enum';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('SchedulesService', () => {
  let service: SchedulesService;
  let barberScheduleModel: any;
  let scheduleExceptionModel: any;
  let barberModel: any;
  let shopsService: Partial<Record<keyof ShopsService, jest.Mock>>;

  const ownerAId = new Types.ObjectId().toString();
  const ownerBId = new Types.ObjectId().toString();
  const shopId = new Types.ObjectId();
  const barberId = new Types.ObjectId().toString();

  const mockBarber = {
    _id: new Types.ObjectId(barberId),
    name: 'Rahul',
    shopId,
  };

  beforeEach(async () => {
    barberScheduleModel = {
      find: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    scheduleExceptionModel = jest.fn();
    scheduleExceptionModel.find = jest.fn();
    scheduleExceptionModel.findOne = jest.fn();
    scheduleExceptionModel.findById = jest.fn();
    scheduleExceptionModel.findByIdAndDelete = jest.fn();

    barberModel = {
      findById: jest.fn(),
    };

    shopsService = {
      verifyOwnership: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulesService,
        {
          provide: getModelToken(BarberSchedule.name),
          useValue: barberScheduleModel,
        },
        {
          provide: getModelToken(ScheduleException.name),
          useValue: scheduleExceptionModel,
        },
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

    service = module.get<SchedulesService>(SchedulesService);
  });

  describe('Weekly Schedule', () => {
    it('should return a full 7-day schedule with defaults if unconfigured', async () => {
      barberModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockBarber),
      });
      (shopsService.verifyOwnership as jest.Mock).mockResolvedValue(true);
      barberScheduleModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getWeeklySchedule(barberId, ownerAId);
      expect(result).toHaveLength(7);
      expect(result.map((d) => d.dayOfWeek)).toEqual([
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
        DayOfWeek.SATURDAY,
        DayOfWeek.SUNDAY,
      ]);
      const sunday = result.find((d) => d.dayOfWeek === DayOfWeek.SUNDAY);
      expect(sunday.isWorking).toBe(false);
      const monday = result.find((d) => d.dayOfWeek === DayOfWeek.MONDAY);
      expect(monday.isWorking).toBe(true);
      expect(monday.startTime).toBe('10:00');
      expect(monday.endTime).toBe('20:00');
    });

    it('should throw BadRequestException if working day has startTime >= endTime', async () => {
      barberModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockBarber),
      });
      (shopsService.verifyOwnership as jest.Mock).mockResolvedValue(true);

      const invalidDto = {
        weeklySchedule: [
          {
            dayOfWeek: DayOfWeek.MONDAY,
            isWorking: true,
            startTime: '18:00',
            endTime: '10:00',
          },
        ],
      };

      await expect(
        service.updateWeeklySchedule(barberId, ownerAId, invalidDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if break is outside working hours', async () => {
      barberModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockBarber),
      });
      (shopsService.verifyOwnership as jest.Mock).mockResolvedValue(true);

      const invalidDto = {
        weeklySchedule: [
          {
            dayOfWeek: DayOfWeek.MONDAY,
            isWorking: true,
            startTime: '10:00',
            endTime: '18:00',
            breaks: [{ startTime: '08:00', endTime: '09:00' }],
          },
        ],
      };

      await expect(
        service.updateWeeklySchedule(barberId, ownerAId, invalidDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if breaks overlap', async () => {
      barberModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockBarber),
      });
      (shopsService.verifyOwnership as jest.Mock).mockResolvedValue(true);

      const invalidDto = {
        weeklySchedule: [
          {
            dayOfWeek: DayOfWeek.MONDAY,
            isWorking: true,
            startTime: '10:00',
            endTime: '20:00',
            breaks: [
              { startTime: '13:00', endTime: '14:30' },
              { startTime: '14:00', endTime: '15:00' },
            ],
          },
        ],
      };

      await expect(
        service.updateWeeklySchedule(barberId, ownerAId, invalidDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully update schedule when timing is valid', async () => {
      barberModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockBarber),
      });
      (shopsService.verifyOwnership as jest.Mock).mockResolvedValue(true);
      barberScheduleModel.findOneAndUpdate.mockResolvedValue({});
      barberScheduleModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      const validDto = {
        weeklySchedule: [
          {
            dayOfWeek: DayOfWeek.MONDAY,
            isWorking: true,
            startTime: '10:00',
            endTime: '20:00',
            breaks: [{ startTime: '13:00', endTime: '14:00' }],
          },
        ],
      };

      const result = await service.updateWeeklySchedule(barberId, ownerAId, validDto);
      expect(barberScheduleModel.findOneAndUpdate).toHaveBeenCalled();
      expect(result).toHaveLength(7);
    });

    it('should throw ForbiddenException if Owner B tries to update Owner A barber schedule', async () => {
      barberModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockBarber),
      });
      (shopsService.verifyOwnership as jest.Mock).mockRejectedValue(
        new ForbiddenException('You do not have permission to access resources in this shop'),
      );

      await expect(
        service.updateWeeklySchedule(barberId, ownerBId, {
          weeklySchedule: [{ dayOfWeek: DayOfWeek.MONDAY, isWorking: false }],
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Schedule Exceptions', () => {
    it('should throw BadRequestException if CUSTOM_HOURS missing times or invalid order', async () => {
      barberModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockBarber),
      });
      (shopsService.verifyOwnership as jest.Mock).mockResolvedValue(true);

      await expect(
        service.createException(barberId, ownerAId, {
          date: '2026-09-22',
          type: ScheduleExceptionType.CUSTOM_HOURS,
          startTime: '16:00',
          endTime: '12:00',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if exception already exists on same date', async () => {
      barberModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockBarber),
      });
      (shopsService.verifyOwnership as jest.Mock).mockResolvedValue(true);
      scheduleExceptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'existing-id' }),
      });

      await expect(
        service.createException(barberId, ownerAId, {
          date: '2026-09-21',
          type: ScheduleExceptionType.OFF,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should delete exception successfully when owned', async () => {
      const exceptionId = new Types.ObjectId().toString();
      const mockException = {
        _id: exceptionId,
        barberId: mockBarber._id,
      };

      scheduleExceptionModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockException),
      });
      barberModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockBarber),
      });
      (shopsService.verifyOwnership as jest.Mock).mockResolvedValue(true);
      scheduleExceptionModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockException),
      });

      const res = await service.deleteException(exceptionId, ownerAId);
      expect(res.message).toBe('Schedule exception deleted successfully');
      expect(scheduleExceptionModel.findByIdAndDelete).toHaveBeenCalledWith(exceptionId);
    });
  });
});
