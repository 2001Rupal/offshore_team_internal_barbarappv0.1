import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { DayOfWeek } from '../src/schedules/enums/day-of-week.enum';

describe('Level 2.6 — Mobile-First Appointment Booking (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;

  let ownerToken: string;
  let customer1Token: string;
  let customer2Token: string;
  let shopId: string;
  let barberId: string;
  let serviceId: string;
  let createdAppointmentId: string;
  let bookingToken: string;

  const testOwnerEmail = 'owner_booking_e2e@test.com';
  const customer1Phone = '+919988776655';
  const customer2Phone = '+919988776644';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/barber_booking_e2e_test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();
    connection = await app.get(getConnectionToken());
    await connection.dropDatabase();

    // 1. Setup Owner
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Master Barber Owner',
        email: testOwnerEmail,
        password: 'Password123',
      })
      .expect(201);

    const ownerLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: testOwnerEmail, password: 'Password123' })
      .expect(200);

    ownerToken = ownerLoginRes.body.accessToken;

    // 2. Setup Shop
    const shopRes = await request(app.getHttpServer())
      .post('/api/v1/shops')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Royal Cuts Booking Studio',
        description: 'Premium Barber Experience',
        address: '202 King St',
        city: 'Indore',
        phone: '9876543210',
        timezone: 'Asia/Kolkata',
      })
      .expect(201);

    shopId = shopRes.body.id || shopRes.body._id;

    // 3. Setup Barber
    const barberRes = await request(app.getHttpServer())
      .post(`/api/v1/shops/${shopId}/barbers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Karan Sharma',
        phone: '9876511111',
        bio: 'Fade Specialist',
      })
      .expect(201);

    barberId = barberRes.body.id || barberRes.body._id;

    // 4. Setup Service
    const serviceRes = await request(app.getHttpServer())
      .post(`/api/v1/shops/${shopId}/services`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Royal Fade & Beard',
        description: 'Precision skin fade with beard trim',
        durationMinutes: 30,
        price: 500,
      })
      .expect(201);

    serviceId = serviceRes.body.id || serviceRes.body._id;

    // 5. Assign Barber to Service
    await request(app.getHttpServer())
      .put(`/api/v1/barbers/${barberId}/services`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ serviceIds: [serviceId] })
      .expect(200);

    // 6. Set Barber Schedule for all days 09:00 - 18:00
    const allDays = [
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
      DayOfWeek.SUNDAY,
    ];

    await request(app.getHttpServer())
      .put(`/api/v1/barbers/${barberId}/schedule`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        weeklySchedule: allDays.map((day) => ({
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '18:00',
          isWorking: true,
          breaks: [{ startTime: '13:00', endTime: '14:00' }],
        })),
      })
      .expect(200);

    // 7. Register Customer 1 via OTP flow
    await request(app.getHttpServer())
      .post('/api/v1/auth/customer/otp/request')
      .send({ phone: customer1Phone })
      .expect(200);

    const customer1Login = await request(app.getHttpServer())
      .post('/api/v1/auth/customer/otp/verify')
      .send({
        phone: customer1Phone,
        code: '123456',
      })
      .expect(200);

    customer1Token = customer1Login.body.accessToken;

    await request(app.getHttpServer())
      .patch('/api/v1/customers/me')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ name: 'Customer One' })
      .expect(200);

    // 8. Register Customer 2 via OTP flow
    await request(app.getHttpServer())
      .post('/api/v1/auth/customer/otp/request')
      .send({ phone: customer2Phone })
      .expect(200);

    const customer2Login = await request(app.getHttpServer())
      .post('/api/v1/auth/customer/otp/verify')
      .send({
        phone: customer2Phone,
        code: '123456',
      })
      .expect(200);

    customer2Token = customer2Login.body.accessToken;

    await request(app.getHttpServer())
      .patch('/api/v1/customers/me')
      .set('Authorization', `Bearer ${customer2Token}`)
      .send({ name: 'Customer Two' })
      .expect(200);
  });

  afterAll(async () => {
    if (connection) {
      await connection.dropDatabase();
      await connection.close();
    }
    if (app) {
      await app.close();
    }
  });

  // Calculate target date 5 days in future
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 5);
  const dateStr = targetDate.toISOString().split('T')[0];
  // Target slot 10:00 AM IST (04:30 UTC)
  const slotIso = `${dateStr}T04:30:00.000Z`;

  it('GET /api/v1/public/services/:serviceId/availability - should return Any-Barber unified availability', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/public/services/${serviceId}/availability?date=${dateStr}`)
      .expect(200);

    expect(res.body.isOff).toBe(false);
    expect(Array.isArray(res.body.slots)).toBe(true);
    const tenAmSlot = res.body.slots.find((s: any) => s.startTime === '10:00');
    expect(tenAmSlot).toBeDefined();
    expect(tenAmSlot.status).toBe('AVAILABLE');
  });

  it('POST /api/v1/appointments - should book an appointment with Any Barber (no barberId specified)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${customer1Token}`)
      .set('Idempotency-Key', 'test-idem-key-101')
      .send({
        serviceId,
        startAt: slotIso,
      })
      .expect(201);

    expect(res.body._id || res.body.id).toBeDefined();
    expect(res.body.bookingToken).toMatch(/^RC-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/);
    expect(res.body.status).toBe('CONFIRMED');
    expect(res.body.barberId).toBe(barberId);
    expect(res.body.barberNameSnapshot).toBe('Karan Sharma');
    expect(res.body.serviceNameSnapshot).toBe('Royal Fade & Beard');
    expect(res.body.customerNameSnapshot).toBe('Customer One');

    createdAppointmentId = res.body._id || res.body.id;
    bookingToken = res.body.bookingToken;
  });

  it('POST /api/v1/appointments - should return existing appointment on duplicate idempotency key', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${customer1Token}`)
      .set('Idempotency-Key', 'test-idem-key-101')
      .send({
        serviceId,
        startAt: slotIso,
      })
      .expect(201);

    expect(res.body._id || res.body.id).toBe(createdAppointmentId);
    expect(res.body.bookingToken).toBe(bookingToken);
  });

  it('POST /api/v1/appointments - should reject double booking (concurrency / conflict check)', async () => {
    // Customer 2 tries to book the same slot where only Karan is assigned
    const res = await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${customer2Token}`)
      .send({
        serviceId,
        startAt: slotIso,
      })
      .expect(409);

    expect(res.body.message).toContain('That time was just taken');
  });

  it('GET /api/v1/public/services/:serviceId/availability - should now show booked slot as removed from available slots', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/public/services/${serviceId}/availability?date=${dateStr}`)
      .expect(200);

    const availableTenAmSlot = res.body.slots.find(
      (s: any) => s.startTime === '10:00' && (s.status === 'AVAILABLE' || s.isAvailable === true),
    );
    expect(availableTenAmSlot).toBeUndefined();
  });

  it('GET /api/v1/appointments/:id - Customer 1 can view own appointment', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/appointments/${createdAppointmentId}`)
      .set('Authorization', `Bearer ${customer1Token}`)
      .expect(200);

    expect(res.body.id || res.body._id).toBe(createdAppointmentId);
    expect(res.body.bookingToken).toBe(bookingToken);
    expect(res.body.status).toBe('CONFIRMED');
  });

  it('GET /api/v1/appointments/:id - Customer 2 receives 403 Forbidden', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/appointments/${createdAppointmentId}`)
      .set('Authorization', `Bearer ${customer2Token}`)
      .expect(403);
  });

  it('GET /api/v1/appointments/:id - Owner can view appointment of their shop', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/appointments/${createdAppointmentId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(res.body.id || res.body._id).toBe(createdAppointmentId);
  });

  it('GET /api/v1/customers/me/appointments - should list appointments for customer', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/customers/me/appointments')
      .set('Authorization', `Bearer ${customer1Token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id || res.body[0]._id).toBe(createdAppointmentId);
  });
});
