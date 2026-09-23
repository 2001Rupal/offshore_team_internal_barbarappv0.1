import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { ShopsService } from '../shops/shops.service';
import { BarbersService } from '../barbers/barbers.service';
import { ServicesService } from '../services/services.service';
import { SchedulesService } from '../schedules/schedules.service';
import { BarberServicesService } from '../barber-services/barber-services.service';
import { DayOfWeek } from '../schedules/enums/day-of-week.enum';
import { ScheduleExceptionType } from '../schedules/enums/schedule-exception-type.enum';
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
  const barberServicesService = app.get(BarberServicesService);

  logger.log('Starting seed process...');

  const email = 'owner@example.com';
  let user = await usersService.findByEmail(email);

  if (!user) {
    const passwordHash = await argon2.hash('change-me');
    user = await usersService.create({
      name: 'Shop Owner',
      email,
      passwordHash,
      role: Role.OWNER,
    });
    logger.log(`Owner created: ${email}`);
  }

  // Seed Customer
  const customerEmail = 'customer@example.com';
  let demoCustomer = await usersService.findByEmail(customerEmail);
  if (!demoCustomer) {
    const customerPasswordHash = await argon2.hash('change-me');
    demoCustomer = await usersService.create({
      name: 'Valued Customer',
      email: customerEmail,
      passwordHash: customerPasswordHash,
      phone: '9876543210',
      role: Role.CUSTOMER,
    });
    logger.log(`Created customer: ${customerEmail}`);
  } else {
    logger.log(`Customer already exists: ${customerEmail}`);
  }

  const userId = user._id.toString();
  let shop = await shopsService.findMyOrNull(userId);

  if (!shop) {
    shop = await shopsService.create(userId, {
      name: "Local's Cut",
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
    const rahul = await barbersService.create(shopId, userId, {
      name: 'Rahul',
      experienceYears: 5,
      phone: '9876543210',
      bio: 'Specialist in modern fades & styling',
    });
    const amit = await barbersService.create(shopId, userId, {
      name: 'Amit',
      experienceYears: 3,
      phone: '9876543211',
      bio: 'Classic scissor cuts & beard sculpting',
    });
    const vikas = await barbersService.create(shopId, userId, {
      name: 'Vikas',
      experienceYears: 2,
      phone: '9876543212',
      bio: 'Hot towel shave and modern styling',
    });
    logger.log('Seeded barbers: Rahul, Amit, Vikas');

    // Seed Schedules
    const schedulesService = app.get(SchedulesService);
    const rahulId = rahul._id.toString();
    await schedulesService.updateWeeklySchedule(rahulId, userId, {
      weeklySchedule: [
        { dayOfWeek: DayOfWeek.MONDAY, isWorking: true, startTime: '10:00', endTime: '20:00', breaks: [{ startTime: '13:00', endTime: '14:00' }] },
        { dayOfWeek: DayOfWeek.TUESDAY, isWorking: true, startTime: '10:00', endTime: '20:00', breaks: [{ startTime: '13:00', endTime: '14:00' }] },
        { dayOfWeek: DayOfWeek.WEDNESDAY, isWorking: false },
        { dayOfWeek: DayOfWeek.THURSDAY, isWorking: true, startTime: '10:00', endTime: '20:00', breaks: [{ startTime: '13:00', endTime: '14:00' }] },
        { dayOfWeek: DayOfWeek.FRIDAY, isWorking: true, startTime: '10:00', endTime: '20:00', breaks: [{ startTime: '13:00', endTime: '14:00' }] },
        { dayOfWeek: DayOfWeek.SATURDAY, isWorking: true, startTime: '09:00', endTime: '21:00', breaks: [{ startTime: '13:00', endTime: '14:00' }] },
        { dayOfWeek: DayOfWeek.SUNDAY, isWorking: true, startTime: '11:00', endTime: '18:00', breaks: [{ startTime: '14:00', endTime: '15:00' }] },
      ],
    });

    await schedulesService.createException(rahulId, userId, {
      date: '2026-09-21',
      type: ScheduleExceptionType.OFF,
      reason: 'Leave',
    });
    logger.log('Seeded schedule and exception for Rahul');

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

  // Resolve the existing catalog and roster on every run, so this relationship seed is idempotent.
  const shopId = shop._id.toString();
  const barbers = await barbersService.findByShop(shopId, userId);
  const services = await servicesService.findByShop(shopId, userId);
  const barberByName = new Map(barbers.map((barber) => [barber.name, barber]));
  const serviceByName = new Map(services.map((service) => [service.name, service]));
  const assignments: Record<string, string[]> = {
    Rahul: ['Haircut', 'Beard'],
    Amit: ['Haircut', 'Haircut+Beard'],
    Vikas: ['Haircut', 'Beard', 'Fade'],
  };
  for (const [barberName, serviceNames] of Object.entries(assignments)) {
    const barber = barberByName.get(barberName);
    const serviceIds = serviceNames.map((name) => serviceByName.get(name)?._id.toString()).filter(Boolean) as string[];
    if (barber && serviceIds.length === serviceNames.length) {
      if (!barber.isActive) {
        await barbersService.updateStatus(barber._id.toString(), userId, true);
      }
      for (const serviceName of serviceNames) {
        const svc = serviceByName.get(serviceName);
        if (svc && !svc.isActive) {
          await servicesService.updateStatus(svc._id.toString(), userId, true);
        }
      }
      await barberServicesService.updateBarberServices(barber._id.toString(), userId, { serviceIds });
    }
  }
  logger.log('Seeded idempotent barber-service assignments');

  logger.log('Seed completed successfully!');
  await app.close();
}

bootstrap().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
