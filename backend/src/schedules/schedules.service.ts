import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import { Barber, BarberDocument } from '../barbers/schemas/barber.schema';
import { ShopsService } from '../shops/shops.service';
import { BarberSchedule, BarberScheduleDocument } from './schemas/barber-schedule.schema';
import { ScheduleException, ScheduleExceptionDocument } from './schemas/schedule-exception.schema';
import { DayOfWeek } from './enums/day-of-week.enum';
import { ScheduleExceptionType } from './enums/schedule-exception-type.enum';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { DayScheduleDto } from './dto/day-schedule.dto';
import { BreakDto } from './dto/break.dto';
import { CreateScheduleExceptionDto } from './dto/create-schedule-exception.dto';
import { UpdateScheduleExceptionDto } from './dto/update-schedule-exception.dto';

const ORDERED_DAYS = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
];

@Injectable()
export class SchedulesService {
  constructor(
    @InjectModel(BarberSchedule.name)
    private barberScheduleModel: Model<BarberScheduleDocument>,
    @InjectModel(ScheduleException.name)
    private scheduleExceptionModel: Model<ScheduleExceptionDocument>,
    @InjectModel(Barber.name)
    private barberModel: Model<BarberDocument>,
    private shopsService: ShopsService,
  ) {}

  private async getAndVerifyBarber(barberId: string, ownerId: string): Promise<BarberDocument> {
    if (!isValidObjectId(barberId)) {
      throw new BadRequestException('Invalid barber ID format');
    }

    const barber = await this.barberModel.findById(barberId).exec();
    if (!barber) {
      throw new NotFoundException('Barber not found');
    }

    await this.shopsService.verifyOwnership(barber.shopId, ownerId);
    return barber;
  }

  // --- Weekly Schedule Methods ---

  async getWeeklySchedule(barberId: string, ownerId: string): Promise<any[]> {
    await this.getAndVerifyBarber(barberId, ownerId);

    const savedSchedules = await this.barberScheduleModel
      .find({ barberId: new Types.ObjectId(barberId) })
      .exec();

    const scheduleMap = new Map<DayOfWeek, BarberScheduleDocument>();
    for (const item of savedSchedules) {
      scheduleMap.set(item.dayOfWeek, item);
    }

    // Return complete 7-day schedule, filling unconfigured days with defaults
    return ORDERED_DAYS.map((day) => {
      const saved = scheduleMap.get(day);
      if (saved) {
        return {
          id: saved._id.toString(),
          barberId: saved.barberId.toString(),
          dayOfWeek: saved.dayOfWeek,
          isWorking: saved.isWorking,
          startTime: saved.startTime,
          endTime: saved.endTime,
          breaks: saved.breaks || [],
        };
      }

      // Default template: Mon-Sat working (10:00 - 20:00, lunch 13:00-14:00), Sun OFF
      const isSunday = day === DayOfWeek.SUNDAY;
      return {
        barberId,
        dayOfWeek: day,
        isWorking: !isSunday,
        startTime: isSunday ? undefined : '10:00',
        endTime: isSunday ? undefined : '20:00',
        breaks: isSunday ? [] : [{ startTime: '13:00', endTime: '14:00' }],
      };
    });
  }

  async updateWeeklySchedule(
    barberId: string,
    ownerId: string,
    dto: UpdateScheduleDto,
  ): Promise<any[]> {
    await this.getAndVerifyBarber(barberId, ownerId);

    // Strict validation of each day schedule
    for (const day of dto.weeklySchedule) {
      this.validateDaySchedule(day);
    }

    // Upsert each provided day schedule
    for (const day of dto.weeklySchedule) {
      await this.barberScheduleModel.findOneAndUpdate(
        {
          barberId: new Types.ObjectId(barberId),
          dayOfWeek: day.dayOfWeek,
        },
        {
          barberId: new Types.ObjectId(barberId),
          dayOfWeek: day.dayOfWeek,
          isWorking: day.isWorking,
          startTime: day.isWorking ? day.startTime : undefined,
          endTime: day.isWorking ? day.endTime : undefined,
          breaks: day.isWorking ? day.breaks || [] : [],
        },
        { upsert: true, new: true },
      );
    }

    return this.getWeeklySchedule(barberId, ownerId);
  }

  private validateDaySchedule(day: DayScheduleDto): void {
    if (day.isWorking) {
      if (!day.startTime || !day.endTime) {
        throw new BadRequestException(
          `startTime and endTime are required for working day: ${day.dayOfWeek}`,
        );
      }

      if (day.startTime >= day.endTime) {
        throw new BadRequestException(
          `startTime (${day.startTime}) must be earlier than endTime (${day.endTime}) for ${day.dayOfWeek}`,
        );
      }

      const breaks = day.breaks || [];
      for (let i = 0; i < breaks.length; i++) {
        const b = breaks[i];
        if (b.startTime >= b.endTime) {
          throw new BadRequestException(
            `Break startTime (${b.startTime}) must be earlier than endTime (${b.endTime}) on ${day.dayOfWeek}`,
          );
        }

        // Break must be strictly inside working hours
        if (b.startTime < day.startTime || b.endTime > day.endTime) {
          throw new BadRequestException(
            `Break ${b.startTime}-${b.endTime} must be within working hours ${day.startTime}-${day.endTime} on ${day.dayOfWeek}`,
          );
        }

        // Check break overlaps with subsequent breaks
        for (let j = i + 1; j < breaks.length; j++) {
          const other = breaks[j];
          if (b.startTime < other.endTime && b.endTime > other.startTime) {
            throw new BadRequestException(
              `Breaks ${b.startTime}-${b.endTime} and ${other.startTime}-${other.endTime} overlap on ${day.dayOfWeek}`,
            );
          }
        }
      }
    }
  }

  // --- Schedule Exceptions Methods ---

  async getExceptions(barberId: string, ownerId: string): Promise<ScheduleExceptionDocument[]> {
    await this.getAndVerifyBarber(barberId, ownerId);

    return this.scheduleExceptionModel
      .find({ barberId: new Types.ObjectId(barberId) })
      .sort({ date: 1 })
      .exec();
  }

  async createException(
    barberId: string,
    ownerId: string,
    dto: CreateScheduleExceptionDto,
  ): Promise<ScheduleExceptionDocument> {
    await this.getAndVerifyBarber(barberId, ownerId);

    this.validateExceptionTiming(dto.type, dto.startTime, dto.endTime);

    // Check duplicate exception on the same date for the barber
    const existing = await this.scheduleExceptionModel
      .findOne({
        barberId: new Types.ObjectId(barberId),
        date: dto.date,
      })
      .exec();

    if (existing) {
      throw new ConflictException(
        `A schedule exception already exists for date ${dto.date} for this barber`,
      );
    }

    const exception = new this.scheduleExceptionModel({
      barberId: new Types.ObjectId(barberId),
      date: dto.date,
      type: dto.type,
      startTime: dto.type === ScheduleExceptionType.CUSTOM_HOURS ? dto.startTime : undefined,
      endTime: dto.type === ScheduleExceptionType.CUSTOM_HOURS ? dto.endTime : undefined,
      reason: dto.reason,
    });

    return exception.save();
  }

  async updateException(
    exceptionId: string,
    ownerId: string,
    dto: UpdateScheduleExceptionDto,
  ): Promise<ScheduleExceptionDocument> {
    if (!isValidObjectId(exceptionId)) {
      throw new BadRequestException('Invalid exception ID format');
    }

    const exception = await this.scheduleExceptionModel.findById(exceptionId).exec();
    if (!exception) {
      throw new NotFoundException('Schedule exception not found');
    }

    const barber = await this.barberModel.findById(exception.barberId).exec();
    if (!barber) {
      throw new NotFoundException('Associated barber not found');
    }

    await this.shopsService.verifyOwnership(barber.shopId, ownerId);

    const targetType = dto.type ?? exception.type;
    const targetStart = dto.startTime ?? exception.startTime;
    const targetEnd = dto.endTime ?? exception.endTime;

    this.validateExceptionTiming(targetType, targetStart, targetEnd);

    if (dto.date && dto.date !== exception.date) {
      const conflict = await this.scheduleExceptionModel
        .findOne({
          barberId: exception.barberId,
          date: dto.date,
          _id: { $ne: exception._id },
        })
        .exec();

      if (conflict) {
        throw new ConflictException(
          `A schedule exception already exists for date ${dto.date} for this barber`,
        );
      }
      exception.date = dto.date;
    }

    exception.type = targetType;
    if (targetType === ScheduleExceptionType.CUSTOM_HOURS) {
      exception.startTime = targetStart;
      exception.endTime = targetEnd;
    } else {
      exception.startTime = undefined;
      exception.endTime = undefined;
    }

    if (dto.reason !== undefined) {
      exception.reason = dto.reason;
    }

    return exception.save();
  }

  async deleteException(
    exceptionId: string,
    ownerId: string,
  ): Promise<{ message: string; id: string }> {
    if (!isValidObjectId(exceptionId)) {
      throw new BadRequestException('Invalid exception ID format');
    }

    const exception = await this.scheduleExceptionModel.findById(exceptionId).exec();
    if (!exception) {
      throw new NotFoundException('Schedule exception not found');
    }

    const barber = await this.barberModel.findById(exception.barberId).exec();
    if (!barber) {
      throw new NotFoundException('Associated barber not found');
    }

    await this.shopsService.verifyOwnership(barber.shopId, ownerId);

    await this.scheduleExceptionModel.findByIdAndDelete(exceptionId).exec();
    return { message: 'Schedule exception deleted successfully', id: exceptionId };
  }

  private validateExceptionTiming(
    type: ScheduleExceptionType,
    startTime?: string,
    endTime?: string,
  ): void {
    if (type === ScheduleExceptionType.CUSTOM_HOURS) {
      if (!startTime || !endTime) {
        throw new BadRequestException(
          'startTime and endTime are required when exception type is CUSTOM_HOURS',
        );
      }
      if (startTime >= endTime) {
        throw new BadRequestException(
          `startTime (${startTime}) must be earlier than endTime (${endTime}) for CUSTOM_HOURS`,
        );
      }
    }
  }
}
