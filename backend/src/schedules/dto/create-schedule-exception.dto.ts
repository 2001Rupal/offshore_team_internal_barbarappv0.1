import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { ScheduleExceptionType } from '../enums/schedule-exception-type.enum';

export class CreateScheduleExceptionDto {
  @ApiProperty({ example: '2026-09-21', description: 'Exception date in YYYY-MM-DD format' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date: string;

  @ApiProperty({ enum: ScheduleExceptionType, example: ScheduleExceptionType.OFF })
  @IsEnum(ScheduleExceptionType)
  @IsNotEmpty()
  type: ScheduleExceptionType;

  @ApiPropertyOptional({ example: '14:00', description: 'Start time if CUSTOM_HOURS' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be in HH:mm 24-hour format' })
  startTime?: string;

  @ApiPropertyOptional({ example: '20:00', description: 'End time if CUSTOM_HOURS' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'endTime must be in HH:mm 24-hour format' })
  endTime?: string;

  @ApiPropertyOptional({ example: 'Festival holiday' })
  @IsOptional()
  @IsString()
  reason?: string;
}
