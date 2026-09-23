import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ShopsModule } from './shops/shops.module';
import { BarbersModule } from './barbers/barbers.module';
import { ServicesModule } from './services/services.module';
import { SchedulesModule } from './schedules/schedules.module';
import { BarberServicesModule } from './barber-services/barber-services.module';
import { AvailabilityModule } from './availability/availability.module';
import { CustomersModule } from './customers/customers.module';
import { PublicModule } from './public/public.module';
import { AppointmentsModule } from './appointments/appointments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri:
          configService.get<string>('MONGODB_URI') ||
          'mongodb://127.0.0.1:27017/barber_booking',
      }),
    }),
    UsersModule,
    AuthModule,
    ShopsModule,
    BarbersModule,
    ServicesModule,
    SchedulesModule,
    BarberServicesModule,
    AvailabilityModule,
    CustomersModule,
    PublicModule,
    AppointmentsModule,
  ],
})
export class AppModule {}
