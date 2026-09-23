export interface User {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'BARBER' | 'CUSTOMER';
  phone?: string;
  age?: number;
  gender?: string;
}

export interface Shop {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  timezone?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Barber {
  id: string;
  shopId: string;
  name: string;
  phone?: string;
  email?: string;
  experienceYears?: number;
  bio?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceItem {
  id: string;
  shopId: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  bufferTime?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp?: string;
  path?: string;
}

export * from './barber-service';
export * from './availability';
