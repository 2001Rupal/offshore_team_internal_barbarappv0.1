import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Shop } from '../../shops/schemas/shop.schema';

export type ServiceDocument = ServiceEntity & Document;

@Schema({ timestamps: true, collection: 'services' })
export class ServiceEntity {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Shop.name, required: true, index: true })
  shopId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: false, trim: true })
  description?: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 1 })
  durationMinutes: number;

  @Prop({ default: true })
  isActive: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ServiceSchema = SchemaFactory.createForClass(ServiceEntity);

ServiceSchema.index({ shopId: 1, isActive: 1 });

ServiceSchema.set('toJSON', {
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
