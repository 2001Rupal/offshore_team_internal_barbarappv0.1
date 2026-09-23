import { apiClient, setAuthToken } from '../lib/api-client';
import { User } from '../types';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  age?: number;
  gender?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface RequestOtpPayload {
  phone?: string;
  email?: string;
  name?: string;
  age?: number;
  gender?: string;
}

export interface VerifyOtpPayload {
  phone?: string;
  email?: string;
  code: string;
  name?: string;
  age?: number;
  gender?: string;
}

export interface OtpResponse {
  success: boolean;
  message: string;
  destination?: string;
  type?: 'PHONE' | 'EMAIL';
  phone?: string;
  email?: string;
  isExistingUser?: boolean;
  devCode?: string;
}

export const authService = {
  async register(payload: RegisterPayload): Promise<{ user: User }> {
    return apiClient<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async registerCustomer(payload: RegisterPayload): Promise<{ user: User }> {
    return apiClient<{ user: User }>('/auth/customer/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const res = await apiClient<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setAuthToken(res.accessToken);
    return res;
  },

  async loginCustomer(payload: LoginPayload): Promise<AuthResponse> {
    const res = await apiClient<AuthResponse>('/auth/customer/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setAuthToken(res.accessToken);
    return res;
  },

  async requestCustomerOtp(target: RequestOtpPayload | string): Promise<OtpResponse> {
    const payload: RequestOtpPayload =
      typeof target === 'string'
        ? target.includes('@')
          ? { email: target.trim() }
          : { phone: target.trim() }
        : target;

    return apiClient<OtpResponse>('/auth/customer/otp/request', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async verifyCustomerOtp(
    target: VerifyOtpPayload | string,
    codeArg?: string,
    nameArg?: string,
  ): Promise<AuthResponse> {
    let payload: VerifyOtpPayload;
    if (typeof target === 'string') {
      const isEmail = target.includes('@');
      payload = {
        phone: isEmail ? undefined : target.trim(),
        email: isEmail ? target.trim() : undefined,
        code: codeArg || '',
        name: nameArg,
      };
    } else {
      payload = target;
    }

    const res = await apiClient<AuthResponse>('/auth/customer/otp/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setAuthToken(res.accessToken);
    return res;
  },

  async verifyFirebaseCustomer(idToken: string, name?: string): Promise<AuthResponse> {
    const res = await apiClient<AuthResponse>('/auth/customer/firebase-verify', {
      method: 'POST',
      body: JSON.stringify({ idToken, name }),
    });
    setAuthToken(res.accessToken);
    return res;
  },

  async getMe(): Promise<User> {
    return apiClient<User>('/auth/me');
  },

  logout(): void {
    setAuthToken(null);
  },
};
