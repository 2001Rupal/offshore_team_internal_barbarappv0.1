import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Shop } from '../../shops/schemas/shop.schema';

export type BarberDocument = Barber & Document;

@Schema({ timestamps: true })
export class Barber {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Shop.name, required: true, index: true })
  shopId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: false, trim: true })
  phone?: string;

  @Prop({ required: false, lowercase: true, trim: true })
  email?: string;

  @Prop({ required: false, default: 0, min: 0 })
  experienceYears?: number;

  @Prop({ required: false, trim: true })
  bio?: string;

  @Prop({ default: true })
  isActive: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const BarberSchema = SchemaFactory.createForClass(Barber);

BarberSchema.index({ shopId: 1, isActive: 1 });

BarberSchema.set('toJSON', {
  transform: (_, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : undefined;
    if (ret.shopId) {
      ret.shopId = ret.shopId.toString();
    }
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
