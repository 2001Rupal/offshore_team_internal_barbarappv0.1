import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DayScheduleDto } from './day-schedule.dto';

export class UpdateScheduleDto {
  @ApiProperty({ type: [DayScheduleDto], description: 'Weekly schedule entries' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayScheduleDto)
  weeklySchedule: DayScheduleDto[];
}
