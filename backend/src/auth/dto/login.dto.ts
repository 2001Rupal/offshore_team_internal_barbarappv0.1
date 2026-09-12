import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'rahul@example.com', description: 'Registered email address' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty({ message: 'Email should not be empty' })
  email: string;

  @ApiProperty({ example: 'StrongPassword123', description: 'Account password' })
  @IsString()
  @IsNotEmpty({ message: 'Password should not be empty' })
  password: string;
}
