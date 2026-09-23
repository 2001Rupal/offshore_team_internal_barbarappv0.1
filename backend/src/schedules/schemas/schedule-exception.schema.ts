import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ScheduleExceptionType } from '../enums/schedule-exception-type.enum';
import { Barber } from '../../barbers/schemas/barber.schema';

export type ScheduleExceptionDocument = ScheduleException & Document;

@Schema({ timestamps: true, collection: 'schedule_exceptions' })
export class ScheduleException {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Barber.name, required: true, index: true })
  barberId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  date: string; // "YYYY-MM-DD" format, e.g. "2026-09-21"

  @Prop({ required: true, enum: ScheduleExceptionType })
  type: ScheduleExceptionType;

  @Prop({ required: false, trim: true })
  startTime?: string; // "HH:mm"

  @Prop({ required: false, trim: true })
  endTime?: string; // "HH:mm"

  @Prop({ required: false, trim: true })
  reason?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ScheduleExceptionSchema = SchemaFactory.createForClass(ScheduleException);

// Compound index on barberId and date
ScheduleExceptionSchema.index({ barberId: 1, date: 1 });

ScheduleExceptionSchema.set('toJSON', {
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
