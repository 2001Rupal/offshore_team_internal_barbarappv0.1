import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBarberDto {
  @ApiProperty({ example: 'Rahul', description: 'Name of the barber' })
  @IsString()
  @IsNotEmpty({ message: 'Barber name should not be empty' })
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: '9999999999', description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'rahul@example.com', description: 'Email address' })
  @IsOptional()
  @IsEmail({}, { message: 'Must be a valid email address' })
  email?: string;

  @ApiPropertyOptional({ example: 5, description: 'Years of barbering experience (non-negative)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Experience must be an integer' })
  @Min(0, { message: 'Experience years must not be less than 0' })
  experienceYears?: number;

  @ApiPropertyOptional({ example: 'Specialist in modern fades and beard styling', description: 'Barber biography' })
  @IsOptional()
  @IsString()
  bio?: string;
}
