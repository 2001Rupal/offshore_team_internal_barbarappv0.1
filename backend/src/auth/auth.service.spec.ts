import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { Role } from '../common/enums/role.enum';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: Partial<Record<keyof UsersService, jest.Mock>>;
  let jwtService: Partial<Record<keyof JwtService, jest.Mock>>;

  beforeEach(async () => {
    usersService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mocked-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
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
});
