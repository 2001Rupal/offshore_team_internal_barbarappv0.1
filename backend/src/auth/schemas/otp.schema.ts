import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OtpDocument = Otp & Document;

@Schema({ timestamps: true })
export class Otp {
  _id: Types.ObjectId;

  @Prop({ required: false, trim: true, index: true })
  phone?: string;

  @Prop({ required: false, trim: true, lowercase: true, index: true })
  email?: string;

  @Prop({ required: true, enum: ['PHONE', 'EMAIL'], default: 'PHONE' })
  type: 'PHONE' | 'EMAIL';

  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ default: false })
  isUsed: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);

// Compound indexes for fast lookup of active codes
OtpSchema.index({ phone: 1, isUsed: 1, expiresAt: 1 });
OtpSchema.index({ email: 1, isUsed: 1, expiresAt: 1 });

// TTL index to automatically purge expired OTP documents after 1 hour
OtpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });
