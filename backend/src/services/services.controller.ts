import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { UpdateServiceStatusDto } from './dto/update-service-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('Services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post('shops/:shopId/services')
  @ApiOperation({ summary: 'Create a new service in a shop' })
  @ApiResponse({ status: 201, description: 'Service created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: not shop owner' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Body() dto: CreateServiceDto,
  ) {
    return this.servicesService.create(shopId, user.id, dto);
  }

  @Get('shops/:shopId/services')
  @ApiOperation({ summary: 'List all services in a shop' })
  @ApiQuery({ name: 'active', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiResponse({ status: 200, description: 'List of services' })
  @ApiResponse({ status: 403, description: 'Forbidden: not shop owner' })
  async listByShop(
    @CurrentUser() user: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Query('active') active?: string,
  ) {
    const activeFilter = active !== undefined ? active === 'true' : undefined;
    return this.servicesService.findByShop(shopId, user.id, activeFilter);
  }

  @Get('services/:serviceId')
  @ApiOperation({ summary: 'Get service details by ID' })
  @ApiResponse({ status: 200, description: 'Service details' })
  @ApiResponse({ status: 403, description: 'Forbidden: not shop owner' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async getService(
    @CurrentUser() user: AuthenticatedUser,
    @Param('serviceId') serviceId: string,
  ) {
    return this.servicesService.findById(serviceId, user.id);
  }

  @Patch('services/:serviceId')
  @ApiOperation({ summary: 'Update service details' })
  @ApiResponse({ status: 200, description: 'Service updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: not shop owner' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('serviceId') serviceId: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.update(serviceId, user.id, dto);
  }

  @Patch('services/:serviceId/status')
  @ApiOperation({ summary: 'Activate or deactivate a service' })
  @ApiResponse({ status: 200, description: 'Service status updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: not shop owner' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('serviceId') serviceId: string,
    @Body() dto: UpdateServiceStatusDto,
  ) {
    return this.servicesService.updateStatus(serviceId, user.id, dto.isActive);
  }
}
