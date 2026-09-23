import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class FirebaseVerifyDto {
  @ApiProperty({
    description: 'Firebase ID Token obtained after successful phone authentication',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...',
  })
  @IsString()
  @IsNotEmpty({ message: 'Firebase ID token is required' })
  idToken: string;

  @ApiPropertyOptional({
    description: 'Customer full name (optional)',
    example: 'Rahul Sharma',
  })
  @IsOptional()
  @IsString()
  name?: string;
}
