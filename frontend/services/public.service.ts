import { apiClient } from '../lib/api-client';

export interface PublicShop {
  id: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  timezone: string;
  isActive: boolean;
}

export interface PublicBarber {
  id: string;
  name: string;
  bio?: string;
  experienceYears?: number;
  phone?: string;
  isActive: boolean;
}

export interface PublicServiceItem {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
}

export interface BarberServicesResponse {
  barberId: string;
  services: PublicServiceItem[];
}

export interface AvailabilitySlot {
  startTime: string;
  endTime: string;
  isAvailable?: boolean;
  status?: string;
}

export interface AvailabilityResponse {
  barberId: string;
  shopId: string;
  serviceId: string;
  date: string;
  dayOfWeek: string;
  serviceDurationMinutes: number;
  isOff: boolean;
  slots: AvailabilitySlot[];
}

export const publicService = {
  async getShop(): Promise<PublicShop> {
    return apiClient<PublicShop>('/public/shop');
  },

  async getShopBarbers(): Promise<PublicBarber[]> {
    return apiClient<PublicBarber[]>('/public/shop/barbers');
  },

  async getShopServices(): Promise<PublicServiceItem[]> {
    return apiClient<PublicServiceItem[]>('/public/shop/services');
  },

  async getBarberServices(barberId: string): Promise<BarberServicesResponse> {
    return apiClient<BarberServicesResponse>(`/public/barbers/${barberId}/services`);
  },

  async getAvailability(
    barberId: string,
    date: string,
    serviceId: string,
  ): Promise<AvailabilityResponse> {
    const params = new URLSearchParams({ date, serviceId });
    return apiClient<AvailabilityResponse>(
      `/public/barbers/${barberId}/availability?${params.toString()}`,
    );
  },

  async getAnyBarberAvailability(
    serviceId: string,
    date: string,
  ): Promise<{
    shopId: string;
    serviceId: string;
    date: string;
    isOff: boolean;
    slots: AvailabilitySlot[];
  }> {
    const params = new URLSearchParams({ date });
    return apiClient<{
      shopId: string;
      serviceId: string;
      date: string;
      isOff: boolean;
      slots: AvailabilitySlot[];
    }>(`/public/services/${serviceId}/availability?${params.toString()}`);
  },
};

