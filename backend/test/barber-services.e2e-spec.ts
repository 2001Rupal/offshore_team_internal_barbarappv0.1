import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Barber Services & Assignments (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let tokenA: string;
  let tokenB: string;
  let shopA: string;
  let shopB: string;
  let barberA: string;
  let barberB: string;
  let serviceA: string;
  let serviceB: string;
  let foreignService: string;

  const api = () => request(app.getHttpServer());

  const registerAndLogin = async (suffix: string) => {
    const email = `barber_svc_owner_${suffix}_${Date.now()}@test.com`;
    await api()
      .post('/api/v1/auth/register')
      .send({ name: `Owner ${suffix}`, email, password: 'Password123' })
      .expect(201);

    const res = await api()
      .post('/api/v1/auth/login')
      .send({ email, password: 'Password123' })
      .expect(200);

    return res.body.accessToken;
  };

  const createShop = async (token: string, name: string) => {
    const res = await api()
      .post('/api/v1/shops')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name,
        address: '100 Main Street',
        city: 'Bhopal',
        state: 'MP',
        country: 'India',
        postalCode: '462001',
      })
      .expect(201);
    return res.body.id;
  };

  beforeAll(async () => {
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/barber_services_e2e_test';

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

    // Register owners
    tokenA = await registerAndLogin('a');
    tokenB = await registerAndLogin('b');

    // Create shops
    shopA = await createShop(tokenA, 'Shop Alpha');
    shopB = await createShop(tokenB, 'Shop Beta');

    // Create barbers
    const barberARes = await api()
      .post(`/api/v1/shops/${shopA}/barbers`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Rahul Sharma', experienceYears: 5 })
      .expect(201);
    barberA = barberARes.body.id;

    const barberBRes = await api()
      .post(`/api/v1/shops/${shopB}/barbers`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Vikas Patel', experienceYears: 3 })
      .expect(201);
    barberB = barberBRes.body.id;

    // Create services for Shop A
    const serviceARes = await api()
      .post(`/api/v1/shops/${shopA}/services`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Haircut', price: 300, durationMinutes: 30, description: 'Classic haircut' })
      .expect(201);
    serviceA = serviceARes.body.id;

    const serviceBRes = await api()
      .post(`/api/v1/shops/${shopA}/services`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Beard Trim', price: 200, durationMinutes: 20, description: 'Precision trim' })
      .expect(201);
    serviceB = serviceBRes.body.id;

    // Create service for Shop B (foreign)
    const foreignRes = await api()
      .post(`/api/v1/shops/${shopB}/services`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Beta Shave', price: 400, durationMinutes: 30 })
      .expect(201);
    foreignService = foreignRes.body.id;
  }, 30000);

  afterAll(async () => {
    if (connection) {
      await connection.dropDatabase();
      await connection.close();
    }
    if (app) {
      await app.close();
    }
  });

  it('assigns, reads, replaces, and removes the complete assignment set', async () => {
    // 1. Assign single service
    const assignRes = await api()
      .put(`/api/v1/barbers/${barberA}/services`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ serviceIds: [serviceA] })
      .expect(200);

    expect(assignRes.body.barberId).toBe(barberA);
    expect(assignRes.body.services).toHaveLength(1);
    expect(assignRes.body.services[0].id).toBe(serviceA);
    expect(assignRes.body.services[0].name).toBe('Haircut');
    expect(assignRes.body.services[0].price).toBe(300);

    // 2. GET services
    const getRes = await api()
      .get(`/api/v1/barbers/${barberA}/services`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(getRes.body.services).toHaveLength(1);
    expect(getRes.body.services[0].id).toBe(serviceA);

    // 3. Replace with [serviceA, serviceB]
    const replaceRes = await api()
      .put(`/api/v1/barbers/${barberA}/services`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ serviceIds: [serviceA, serviceB] })
      .expect(200);

    expect(replaceRes.body.services).toHaveLength(2);
    const assignedIds = replaceRes.body.services.map((s: any) => s.id);
    expect(assignedIds).toContain(serviceA);
    expect(assignedIds).toContain(serviceB);

    // 4. Replace with only [serviceB] - serviceA is removed
    const singleReplace = await api()
      .put(`/api/v1/barbers/${barberA}/services`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ serviceIds: [serviceB] })
      .expect(200);

    expect(singleReplace.body.services).toHaveLength(1);
    expect(singleReplace.body.services[0].id).toBe(serviceB);

    // 5. Replace with empty array [] - all services removed
    const emptyReplace = await api()
      .put(`/api/v1/barbers/${barberA}/services`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ serviceIds: [] })
      .expect(200);

    expect(emptyReplace.body.services).toEqual([]);

    // Verify GET also returns empty array
    const verifyEmpty = await api()
      .get(`/api/v1/barbers/${barberA}/services`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(verifyEmpty.body.services).toEqual([]);
  });

  it('rejects cross-owner barber access and cross-shop service assignments with 403 Forbidden', async () => {
    // Owner B attempts to GET Barber A services -> 403
    await api()
      .get(`/api/v1/barbers/${barberA}/services`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(403);

    // Owner A attempts to GET Barber B services -> 403
    await api()
      .get(`/api/v1/barbers/${barberB}/services`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(403);

    // Owner A attempts to assign foreign service from Shop B to Barber A -> 403
    await api()
      .put(`/api/v1/barbers/${barberA}/services`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ serviceIds: [foreignService] })
      .expect(403);

    // Owner A attempts to update Barber B's services -> 403
    await api()
      .put(`/api/v1/barbers/${barberB}/services`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ serviceIds: [serviceA] })
      .expect(403);
  });

  it('rejects duplicate service IDs, invalid IDs, and nonexistent services', async () => {
    // Duplicate service IDs in request
    await api()
      .put(`/api/v1/barbers/${barberA}/services`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ serviceIds: [serviceA, serviceA] })
      .expect(400);

    // Malformed ID
    await api()
      .put(`/api/v1/barbers/${barberA}/services`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ serviceIds: ['invalid-mongo-id'] })
      .expect(400);

    // Nonexistent service ID (valid mongo ObjectId)
    await api()
      .put(`/api/v1/barbers/${barberA}/services`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ serviceIds: ['507f1f77bcf86cd799439011'] })
      .expect(404);
  });

  it('blocks unauthenticated requests with 401 Unauthorized', async () => {
    await api().get(`/api/v1/barbers/${barberA}/services`).expect(401);
    await api().put(`/api/v1/barbers/${barberA}/services`).send({ serviceIds: [] }).expect(401);
  });
});
