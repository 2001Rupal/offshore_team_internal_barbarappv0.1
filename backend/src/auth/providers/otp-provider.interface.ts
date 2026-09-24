export interface IOtpProvider {
  sendSmsOtp(
    phone: string,
    code: string,
    fallbackEmail?: string,
  ): Promise<{ deliveredVia: 'SMS' | 'EMAIL' | 'SIMULATOR'; destination: string } | void>;
  sendEmailOtp(email: string, code: string): Promise<void>;
  getLastSentOtp(destination: string): string | null;
}


export const OTP_PROVIDER = 'OTP_PROVIDER';
