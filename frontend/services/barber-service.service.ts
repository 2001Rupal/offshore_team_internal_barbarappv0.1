import { apiClient } from '../lib/api-client';
import { BarberServicesResponse } from '../types';

export const barberServicesService = {
  /**
   * Fetch services assigned to a barber
   * GET /api/v1/barbers/:barberId/services
   */
  async getBarberServices(barberId: string): Promise<BarberServicesResponse> {
    return apiClient<BarberServicesResponse>(`/barbers/${barberId}/services`);
  },

  /**
   * Replace a barber's complete service assignment set
   * PUT /api/v1/barbers/:barberId/services
   */
  async updateBarberServices(barberId: string, serviceIds: string[]): Promise<BarberServicesResponse> {
    return apiClient<BarberServicesResponse>(`/barbers/${barberId}/services`, {
      method: 'PUT',
      body: JSON.stringify({ serviceIds }),
    });
  },
};

export const getBarberServices = barberServicesService.getBarberServices;
export const updateBarberServices = barberServicesService.updateBarberServices;
