import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class GetAvailabilityDto {
  @ApiProperty({
    example: '2026-09-20',
    description: 'Target booking date in YYYY-MM-DD format',
  })
  @IsString()
  @IsNotEmpty({ message: 'date should not be empty' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date: string;

  @ApiProperty({
    example: '64f1a2b3c4d5e6f7a8b9c0d1',
    description: 'Catalog service ID to check availability for',
  })
  @IsString()
  @IsNotEmpty({ message: 'serviceId should not be empty' })
  serviceId: string;
}
