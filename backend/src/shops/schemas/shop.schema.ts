import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type ShopDocument = Shop & Document;

@Schema({ timestamps: true })
export class Shop {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  ownerId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: false, trim: true })
  description?: string;

  @Prop({ required: true, trim: true })
  address: string;

  @Prop({ required: true, trim: true })
  city: string;

  @Prop({ required: false, trim: true })
  state?: string;

  @Prop({ required: false, trim: true, default: 'India' })
  country?: string;

  @Prop({ required: false, trim: true })
  postalCode?: string;

  @Prop({ required: false, trim: true })
  phone?: string;

  @Prop({ required: false, trim: true, default: 'Asia/Kolkata' })
  timezone: string;

  @Prop({ default: true })
  isActive: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ShopSchema = SchemaFactory.createForClass(Shop);

// Index on ownerId and compound index
ShopSchema.index({ ownerId: 1, isActive: 1 });

ShopSchema.set('toJSON', {
  transform: (_, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : undefined;
    if (ret.ownerId) {
      ret.ownerId = ret.ownerId.toString();
    }
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
