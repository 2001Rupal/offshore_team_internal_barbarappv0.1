import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';

import { MongooseModule } from '@nestjs/mongoose';
import { Otp, OtpSchema } from './schemas/otp.schema';
import { AppOtpProvider } from './providers/app-otp.provider';
import { OTP_PROVIDER } from './providers/otp-provider.interface';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([{ name: Otp.name, schema: OtpSchema }]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'super-secret-jwt-key-for-level-1-development-at-least-32-chars',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '7d',
        },
      }),
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: OTP_PROVIDER,
      useClass: AppOtpProvider,
    },
    AppOtpProvider,
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtModule, PassportModule, OTP_PROVIDER],
})
export class AuthModule {}
