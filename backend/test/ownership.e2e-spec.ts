import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

describe('Mandatory Authorization Acceptance Test - Cross-Owner Isolation (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;

  let ownerAToken: string;
  let ownerBToken: string;

  let shopAId: string;
  let barberAId: string;
  let serviceAId: string;

  let shopBId: string;

  beforeAll(async () => {
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/barber_level1_ownership_test';

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

    // 1. Register and login Owner A
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ name: 'Owner A', email: 'owner_a@test.com', password: 'Password123' })
      .expect(201);

    const loginARes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'owner_a@test.com', password: 'Password123' })
      .expect(200);
    ownerAToken = loginARes.body.accessToken;

    // 2. Register and login Owner B
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ name: 'Owner B', email: 'owner_b@test.com', password: 'Password123' })
      .expect(201);

    const loginBRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'owner_b@test.com', password: 'Password123' })
      .expect(200);
    ownerBToken = loginBRes.body.accessToken;

    // 3. Owner A creates Shop A, Barber A, Service A
    const shopARes = await request(app.getHttpServer())
      .post('/api/v1/shops')
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        name: 'Shop A',
        address: '1st Street',
        city: 'Bhopal',
      })
      .expect(201);
    shopAId = shopARes.body.id;

    const barberARes = await request(app.getHttpServer())
      .post(`/api/v1/shops/${shopAId}/barbers`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        name: 'Barber A',
        experienceYears: 4,
      })
      .expect(201);
    barberAId = barberARes.body.id;

    const serviceARes = await request(app.getHttpServer())
      .post(`/api/v1/shops/${shopAId}/services`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        name: 'Service A',
        price: 200,
        durationMinutes: 30,
      })
      .expect(201);
    serviceAId = serviceARes.body.id;

    // 4. Owner B creates Shop B
    const shopBRes = await request(app.getHttpServer())
      .post('/api/v1/shops')
      .set('Authorization', `Bearer ${ownerBToken}`)
      .send({
        name: 'Shop B',
        address: '2nd Street',
        city: 'Indore',
      })
      .expect(201);
    shopBId = shopBRes.body.id;
  });

  afterAll(async () => {
    if (connection) {
      await connection.dropDatabase();
      await connection.close();
    }
    await app.close();
  });

  it('Owner B attempts to update Barber A -> 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/barbers/${barberAId}`)
      .set('Authorization', `Bearer ${ownerBToken}`)
      .send({ name: 'Hacked Barber' })
      .expect(403);

    expect(res.body.statusCode).toBe(403);
  });

  it('Owner B attempts to deactivate Barber A -> 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/barbers/${barberAId}/status`)
      .set('Authorization', `Bearer ${ownerBToken}`)
      .send({ isActive: false })
      .expect(403);

    expect(res.body.statusCode).toBe(403);
  });

  it('Owner B attempts to update Service A -> 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/services/${serviceAId}`)
      .set('Authorization', `Bearer ${ownerBToken}`)
      .send({ price: 999 })
      .expect(403);

    expect(res.body.statusCode).toBe(403);
  });

  it('Owner B attempts to deactivate Service A -> 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/services/${serviceAId}/status`)
      .set('Authorization', `Bearer ${ownerBToken}`)
      .send({ isActive: false })
      .expect(403);

    expect(res.body.statusCode).toBe(403);
  });

  it('Owner B attempts to update Shop A -> 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/shops/${shopAId}`)
      .set('Authorization', `Bearer ${ownerBToken}`)
      .send({ name: 'Hacked Shop' })
      .expect(403);

    expect(res.body.statusCode).toBe(403);
  });

  it('Owner B attempts to add barber to Shop A -> 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/shops/${shopAId}/barbers`)
      .set('Authorization', `Bearer ${ownerBToken}`)
      .send({ name: 'Illegal Barber' })
      .expect(403);

    expect(res.body.statusCode).toBe(403);
  });

  it('Owner B attempts to add service to Shop A -> 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/shops/${shopAId}/services`)
      .set('Authorization', `Bearer ${ownerBToken}`)
      .send({ name: 'Illegal Service', price: 100, durationMinutes: 15 })
      .expect(403);

    expect(res.body.statusCode).toBe(403);
  });
});
