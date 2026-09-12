import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseBoolPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BarbersService } from './barbers.service';
import { CreateBarberDto } from './dto/create-barber.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';
import { UpdateBarberStatusDto } from './dto/update-barber-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('Barbers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class BarbersController {
  constructor(private readonly barbersService: BarbersService) {}

  @Post('shops/:shopId/barbers')
  @ApiOperation({ summary: 'Create a new barber in a shop' })
  @ApiResponse({ status: 201, description: 'Barber created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: not shop owner' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Body() dto: CreateBarberDto,
  ) {
    return this.barbersService.create(shopId, user.id, dto);
  }

  @Get('shops/:shopId/barbers')
  @ApiOperation({ summary: 'List all barbers in a shop' })
  @ApiQuery({ name: 'active', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiResponse({ status: 200, description: 'List of barbers' })
  @ApiResponse({ status: 403, description: 'Forbidden: not shop owner' })
  async listByShop(
    @CurrentUser() user: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Query('active') active?: string,
  ) {
    const activeFilter = active !== undefined ? active === 'true' : undefined;
    return this.barbersService.findByShop(shopId, user.id, activeFilter);
  }

  @Get('barbers/:barberId')
  @ApiOperation({ summary: 'Get barber details by ID' })
  @ApiResponse({ status: 200, description: 'Barber details' })
  @ApiResponse({ status: 403, description: 'Forbidden: not shop owner' })
  @ApiResponse({ status: 404, description: 'Barber not found' })
  async getBarber(
    @CurrentUser() user: AuthenticatedUser,
    @Param('barberId') barberId: string,
  ) {
    return this.barbersService.findById(barberId, user.id);
  }

  @Patch('barbers/:barberId')
  @ApiOperation({ summary: 'Update barber details' })
  @ApiResponse({ status: 200, description: 'Barber updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: not shop owner' })
  @ApiResponse({ status: 404, description: 'Barber not found' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('barberId') barberId: string,
    @Body() dto: UpdateBarberDto,
  ) {
    return this.barbersService.update(barberId, user.id, dto);
  }

  @Patch('barbers/:barberId/status')
  @ApiOperation({ summary: 'Activate or deactivate a barber' })
  @ApiResponse({ status: 200, description: 'Barber status updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: not shop owner' })
  @ApiResponse({ status: 404, description: 'Barber not found' })
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('barberId') barberId: string,
    @Body() dto: UpdateBarberStatusDto,
  ) {
    return this.barbersService.updateStatus(barberId, user.id, dto.isActive);
  }
}
