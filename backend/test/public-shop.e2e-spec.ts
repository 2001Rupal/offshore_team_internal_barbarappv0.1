import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { DayOfWeek } from '../src/schedules/enums/day-of-week.enum';

describe('Level 2.5 — Single-Shop Customer Experience & OTP Discovery (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;

  let ownerToken: string;
  let shopId: string;
  let activeBarberId: string;
  let inactiveBarberId: string;
  let activeServiceId: string;
  let inactiveServiceId: string;

  const testOwnerEmail = 'owner_single_shop@test.com';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.MONGODB_URI =
      'mongodb://127.0.0.1:27017/barber_public_shop_e2e_test';

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
        name: 'Owner Boss',
        email: testOwnerEmail,
        password: 'Password123',
      })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: testOwnerEmail, password: 'Password123' })
      .expect(200);

    ownerToken = loginRes.body.accessToken;

    // 2. Setup Shop
    const shopRes = await request(app.getHttpServer())
      .post('/api/v1/shops')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Royal Cuts Studio',
        description: 'Luxury grooming',
        address: '100 Main St',
        city: 'Bhopal',
        phone: '9876500000',
        timezone: 'Asia/Kolkata',
      })
      .expect(201);

    shopId = shopRes.body.id;

    // 3. Setup Barbers: 1 active, 1 inactive
    const b1Res = await request(app.getHttpServer())
      .post(`/api/v1/shops/${shopId}/barbers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Rahul Barber',
        experienceYears: 4,
        bio: 'Fade expert',
      })
      .expect(201);
    activeBarberId = b1Res.body.id;

    const b2Res = await request(app.getHttpServer())
      .post(`/api/v1/shops/${shopId}/barbers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Inactive Barber',
        experienceYears: 1,
      })
      .expect(201);
    inactiveBarberId = b2Res.body.id;

    // Set b2 inactive
    await request(app.getHttpServer())
      .patch(`/api/v1/barbers/${inactiveBarberId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ isActive: false })
      .expect(200);

    // 4. Setup Services: 1 active, 1 inactive
    const s1Res = await request(app.getHttpServer())
      .post(`/api/v1/shops/${shopId}/services`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Royal Haircut',
        description: 'Precision cut',
        price: 300,
        durationMinutes: 30,
      })
      .expect(201);
    activeServiceId = s1Res.body.id;

    const s2Res = await request(app.getHttpServer())
      .post(`/api/v1/shops/${shopId}/services`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Discontinued Beard Trim',
        price: 100,
        durationMinutes: 15,
      })
      .expect(201);
    inactiveServiceId = s2Res.body.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/services/${inactiveServiceId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ isActive: false })
      .expect(200);

    // 5. Assign active service to active barber
    await request(app.getHttpServer())
      .put(`/api/v1/barbers/${activeBarberId}/services`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ serviceIds: [activeServiceId] })
      .expect(200);

    // 6. Setup weekly schedule for active barber
    await request(app.getHttpServer())
      .put(`/api/v1/barbers/${activeBarberId}/schedule`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        weeklySchedule: [
          {
            dayOfWeek: DayOfWeek.TUESDAY,
            isWorking: true,
            startTime: '10:00',
            endTime: '18:00',
            breaks: [{ startTime: '13:00', endTime: '14:00' }],
          },
        ],
      })
      .expect(200);
  });

  afterAll(async () => {
    if (connection) {
      await connection.dropDatabase();
      await connection.close();
    }
    await app.close();
  });

  describe('Public Single-Shop APIs (Anonymous / No JWT)', () => {
    it('GET /api/v1/public/shop should return the single active shop profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/public/shop')
        .expect(200);

      expect(res.body.id).toBe(shopId);
      expect(res.body.name).toBe('Royal Cuts Studio');
      expect(res.body.city).toBe('Bhopal');
      expect(res.body.ownerId).toBeUndefined();
    });

    it('GET /api/v1/public/shop/barbers should return only active barbers', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/public/shop/barbers')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((b: any) => b.id === activeBarberId)).toBe(true);
      expect(res.body.some((b: any) => b.id === inactiveBarberId)).toBe(false);
    });

    it('GET /api/v1/public/shop/services should return only active services', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/public/shop/services')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((s: any) => s.id === activeServiceId)).toBe(true);
      expect(res.body.some((s: any) => s.id === inactiveServiceId)).toBe(false);
    });

    it('GET /api/v1/public/barbers/:barberId/services should return assigned services', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/public/barbers/${activeBarberId}/services`)
        .expect(200);

      expect(res.body.barberId).toBe(activeBarberId);
      expect(res.body.services).toHaveLength(1);
      expect(res.body.services[0].id).toBe(activeServiceId);
      expect(res.body.services[0].name).toBe('Royal Haircut');
    });

    it('GET /api/v1/public/barbers/:barberId/availability should calculate slots without JWT', async () => {
      // 2026-09-22 is Tuesday
      const res = await request(app.getHttpServer())
        .get(`/api/v1/public/barbers/${activeBarberId}/availability?date=2026-09-22&serviceId=${activeServiceId}`)
        .expect(200);

      expect(res.body.date).toBe('2026-09-22');
      expect(res.body.barberId).toBe(activeBarberId);
      expect(res.body.serviceId).toBe(activeServiceId);
      expect(Array.isArray(res.body.slots)).toBe(true);
      expect(res.body.slots.length).toBeGreaterThan(0);
      expect(res.body.slots[0].startTime).toBe('10:00');
    });
  });

  describe('Customer Mobile OTP Authentication Flow', () => {
    const customerPhone = '9876543299';
    let customerJwt: string;

    it('POST /api/v1/auth/customer/otp/request should dispatch OTP and return success', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/customer/otp/request')
        .send({ phone: customerPhone })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.phone).toBe(customerPhone);
      expect(res.body.code).toBeUndefined(); // Never expose code in response
    });

    it('POST /api/v1/auth/customer/otp/request should reject if requested too quickly (rate limit)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/customer/otp/request')
        .send({ phone: customerPhone })
        .expect(400);
    });

    it('POST /api/v1/auth/customer/otp/verify should reject invalid OTP code', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/customer/otp/verify')
        .send({ phone: customerPhone, code: '000000' })
        .expect(400);
    });

    it('POST /api/v1/auth/customer/otp/verify should verify and create CUSTOMER user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/customer/otp/verify')
        .send({ phone: customerPhone, code: '123456' })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe('CUSTOMER');
      expect(res.body.user.phone).toBe(customerPhone);
      customerJwt = res.body.accessToken;
    });

    it('Customer JWT should access /customers/me and update profile', async () => {
      const meRes = await request(app.getHttpServer())
        .get('/api/v1/customers/me')
        .set('Authorization', `Bearer ${customerJwt}`)
        .expect(200);

      expect(meRes.body.phone).toBe(customerPhone);
      expect(meRes.body.role).toBe('CUSTOMER');

      const patchRes = await request(app.getHttpServer())
        .patch('/api/v1/customers/me')
        .set('Authorization', `Bearer ${customerJwt}`)
        .send({ name: 'Vikram Verified' })
        .expect(200);

      expect(patchRes.body.name).toBe('Vikram Verified');
    });

    it('Customer JWT should receive 403 on owner-only endpoints', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/shops/me')
        .set('Authorization', `Bearer ${customerJwt}`)
        .expect(403);
    });
  });
});
