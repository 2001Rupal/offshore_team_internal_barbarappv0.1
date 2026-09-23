import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { Role } from '../common/enums/role.enum';
import { Otp } from './schemas/otp.schema';
import { OTP_PROVIDER } from './providers/otp-provider.interface';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: Partial<Record<keyof UsersService, jest.Mock>>;
  let jwtService: Partial<Record<keyof JwtService, jest.Mock>>;
  let otpModel: any;
  let otpProvider: any;

  beforeEach(async () => {
    usersService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      createCustomerWithPhone: jest.fn(),
      findById: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mocked-jwt-token'),
    };

    otpModel = {
      findOne: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      }),
      countDocuments: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({}),
    };

    otpProvider = {
      sendSmsOtp: jest.fn().mockResolvedValue(undefined),
      sendEmailOtp: jest.fn().mockResolvedValue(undefined),
      getLastSentOtp: jest.fn().mockReturnValue('123456'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: getModelToken(Otp.name), useValue: otpModel },
        { provide: OTP_PROVIDER, useValue: otpProvider },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should register a new owner with hashed password and return safe user object', async () => {
    const mockUser: any = {
      _id: { toString: () => 'user-123' },
      name: 'Test Owner',
      email: 'owner@test.com',
      role: Role.OWNER,
    };

    (usersService.create as jest.Mock).mockResolvedValue(mockUser);

    const result = await authService.register({
      name: 'Test Owner',
      email: 'owner@test.com',
      password: 'TestPassword123',
    });

    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Owner',
        email: 'owner@test.com',
        role: Role.OWNER,
        passwordHash: expect.any(String),
      }),
    );
    expect(result.user).toEqual({
      id: 'user-123',
      name: 'Test Owner',
      email: 'owner@test.com',
      role: Role.OWNER,
    });
    expect((result.user as any).passwordHash).toBeUndefined();
  });

  it('should verify password with Argon2 and return JWT on valid login', async () => {
    const passwordHash = await argon2.hash('TestPassword123');
    const mockUser: any = {
      _id: { toString: () => 'user-123' },
      name: 'Test Owner',
      email: 'owner@test.com',
      passwordHash,
      role: Role.OWNER,
      isActive: true,
    };

    (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);

    const result = await authService.login({
      email: 'owner@test.com',
      password: 'TestPassword123',
    });

    expect(result.accessToken).toBe('mocked-jwt-token');
    expect(result.user.email).toBe('owner@test.com');
  });

  it('should throw UnauthorizedException on invalid login password', async () => {
    const passwordHash = await argon2.hash('TestPassword123');
    const mockUser: any = {
      _id: { toString: () => 'user-123' },
      name: 'Test Owner',
      email: 'owner@test.com',
      passwordHash,
      role: Role.OWNER,
      isActive: true,
    };

    (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);

    await expect(
      authService.login({
        email: 'owner@test.com',
        password: 'WrongPassword!',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should register a new customer with Role.CUSTOMER and hashed password', async () => {
    const mockCustomer: any = {
      _id: { toString: () => 'cust-123' },
      name: 'Test Customer',
      email: 'customer@test.com',
      phone: '9876543210',
      role: Role.CUSTOMER,
    };

    (usersService.create as jest.Mock).mockResolvedValue(mockCustomer);

    const result = await authService.registerCustomer({
      name: 'Test Customer',
      email: 'customer@test.com',
      password: 'CustomerPass123',
      phone: '9876543210',
    });

    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Customer',
        email: 'customer@test.com',
        phone: '9876543210',
        role: Role.CUSTOMER,
        passwordHash: expect.any(String),
      }),
    );
    expect(result.user).toEqual({
      id: 'cust-123',
      name: 'Test Customer',
      email: 'customer@test.com',
      phone: '9876543210',
      role: Role.CUSTOMER,
    });
    expect((result.user as any).passwordHash).toBeUndefined();
  });

  it('should log in customer and return JWT with Role.CUSTOMER', async () => {
    const passwordHash = await argon2.hash('CustomerPass123');
    const mockCustomer: any = {
      _id: { toString: () => 'cust-123' },
      name: 'Test Customer',
      email: 'customer@test.com',
      phone: '9876543210',
      passwordHash,
      role: Role.CUSTOMER,
      isActive: true,
    };

    (usersService.findByEmail as jest.Mock).mockResolvedValue(mockCustomer);

    const result = await authService.loginCustomer({
      email: 'customer@test.com',
      password: 'CustomerPass123',
    });

    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 'cust-123',
        role: Role.CUSTOMER,
        email: 'customer@test.com',
      }),
    );
    expect(result.accessToken).toBe('mocked-jwt-token');
    expect(result.user.role).toBe(Role.CUSTOMER);
  });

  it('should reject loginCustomer if account is not a customer role', async () => {
    const passwordHash = await argon2.hash('Password123');
    const mockOwner: any = {
      _id: { toString: () => 'owner-123' },
      name: 'Test Owner',
      email: 'owner@test.com',
      passwordHash,
      role: Role.OWNER,
      isActive: true,
    };

    (usersService.findByEmail as jest.Mock).mockResolvedValue(mockOwner);

    await expect(
      authService.loginCustomer({
        email: 'owner@test.com',
        password: 'Password123',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  describe('Customer Mobile OTP', () => {
    it('should successfully request OTP and dispatch via email provider when phone and email are provided', async () => {
      otpModel.findOne.mockResolvedValueOnce(null);

      const res = await authService.requestCustomerOtp({ phone: '9876543210', email: 'customer@test.com' });

      expect(res.success).toBe(true);
      expect(res.phone).toBe('9876543210');
      expect(res.email).toBe('customer@test.com');
      expect(otpModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'customer@test.com',
          code: expect.any(String),
          attempts: 0,
          isUsed: false,
        }),
      );
      expect(otpProvider.sendEmailOtp).toHaveBeenCalledWith('customer@test.com', expect.any(String));
    });

    it('should successfully request OTP for existing user by phone lookup', async () => {
      otpModel.findOne.mockResolvedValueOnce(null);
      (usersService.findByPhone as jest.Mock).mockResolvedValueOnce({
        _id: { toString: () => 'existing-cust-123' },
        name: 'Existing Customer',
        phone: '9876543210',
        email: 'registered@test.com',
        role: Role.CUSTOMER,
        isActive: true,
      });

      const res = await authService.requestCustomerOtp({ phone: '9876543210' });

      expect(res.success).toBe(true);
      expect(res.email).toBe('registered@test.com');
      expect(otpProvider.sendEmailOtp).toHaveBeenCalledWith('registered@test.com', expect.any(String));
    });

    it('should successfully request Email OTP and dispatch via provider', async () => {
      otpModel.findOne.mockResolvedValueOnce(null);

      const res = await authService.requestCustomerOtp({ email: 'test@example.com' });

      expect(res.success).toBe(true);
      expect(res.email).toBe('test@example.com');
      expect(otpProvider.sendEmailOtp).toHaveBeenCalledWith('test@example.com', expect.any(String));
    });

    it('should rate-limit OTP request if sent within 60 seconds', async () => {
      otpModel.findOne.mockResolvedValueOnce({ email: 'customer@test.com' });

      await expect(
        authService.requestCustomerOtp({ phone: '9876543210', email: 'customer@test.com' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should verify OTP, auto-create customer user, and return JWT with CUSTOMER role', async () => {
      const mockOtpRecord = {
        phone: '9876543210',
        email: 'newcustomer@test.com',
        code: '123456',
        attempts: 0,
        isUsed: false,
        save: jest.fn().mockResolvedValue(true),
      };

      otpModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockOtpRecord),
      });

      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);
      (usersService.findByPhone as jest.Mock).mockResolvedValue(null);
      (usersService.createCustomer as jest.Mock) = jest.fn().mockResolvedValue({
        _id: { toString: () => 'new-cust-123' },
        name: 'Customer',
        phone: '9876543210',
        email: 'newcustomer@test.com',
        role: Role.CUSTOMER,
        isActive: true,
      });

      const res = await authService.verifyCustomerOtp({
        phone: '9876543210',
        email: 'newcustomer@test.com',
        code: '123456',
      });

      expect(mockOtpRecord.isUsed).toBe(true);
      expect(mockOtpRecord.save).toHaveBeenCalled();
      expect(res.accessToken).toBe('mocked-jwt-token');
      expect(res.user.role).toBe(Role.CUSTOMER);
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'new-cust-123',
          role: Role.CUSTOMER,
        }),
      );
    });

    it('should reject OTP verification if code is invalid', async () => {
      const mockOtpRecord = {
        phone: '9876543210',
        code: '999999',
        attempts: 0,
        isUsed: false,
        save: jest.fn().mockResolvedValue(true),
      };

      otpModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockOtpRecord),
      });

      await expect(
        authService.verifyCustomerOtp({
          phone: '9876543210',
          code: '000000',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockOtpRecord.attempts).toBe(1);
    });

    it('should forbid customer OTP verification for OWNER accounts', async () => {
      const mockOtpRecord = {
        phone: '9876543210',
        code: '123456',
        attempts: 0,
        isUsed: false,
        save: jest.fn().mockResolvedValue(true),
      };

      otpModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockOtpRecord),
      });

      (usersService.findByPhone as jest.Mock).mockResolvedValue({
        _id: { toString: () => 'owner-123' },
        role: Role.OWNER,
        isActive: true,
      });

      await expect(
        authService.verifyCustomerOtp({
          phone: '9876543210',
          code: '123456',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
