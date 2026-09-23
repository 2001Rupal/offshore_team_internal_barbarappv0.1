import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CreateScheduleExceptionDto } from './dto/create-schedule-exception.dto';
import { UpdateScheduleExceptionDto } from './dto/update-schedule-exception.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('Schedules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER)
@Controller()
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get('barbers/:barberId/schedule')
  @ApiOperation({ summary: 'Get complete weekly schedule for a barber' })
  @ApiResponse({ status: 200, description: 'Weekly schedule for 7 days' })
  @ApiResponse({ status: 403, description: 'Forbidden: not barber shop owner' })
  @ApiResponse({ status: 404, description: 'Barber not found' })
  async getWeeklySchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('barberId') barberId: string,
  ) {
    return this.schedulesService.getWeeklySchedule(barberId, user.id);
  }

  @Put('barbers/:barberId/schedule')
  @ApiOperation({ summary: 'Update weekly schedule for a barber' })
  @ApiResponse({ status: 200, description: 'Weekly schedule updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed for timing or breaks' })
  @ApiResponse({ status: 403, description: 'Forbidden: not barber shop owner' })
  @ApiResponse({ status: 404, description: 'Barber not found' })
  async updateWeeklySchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('barberId') barberId: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.schedulesService.updateWeeklySchedule(barberId, user.id, dto);
  }

  @Get('barbers/:barberId/schedule/exceptions')
  @ApiOperation({ summary: 'Get schedule exceptions for a barber' })
  @ApiResponse({ status: 200, description: 'List of schedule exceptions' })
  @ApiResponse({ status: 403, description: 'Forbidden: not barber shop owner' })
  @ApiResponse({ status: 404, description: 'Barber not found' })
  async getExceptions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('barberId') barberId: string,
  ) {
    return this.schedulesService.getExceptions(barberId, user.id);
  }

  @Post('barbers/:barberId/schedule/exceptions')
  @ApiOperation({ summary: 'Create a date-specific schedule exception for a barber' })
  @ApiResponse({ status: 201, description: 'Schedule exception created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden: not barber shop owner' })
  @ApiResponse({ status: 404, description: 'Barber not found' })
  @ApiResponse({ status: 409, description: 'Exception already exists for this date' })
  async createException(
    @CurrentUser() user: AuthenticatedUser,
    @Param('barberId') barberId: string,
    @Body() dto: CreateScheduleExceptionDto,
  ) {
    return this.schedulesService.createException(barberId, user.id, dto);
  }

  @Patch('schedule-exceptions/:id')
  @ApiOperation({ summary: 'Update a schedule exception' })
  @ApiResponse({ status: 200, description: 'Schedule exception updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden: not barber shop owner' })
  @ApiResponse({ status: 404, description: 'Schedule exception not found' })
  @ApiResponse({ status: 409, description: 'Exception already exists for new date' })
  async updateException(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateScheduleExceptionDto,
  ) {
    return this.schedulesService.updateException(id, user.id, dto);
  }

  @Delete('schedule-exceptions/:id')
  @ApiOperation({ summary: 'Delete a schedule exception' })
  @ApiResponse({ status: 200, description: 'Schedule exception deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden: not barber shop owner' })
  @ApiResponse({ status: 404, description: 'Schedule exception not found' })
  async deleteException(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.schedulesService.deleteException(id, user.id);
  }
}
