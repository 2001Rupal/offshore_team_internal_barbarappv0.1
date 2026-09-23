import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Appointment, AppointmentSchema } from './schemas/appointment.schema';
import {
  AppointmentReminder,
  AppointmentReminderSchema,
} from './reminders/schemas/appointment-reminder.schema';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { RemindersService } from './reminders/reminders.service';
import { MockNotificationProvider } from './reminders/providers/mock-notification.provider';
import { NOTIFICATION_PROVIDER } from './reminders/providers/notification-provider.interface';
import { UsersModule } from '../users/users.module';
import { ShopsModule } from '../shops/shops.module';
import { AvailabilityModule } from '../availability/availability.module';
import { Barber, BarberSchema } from '../barbers/schemas/barber.schema';
import { ServiceEntity, ServiceSchema } from '../services/schemas/service.schema';
import { BarberService, BarberServiceSchema } from '../barber-services/schemas/barber-service.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
      { name: AppointmentReminder.name, schema: AppointmentReminderSchema },
      { name: Barber.name, schema: BarberSchema },
      { name: ServiceEntity.name, schema: ServiceSchema },
      { name: BarberService.name, schema: BarberServiceSchema },
    ]),
    UsersModule,
    ShopsModule,
    AvailabilityModule,
  ],
  controllers: [AppointmentsController],
  providers: [
    AppointmentsService,
    RemindersService,
    {
      provide: NOTIFICATION_PROVIDER,
      useClass: MockNotificationProvider,
    },
    MockNotificationProvider,
  ],
  exports: [
    AppointmentsService,
    RemindersService,
    NOTIFICATION_PROVIDER,
    MongooseModule,
  ],
})
export class AppointmentsModule {}
