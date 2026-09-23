import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentStatus } from './enums/appointment-status.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('Appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post('appointments')
  @Roles(Role.CUSTOMER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Book an appointment (Any Barber or Specific Barber)',
    description:
      'Creates a confirmed appointment with server-assigned eligible barber (if Any Barber), double-booking protection, booking token, and automated 24h reminder.',
  })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Unique key for safe retries and double-tap prevention',
  })
  @ApiResponse({ status: 201, description: 'Appointment successfully booked' })
  @ApiResponse({ status: 400, description: 'Validation failed or invalid date' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (customer role required)' })
  @ApiResponse({ status: 409, description: 'Conflict: Slot was just taken' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAppointmentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.appointmentsService.createAppointment(user.id, dto, idempotencyKey);
  }

  @Get('appointments/:id')
  @ApiOperation({ summary: 'Get appointment details by ID' })
  @ApiResponse({ status: 200, description: 'Appointment details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (not appointment owner)' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.appointmentsService.getById(id, user);
  }

  @Get('customers/me/appointments')
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'List authenticated customer appointments' })
  @ApiResponse({ status: 200, description: 'List of appointments' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (customer role required)' })
  async getMyAppointments(@CurrentUser() user: AuthenticatedUser) {
    return this.appointmentsService.getCustomerAppointments(user.id);
  }

  @Patch('appointments/:id/cancel')
  @ApiOperation({ summary: 'Cancel an appointment (Customer or Shop Owner)' })
  @ApiResponse({ status: 200, description: 'Appointment successfully cancelled' })
  @ApiResponse({ status: 400, description: 'Cannot cancel completed appointment' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.appointmentsService.cancelAppointment(id, user, reason);
  }

  @Get('owner/appointments')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'List all appointments for the studio (Shop Owner view)' })
  @ApiResponse({ status: 200, description: 'List of shop appointments' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (owner role required)' })
  async getOwnerAppointments(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('date') date?: string,
    @Query('barberId') barberId?: string,
  ) {
    return this.appointmentsService.getShopAppointments(user.id, { status, date, barberId });
  }

  @Patch('owner/appointments/:id/status')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Update appointment status (CONFIRMED, COMPLETED, CANCELLED)' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('status') status: AppointmentStatus,
  ) {
    return this.appointmentsService.updateAppointmentStatus(id, user.id, status);
  }
}
