import { apiClient } from '../lib/api-client';
import { Shop } from '../types';

export interface CreateShopPayload {
  name: string;
  description?: string;
  address: string;
  city: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
}

export interface UpdateShopPayload {
  name?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
}

export const shopService = {
  async getMyShop(): Promise<Shop> {
    return apiClient<Shop>('/shops/me');
  },

  async createShop(payload: CreateShopPayload): Promise<Shop> {
    return apiClient<Shop>('/shops', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateShop(shopId: string, payload: UpdateShopPayload): Promise<Shop> {
    return apiClient<Shop>(`/shops/${shopId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};
