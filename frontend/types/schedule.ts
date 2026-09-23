export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface ScheduleBreak {
  startTime: string;
  endTime: string;
}

export interface DaySchedule {
  id?: string;
  barberId?: string;
  dayOfWeek: DayOfWeek;
  isWorking: boolean;
  startTime?: string;
  endTime?: string;
  breaks?: ScheduleBreak[];
}

export type ScheduleExceptionType = 'OFF' | 'CUSTOM_HOURS';

export interface ScheduleException {
  id: string;
  barberId: string;
  date: string;
  type: ScheduleExceptionType;
  startTime?: string;
  endTime?: string;
  reason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateScheduleExceptionPayload {
  date: string;
  type: ScheduleExceptionType;
  startTime?: string;
  endTime?: string;
  reason?: string;
}

export interface UpdateScheduleExceptionPayload {
  date?: string;
  type?: ScheduleExceptionType;
  startTime?: string;
  endTime?: string;
  reason?: string;
}
