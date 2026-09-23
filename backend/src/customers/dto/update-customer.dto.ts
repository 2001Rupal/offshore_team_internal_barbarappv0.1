import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: 'Rahul Sharma', description: 'Updated customer full name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: '9876543210', description: 'Updated customer phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 25, description: 'Customer age' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Age must be an integer' })
  @Min(5, { message: 'Age must be at least 5' })
  @Max(120, { message: 'Age must be at most 120' })
  age?: number;

  @ApiPropertyOptional({ example: 'Male', description: 'Customer gender' })
  @IsOptional()
  @IsString()
  gender?: string;
}
