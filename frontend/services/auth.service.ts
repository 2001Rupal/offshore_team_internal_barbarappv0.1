import { apiClient, setAuthToken } from '../lib/api-client';
import { User } from '../types';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export const authService = {
  async register(payload: RegisterPayload): Promise<{ user: User }> {
    return apiClient<{ user: User }>('/auth/register', {
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

  async getMe(): Promise<User> {
    return apiClient<User>('/auth/me');
  },

  logout(): void {
    setAuthToken(null);
  },
};
