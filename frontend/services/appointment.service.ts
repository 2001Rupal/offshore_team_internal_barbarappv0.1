import { apiClient } from '../lib/api-client';

export interface CreateAppointmentDto {
  serviceId: string;
  barberId?: string; // If omitted or 'ANY', system selects available barber
  startAt: string; // ISO 8601 string
}

export interface Appointment {
  id: string;
  bookingToken: string;
  customerId: string;
  shopId: string;
  barberId: string;
  serviceId: string;
  startAt: string;
  endAt: string;
  timezone: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  idempotencyKey?: string;
  customerNameSnapshot: string;
  customerPhoneSnapshot: string;
  serviceNameSnapshot: string;
  barberNameSnapshot: string;
  serviceDurationSnapshot: number;
  servicePriceSnapshot: number;
  createdAt: string;
  updatedAt: string;
}

export const appointmentService = {
  async create(dto: CreateAppointmentDto, idempotencyKey?: string): Promise<Appointment> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['idempotency-key'] = idempotencyKey;
    }

    return apiClient<Appointment>('/appointments', {
      method: 'POST',
      headers,
      body: JSON.stringify(dto),
    });
  },

  async getById(id: string): Promise<Appointment> {
    return apiClient<Appointment>(`/appointments/${id}`);
  },

  async getMy(): Promise<Appointment[]> {
    return apiClient<Appointment[]>('/customers/me/appointments');
  },

  async cancel(id: string, reason?: string): Promise<Appointment> {
    return apiClient<Appointment>(`/appointments/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  },

  async getOwnerAppointments(filters?: { status?: string; date?: string; barberId?: string }): Promise<Appointment[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.date) params.append('date', filters.date);
    if (filters?.barberId) params.append('barberId', filters.barberId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient<Appointment[]>(`/owner/appointments${query}`);
  },

  async updateStatus(id: string, status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'): Promise<Appointment> {
    return apiClient<Appointment>(`/owner/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};
