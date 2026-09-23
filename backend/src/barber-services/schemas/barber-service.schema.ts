import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Barber } from '../../barbers/schemas/barber.schema';
import { ServiceEntity } from '../../services/schemas/service.schema';

export type BarberServiceDocument = BarberService & Document;

@Schema({ timestamps: true, collection: 'barber_services' })
export class BarberService {
  _id: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: Barber.name, required: true }) barberId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: ServiceEntity.name, required: true }) serviceId: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export const BarberServiceSchema = SchemaFactory.createForClass(BarberService);
BarberServiceSchema.index({ barberId: 1, serviceId: 1 }, { unique: true });

BarberServiceSchema.set('toJSON', {
  transform: (_, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : undefined;
    if (ret.barberId) {
      ret.barberId = ret.barberId.toString();
    }
    if (ret.serviceId) {
      ret.serviceId = ret.serviceId.toString();
    }
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
