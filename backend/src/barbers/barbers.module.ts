import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Barber, BarberSchema } from './schemas/barber.schema';
import { BarbersService } from './barbers.service';
import { BarbersController } from './barbers.controller';
import { ShopsModule } from '../shops/shops.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Barber.name, schema: BarberSchema }]),
    ShopsModule,
  ],
  providers: [BarbersService],
  controllers: [BarbersController],
  exports: [BarbersService, MongooseModule],
})
export class BarbersModule {}
