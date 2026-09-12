import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

describe('Barber Platform Level 1 - Complete Owner Flow (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let accessToken: string;
  let shopId: string;
  let rahulId: string;
  let beardServiceId: string;

  beforeAll(async () => {
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/barber_level1_e2e_test';

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
  });

  afterAll(async () => {
    if (connection) {
      await connection.dropDatabase();
      await connection.close();
    }
    await app.close();
  });

  // Step 1: Register Owner
  it('Step 1: Should register a new owner (201 Created)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Owner',
        email: 'owner@test.com',
        password: 'TestPassword123',
      })
      .expect(201);

    expect(res.body.user).toBeDefined();
    expect(res.body.user.name).toBe('Test Owner');
    expect(res.body.user.email).toBe('owner@test.com');
    expect(res.body.user.role).toBe('OWNER');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  // Step 2: Login Owner
  it('Step 2: Should login owner and return JWT access token (200 OK)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@test.com',
        password: 'TestPassword123',
      })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe('owner@test.com');
    accessToken = res.body.accessToken;
  });

  // Verify /auth/me
  it('Should fetch current user profile via /auth/me', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.email).toBe('owner@test.com');
    expect(res.body.name).toBe('Test Owner');
  });

  // Step 3: Create Shop
  it('Step 3: Should create shop "Royal Cuts" (201 Created)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/shops')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Royal Cuts',
        description: "Modern men's barber shop",
        address: 'Main Road',
        city: 'Bhopal',
        state: 'Madhya Pradesh',
        country: 'India',
        postalCode: '462001',
        phone: '9999999999',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('Royal Cuts');
    expect(res.body.city).toBe('Bhopal');
    shopId = res.body.id;
  });

  it('Should retrieve own shop via /shops/me', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/shops/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.id).toBe(shopId);
    expect(res.body.name).toBe('Royal Cuts');
  });

  // Step 4 & 5: Create Barbers
  it('Step 4 & 5: Should create barbers Rahul (5 yrs) and Amit (3 yrs)', async () => {
    const resRahul = await request(app.getHttpServer())
      .post(`/api/v1/shops/${shopId}/barbers`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Rahul',
        experienceYears: 5,
        phone: '9999999999',
        email: 'rahul@example.com',
      })
      .expect(201);

    expect(resRahul.body.id).toBeDefined();
    expect(resRahul.body.name).toBe('Rahul');
    expect(resRahul.body.experienceYears).toBe(5);
    rahulId = resRahul.body.id;

    const resAmit = await request(app.getHttpServer())
      .post(`/api/v1/shops/${shopId}/barbers`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Amit',
        experienceYears: 3,
        phone: '9888888888',
        email: 'amit@example.com',
      })
      .expect(201);

    expect(resAmit.body.name).toBe('Amit');
  });

  // Step 6 & 7: Create Services
  it('Step 6 & 7: Should create services Haircut (₹250, 30 min) and Beard (₹150, 20 min)', async () => {
    const resHaircut = await request(app.getHttpServer())
      .post(`/api/v1/shops/${shopId}/services`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Haircut',
        description: 'Classic haircut',
        price: 250,
        durationMinutes: 30,
      })
      .expect(201);

    expect(resHaircut.body.name).toBe('Haircut');
    expect(resHaircut.body.price).toBe(250);

    const resBeard = await request(app.getHttpServer())
      .post(`/api/v1/shops/${shopId}/services`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Beard',
        description: 'Beard trim',
        price: 150,
        durationMinutes: 20,
      })
      .expect(201);

    expect(resBeard.body.name).toBe('Beard');
    beardServiceId = resBeard.body.id;
  });

  // Step 8: Edit Rahul experience to 6 years
  it('Step 8: Should update Rahul experienceYears to 6', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/barbers/${rahulId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        experienceYears: 6,
      })
      .expect(200);

    expect(res.body.experienceYears).toBe(6);
  });

  // Step 9: Deactivate Beard service
  it('Step 9: Should deactivate Beard service (isActive: false)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/services/${beardServiceId}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        isActive: false,
      })
      .expect(200);

    expect(res.body.isActive).toBe(false);
  });

  // Step 10: Relogin and verify persistence
  it('Step 10: Should re-login and verify all state persists', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@test.com',
        password: 'TestPassword123',
      })
      .expect(200);

    const newToken = loginRes.body.accessToken;

    // Verify shop
    const shopRes = await request(app.getHttpServer())
      .get('/api/v1/shops/me')
      .set('Authorization', `Bearer ${newToken}`)
      .expect(200);

    expect(shopRes.body.name).toBe('Royal Cuts');

    // Verify barbers
    const barbersRes = await request(app.getHttpServer())
      .get(`/api/v1/shops/${shopId}/barbers`)
      .set('Authorization', `Bearer ${newToken}`)
      .expect(200);

    expect(barbersRes.body.length).toBe(2);
    const rahul = barbersRes.body.find((b: any) => b.name === 'Rahul');
    expect(rahul.experienceYears).toBe(6);

    // Verify services
    const servicesRes = await request(app.getHttpServer())
      .get(`/api/v1/shops/${shopId}/services`)
      .set('Authorization', `Bearer ${newToken}`)
      .expect(200);

    expect(servicesRes.body.length).toBe(2);
    const beard = servicesRes.body.find((s: any) => s.name === 'Beard');
    expect(beard.isActive).toBe(false);
  });
});
