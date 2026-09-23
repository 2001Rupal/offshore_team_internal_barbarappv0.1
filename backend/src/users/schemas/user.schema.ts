import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Role } from '../../common/enums/role.enum';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true, default: 'Customer' })
  name: string;

  @Prop({ required: false, unique: true, sparse: true, lowercase: true, trim: true, index: true })
  email?: string;

  @Prop({ required: false, trim: true, sparse: true, index: true })
  phone?: string;

  @Prop({ required: false })
  passwordHash?: string;

  @Prop({ required: false, min: 5, max: 120 })
  age?: number;

  @Prop({ required: false, trim: true })
  gender?: string;

  @Prop({ required: true, enum: Role, default: Role.OWNER })
  role: Role;

  @Prop({ default: true })
  isActive: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Ensure passwordHash is not returned in JSON by default
UserSchema.set('toJSON', {
  transform: (_, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : undefined;
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  },
});
