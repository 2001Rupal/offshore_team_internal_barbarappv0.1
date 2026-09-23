import { Injectable, Logger } from '@nestjs/common';
import { IOtpProvider } from './otp-provider.interface';

@Injectable()
export class MockOtpProvider implements IOtpProvider {
  private readonly logger = new Logger(MockOtpProvider.name);
  private readonly otpStore = new Map<string, string>();

  async sendSmsOtp(
    phone: string,
    code: string,
    fallbackEmail?: string,
  ): Promise<{ deliveredVia: 'SMS' | 'EMAIL' | 'SIMULATOR'; destination: string }> {
    this.otpStore.set(phone, code);
    this.logger.log(`[MockOtpProvider] Dispatched SMS OTP ${code} to ${phone}`);
    return { deliveredVia: 'SMS', destination: phone };
  }

  async sendEmailOtp(email: string, code: string): Promise<void> {
    this.otpStore.set(email.toLowerCase(), code);
    this.logger.log(`[MockOtpProvider] Dispatched Email OTP ${code} to ${email}`);
  }

  getLastSentOtp(destination: string): string | null {
    return this.otpStore.get(destination.toLowerCase()) || this.otpStore.get(destination) || null;
  }
}
