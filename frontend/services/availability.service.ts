import { apiClient } from '../lib/api-client';
import { AvailabilityResult } from '../types';

export const availabilityService = {
  /**
   * Fetch available booking slots for a barber on a specific date for a service
   * GET /api/v1/barbers/:barberId/availability?date=YYYY-MM-DD&serviceId=...
   */
  async getAvailability(
    barberId: string,
    date: string,
    serviceId: string,
  ): Promise<AvailabilityResult> {
    const query = new URLSearchParams({ date, serviceId }).toString();
    return apiClient<AvailabilityResult>(`/barbers/${barberId}/availability?${query}`);
  },
};
