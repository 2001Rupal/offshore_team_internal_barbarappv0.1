import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateBarberStatusDto {
  @ApiProperty({ example: false, description: 'Active status of the barber (false to deactivate, true to reactivate)' })
  @IsBoolean()
  isActive: boolean;
}
