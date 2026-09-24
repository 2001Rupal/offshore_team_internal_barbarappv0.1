import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IOtpProvider } from './otp-provider.interface';

@Injectable()
export class AppOtpProvider implements IOtpProvider {
  private readonly logger = new Logger(AppOtpProvider.name);
  private readonly otpStore = new Map<string, string>();
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initMailTransporter();
  }

  private initMailTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get('SMTP_PORT')) || 587;
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (user && pass) {
      try {
        if (host?.includes('gmail') || user.endsWith('@gmail.com')) {
          // Specialized Gmail preset natively handles Google TLS and prevents 'Unexpected socket close'
          this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user, pass },
            connectionTimeout: 4000,
            greetingTimeout: 4000,
            socketTimeout: 4000,
          });
          this.logger.log(`[EmailProvider] SMTP Gmail service initialized for: ${user}`);
        } else if (host) {
          this.transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
            connectionTimeout: 4000,
            greetingTimeout: 4000,
            socketTimeout: 4000,
          });
          this.logger.log(`[EmailProvider] SMTP transporter initialized for host: ${host}:${port}`);
        }
      } catch (err: any) {
        this.logger.error(`[EmailProvider] Failed to initialize SMTP transporter: ${err?.message}`);
      }
    } else {
      this.logger.log('[EmailProvider] No SMTP credentials configured. Operating in dev/simulated mode.');
    }
  }

  async sendSmsOtp(
    phone: string,
    code: string,
    fallbackEmail?: string,
  ): Promise<{ deliveredVia: 'SMS' | 'EMAIL' | 'SIMULATOR'; destination: string }> {
    this.otpStore.set(phone, code);

    const fast2smsKey = this.configService.get<string>('FAST2SMS_API_KEY');
    const twilioSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const twilioToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const twilioFrom = this.configService.get<string>('TWILIO_PHONE_NUMBER');

    // 1. Try Twilio (Global SMS Gateway - Prioritized)
    if (twilioSid && twilioToken && twilioFrom) {
      try {
        const cleanDigits = phone.replace(/\D/g, '');
        const formattedTo = phone.trim().startsWith('+')
          ? `+${cleanDigits}`
          : `+91${cleanDigits.slice(-10)}`;
        const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
        const params = new URLSearchParams({
          From: twilioFrom,
          To: formattedTo,
          Body: `Your Local's Cut verification code is: ${code}. Valid for 5 minutes.`,
        });

        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });
        const result = await res.json();

        if (res.ok && (result?.status === 'queued' || result?.status === 'sent')) {
          this.logger.log(`[Twilio] Dispatched real SMS to ${formattedTo}: sid=${result?.sid}, status=${result?.status}`);
          return { deliveredVia: 'SMS', destination: formattedTo };
        } else {
          this.logger.warn(`[Twilio] SMS dispatch failed: ${result?.message || JSON.stringify(result)} (code: ${result?.code})`);
        }
      } catch (err: any) {
        this.logger.error(`[Twilio] Failed to send real SMS: ${err?.message}`);
      }
    }

    // 2. Try Fast2SMS (Indian SMS Gateway)
    if (fast2smsKey) {
      try {
        const cleanPhone = phone.replace(/\D/g, '').slice(-10);
        const configuredRoute = this.configService.get<string>('FAST2SMS_ROUTE') || 'otp';

        let res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            authorization: fast2smsKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            configuredRoute === 'q'
              ? {
                  route: 'q',
                  message: `Your Local's Cut verification code is ${code}. Valid for 5 minutes.`,
                  language: 'english',
                  flash: 0,
                  numbers: cleanPhone,
                }
              : {
                  route: 'otp',
                  variables_values: code,
                  numbers: cleanPhone,
                },
          ),
        });
        let result = await res.json();

        // If 'otp' route is blocked by Fast2SMS due to pending website verification (code 996), fallback to 'q' (Quick SMS)
        if (result?.status_code === 996 && configuredRoute !== 'q') {
          this.logger.warn(
            `[Fast2SMS] 'otp' route returned error 996 (Website verification required). Automatically retrying via 'q' (Quick SMS) route...`,
          );
          res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
            method: 'POST',
            headers: {
              authorization: fast2smsKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              route: 'q',
              message: `Your verification code is ${code}`,
              language: 'english',
              flash: 0,
              numbers: cleanPhone,
            }),
          });
          result = await res.json();
        }

        this.logger.log(`[Fast2SMS] Gateway response for ${cleanPhone}: ${JSON.stringify(result)}`);

        if (result?.return === true) {
          return { deliveredVia: 'SMS', destination: cleanPhone };
        } else {
          this.logger.warn(
            `[Fast2SMS] SMS was rejected by Fast2SMS: ${result?.message || JSON.stringify(result)}.`,
          );
        }
      } catch (err: any) {
        this.logger.error(`[Fast2SMS] Failed to send real SMS: ${err?.message}`);
      }
    }

    // 3. Fallback to Email if SMS gateways failed and email is provided!
    if (fallbackEmail) {
      try {
        this.logger.warn(
          `[AppOtpProvider] Mobile SMS delivery failed or unconfigured. Triggering automatic fallback to Email: ${fallbackEmail}`,
        );
        await this.sendEmailOtp(fallbackEmail, code);
        return { deliveredVia: 'EMAIL', destination: fallbackEmail };
      } catch (err: any) {
        this.logger.error(`[AppOtpProvider] Fallback email dispatch failed: ${err?.message}`);
      }
    }

    // 4. Fallback dev logger (Terminal output)
    this.logger.log(`\n========================================\n📱 [REAL SMS SIMULATOR] To: ${phone}\n🔑 VERIFICATION CODE: ${code}\n========================================\n`);
    return { deliveredVia: 'SIMULATOR', destination: phone };
  }

  async sendEmailOtp(email: string, code: string): Promise<void> {
    this.otpStore.set(email.toLowerCase(), code);

    // If SMTP transporter is configured, dispatch real email
    if (this.transporter) {
      try {
        let from = this.configService.get<string>('EMAIL_FROM') || `"Local's Cut" <no-reply@localscut.com>`;
        if (!from.includes('<') && from.includes('@')) {
          const parts = from.trim().split(/\s+/);
          const emailPart = parts.pop();
          const namePart = parts.join(' ').replace(/"/g, '') || "Local's Cut Studio";
          from = `"${namePart}" <${emailPart}>`;
        }
        await this.transporter.sendMail({
          from,
          to: email,
          subject: `Your Local's Cut Verification Code: ${code}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 16px; background-color: #ffffff;">
              <h2 style="color: #d97706; margin-top: 0;">Local's Cut</h2>
              <p style="font-size: 15px; color: #3f3f46;">Hello,</p>
              <p style="font-size: 15px; color: #3f3f46;">Here is your verification code to complete your customer login / registration:</p>
              <div style="background-color: #fef3c7; border: 1px dashed #f59e0b; border-radius: 12px; padding: 16px; text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #b45309;">${code}</span>
              </div>
              <p style="font-size: 13px; color: #71717a;">This code will expire in 5 minutes. If you did not request this code, please disregard this email.</p>
              <hr style="border: none; border-top: 1px solid #f4f4f5; margin: 20px 0;" />
              <p style="font-size: 12px; color: #a1a1aa; text-align: center;">© ${new Date().getFullYear()} Local's Cut Studio. All rights reserved.</p>
            </div>
          `,
        });
        this.logger.log(`[EmailProvider] Dispatched real verification email to: ${email}`);
        return;
      } catch (err: any) {
        this.logger.error(`[EmailProvider] Failed to dispatch email to ${email}: ${err?.message}`);
      }
    }

    // Fallback dev logger (Terminal output)
    this.logger.log(`\n========================================\n✉️ [EMAIL OTP SIMULATOR] To: ${email}\n🔑 VERIFICATION CODE: ${code}\n========================================\n`);
  }

  getLastSentOtp(destination: string): string | null {
    return this.otpStore.get(destination.toLowerCase()) || null;
  }
}
