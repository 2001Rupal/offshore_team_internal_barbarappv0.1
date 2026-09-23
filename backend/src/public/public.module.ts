import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { ShopsModule } from '../shops/shops.module';
import { AvailabilityModule } from '../availability/availability.module';
import { Barber, BarberSchema } from '../barbers/schemas/barber.schema';
import { ServiceEntity, ServiceSchema } from '../services/schemas/service.schema';
import { BarberService, BarberServiceSchema } from '../barber-services/schemas/barber-service.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Barber.name, schema: BarberSchema },
      { name: ServiceEntity.name, schema: ServiceSchema },
      { name: BarberService.name, schema: BarberServiceSchema },
    ]),
    ShopsModule,
    AvailabilityModule,
  ],
  controllers: [PublicController],
  providers: [PublicService],
  exports: [PublicService],
})
export class PublicModule {}
