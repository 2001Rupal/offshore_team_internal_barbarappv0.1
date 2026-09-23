import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateBarberServicesDto } from './dto/update-barber-services.dto';
import { BarberServicesService } from './barber-services.service';

@ApiTags('Barber Services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER)
@Controller()
export class BarberServicesController {
  constructor(private readonly barberServicesService: BarberServicesService) {}
  @Get('barbers/:barberId/services')
  @ApiOperation({ summary: 'Get the services assigned to a barber' })
  @ApiResponse({ status: 200, description: 'Assigned service catalog entries' })
  @ApiResponse({ status: 403, description: 'Forbidden: barber belongs to another owner' })
  getBarberServices(@CurrentUser() user: AuthenticatedUser, @Param('barberId') barberId: string) { return this.barberServicesService.getBarberServices(barberId, user.id); }
  @Put('barbers/:barberId/services')
  @ApiOperation({ summary: 'Replace a barber’s complete service assignment set' })
  @ApiResponse({ status: 200, description: 'Assignments replaced successfully' })
  @ApiResponse({ status: 400, description: 'Invalid, duplicate, or inactive service assignment' })
  @ApiResponse({ status: 403, description: 'Forbidden: cross-owner or cross-shop assignment' })
  updateBarberServices(@CurrentUser() user: AuthenticatedUser, @Param('barberId') barberId: string, @Body() dto: UpdateBarberServicesDto) { return this.barberServicesService.updateBarberServices(barberId, user.id, dto); }
}
