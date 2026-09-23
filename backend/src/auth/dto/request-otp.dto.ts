import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, ValidateIf } from 'class-validator';

export class RequestOtpDto {
  @ApiPropertyOptional({ example: '9876543210', description: 'Customer mobile phone number' })
  @ValidateIf((o) => !o.email || o.phone)
  @IsString()
  @Matches(/^(\+?\d{1,4}[- ]?)?\d{7,14}$/, { message: 'Must be a valid mobile phone number' })
  phone?: string;

  @ApiPropertyOptional({ example: 'customer@example.com', description: 'Customer email address' })
  @ValidateIf((o) => !o.phone || o.email)
  @IsEmail({}, { message: 'Must be a valid email address' })
  email?: string;

  @ApiPropertyOptional({ example: 'Rahul Sharma', description: 'Optional customer name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 25, description: 'Optional customer age' })
  @IsOptional()
  age?: number;

  @ApiPropertyOptional({ example: 'Male', description: 'Optional customer gender' })
  @IsOptional()
  @IsString()
  gender?: string;
}
