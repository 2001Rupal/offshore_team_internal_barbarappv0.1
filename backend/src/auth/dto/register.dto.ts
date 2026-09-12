import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Rahul Sharma', description: 'Full name of the shop owner' })
  @IsString()
  @IsNotEmpty({ message: 'Name should not be empty' })
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'rahul@example.com', description: 'Unique email address' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty({ message: 'Email should not be empty' })
  email: string;

  @ApiProperty({ example: 'StrongPassword123', description: 'Password (min 8 characters)' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiPropertyOptional({ example: '+919999999999', description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  phone?: string;
}
