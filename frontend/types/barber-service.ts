export interface BarberService {
  id: string;
  name: string;
  description?: string;
  duration?: number;
  durationMinutes: number;
  price: number;
  status?: 'ACTIVE' | 'INACTIVE';
  isActive: boolean;
}

export interface BarberServicesResponse {
  barberId: string;
  services: BarberService[];
}

export interface UpdateBarberServicesRequest {
  serviceIds: string[];
}
