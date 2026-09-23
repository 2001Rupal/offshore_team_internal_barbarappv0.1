import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { DayOfWeek } from '../enums/day-of-week.enum';
import { Barber } from '../../barbers/schemas/barber.schema';

export type BarberScheduleDocument = BarberSchedule & Document;

@Schema({ _id: false })
export class ScheduleBreak {
  @Prop({ required: true, trim: true })
  startTime: string; // e.g. "13:00"

  @Prop({ required: true, trim: true })
  endTime: string; // e.g. "14:00"
}

export const ScheduleBreakSchema = SchemaFactory.createForClass(ScheduleBreak);

@Schema({ timestamps: true, collection: 'barber_schedules' })
export class BarberSchedule {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Barber.name, required: true, index: true })
  barberId: Types.ObjectId;

  @Prop({ required: true, enum: DayOfWeek })
  dayOfWeek: DayOfWeek;

  @Prop({ required: true, default: true })
  isWorking: boolean;

  @Prop({ required: false, trim: true })
  startTime?: string; // e.g. "10:00"

  @Prop({ required: false, trim: true })
  endTime?: string; // e.g. "20:00"

  @Prop({ type: [ScheduleBreakSchema], default: [] })
  breaks: ScheduleBreak[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const BarberScheduleSchema = SchemaFactory.createForClass(BarberSchedule);

// Compound unique index ensuring exactly one schedule entry per barber per day of week
BarberScheduleSchema.index({ barberId: 1, dayOfWeek: 1 }, { unique: true });

BarberScheduleSchema.set('toJSON', {
  transform: (_, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : undefined;
    if (ret.barberId) {
      ret.barberId = ret.barberId.toString();
    }
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
