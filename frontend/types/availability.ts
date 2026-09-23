export type SlotStatus = 'AVAILABLE' | 'UNAVAILABLE';

export interface AvailabilitySlot {
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  status: SlotStatus;
}

export interface AvailabilityResult {
  date: string; // "YYYY-MM-DD"
  timezone: string;
  barberId: string;
  serviceId: string;
  serviceDurationMinutes: number;
  bufferMinutes: number;
  slots: AvailabilitySlot[];
}
