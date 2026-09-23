import { Injectable, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppointmentInterval } from '../types/availability.types';

export const APPOINTMENT_CONFLICT_REPOSITORY = 'APPOINTMENT_CONFLICT_REPOSITORY';

export interface IAppointmentConflictRepository {
  findBookedIntervals(barberId: string, date: string): Promise<AppointmentInterval[]>;
}

@Injectable()
export class DefaultAppointmentConflictRepository implements IAppointmentConflictRepository {
  constructor(
    @Optional()
    @InjectModel('Appointment')
    private readonly appointmentModel?: Model<any>,
  ) {}

  async findBookedIntervals(barberId: string, date: string): Promise<AppointmentInterval[]> {
    if (!this.appointmentModel) {
      return [];
    }

    try {
      const dayStart = new Date(`${date}T00:00:00.000Z`);
      dayStart.setUTCDate(dayStart.getUTCDate() - 1);
      const dayEnd = new Date(`${date}T23:59:59.999Z`);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

      const appointments = await this.appointmentModel
        .find({
          barberId: new Types.ObjectId(barberId),
          status: { $in: ['CONFIRMED', 'PENDING'] },
          startAt: { $gte: dayStart, $lte: dayEnd },
        })
        .exec();

      const intervals: AppointmentInterval[] = [];
      for (const appt of appointments) {
        const tz = appt.timezone || 'Asia/Kolkata';
        const startParts = new Intl.DateTimeFormat('en-CA', {
          timeZone: tz,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).formatToParts(appt.startAt);

        const getP = (parts: Intl.DateTimeFormatPart[], type: string) =>
          parts.find((p) => p.type === type)?.value ?? '00';

        const apptDate = `${getP(startParts, 'year')}-${getP(startParts, 'month')}-${getP(startParts, 'day')}`;
        if (apptDate === date) {
          const endParts = new Intl.DateTimeFormat('en-CA', {
            timeZone: tz,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }).formatToParts(appt.endAt);

          intervals.push({
            startTime: `${getP(startParts, 'hour')}:${getP(startParts, 'minute')}`,
            endTime: `${getP(endParts, 'hour')}:${getP(endParts, 'minute')}`,
          });
        }
      }
      return intervals;
    } catch {
      return [];
    }
  }
}
