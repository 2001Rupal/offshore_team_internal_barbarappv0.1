'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleService } from '../../services/schedule.service';
import { useAuth } from '../../lib/auth-context';
import { Barber } from '../../types';
import { Portal } from '../portal';
import {
  DaySchedule,
  DayOfWeek,
  ScheduleBreak,
  ScheduleExceptionType,
} from '../../types/schedule';
import {
  X,
  Calendar,
  Clock,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  Coffee,
  Save,
  Copy,
  Sparkles,
  Globe,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface BarberScheduleModalProps {
  barber: Barber;
  onClose: () => void;
}

const DAYS_OF_WEEK: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
};

// Helper to convert "HH:mm" to total minutes
function timeToMinutes(time: string): number {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Format minutes into "Xh Ym"
function formatMinutesToHours(minutes: number): string {
  if (minutes <= 0) return '0h';
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (rem === 0) return `${hours}h`;
  return `${hours}h ${rem}m`;
}

// Format 24-hr "HH:mm" to 12-hr AM/PM format (e.g. "10:00" -> "10:00 AM", "20:00" -> "8:00 PM")
export function formatTo12Hour(time?: string): string {
  if (!time) return '';
  const [hStr, mStr] = time.split(':');
  const hours = parseInt(hStr, 10);
  const minutes = mStr !== undefined ? mStr.padStart(2, '0') : '00';
  if (isNaN(hours)) return time;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${minutes} ${period}`;
}

// Validate a single day schedule for inline errors
function getDayValidationErrors(day: DaySchedule): string[] {
  if (!day.isWorking) return [];
  const errors: string[] = [];

  if (!day.startTime || !day.endTime) {
    errors.push('Shift start and end times are required');
    return errors;
  }

  const shiftStart = timeToMinutes(day.startTime);
  const shiftEnd = timeToMinutes(day.endTime);

  if (shiftStart >= shiftEnd) {
    errors.push(`Shift start time (${formatTo12Hour(day.startTime)}) must be before end time (${formatTo12Hour(day.endTime)})`);
  }

  const breaks = day.breaks || [];
  for (let i = 0; i < breaks.length; i++) {
    const b = breaks[i];
    const bStart = timeToMinutes(b.startTime);
    const bEnd = timeToMinutes(b.endTime);

    if (bStart >= bEnd) {
      errors.push(`Break #${i + 1} (${formatTo12Hour(b.startTime)} – ${formatTo12Hour(b.endTime)}) has invalid times`);
    } else if (bStart < shiftStart || bEnd > shiftEnd) {
      errors.push(`Break #${i + 1} must fall within shift (${formatTo12Hour(day.startTime)} – ${formatTo12Hour(day.endTime)})`);
    }
  }

  // Check break overlaps
  const sortedBreaks = [...breaks].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
  );
  for (let i = 0; i < sortedBreaks.length - 1; i++) {
    const currentEnd = timeToMinutes(sortedBreaks[i].endTime);
    const nextStart = timeToMinutes(sortedBreaks[i + 1].startTime);
    if (currentEnd > nextStart) {
      errors.push('Break periods overlap with each other');
      break;
    }
  }

  return errors;
}

// Helper to parse 24h "HH:mm" into 12h parts
export function parse24to12(time24?: string) {
  if (!time24) return { hour: 10, minute: '00', ampm: 'AM' as const };
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  if (isNaN(h)) h = 10;
  const minute = mStr ? mStr.padStart(2, '0') : '00';
  const ampm = h >= 12 ? ('PM' as const) : ('AM' as const);
  const hour = h % 12 === 0 ? 12 : h % 12;
  return { hour, minute, ampm };
}

// Helper to format 12h parts back into standard 24h "HH:mm"
export function format12to24(hour: number, minute: string, ampm: 'AM' | 'PM'): string {
  let h = hour;
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return `${h.toString().padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

// Integrated 12-Hour Time Picker with direct AM/PM selector
export function TimePicker12({
  value,
  onChange,
  className = '',
}: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
}) {
  const { hour, minute, ampm } = parse24to12(value);

  const handleHourChange = (newH: number) => {
    onChange(format12to24(newH, minute, ampm));
  };

  const handleMinuteChange = (newM: string) => {
    onChange(format12to24(hour, newM, ampm));
  };

  const handleAmPmChange = (newAmPm: 'AM' | 'PM') => {
    if (newAmPm !== ampm) {
      onChange(format12to24(hour, minute, newAmPm));
    }
  };

  const standardMinutes = [
    '00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55',
  ];
  const minutesList = standardMinutes.includes(minute)
    ? standardMinutes
    : Array.from(new Set([...standardMinutes, minute])).sort();

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/90 px-2.5 py-1 shadow-xs focus-within:border-amber-500/80 transition ${className}`}
    >
      <Clock className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
      <div className="flex items-center">
        <select
          value={hour}
          onChange={(e) => handleHourChange(Number(e.target.value))}
          className="bg-transparent text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none cursor-pointer pr-0.5"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
            <option key={h} value={h} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
              {h.toString().padStart(2, '0')}
            </option>
          ))}
        </select>
        <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 mx-0.5">:</span>
        <select
          value={minute}
          onChange={(e) => handleMinuteChange(e.target.value)}
          className="bg-transparent text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none cursor-pointer px-0.5"
        >
          {minutesList.map((m) => (
            <option key={m} value={m} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
              {m}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center rounded-lg bg-zinc-100 dark:bg-zinc-950/80 p-0.5 border border-zinc-200 dark:border-zinc-800 ml-1">
        <button
          type="button"
          onClick={() => handleAmPmChange('AM')}
          className={`rounded px-1.5 py-0.5 text-[10px] font-bold transition select-none ${
            ampm === 'AM'
              ? 'bg-amber-500 text-zinc-950 shadow-xs'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          AM
        </button>
        <button
          type="button"
          onClick={() => handleAmPmChange('PM')}
          className={`rounded px-1.5 py-0.5 text-[10px] font-bold transition select-none ${
            ampm === 'PM'
              ? 'bg-amber-500 text-zinc-950 shadow-xs'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          PM
        </button>
      </div>
    </div>
  );
}

export default function BarberScheduleModal({ barber, onClose }: BarberScheduleModalProps) {
  const { shop } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'weekly' | 'exceptions'>('weekly');
  const [scheduleState, setScheduleState] = useState<DaySchedule[]>([]);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Exception Form State
  const [exceptionDate, setExceptionDate] = useState('');
  const [exceptionType, setExceptionType] = useState<ScheduleExceptionType>('OFF');
  const [exceptionStartTime, setExceptionStartTime] = useState('10:00');
  const [exceptionEndTime, setExceptionEndTime] = useState('18:00');
  const [exceptionReason, setExceptionReason] = useState('');
  const [deletingExceptionId, setDeletingExceptionId] = useState<string | null>(null);

  // 1. Fetch Weekly Schedule
  const { data: weeklySchedule = [], isLoading: isLoadingSchedule } = useQuery({
    queryKey: ['schedule', barber.id],
    queryFn: () => scheduleService.getWeeklySchedule(barber.id),
  });

  // 2. Fetch Exceptions
  const { data: exceptions = [], isLoading: isLoadingExceptions } = useQuery({
    queryKey: ['schedule-exceptions', barber.id],
    queryFn: () => scheduleService.getExceptions(barber.id),
  });

  // Synchronize local editable state when query loads
  useEffect(() => {
    if (weeklySchedule.length > 0) {
      setScheduleState(JSON.parse(JSON.stringify(weeklySchedule)));
    }
  }, [weeklySchedule]);

  // Mutations
  const updateScheduleMutation = useMutation({
    mutationFn: (schedules: DaySchedule[]) =>
      scheduleService.updateWeeklySchedule(barber.id, schedules),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', barber.id] });
      queryClient.invalidateQueries({ queryKey: ['schedules-all-barbers'] });
      onClose();
    },
    onError: (err: any) => {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Failed to update weekly schedule',
      });
    },
  });

  const createExceptionMutation = useMutation({
    mutationFn: () =>
      scheduleService.createException(barber.id, {
        date: exceptionDate,
        type: exceptionType,
        startTime: exceptionType === 'CUSTOM_HOURS' ? exceptionStartTime : undefined,
        endTime: exceptionType === 'CUSTOM_HOURS' ? exceptionEndTime : undefined,
        reason: exceptionReason || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-exceptions', barber.id] });
      setExceptionDate('');
      setExceptionReason('');
      onClose();
    },
    onError: (err: any) => {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Failed to add schedule exception',
      });
    },
  });

  const deleteExceptionMutation = useMutation({
    mutationFn: (exceptionId: string) => scheduleService.deleteException(exceptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-exceptions', barber.id] });
      setDeletingExceptionId(null);
      setFeedbackMsg({ type: 'success', text: 'Schedule exception removed successfully!' });
    },
    onError: (err: any) => {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Failed to delete schedule exception',
      });
    },
  });

  // Check overall schedule validity
  const allValidationErrors = useMemo(() => {
    const errorMap: Record<DayOfWeek, string[]> = {} as any;
    let hasAnyError = false;
    for (const day of scheduleState) {
      const errs = getDayValidationErrors(day);
      if (errs.length > 0) {
        errorMap[day.dayOfWeek] = errs;
        hasAnyError = true;
      }
    }
    return { errorMap, hasAnyError };
  }, [scheduleState]);

  // Local state update handlers
  const handleToggleWorking = (dayOfWeek: DayOfWeek) => {
    setScheduleState((prev) =>
      prev.map((day) => {
        if (day.dayOfWeek === dayOfWeek) {
          const nextWorking = !day.isWorking;
          return {
            ...day,
            isWorking: nextWorking,
            startTime: nextWorking ? day.startTime || '10:00' : undefined,
            endTime: nextWorking ? day.endTime || '20:00' : undefined,
            breaks: nextWorking ? (day.breaks && day.breaks.length > 0 ? day.breaks : [{ startTime: '13:00', endTime: '14:00' }]) : [],
          };
        }
        return day;
      }),
    );
  };

  const handleTimeChange = (
    dayOfWeek: DayOfWeek,
    field: 'startTime' | 'endTime',
    value: string,
  ) => {
    setScheduleState((prev) =>
      prev.map((day) => {
        if (day.dayOfWeek === dayOfWeek) {
          return { ...day, [field]: value };
        }
        return day;
      }),
    );
  };

  const handleAddBreak = (dayOfWeek: DayOfWeek) => {
    setScheduleState((prev) =>
      prev.map((day) => {
        if (day.dayOfWeek === dayOfWeek) {
          const currentBreaks = day.breaks || [];
          return {
            ...day,
            breaks: [...currentBreaks, { startTime: '13:00', endTime: '14:00' }],
          };
        }
        return day;
      }),
    );
  };

  const handleBreakChange = (
    dayOfWeek: DayOfWeek,
    breakIndex: number,
    field: 'startTime' | 'endTime',
    value: string,
  ) => {
    setScheduleState((prev) =>
      prev.map((day) => {
        if (day.dayOfWeek === dayOfWeek) {
          const updatedBreaks = [...(day.breaks || [])];
          updatedBreaks[breakIndex] = {
            ...updatedBreaks[breakIndex],
            [field]: value,
          };
          return { ...day, breaks: updatedBreaks };
        }
        return day;
      }),
    );
  };

  const handleRemoveBreak = (dayOfWeek: DayOfWeek, breakIndex: number) => {
    setScheduleState((prev) =>
      prev.map((day) => {
        if (day.dayOfWeek === dayOfWeek) {
          const updatedBreaks = (day.breaks || []).filter((_, idx) => idx !== breakIndex);
          return { ...day, breaks: updatedBreaks };
        }
        return day;
      }),
    );
  };

  // Quick action: Copy Monday to Weekdays (Tue - Fri)
  const handleCopyMondayToWeekdays = () => {
    const monday = scheduleState.find((d) => d.dayOfWeek === 'MONDAY');
    if (!monday) return;

    setScheduleState((prev) =>
      prev.map((d) => {
        if (['TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].includes(d.dayOfWeek)) {
          return {
            ...d,
            isWorking: monday.isWorking,
            startTime: monday.startTime,
            endTime: monday.endTime,
            breaks: monday.breaks ? JSON.parse(JSON.stringify(monday.breaks)) : [],
          };
        }
        return d;
      }),
    );
    setFeedbackMsg({
      type: 'success',
      text: "Copied Monday's hours & breaks to Tuesday – Friday!",
    });
  };

  // Quick action: Copy Monday to All Working Days (Tue - Sat)
  const handleCopyMondayToSat = () => {
    const monday = scheduleState.find((d) => d.dayOfWeek === 'MONDAY');
    if (!monday) return;

    setScheduleState((prev) =>
      prev.map((d) => {
        if (['TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].includes(d.dayOfWeek)) {
          return {
            ...d,
            isWorking: monday.isWorking,
            startTime: monday.startTime,
            endTime: monday.endTime,
            breaks: monday.breaks ? JSON.parse(JSON.stringify(monday.breaks)) : [],
          };
        }
        return d;
      }),
    );
    setFeedbackMsg({
      type: 'success',
      text: "Copied Monday's schedule to Tuesday – Saturday!",
    });
  };

  // Quick action: Apply Standard Preset (Mon-Sat 10:00 - 20:00, Sun OFF)
  const handleApplyStandardPreset = () => {
    setScheduleState((prev) =>
      prev.map((d) => {
        const isSunday = d.dayOfWeek === 'SUNDAY';
        return {
          ...d,
          isWorking: !isSunday,
          startTime: isSunday ? undefined : '10:00',
          endTime: isSunday ? undefined : '20:00',
          breaks: isSunday ? [] : [{ startTime: '13:00', endTime: '14:00' }],
        };
      }),
    );
    setFeedbackMsg({
      type: 'success',
      text: 'Applied standard preset: Mon–Sat 10:00 AM – 8:00 PM (Lunch 1:00 PM – 2:00 PM), Sunday OFF',
    });
  };

  const handleSaveWeekly = (e: React.FormEvent) => {
    e.preventDefault();
    if (allValidationErrors.hasAnyError) {
      setFeedbackMsg({
        type: 'error',
        text: 'Please resolve the highlighted timing errors before saving.',
      });
      return;
    }
    updateScheduleMutation.mutate(scheduleState);
  };

  const handleAddExceptionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exceptionDate) {
      setFeedbackMsg({ type: 'error', text: 'Please select a date for the exception' });
      return;
    }
    createExceptionMutation.mutate();
  };

  return (
    <Portal onClose={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 sm:p-5 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget && !updateScheduleMutation.isPending) onClose();
        }}
      >
      <div className="relative w-full max-w-4xl rounded-2xl border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-950 shadow-2xl text-zinc-900 dark:text-zinc-100 my-auto max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150 ring-1 ring-black/5 dark:ring-white/5 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 px-6 py-4 bg-zinc-50/80 dark:bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 dark:text-amber-400 font-bold text-sm">
              {barber.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
                  {barber.name}’s Schedule
                </h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    barber.isActive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {barber.isActive ? 'Active Barber' : 'Inactive'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                  <Globe className="h-3 w-3 text-amber-500 dark:text-amber-400" />
                  <span>{shop?.timezone || 'Asia/Kolkata'}</span>
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Manage weekly working shifts, break periods, and calendar date exceptions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/20 px-6 pt-2 shrink-0">
          <button
            onClick={() => setActiveTab('weekly')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === 'weekly'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Weekly Working Hours</span>
          </button>
          <button
            onClick={() => setActiveTab('exceptions')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === 'exceptions'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            <span>Date Exceptions ({exceptions.length})</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`mx-6 mt-4 flex items-center justify-between rounded-xl border p-3 text-xs shrink-0 ${
              feedbackMsg.type === 'success'
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
            <button onClick={() => setFeedbackMsg(null)}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-0">
          {/* TAB 1: WEEKLY SCHEDULE */}
          {activeTab === 'weekly' && (
            <div>
              {isLoadingSchedule ? (
                <div className="flex h-48 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                </div>
              ) : (
                <form onSubmit={handleSaveWeekly} className="space-y-4">
                  {/* Quick Setup Toolbar */}
                  <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/40 p-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                        <span>Quick Setup Tools</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopyMondayToWeekdays}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:border-amber-500/40 hover:text-amber-600 dark:hover:text-amber-400 transition shadow-xs"
                          title="Copy Monday's times to Tue, Wed, Thu, Fri"
                        >
                          <Copy className="h-3 w-3" />
                          <span>Monday &rarr; Mon–Fri</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyMondayToSat}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:border-amber-500/40 hover:text-amber-600 dark:hover:text-amber-400 transition shadow-xs"
                          title="Copy Monday's times to Tue, Wed, Thu, Fri, Sat"
                        >
                          <Copy className="h-3 w-3" />
                          <span>Monday &rarr; Mon–Sat</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleApplyStandardPreset}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition shadow-xs"
                          title="Set Mon-Sat 10:00 AM – 8:00 PM, Sun OFF"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Standard 10 AM – 8 PM</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 7 Days List */}
                  <div className="space-y-3">
                    {scheduleState.map((day) => {
                      const dayErrors = allValidationErrors.errorMap[day.dayOfWeek] || [];
                      const hasError = dayErrors.length > 0;

                      let totalDutyMinutes = 0;
                      let totalBreakMinutes = 0;
                      if (day.isWorking && day.startTime && day.endTime) {
                        const start = timeToMinutes(day.startTime);
                        const end = timeToMinutes(day.endTime);
                        if (end > start) {
                          totalDutyMinutes = end - start;
                          for (const b of day.breaks || []) {
                            const bs = timeToMinutes(b.startTime);
                            const be = timeToMinutes(b.endTime);
                            if (be > bs && bs >= start && be <= end) {
                              totalBreakMinutes += (be - bs);
                            }
                          }
                        }
                      }
                      const netMinutes = Math.max(0, totalDutyMinutes - totalBreakMinutes);

                      return (
                        <div
                          key={day.dayOfWeek}
                          className={`rounded-2xl border p-4 transition ${
                            hasError
                              ? 'border-red-500/40 bg-red-500/5'
                              : day.isWorking
                              ? 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/50'
                              : 'border-zinc-200 dark:border-zinc-900 bg-zinc-100/50 dark:bg-zinc-950/40 opacity-70'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            {/* Day & Working Toggle */}
                            <div className="flex items-center gap-3">
                              <label className="relative inline-flex cursor-pointer items-center">
                                <input
                                  type="checkbox"
                                  checked={day.isWorking}
                                  onChange={() => handleToggleWorking(day.dayOfWeek)}
                                  className="peer sr-only"
                                />
                                <div className="peer h-5 w-9 rounded-full bg-zinc-200 dark:bg-zinc-800 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white dark:after:bg-zinc-400 after:transition-all after:content-[''] peer-checked:bg-amber-500 peer-checked:after:translate-x-full peer-checked:after:bg-zinc-950" />
                              </label>
                              <div>
                                <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                                  {DAY_LABELS[day.dayOfWeek]}
                                </span>
                                <span
                                  className={`ml-2 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                                    day.isWorking
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                                  }`}
                                >
                                  {day.isWorking ? 'Working' : 'OFF'}
                                </span>
                              </div>
                            </div>

                            {/* Hours Selector */}
                            {day.isWorking ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <TimePicker12
                                  value={day.startTime || '10:00'}
                                  onChange={(val) =>
                                    handleTimeChange(day.dayOfWeek, 'startTime', val)
                                  }
                                />
                                <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">to</span>
                                <TimePicker12
                                  value={day.endTime || '20:00'}
                                  onChange={(val) =>
                                    handleTimeChange(day.dayOfWeek, 'endTime', val)
                                  }
                                />

                                <button
                                  type="button"
                                  onClick={() => handleAddBreak(day.dayOfWeek)}
                                  className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-800/80 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:border-amber-500/40 hover:text-amber-600 dark:hover:text-amber-400 transition shadow-xs ml-1"
                                >
                                  <Plus className="h-3 w-3" />
                                  <span>Break</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-400 dark:text-zinc-500 italic">Day off</span>
                            )}
                          </div>

                          {/* Visual Day Timeline Bar */}
                          {day.isWorking && day.startTime && day.endTime && !hasError && (
                            <div className="mt-3.5 pt-2.5 border-t border-zinc-200 dark:border-zinc-800/50">
                              <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mb-1.5">
                                <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-medium">
                                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatTo12Hour(day.startTime)} – {formatTo12Hour(day.endTime)}</span>
                                  <span className="text-zinc-400 dark:text-zinc-500 text-[10px]">({day.startTime} – {day.endTime})</span>
                                </span>
                                <span className="text-zinc-500 dark:text-zinc-400 text-[10px]">
                                  <strong className="text-amber-600 dark:text-amber-400">{formatMinutesToHours(netMinutes)}</strong> net working time
                                  {totalBreakMinutes > 0 && ` (${formatMinutesToHours(totalBreakMinutes)} breaks)`}
                                </span>
                              </div>

                              {/* Timeline track (08:00 to 22:00 = 840 mins) */}
                              <div className="relative h-2.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800/80 overflow-hidden">
                                {(() => {
                                  const baseStart = 8 * 60;
                                  const baseTotal = 14 * 60;
                                  const startMin = timeToMinutes(day.startTime);
                                  const endMin = timeToMinutes(day.endTime);

                                  const shiftLeft = Math.max(0, Math.min(100, ((startMin - baseStart) / baseTotal) * 100));
                                  const shiftWidth = Math.max(2, Math.min(100 - shiftLeft, ((endMin - startMin) / baseTotal) * 100));

                                  return (
                                    <>
                                      <div
                                        className="absolute top-0 bottom-0 bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full"
                                        style={{ left: `${shiftLeft}%`, width: `${shiftWidth}%` }}
                                      />
                                      {(day.breaks || []).map((b, bIdx) => {
                                        const bStart = timeToMinutes(b.startTime);
                                        const bEnd = timeToMinutes(b.endTime);
                                        if (bEnd <= bStart) return null;
                                        const bLeft = Math.max(0, Math.min(100, ((bStart - baseStart) / baseTotal) * 100));
                                        const bWidth = Math.max(1, Math.min(100 - bLeft, ((bEnd - bStart) / baseTotal) * 100));
                                        return (
                                          <div
                                            key={bIdx}
                                            title={`Break: ${formatTo12Hour(b.startTime)} – ${formatTo12Hour(b.endTime)}`}
                                            className="absolute top-0 bottom-0 bg-white dark:bg-zinc-950 border border-amber-400/80 rounded"
                                            style={{ left: `${bLeft}%`, width: `${bWidth}%` }}
                                          />
                                        );
                                      })}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          )}

                          {/* Inline Validation Warnings */}
                          {hasError && (
                            <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-500 dark:text-red-400 space-y-1">
                              {dayErrors.map((err, errIdx) => (
                                <div key={errIdx} className="flex items-center gap-1.5">
                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                  <span>{err}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Breaks List */}
                          {day.isWorking && day.breaks && day.breaks.length > 0 && (
                            <div className="mt-3.5 pt-3 border-t border-zinc-200 dark:border-zinc-800/60 pl-2 sm:pl-4 space-y-2">
                              <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                                <Coffee className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                                <span>Scheduled Breaks ({day.breaks.length})</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {day.breaks.map((b, idx) => (
                                  <div
                                    key={idx}
                                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-950 p-1.5 text-xs shadow-xs"
                                  >
                                    <TimePicker12
                                      value={b.startTime}
                                      onChange={(val) =>
                                        handleBreakChange(
                                          day.dayOfWeek,
                                          idx,
                                          'startTime',
                                          val,
                                        )
                                      }
                                    />
                                    <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">to</span>
                                    <TimePicker12
                                      value={b.endTime}
                                      onChange={(val) =>
                                        handleBreakChange(
                                          day.dayOfWeek,
                                          idx,
                                          'endTime',
                                          val,
                                        )
                                      }
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveBreak(day.dayOfWeek, idx)}
                                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-red-500 transition ml-0.5"
                                      title="Remove this break"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Sticky Footer Actions */}
                  <div className="sticky -bottom-5 sm:-bottom-6 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 mt-6 border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl z-20">
                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <Clock className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                      <span>
                        <strong className="text-zinc-900 dark:text-zinc-200">
                          {scheduleState.filter((d) => d.isWorking).length} working days
                        </strong>{' '}
                        configured for {barber.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 sm:flex-none rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={updateScheduleMutation.isPending || allValidationErrors.hasAnyError}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-bold text-zinc-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition disabled:opacity-50"
                      >
                        {updateScheduleMutation.isPending ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        <span>
                          {allValidationErrors.hasAnyError
                            ? 'Resolve Timing Errors to Save'
                            : 'Save Weekly Shifts'}
                        </span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: DATE EXCEPTIONS */}
          {activeTab === 'exceptions' && (
            <div className="space-y-6">
              {/* Form to Add New Exception */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-5 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
                  <Calendar className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                  <span>Add Date-Specific Exception</span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Override normal weekly hours for specific dates (such as leaves, festivals, or custom emergency shifts).
                </p>

                <form onSubmit={handleAddExceptionSubmit} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Date *</label>
                      <input
                        type="date"
                        required
                        value={exceptionDate}
                        onChange={(e) => setExceptionDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Exception Type *</label>
                      <select
                        value={exceptionType}
                        onChange={(e) =>
                          setExceptionType(e.target.value as ScheduleExceptionType)
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none"
                      >
                        <option value="OFF">OFF (Full Day Off / Leave)</option>
                        <option value="CUSTOM_HOURS">CUSTOM_HOURS (Custom Shift Times)</option>
                      </select>
                    </div>
                  </div>

                  {exceptionType === 'CUSTOM_HOURS' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 rounded-xl border border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5">
                      <div>
                        <label className="block text-xs font-medium text-amber-700 dark:text-amber-300 mb-1.5">
                          Custom Start Time *
                        </label>
                        <TimePicker12
                          value={exceptionStartTime}
                          onChange={setExceptionStartTime}
                          className="w-full justify-between"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-amber-700 dark:text-amber-300 mb-1.5">
                          Custom End Time *
                        </label>
                        <TimePicker12
                          value={exceptionEndTime}
                          onChange={setExceptionEndTime}
                          className="w-full justify-between"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Reason / Note (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Festival holiday, Personal leave, Special shift"
                      value={exceptionReason}
                      onChange={(e) => setExceptionReason(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 px-3.5 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createExceptionMutation.isPending}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 transition disabled:opacity-50"
                    >
                      {createExceptionMutation.isPending ? (
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      <span>Add Exception</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* List of Existing Exceptions */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Configured Exceptions ({exceptions.length})
                </h3>

                {isLoadingExceptions ? (
                  <div className="flex h-24 items-center justify-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                  </div>
                ) : exceptions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center bg-zinc-50/50 dark:bg-transparent">
                    <CalendarDays className="mx-auto h-8 w-8 text-zinc-400 dark:text-zinc-600" />
                    <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                      No schedule exceptions configured yet.
                    </p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                      Regular weekly working hours apply to all upcoming dates by default.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 overflow-hidden shadow-xs">
                    {exceptions.map((exc) => (
                      <div
                        key={exc.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-3 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition"
                      >
                        <div className="flex flex-wrap items-center gap-2.5">
                          <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                            {exc.date}
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                              exc.type === 'OFF'
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {exc.type === 'OFF'
                              ? 'OFF (Day Off)'
                              : `Custom Hours (${formatTo12Hour(exc.startTime)} – ${formatTo12Hour(exc.endTime)})`}
                          </span>
                          {exc.reason && (
                            <span className="text-zinc-500 dark:text-zinc-400 text-[11px] italic">
                              &ldquo;{exc.reason}&rdquo;
                            </span>
                          )}
                        </div>

                        {/* Delete with inline confirmation */}
                        <div>
                          {deletingExceptionId === exc.id ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Remove?</span>
                              <button
                                type="button"
                                onClick={() => deleteExceptionMutation.mutate(exc.id)}
                                disabled={deleteExceptionMutation.isPending}
                                className="rounded px-2 py-1 text-[10px] font-semibold bg-red-500/20 text-red-600 dark:text-red-300 hover:bg-red-500/30 transition"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingExceptionId(null)}
                                className="rounded px-2 py-1 text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingExceptionId(exc.id)}
                              title="Delete exception"
                              className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-500/10 hover:text-red-500 transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end pt-3 border-t border-zinc-200 dark:border-zinc-800/80">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 transition shadow-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </Portal>
  );
}
