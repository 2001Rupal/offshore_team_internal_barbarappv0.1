import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { DayOfWeek } from '../src/schedules/enums/day-of-week.enum';
import { ScheduleExceptionType } from '../src/schedules/enums/schedule-exception-type.enum';

describe('Availability & Slot Engine (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;

  let ownerAToken: string;
  let ownerBToken: string;

  let shopAId: string;
  let barberAId: string;
  let serviceAId: string;
  let unassignedServiceId: string;

  // 2026-09-20 is a Sunday
  const testSunday = '2026-09-20';

  beforeAll(async () => {
    process.env.MONGODB_URI =
      'mongodb://127.0.0.1:27017/barber_availability_e2e_test';

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

    // 1. Register & login Owner A
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Owner A',
        email: 'owner_a_avail@test.com',
        password: 'Password123',
      })
      .expect(201);

    const loginARes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'owner_a_avail@test.com', password: 'Password123' })
      .expect(200);
    ownerAToken = loginARes.body.accessToken;

    // 2. Register & login Owner B
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Owner B',
        email: 'owner_b_avail@test.com',
        password: 'Password123',
      })
      .expect(201);

    const loginBRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'owner_b_avail@test.com', password: 'Password123' })
      .expect(200);
    ownerBToken = loginBRes.body.accessToken;

    // 3. Owner A creates Shop
    const shopRes = await request(app.getHttpServer())
      .post('/api/v1/shops')
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        name: "Local's Cut",
        address: '100 Main Road',
        city: 'Bhopal',
        state: 'MP',
        country: 'India',
        postalCode: '462001',
        timezone: 'Asia/Kolkata',
      })
      .expect(201);
    shopAId = shopRes.body.id;

    // 4. Owner A creates Barber
    const barberRes = await request(app.getHttpServer())
      .post(`/api/v1/shops/${shopAId}/barbers`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        name: 'Rahul Sharma',
        experienceYears: 5,
        bio: 'Fade expert',
      })
      .expect(201);
    barberAId = barberRes.body.id;

    // 5. Owner A creates Service A (Haircut: 30m duration)
    const serviceRes = await request(app.getHttpServer())
      .post(`/api/v1/shops/${shopAId}/services`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        name: 'Classic Haircut',
        price: 250,
        durationMinutes: 30,
        bufferTime: 0,
      })
      .expect(201);
    serviceAId = serviceRes.body.id;

    // 6. Owner A creates Service B (Unassigned service)
    const unassignedRes = await request(app.getHttpServer())
      .post(`/api/v1/shops/${shopAId}/services`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        name: 'Luxury Spa',
        price: 800,
        durationMinutes: 60,
      })
      .expect(201);
    unassignedServiceId = unassignedRes.body.id;

    // 7. Owner A assigns Service A to Barber A
    await request(app.getHttpServer())
      .put(`/api/v1/barbers/${barberAId}/services`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({ serviceIds: [serviceAId] })
      .expect(200);

    // 8. Configure Barber A weekly schedule (Sunday: 10:00 to 20:00, break 13:00 to 14:00)
    await request(app.getHttpServer())
      .put(`/api/v1/barbers/${barberAId}/schedule`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        weeklySchedule: [
          {
            dayOfWeek: DayOfWeek.SUNDAY,
            isWorking: true,
            startTime: '10:00',
            endTime: '20:00',
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
    if (app) {
      await app.close();
    }
  });

  describe('GET /api/v1/barbers/:barberId/availability', () => {
    it('should reject requests without authorization token (401)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/barbers/${barberAId}/availability?date=${testSunday}&serviceId=${serviceAId}`)
        .expect(401);
    });

    it('should reject unassigned service with 404', async () => {
      await request(app.getHttpServer())
        .get(
          `/api/v1/barbers/${barberAId}/availability?date=${testSunday}&serviceId=${unassignedServiceId}`,
        )
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(404);
    });

    it('should prevent cross-owner access with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/barbers/${barberAId}/availability?date=${testSunday}&serviceId=${serviceAId}`)
        .set('Authorization', `Bearer ${ownerBToken}`)
        .expect(403);
    });

    it('should calculate available slots correctly for assigned service and working schedule', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/barbers/${barberAId}/availability?date=${testSunday}&serviceId=${serviceAId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.date).toBe(testSunday);
      expect(res.body.barberId).toBe(barberAId);
      expect(res.body.serviceId).toBe(serviceAId);
      expect(res.body.serviceDurationMinutes).toBe(30);
      expect(res.body.timezone).toBe('Asia/Kolkata');
      expect(Array.isArray(res.body.slots)).toBe(true);
      expect(res.body.slots.length).toBeGreaterThan(0);

      // Verify break period is excluded (13:00 to 14:00)
      const slotStarts = res.body.slots.map((s: any) => s.startTime);
      expect(slotStarts).toContain('10:00');
      expect(slotStarts).toContain('12:30');
      expect(slotStarts).not.toContain('13:00');
      expect(slotStarts).not.toContain('13:30');
      expect(slotStarts).toContain('14:00');
    });

    it('should return empty slots when DAY_OFF/OFF exception is added', async () => {
      // Add OFF exception for testSunday (2026-09-20)
      await request(app.getHttpServer())
        .post(`/api/v1/barbers/${barberAId}/schedule/exceptions`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          date: testSunday,
          type: ScheduleExceptionType.OFF,
          reason: 'Personal Leave',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/barbers/${barberAId}/availability?date=${testSunday}&serviceId=${serviceAId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.slots).toEqual([]);
    });

    it('should calculate custom slots when CUSTOM_HOURS exception is applied', async () => {
      // 2026-09-27 is the next Sunday
      const nextSunday = '2026-09-27';
      await request(app.getHttpServer())
        .post(`/api/v1/barbers/${barberAId}/schedule/exceptions`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          date: nextSunday,
          type: ScheduleExceptionType.CUSTOM_HOURS,
          startTime: '15:00',
          endTime: '18:00',
          reason: 'Evening Shift Only',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/barbers/${barberAId}/availability?date=${nextSunday}&serviceId=${serviceAId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      const slotStarts = res.body.slots.map((s: any) => s.startTime);
      expect(slotStarts).not.toContain('10:00');
      expect(slotStarts).toContain('15:00');
      expect(slotStarts).toContain('17:30');
      // 17:30 + 30m = 18:00, so 18:00 is not a start
      expect(slotStarts).not.toContain('18:00');
    });

    it('should return empty slots for a date in the past', async () => {
      const pastDate = '2020-01-05'; // Sunday in the past
      const res = await request(app.getHttpServer())
        .get(`/api/v1/barbers/${barberAId}/availability?date=${pastDate}&serviceId=${serviceAId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.slots).toEqual([]);
    });
  });
});
