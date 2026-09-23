import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { GetAvailabilityDto } from '../availability/dto/get-availability.dto';

@ApiTags('Public Shop & Booking')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('shop')
  @ApiOperation({ summary: 'Get single configured active shop details' })
  @ApiResponse({ status: 200, description: 'Shop profile retrieved successfully' })
  @ApiResponse({ status: 404, description: 'No active shop configured' })
  async getShop() {
    return this.publicService.getShop();
  }

  @Get('shop/barbers')
  @ApiOperation({ summary: 'Get active barbers for the shop' })
  @ApiResponse({ status: 200, description: 'Active barbers retrieved' })
  async getShopBarbers() {
    return this.publicService.getShopBarbers();
  }

  @Get('shop/services')
  @ApiOperation({ summary: 'Get active services for the shop' })
  @ApiResponse({ status: 200, description: 'Active services retrieved' })
  async getShopServices() {
    return this.publicService.getShopServices();
  }

  @Get('barbers/:barberId/services')
  @ApiOperation({ summary: 'Get active services assigned to a barber' })
  @ApiResponse({ status: 200, description: 'Barber services retrieved' })
  @ApiResponse({ status: 404, description: 'Barber not found or inactive' })
  async getBarberServices(@Param('barberId') barberId: string) {
    return this.publicService.getBarberServices(barberId);
  }

  @Get('barbers/:barberId/availability')
  @ApiOperation({ summary: 'Check live availability slots for a barber, date, and service' })
  @ApiResponse({ status: 200, description: 'Available slots calculated' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'Barber, shop, or service not found' })
  async getAvailability(
    @Param('barberId') barberId: string,
    @Query() query: GetAvailabilityDto,
  ) {
    return this.publicService.getAvailability(barberId, query.date, query.serviceId);
  }

  @Get('services/:serviceId/availability')
  @ApiOperation({ summary: 'Check live availability slots across all eligible barbers for a service and date (Any Barber)' })
  @ApiResponse({ status: 200, description: 'Available slots calculated (union of eligible barbers)' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'Shop or service not found' })
  async getAnyBarberAvailability(
    @Param('serviceId') serviceId: string,
    @Query('date') date: string,
  ) {
    return this.publicService.getAnyBarberAvailability(date, serviceId);
  }
}

