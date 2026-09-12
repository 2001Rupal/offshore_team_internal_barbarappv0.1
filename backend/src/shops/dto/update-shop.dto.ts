import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateShopDto {
  @ApiPropertyOptional({ example: 'Royal Cuts Deluxe', description: 'Updated name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description', description: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'New Address Road', description: 'Updated address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Bhopal', description: 'Updated city' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Madhya Pradesh', description: 'Updated state' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: 'India', description: 'Updated country' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: '462002', description: 'Updated postal code' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: '8888888888', description: 'Updated phone' })
  @IsOptional()
  @IsString()
  phone?: string;
}
