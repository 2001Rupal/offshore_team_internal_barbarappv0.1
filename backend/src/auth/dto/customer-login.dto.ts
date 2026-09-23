import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CustomerLoginDto {
  @ApiProperty({ example: 'rahul@example.com', description: 'Customer email' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty({ message: 'Email should not be empty' })
  email: string;

  @ApiProperty({ example: 'StrongPassword123', description: 'Customer password' })
  @IsString()
  @IsNotEmpty({ message: 'Password should not be empty' })
  password: string;
}
