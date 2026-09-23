import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AppointmentStatus } from '../enums/appointment-status.enum';
import { User } from '../../users/schemas/user.schema';
import { Shop } from '../../shops/schemas/shop.schema';
import { Barber } from '../../barbers/schemas/barber.schema';
import { ServiceEntity } from '../../services/schemas/service.schema';

export type AppointmentDocument = Appointment & Document;

@Schema({ timestamps: true })
export class Appointment {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, uppercase: true, trim: true, index: true })
  bookingToken: string;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Shop.name, required: true, index: true })
  shopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Barber.name, required: true, index: true })
  barberId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: ServiceEntity.name, required: true, index: true })
  serviceId: Types.ObjectId;

  @Prop({ required: true, index: true })
  startAt: Date;

  @Prop({ required: true, index: true })
  endAt: Date;

  @Prop({ required: true, default: 'Asia/Kolkata' })
  timezone: string;

  @Prop({ required: true, enum: AppointmentStatus, default: AppointmentStatus.CONFIRMED, index: true })
  status: AppointmentStatus;

  @Prop({ required: false, sparse: true, index: true })
  idempotencyKey?: string;

  // Historical Snapshot Fields
  @Prop({ required: true })
  customerNameSnapshot: string;

  @Prop({ required: false, default: '' })
  customerPhoneSnapshot: string;

  @Prop({ required: true })
  serviceNameSnapshot: string;

  @Prop({ required: true })
  barberNameSnapshot: string;

  @Prop({ required: true })
  serviceDurationSnapshot: number;

  @Prop({ required: true })
  servicePriceSnapshot: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);

// Compound indexes for fast conflict lookup and client queries
AppointmentSchema.index({ barberId: 1, status: 1, startAt: 1, endAt: 1 });
AppointmentSchema.index({ customerId: 1, startAt: -1 });
AppointmentSchema.index({ shopId: 1, startAt: -1 });

AppointmentSchema.set('toJSON', {
  transform: (_, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : undefined;
    if (ret.customerId) ret.customerId = ret.customerId.toString();
    if (ret.shopId) ret.shopId = ret.shopId.toString();
    if (ret.barberId) ret.barberId = ret.barberId.toString();
    if (ret.serviceId) ret.serviceId = ret.serviceId.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
