import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Length, Matches, Max, Min, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class VerifyOtpDto {
  @ApiPropertyOptional({ example: '9876543210', description: 'Customer mobile phone number' })
  @ValidateIf((o) => !o.email || o.phone)
  @IsString()
  @Matches(/^(\+?\d{1,4}[- ]?)?\d{7,14}$/, { message: 'Must be a valid mobile phone number' })
  phone?: string;

  @ApiPropertyOptional({ example: 'customer@example.com', description: 'Customer email address' })
  @ValidateIf((o) => !o.phone || o.email)
  @IsEmail({}, { message: 'Must be a valid email address' })
  email?: string;

  @ApiProperty({ example: '123456', description: '6-digit verification code' })
  @IsString()
  @IsNotEmpty({ message: 'OTP code is required' })
  @Length(4, 6, { message: 'OTP code must be between 4 and 6 characters' })
  code: string;

  @ApiPropertyOptional({ example: 'Rahul Sharma', description: 'Optional customer full name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 25, description: 'Optional customer age' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Age must be an integer' })
  @Min(5, { message: 'Age must be at least 5' })
  @Max(120, { message: 'Age must be at most 120' })
  age?: number;

  @ApiPropertyOptional({ example: 'Male', description: 'Optional customer gender' })
  @IsOptional()
  @IsString()
  gender?: string;
}
