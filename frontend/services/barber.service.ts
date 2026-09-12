import { apiClient } from '../lib/api-client';
import { Barber } from '../types';

export interface CreateBarberPayload {
  name: string;
  phone?: string;
  email?: string;
  experienceYears?: number;
  bio?: string;
}

export interface UpdateBarberPayload {
  name?: string;
  phone?: string;
  email?: string;
  experienceYears?: number;
  bio?: string;
}

export const barberService = {
  async getBarbersByShop(shopId: string, activeOnly?: boolean): Promise<Barber[]> {
    const query = activeOnly !== undefined ? `?active=${activeOnly}` : '';
    return apiClient<Barber[]>(`/shops/${shopId}/barbers${query}`);
  },

  async getBarber(barberId: string): Promise<Barber> {
    return apiClient<Barber>(`/barbers/${barberId}`);
  },

  async createBarber(shopId: string, payload: CreateBarberPayload): Promise<Barber> {
    return apiClient<Barber>(`/shops/${shopId}/barbers`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateBarber(barberId: string, payload: UpdateBarberPayload): Promise<Barber> {
    return apiClient<Barber>(`/barbers/${barberId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async updateStatus(barberId: string, isActive: boolean): Promise<Barber> {
    return apiClient<Barber>(`/barbers/${barberId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },
};
