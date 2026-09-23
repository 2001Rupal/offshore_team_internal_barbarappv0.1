import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { DayOfWeek } from '../src/schedules/enums/day-of-week.enum';
import { ScheduleExceptionType } from '../src/schedules/enums/schedule-exception-type.enum';

describe('Barber Schedules & Exceptions (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;

  let ownerAToken: string;
  let ownerBToken: string;

  let shopAId: string;
  let barberAId: string;
  let exceptionId: string;

  beforeAll(async () => {
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/barber_schedules_e2e_test';

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
      .send({ name: 'Owner A', email: 'owner_a_sched@test.com', password: 'Password123' })
      .expect(201);

    const loginARes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'owner_a_sched@test.com', password: 'Password123' })
      .expect(200);
    ownerAToken = loginARes.body.accessToken;

    // 2. Register & login Owner B
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ name: 'Owner B', email: 'owner_b_sched@test.com', password: 'Password123' })
      .expect(201);

    const loginBRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'owner_b_sched@test.com', password: 'Password123' })
      .expect(200);
    ownerBToken = loginBRes.body.accessToken;

    // 3. Create Shop for Owner A
    const shopARes = await request(app.getHttpServer())
      .post('/api/v1/shops')
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        name: 'Shop A',
        address: '123 Main St',
        city: 'Bhopal',
        timezone: 'Asia/Kolkata',
      })
      .expect(201);
    shopAId = shopARes.body.id;

    // 4. Create Barber in Shop A
    const barberARes = await request(app.getHttpServer())
      .post(`/api/v1/shops/${shopAId}/barbers`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        name: 'Rahul',
        experienceYears: 5,
        phone: '9876543210',
      })
      .expect(201);
    barberAId = barberARes.body.id;
  });

  afterAll(async () => {
    if (connection) {
      await connection.dropDatabase();
      await connection.close();
    }
    await app.close();
  });

  describe('Weekly Schedule Flow', () => {
    it('Owner A gets initial schedule -> receives 7-day default template', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/barbers/${barberAId}/schedule`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(7);
      expect(res.body[0].dayOfWeek).toBe(DayOfWeek.MONDAY);
    });

    it('Owner A updates weekly schedule with valid hours and breaks', async () => {
      const schedulePayload = {
        weeklySchedule: [
          {
            dayOfWeek: DayOfWeek.MONDAY,
            isWorking: true,
            startTime: '10:00',
            endTime: '20:00',
            breaks: [{ startTime: '13:00', endTime: '14:00' }],
          },
          {
            dayOfWeek: DayOfWeek.WEDNESDAY,
            isWorking: false,
          },
        ],
      };

      const res = await request(app.getHttpServer())
        .put(`/api/v1/barbers/${barberAId}/schedule`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send(schedulePayload)
        .expect(200);

      expect(res.body).toHaveLength(7);
      const wednesday = res.body.find((d: any) => d.dayOfWeek === DayOfWeek.WEDNESDAY);
      expect(wednesday.isWorking).toBe(false);
      const monday = res.body.find((d: any) => d.dayOfWeek === DayOfWeek.MONDAY);
      expect(monday.isWorking).toBe(true);
      expect(monday.breaks).toHaveLength(1);
    });

    it('Owner A update fails when startTime >= endTime (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/barbers/${barberAId}/schedule`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          weeklySchedule: [
            {
              dayOfWeek: DayOfWeek.TUESDAY,
              isWorking: true,
              startTime: '20:00',
              endTime: '10:00',
            },
          ],
        })
        .expect(400);
    });

    it('Owner A update fails when break is outside working hours (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/barbers/${barberAId}/schedule`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          weeklySchedule: [
            {
              dayOfWeek: DayOfWeek.TUESDAY,
              isWorking: true,
              startTime: '10:00',
              endTime: '18:00',
              breaks: [{ startTime: '18:30', endTime: '19:00' }],
            },
          ],
        })
        .expect(400);
    });

    it('Owner A update fails when breaks overlap (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/barbers/${barberAId}/schedule`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          weeklySchedule: [
            {
              dayOfWeek: DayOfWeek.TUESDAY,
              isWorking: true,
              startTime: '10:00',
              endTime: '20:00',
              breaks: [
                { startTime: '13:00', endTime: '14:30' },
                { startTime: '14:00', endTime: '15:00' },
              ],
            },
          ],
        })
        .expect(400);
    });
  });

  describe('Schedule Exceptions Flow', () => {
    it('Owner A creates an OFF exception', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/barbers/${barberAId}/schedule/exceptions`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          date: '2026-09-21',
          type: ScheduleExceptionType.OFF,
          reason: 'Medical leave',
        })
        .expect(201);

      expect(res.body.date).toBe('2026-09-21');
      expect(res.body.type).toBe(ScheduleExceptionType.OFF);
      exceptionId = res.body.id;
    });

    it('Owner A creates a CUSTOM_HOURS exception', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/barbers/${barberAId}/schedule/exceptions`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          date: '2026-09-22',
          type: ScheduleExceptionType.CUSTOM_HOURS,
          startTime: '14:00',
          endTime: '20:00',
          reason: 'Half day shift',
        })
        .expect(201);

      expect(res.body.date).toBe('2026-09-22');
      expect(res.body.startTime).toBe('14:00');
    });

    it('Owner A cannot create duplicate exception for the same date (409 Conflict)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/barbers/${barberAId}/schedule/exceptions`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          date: '2026-09-21',
          type: ScheduleExceptionType.OFF,
          reason: 'Duplicate check',
        })
        .expect(409);
    });

    it('Owner A updates existing exception', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/schedule-exceptions/${exceptionId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          reason: 'Updated leave reason',
        })
        .expect(200);

      expect(res.body.reason).toBe('Updated leave reason');
    });

    it('Owner A lists exceptions for barber', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/barbers/${barberAId}/schedule/exceptions`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it('Owner A deletes an exception', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/schedule-exceptions/${exceptionId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);
    });
  });

  describe('Cross-Owner Multi-Tenant Isolation', () => {
    it('Owner B cannot get Barber A schedule -> 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/barbers/${barberAId}/schedule`)
        .set('Authorization', `Bearer ${ownerBToken}`)
        .expect(403);
    });

    it('Owner B cannot update Barber A schedule -> 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/barbers/${barberAId}/schedule`)
        .set('Authorization', `Bearer ${ownerBToken}`)
        .send({
          weeklySchedule: [{ dayOfWeek: DayOfWeek.MONDAY, isWorking: false }],
        })
        .expect(403);
    });

    it('Owner B cannot create schedule exception for Barber A -> 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/barbers/${barberAId}/schedule/exceptions`)
        .set('Authorization', `Bearer ${ownerBToken}`)
        .send({
          date: '2026-09-30',
          type: ScheduleExceptionType.OFF,
        })
        .expect(403);
    });

    it('Owner B cannot list schedule exceptions for Barber A -> 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/barbers/${barberAId}/schedule/exceptions`)
        .set('Authorization', `Bearer ${ownerBToken}`)
        .expect(403);
    });
  });
});
