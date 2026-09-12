import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateServiceStatusDto {
  @ApiProperty({ example: false, description: 'Active status of the service (false to deactivate, true to reactivate)' })
  @IsBoolean()
  isActive: boolean;
}
