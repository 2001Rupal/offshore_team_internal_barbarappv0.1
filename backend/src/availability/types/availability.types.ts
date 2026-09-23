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

export interface TimeIntervalMinutes {
  start: number; // minutes from midnight [0..1440)
  end: number; // minutes from midnight [0..1440)
}

export interface AppointmentInterval {
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  status?: string;
}
