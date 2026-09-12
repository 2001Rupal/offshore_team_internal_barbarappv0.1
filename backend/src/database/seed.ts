import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { ShopsService } from '../shops/shops.service';
import { BarbersService } from '../barbers/barbers.service';
import { ServicesService } from '../services/services.service';
import * as argon2 from 'argon2';
import { Role } from '../common/enums/role.enum';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Seed');
  const app = await NestFactory.createApplicationContext(AppModule);

  const usersService = app.get(UsersService);
  const shopsService = app.get(ShopsService);
  const barbersService = app.get(BarbersService);
  const servicesService = app.get(ServicesService);

  logger.log('Starting seed process...');

  const email = 'owner@example.com';
  let user = await usersService.findByEmail(email);

  if (!user) {
    const passwordHash = await argon2.hash('change-me');
    user = await usersService.create({
      name: 'Demo Owner',
      email,
      passwordHash,
      role: Role.OWNER,
    });
    logger.log(`Created demo owner: ${email}`);
  } else {
    logger.log(`Demo owner already exists: ${email}`);
  }

  const userId = user._id.toString();
  let shop = await shopsService.findMyOrNull(userId);

  if (!shop) {
    shop = await shopsService.create(userId, {
      name: 'Royal Cuts',
      description: "Premier men's barber & grooming studio",
      address: 'Main Road',
      city: 'Bhopal',
      state: 'Madhya Pradesh',
      country: 'India',
      postalCode: '462001',
      phone: '9999999999',
    });
    logger.log(`Created shop: ${shop.name}`);

    const shopId = shop._id.toString();

    // Seed Barbers
    await barbersService.create(shopId, userId, {
      name: 'Rahul',
      experienceYears: 5,
      phone: '9876543210',
      bio: 'Specialist in modern fades & styling',
    });
    await barbersService.create(shopId, userId, {
      name: 'Amit',
      experienceYears: 3,
      phone: '9876543211',
      bio: 'Classic scissor cuts & beard sculpting',
    });
    await barbersService.create(shopId, userId, {
      name: 'Vikas',
      experienceYears: 2,
      phone: '9876543212',
      bio: 'Hot towel shave and modern styling',
    });
    logger.log('Seeded barbers: Rahul, Amit, Vikas');

    // Seed Services
    await servicesService.create(shopId, userId, {
      name: 'Haircut',
      description: 'Classic haircut with wash and styling',
      price: 250,
      durationMinutes: 30,
    });
    await servicesService.create(shopId, userId, {
      name: 'Beard',
      description: 'Precision beard trim & hot towel line up',
      price: 150,
      durationMinutes: 20,
    });
    await servicesService.create(shopId, userId, {
      name: 'Fade',
      description: 'Skin fade with precision detailing',
      price: 300,
      durationMinutes: 40,
    });
    await servicesService.create(shopId, userId, {
      name: 'Haircut+Beard',
      description: 'Complete grooming combo experience',
      price: 350,
      durationMinutes: 50,
    });
    logger.log('Seeded services: Haircut, Beard, Fade, Haircut+Beard');
  } else {
    logger.log(`Shop already exists: ${shop.name}`);
  }

  logger.log('Seed completed successfully!');
  await app.close();
}

bootstrap().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
