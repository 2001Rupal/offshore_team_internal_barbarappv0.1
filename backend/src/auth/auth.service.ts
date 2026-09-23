import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException, Inject, Optional, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CustomerRegisterDto } from './dto/customer-register.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { FirebaseVerifyDto } from './dto/firebase-verify.dto';
import { Role } from '../common/enums/role.enum';
import { Otp, OtpDocument } from './schemas/otp.schema';
import { IOtpProvider, OTP_PROVIDER } from './providers/otp-provider.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectModel(Otp.name) private otpModel: Model<OtpDocument>,
    @Inject(OTP_PROVIDER) private otpProvider: IOtpProvider,
    @Optional() private configService?: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await argon2.hash(dto.password);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      phone: dto.phone,
      role: Role.OWNER,
    });

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        age: (user as any).age,
        gender: (user as any).gender,
      },
    };
  }

  async registerCustomer(dto: CustomerRegisterDto) {
    const passwordHash = await argon2.hash(dto.password);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      phone: dto.phone,
      role: Role.CUSTOMER,
    });
    if (dto.age || dto.gender) {
      await this.usersService.updateProfile(user._id, { age: dto.age, gender: dto.gender });
    }

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        age: dto.age,
        gender: dto.gender,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    const isValidPassword = await argon2.verify(user.passwordHash, dto.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      sub: user._id.toString(),
      role: user.role,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        age: (user as any).age,
        gender: (user as any).gender,
      },
    };
  }

  async loginCustomer(dto: CustomerLoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    if (user.role !== Role.CUSTOMER) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValidPassword = await argon2.verify(user.passwordHash, dto.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      sub: user._id.toString(),
      role: user.role,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        age: (user as any).age,
        gender: (user as any).gender,
      },
    };
  }

  async requestCustomerOtp(dto: RequestOtpDto) {
    if (!dto.phone && !dto.email) {
      throw new BadRequestException('Please provide either a mobile number or email address');
    }

    let targetEmail: string | undefined = dto.email?.trim().toLowerCase();
    const cleanPhone = dto.phone ? this.normalizePhone(dto.phone) : undefined;
    let existingUser: any = null;

    if (cleanPhone) {
      existingUser = await this.usersService.findByPhone(cleanPhone);
      if (existingUser) {
        if (!targetEmail) {
          targetEmail = existingUser.email?.toLowerCase().trim();
        }
      }
    }

    if (!targetEmail && dto.email) {
      targetEmail = dto.email.trim().toLowerCase();
    }

    if (!targetEmail) {
      throw new BadRequestException('No account found with this mobile number. Please enter your email to register.');
    }

    // 1. Rate limiting: Check if an OTP was sent to this email within the last 60 seconds
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
    const recentOtp = await this.otpModel.findOne({
      email: targetEmail,
      createdAt: { $gte: sixtySecondsAgo },
    });
    if (recentOtp) {
      throw new BadRequestException('Please wait 60 seconds before requesting another verification code');
    }

    // 2. Anti-spam: Max 5 OTP requests per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const hourlyCount = await this.otpModel.countDocuments({
      email: targetEmail,
      createdAt: { $gte: oneHourAgo },
    });
    if (hourlyCount >= 5) {
      throw new BadRequestException('Too many verification requests. Please try again later');
    }

    // 3. Generate 6-digit code (Use 123456 in test env)
    const isTest = process.env.NODE_ENV === 'test';
    const code = isTest ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    // 4. Store OTP in database
    await this.otpModel.create({
      phone: cleanPhone,
      email: targetEmail,
      type: 'EMAIL',
      code,
      expiresAt,
      attempts: 0,
      isUsed: false,
    });

    if (cleanPhone) {
      await this.otpModel.create({
        phone: cleanPhone,
        type: 'EMAIL',
        code,
        expiresAt,
        attempts: 0,
        isUsed: false,
      });
    }

    // 5. Send OTP strictly to Email
    await this.otpProvider.sendEmailOtp(targetEmail, code);

    const maskedEmail = targetEmail.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + '*'.repeat(Math.max(1, b.length)));

    return {
      success: true,
      message: `Verification code sent to your email (${maskedEmail})`,
      destination: targetEmail,
      deliveredVia: 'EMAIL',
      type: 'EMAIL',
      phone: cleanPhone,
      email: targetEmail,
      isExistingUser: !!existingUser,
    };
  }

  async verifyCustomerOtp(dto: VerifyOtpDto) {
    if (!dto.phone && !dto.email) {
      throw new BadRequestException('Please provide either a mobile number or email address');
    }

    const code = dto.code.trim();
    const cleanEmail = dto.email ? dto.email.toLowerCase().trim() : undefined;
    const cleanPhone = dto.phone ? this.normalizePhone(dto.phone) : undefined;

    // 1. Find latest active OTP for this email or phone
    const filterOtp: any = { isUsed: false, expiresAt: { $gt: new Date() } };
    if (cleanEmail) {
      filterOtp.email = cleanEmail;
    } else if (cleanPhone) {
      filterOtp.phone = cleanPhone;
    }

    const otpRecord = await this.otpModel
      .findOne(filterOtp)
      .sort({ createdAt: -1 });

    if (!otpRecord) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    // 2. Check maximum verification attempts (max 3)
    if (otpRecord.attempts >= 3) {
      otpRecord.isUsed = true;
      await otpRecord.save();
      throw new BadRequestException('Maximum verification attempts exceeded. Please request a new code.');
    }

    // 3. Verify OTP code (Accept record code or standard 123456 in non-production)
    const isDevOrTest = process.env.NODE_ENV !== 'production';
    const isMatching = otpRecord.code === code || (isDevOrTest && code === '123456');
    if (!isMatching) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      throw new BadRequestException('Invalid verification code');
    }

    // 4. Burn OTP
    otpRecord.isUsed = true;
    await otpRecord.save();

    // 5. Find or create CUSTOMER user
    let user: any = null;
    if (cleanEmail) {
      user = await this.usersService.findByEmail(cleanEmail);
    }
    if (!user && cleanPhone) {
      user = await this.usersService.findByPhone(cleanPhone);
    }

    if (user) {
      if (user.role === Role.OWNER) {
        throw new ForbiddenException('Owner accounts cannot authenticate via customer verification');
      }
      if (!user.isActive) {
        throw new UnauthorizedException('Account is inactive');
      }

      // Update customer profile fields if provided
      const updateData: any = {};
      if (dto.name && dto.name.trim() && (user.name === 'Customer' || !user.name)) {
        updateData.name = dto.name.trim();
      }
      if (cleanPhone && !user.phone) {
        updateData.phone = cleanPhone;
      }
      if (cleanEmail && !user.email) {
        updateData.email = cleanEmail;
      }
      if (dto.age !== undefined && dto.age !== null) {
        updateData.age = Number(dto.age);
      }
      if (dto.gender !== undefined && dto.gender !== null) {
        updateData.gender = dto.gender.trim();
      }

      if (Object.keys(updateData).length > 0) {
        user = await this.usersService.updateProfile(user._id, updateData);
      }
    } else {
      // New Customer Registration
      const finalEmail = cleanEmail || (otpRecord.email ? otpRecord.email.toLowerCase().trim() : undefined);
      const finalPhone = cleanPhone || (otpRecord.phone ? this.normalizePhone(otpRecord.phone) : undefined);

      if (!finalEmail) {
        throw new BadRequestException('Email address is required for customer registration');
      }

      user = await this.usersService.createCustomer({
        email: finalEmail,
        phone: finalPhone,
        name: dto.name?.trim() || 'Customer',
        age: dto.age !== undefined && dto.age !== null ? Number(dto.age) : undefined,
        gender: dto.gender ? dto.gender.trim() : undefined,
      });
    }

    // 6. Sign JWT with CUSTOMER role
    const payload = {
      sub: user._id.toString(),
      role: Role.CUSTOMER,
      email: user.email || '',
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email || '',
        role: user.role,
        phone: user.phone || '',
        age: (user as any).age,
        gender: (user as any).gender,
      },
    };
  }

  async verifyFirebaseCustomer(dto: FirebaseVerifyDto) {
    if (!dto.idToken || !dto.idToken.trim()) {
      throw new BadRequestException('Firebase ID token is required');
    }

    let decodedPhone: string | undefined;
    let decodedEmail: string | undefined;
    let decodedUid: string | undefined;
    let decodedName: string | undefined;

    // 1. Verify Firebase ID Token via Google's OAuth2 tokeninfo API
    try {
      const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(dto.idToken)}`);
      if (!res.ok) {
        throw new UnauthorizedException('Invalid or expired Firebase ID token');
      }
      const info = await res.json();
      decodedPhone = info.phone_number;
      decodedEmail = info.email;
      decodedUid = info.sub || info.user_id;
      decodedName = info.name;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      this.logger.error(`Error verifying Firebase ID token with Google: ${err?.message}`);
      throw new UnauthorizedException('Failed to verify authentication token');
    }

    if (!decodedPhone && !decodedEmail && !decodedUid) {
      throw new UnauthorizedException('Could not verify identity from Firebase token');
    }

    const destination = decodedPhone ? this.normalizePhone(decodedPhone) : decodedEmail?.toLowerCase().trim();

    // 2. Find or create Customer user in MongoDB
    let user = destination
      ? (decodedPhone
          ? await this.usersService.findByPhone(destination)
          : await this.usersService.findByEmail(destination))
      : null;

    if (user) {
      if (user.role === Role.OWNER) {
        throw new ForbiddenException('Owner accounts cannot authenticate via customer verification');
      }
      if (!user.isActive) {
        throw new UnauthorizedException('Account is inactive');
      }
      if (dto.name && dto.name.trim() && (user.name === 'Customer' || !user.name)) {
        user = await this.usersService.updateProfile(user._id, { name: dto.name.trim() });
      }
    } else {
      const customerName = dto.name?.trim() || decodedName || 'Valued Customer';
      if (decodedPhone) {
        user = await this.usersService.createCustomerWithPhone({
          phone: destination!,
          name: customerName,
          email: decodedEmail,
        });
      } else if (decodedEmail) {
        user = await this.usersService.createCustomerWithEmail({
          email: destination!,
          name: customerName,
        });
      } else {
        user = await this.usersService.createCustomerWithPhone({
          phone: decodedUid!,
          name: customerName,
        });
      }
    }

    // 3. Issue system JWT with Role.CUSTOMER
    const payload = {
      sub: user._id.toString(),
      role: Role.CUSTOMER,
      email: user.email || '',
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email || '',
        role: user.role,
        phone: user.phone || '',
        age: (user as any).age,
        gender: (user as any).gender,
      },
    };
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/[\s\-\(\)]/g, '').trim();
  }

  async getCurrentUser(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      age: (user as any).age,
      gender: (user as any).gender,
    };
  }
}
