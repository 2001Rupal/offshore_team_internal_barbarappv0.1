import { apiClient } from '../lib/api-client';
import {
  DaySchedule,
  ScheduleException,
  CreateScheduleExceptionPayload,
  UpdateScheduleExceptionPayload,
} from '../types/schedule';

export const scheduleService = {
  async getWeeklySchedule(barberId: string): Promise<DaySchedule[]> {
    return apiClient<DaySchedule[]>(`/barbers/${barberId}/schedule`);
  },

  async updateWeeklySchedule(
    barberId: string,
    weeklySchedule: DaySchedule[],
  ): Promise<DaySchedule[]> {
    const sanitizedSchedule = weeklySchedule.map((d) => ({
      dayOfWeek: d.dayOfWeek,
      isWorking: Boolean(d.isWorking),
      ...(d.isWorking && d.startTime ? { startTime: d.startTime } : {}),
      ...(d.isWorking && d.endTime ? { endTime: d.endTime } : {}),
      breaks: (d.isWorking && d.breaks ? d.breaks : []).map((b) => ({
        startTime: b.startTime,
        endTime: b.endTime,
      })),
    }));

    return apiClient<DaySchedule[]>(`/barbers/${barberId}/schedule`, {
      method: 'PUT',
      body: JSON.stringify({ weeklySchedule: sanitizedSchedule }),
    });
  },

  async getExceptions(barberId: string): Promise<ScheduleException[]> {
    return apiClient<ScheduleException[]>(`/barbers/${barberId}/schedule/exceptions`);
  },

  async createException(
    barberId: string,
    payload: CreateScheduleExceptionPayload,
  ): Promise<ScheduleException> {
    return apiClient<ScheduleException>(`/barbers/${barberId}/schedule/exceptions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateException(
    exceptionId: string,
    payload: UpdateScheduleExceptionPayload,
  ): Promise<ScheduleException> {
    return apiClient<ScheduleException>(`/schedule-exceptions/${exceptionId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deleteException(exceptionId: string): Promise<{ message: string; id: string }> {
    return apiClient<{ message: string; id: string }>(`/schedule-exceptions/${exceptionId}`, {
      method: 'DELETE',
    });
  },
};
