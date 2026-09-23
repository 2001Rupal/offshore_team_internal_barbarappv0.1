import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';
import { GetAvailabilityDto } from './dto/get-availability.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('Availability')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER)
@Controller('barbers')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get(':barberId/availability')
  @ApiOperation({
    summary: 'Calculate available booking slots for a barber on a given date and service',
    description:
      'Calculates valid slots considering weekly schedule, breaks, date exceptions, service duration/buffer, appointment conflicts, and past-slot filtering in shop timezone.',
  })
  @ApiResponse({
    status: 200,
    description: 'Available slots calculated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed (invalid date, inactive barber/shop/service)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (caller does not own the barber shop or service belongs to another shop)',
  })
  @ApiResponse({
    status: 404,
    description: 'Barber, shop, or service not found or barber not assigned to service',
  })
  async getAvailability(
    @CurrentUser() user: AuthenticatedUser,
    @Param('barberId') barberId: string,
    @Query() query: GetAvailabilityDto,
  ) {
    return this.availabilityService.getAvailability(
      barberId,
      query.date,
      query.serviceId,
      user.id,
    );
  }
}
