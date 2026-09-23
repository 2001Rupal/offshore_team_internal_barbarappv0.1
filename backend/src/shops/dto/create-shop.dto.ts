import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateShopDto {
  @ApiProperty({ example: "Local's Cut", description: 'Name of the barber shop' })
  @IsString()
  @IsNotEmpty({ message: 'Shop name should not be empty' })
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: "Modern men's barber shop", description: 'Shop description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Main Road', description: 'Street address' })
  @IsString()
  @IsNotEmpty({ message: 'Address should not be empty' })
  address: string;

  @ApiProperty({ example: 'Bhopal', description: 'City' })
  @IsString()
  @IsNotEmpty({ message: 'City should not be empty' })
  city: string;

  @ApiPropertyOptional({ example: 'Madhya Pradesh', description: 'State' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: 'India', description: 'Country' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: '462001', description: 'Postal or PIN code' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: '9999999999', description: 'Shop contact phone' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Asia/Kolkata', description: 'Shop timezone (IANA timezone name)' })
  @IsOptional()
  @IsString()
  timezone?: string;
}
