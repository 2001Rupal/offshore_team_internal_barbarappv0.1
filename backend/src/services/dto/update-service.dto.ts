import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateServiceDto {
  @ApiPropertyOptional({ example: 'Premium Haircut', description: 'Updated service title' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description', description: 'Updated service description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 300, description: 'Updated price (non-negative)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0, { message: 'price must not be less than 0' })
  price?: number;

  @ApiPropertyOptional({ example: 45, description: 'Updated duration in minutes (positive integer)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Duration must be an integer' })
  @Min(1, { message: 'durationMinutes must be a positive integer' })
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 10, description: 'Updated buffer time in minutes' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'bufferTime must be an integer' })
  @Min(0, { message: 'bufferTime must not be less than 0' })
  bufferTime?: number;
}
