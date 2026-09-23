import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  BarberSchedule,
  BarberScheduleSchema,
} from './schemas/barber-schedule.schema';
import {
  ScheduleException,
  ScheduleExceptionSchema,
} from './schemas/schedule-exception.schema';
import { Barber, BarberSchema } from '../barbers/schemas/barber.schema';
import { ShopsModule } from '../shops/shops.module';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BarberSchedule.name, schema: BarberScheduleSchema },
      { name: ScheduleException.name, schema: ScheduleExceptionSchema },
      { name: Barber.name, schema: BarberSchema },
    ]),
    ShopsModule,
  ],
  controllers: [SchedulesController],
  providers: [SchedulesService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
