import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ServiceEntity, ServiceSchema } from './schemas/service.schema';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { ShopsModule } from '../shops/shops.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ServiceEntity.name, schema: ServiceSchema }]),
    ShopsModule,
  ],
  providers: [ServicesService],
  controllers: [ServicesController],
  exports: [ServicesService, MongooseModule],
})
export class ServicesModule {}
