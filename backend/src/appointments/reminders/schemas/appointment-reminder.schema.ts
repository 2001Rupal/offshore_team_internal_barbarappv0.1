import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Appointment } from '../../schemas/appointment.schema';
import { User } from '../../../users/schemas/user.schema';

export type AppointmentReminderDocument = AppointmentReminder & Document;

@Schema({ timestamps: true })
export class AppointmentReminder {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Appointment.name, required: true, index: true })
  appointmentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ required: false, default: '', trim: true })
  customerPhone?: string;

  @Prop({ required: true, uppercase: true })
  bookingToken: string;

  @Prop({ required: true, enum: ['24_HOUR', '2_HOUR'], default: '24_HOUR' })
  type: string;

  @Prop({ required: true, index: true })
  scheduledFor: Date;

  @Prop({
    required: true,
    enum: ['SCHEDULED', 'SENT', 'FAILED', 'CANCELLED'],
    default: 'SCHEDULED',
    index: true,
  })
  status: string;

  @Prop({ required: true })
  message: string;

  @Prop({ required: false })
  sentAt?: Date;

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ required: false })
  lastError?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AppointmentReminderSchema = SchemaFactory.createForClass(AppointmentReminder);
