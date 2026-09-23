import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateServiceDto {
  @ApiProperty({ example: 'Haircut', description: 'Service title' })
  @IsString()
  @IsNotEmpty({ message: 'Service name should not be empty' })
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Classic men haircut including wash and styling', description: 'Service description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 250, description: 'Price in INR (non-negative number)' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0, { message: 'price must not be less than 0' })
  price: number;

  @ApiProperty({ example: 30, description: 'Service duration in minutes (positive integer)' })
  @Type(() => Number)
  @IsInt({ message: 'Duration must be an integer' })
  @Min(1, { message: 'durationMinutes must be a positive integer' })
  durationMinutes: number;

  @ApiPropertyOptional({ example: 10, description: 'Buffer time in minutes after service' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'bufferTime must be an integer' })
  @Min(0, { message: 'bufferTime must not be less than 0' })
  bufferTime?: number;
}
