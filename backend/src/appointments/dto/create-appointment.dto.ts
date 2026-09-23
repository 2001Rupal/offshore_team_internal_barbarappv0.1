import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsISO8601 } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({
    example: '6aa57996d72d74a88be312c5',
    description: 'MongoDB ObjectId of the chosen service',
  })
  @IsString()
  @IsNotEmpty({ message: 'serviceId is required' })
  serviceId: string;

  @ApiPropertyOptional({
    example: '6aa57996d72d74a88be312ab',
    description: 'Optional specific barber ID. If omitted or null, Any Barber is assigned.',
  })
  @IsOptional()
  @IsString()
  barberId?: string;

  @ApiProperty({
    example: '2026-09-22T10:30:00.000Z',
    description: 'Start date and time of the appointment in ISO 8601 format',
  })
  @IsNotEmpty({ message: 'startAt is required' })
  @IsISO8601({}, { message: 'startAt must be a valid ISO 8601 date-time string' })
  startAt: string;
}
