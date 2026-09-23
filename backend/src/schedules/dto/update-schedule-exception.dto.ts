import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { ScheduleExceptionType } from '../enums/schedule-exception-type.enum';

export class UpdateScheduleExceptionDto {
  @ApiPropertyOptional({ example: '2026-09-21', description: 'Exception date in YYYY-MM-DD format' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date?: string;

  @ApiPropertyOptional({ enum: ScheduleExceptionType, example: ScheduleExceptionType.CUSTOM_HOURS })
  @IsOptional()
  @IsEnum(ScheduleExceptionType)
  type?: ScheduleExceptionType;

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

  @ApiPropertyOptional({ example: 'Personal schedule' })
  @IsOptional()
  @IsString()
  reason?: string;
}
