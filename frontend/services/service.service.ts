import { apiClient } from '../lib/api-client';
import { ServiceItem } from '../types';

export interface CreateServicePayload {
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
}

export interface UpdateServicePayload {
  name?: string;
  description?: string;
  price?: number;
  durationMinutes?: number;
}

export const serviceService = {
  async getServicesByShop(shopId: string, activeOnly?: boolean): Promise<ServiceItem[]> {
    const query = activeOnly !== undefined ? `?active=${activeOnly}` : '';
    return apiClient<ServiceItem[]>(`/shops/${shopId}/services${query}`);
  },

  async getService(serviceId: string): Promise<ServiceItem> {
    return apiClient<ServiceItem>(`/services/${serviceId}`);
  },

  async createService(shopId: string, payload: CreateServicePayload): Promise<ServiceItem> {
    return apiClient<ServiceItem>(`/shops/${shopId}/services`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateService(serviceId: string, payload: UpdateServicePayload): Promise<ServiceItem> {
    return apiClient<ServiceItem>(`/services/${serviceId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async updateStatus(serviceId: string, isActive: boolean): Promise<ServiceItem> {
    return apiClient<ServiceItem>(`/services/${serviceId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },
};
