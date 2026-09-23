import { ArrayUnique, IsArray, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBarberServicesDto {
  @ApiProperty({ type: [String], example: ['65a1c4d9b1e9d783cc001234'] })
  @IsArray()
  @ArrayUnique({ message: 'serviceIds must not contain duplicates' })
  @IsMongoId({ each: true, message: 'Each serviceId must be a valid MongoDB ObjectId' })
  serviceIds: string[];
}
