import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Barber, BarberSchema } from '../barbers/schemas/barber.schema';
import { ServiceEntity, ServiceSchema } from '../services/schemas/service.schema';
import { ShopsModule } from '../shops/shops.module';
import { BarberServicesController } from './barber-services.controller';
import { BarberServicesService } from './barber-services.service';
import { BarberService, BarberServiceSchema } from './schemas/barber-service.schema';
@Module({ imports: [MongooseModule.forFeature([{ name: BarberService.name, schema: BarberServiceSchema }, { name: Barber.name, schema: BarberSchema }, { name: ServiceEntity.name, schema: ServiceSchema }]), ShopsModule], controllers: [BarberServicesController], providers: [BarberServicesService], exports: [BarberServicesService] })
export class BarberServicesModule {}
