import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import {
  APPOINTMENT_CONFLICT_REPOSITORY,
  DefaultAppointmentConflictRepository,
} from './repositories/appointment-conflict.repository';
import { Barber, BarberSchema } from '../barbers/schemas/barber.schema';
import { Shop, ShopSchema } from '../shops/schemas/shop.schema';
import { ServiceEntity, ServiceSchema } from '../services/schemas/service.schema';
import { BarberService, BarberServiceSchema } from '../barber-services/schemas/barber-service.schema';
import { BarberSchedule, BarberScheduleSchema } from '../schedules/schemas/barber-schedule.schema';
import { ScheduleException, ScheduleExceptionSchema } from '../schedules/schemas/schedule-exception.schema';
import { Appointment, AppointmentSchema } from '../appointments/schemas/appointment.schema';
import { ShopsModule } from '../shops/shops.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Barber.name, schema: BarberSchema },
      { name: Shop.name, schema: ShopSchema },
      { name: ServiceEntity.name, schema: ServiceSchema },
      { name: BarberService.name, schema: BarberServiceSchema },
      { name: BarberSchedule.name, schema: BarberScheduleSchema },
      { name: ScheduleException.name, schema: ScheduleExceptionSchema },
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
    ShopsModule,
  ],
  controllers: [AvailabilityController],
  providers: [
    AvailabilityService,
    {
      provide: APPOINTMENT_CONFLICT_REPOSITORY,
      useClass: DefaultAppointmentConflictRepository,
    },
  ],
  exports: [AvailabilityService, APPOINTMENT_CONFLICT_REPOSITORY],
})
export class AvailabilityModule {}
