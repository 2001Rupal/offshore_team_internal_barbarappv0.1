import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Role } from '../src/common/enums/role.enum';

describe('Customer Accounts & Role Isolation (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;

  let ownerToken: string;
  let customerToken: string;

  const testOwnerEmail = 'owner_cust_test@test.com';
  const testCustomerEmail = 'customer_cust_test@test.com';

  beforeAll(async () => {
    process.env.MONGODB_URI =
      'mongodb://127.0.0.1:27017/barber_customers_e2e_test';

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

    // 1. Register and login Owner
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Studio Owner',
        email: testOwnerEmail,
        password: 'Password123',
      })
      .expect(201);

    const ownerLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: testOwnerEmail, password: 'Password123' })
      .expect(200);
    ownerToken = ownerLoginRes.body.accessToken;
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

  describe('Customer Registration Flow', () => {
    it('should successfully register a customer with Role.CUSTOMER', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/customer/register')
        .send({
          name: 'Rahul Customer',
          email: testCustomerEmail,
          phone: '9876543210',
          password: 'Password123',
        })
        .expect(201);

      expect(res.body.user).toBeDefined();
      expect(res.body.user.name).toBe('Rahul Customer');
      expect(res.body.user.email).toBe(testCustomerEmail);
      expect(res.body.user.phone).toBe('9876543210');
      expect(res.body.user.role).toBe(Role.CUSTOMER);
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('should reject duplicate customer email with 409 Conflict', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/customer/register')
        .send({
          name: 'Rahul Duplicate',
          email: testCustomerEmail,
          phone: '9876543210',
          password: 'Password123',
        })
        .expect(409);
    });

    it('should reject registration with invalid email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/customer/register')
        .send({
          name: 'Invalid Email',
          email: 'not-an-email',
          password: 'Password123',
        })
        .expect(400);
    });

    it('should reject registration with short password (< 8 chars)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/customer/register')
        .send({
          name: 'Short Password',
          email: 'shortpass@test.com',
          password: '123',
        })
        .expect(400);
    });
  });

  describe('Customer Login Flow', () => {
    it('should successfully log in customer and return JWT with customer profile', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/customer/login')
        .send({
          email: testCustomerEmail,
          password: 'Password123',
        })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testCustomerEmail);
      expect(res.body.user.role).toBe(Role.CUSTOMER);
      expect(res.body.user.passwordHash).toBeUndefined();

      customerToken = res.body.accessToken;
    });

    it('should reject login with wrong password (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/customer/login')
        .send({
          email: testCustomerEmail,
          password: 'WrongPassword!',
        })
        .expect(401);
    });

    it('should reject login with non-existent email (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/customer/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'Password123',
        })
        .expect(401);
    });

    it('should reject owner credentials at customer login endpoint (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/customer/login')
        .send({
          email: testOwnerEmail,
          password: 'Password123',
        })
        .expect(401);
    });
  });

  describe('Customer Profile Management (/customers/me)', () => {
    it('should return current customer profile with valid customer JWT', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/customers/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.email).toBe(testCustomerEmail);
      expect(res.body.name).toBe('Rahul Customer');
      expect(res.body.phone).toBe('9876543210');
      expect(res.body.role).toBe(Role.CUSTOMER);
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('should update customer profile name and phone', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/customers/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Rahul S. Updated',
          phone: '9111122222',
        })
        .expect(200);

      expect(res.body.name).toBe('Rahul S. Updated');
      expect(res.body.phone).toBe('9111122222');
      expect(res.body.email).toBe(testCustomerEmail); // Email unchanged
      expect(res.body.role).toBe(Role.CUSTOMER);
    });

    it('should verify persistence via GET /api/v1/customers/me', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/customers/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.name).toBe('Rahul S. Updated');
      expect(res.body.phone).toBe('9111122222');
    });
  });

  describe('Strict Role-Based Authorization Isolation', () => {
    it('Customer JWT must receive 403 Forbidden attempting owner-only shop creation', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/shops')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Customer Illegal Shop',
          address: '100 Street',
          city: 'Bhopal',
          state: 'MP',
          country: 'India',
        })
        .expect(403);
    });

    it('Owner JWT must receive 403 Forbidden attempting customer-only profile access', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/customers/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);
    });

    it('Owner JWT must receive 403 Forbidden attempting customer-only profile update', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/customers/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Owner Trying To Be Customer' })
        .expect(403);
    });
  });
});
