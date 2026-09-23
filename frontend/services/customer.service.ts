import { apiClient } from '../lib/api-client';
import { User } from '../types';

export interface UpdateCustomerPayload {
  name?: string;
  phone?: string;
  age?: number;
  gender?: string;
}

export const customerService = {
  /**
   * Fetch current authenticated customer profile
   * GET /api/v1/customers/me
   */
  async getProfile(): Promise<User> {
    return apiClient<User>('/customers/me');
  },

  /**
   * Update current authenticated customer profile
   * PATCH /api/v1/customers/me
   */
  async updateProfile(payload: UpdateCustomerPayload): Promise<User> {
    return apiClient<User>('/customers/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};
