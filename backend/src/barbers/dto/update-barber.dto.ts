import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateBarberDto {
  @ApiPropertyOptional({ example: 'Rahul Sharma', description: 'Updated name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: '9999999999', description: 'Updated phone' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'rahul.new@example.com', description: 'Updated email' })
  @IsOptional()
  @IsEmail({}, { message: 'Must be a valid email address' })
  email?: string;

  @ApiPropertyOptional({ example: 6, description: 'Updated experience years' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Experience must be an integer' })
  @Min(0, { message: 'Experience years must not be less than 0' })
  experienceYears?: number;

  @ApiPropertyOptional({ example: 'Updated bio', description: 'Updated bio' })
  @IsOptional()
  @IsString()
  bio?: string;
}
