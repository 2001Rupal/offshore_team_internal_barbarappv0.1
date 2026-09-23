'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Barber } from '../../types';
import { barberServicesService } from '../../services/barber-service.service';
import { availabilityService } from '../../services/availability.service';
import { Portal } from '../portal';
import {
  X,
  Clock,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Scissors,
  Globe,
  Hourglass,
} from 'lucide-react';

interface AvailabilityModalProps {
  isOpen?: boolean;
  onClose: () => void;
  barber: Barber | null;
}

export function formatTo12Hour(time24: string): string {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

export default function AvailabilityModal({
  isOpen = true,
  onClose,
  barber,
}: AvailabilityModalProps) {
  // Format today's date as YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');

  // Fetch assigned services for this barber
  const { data: servicesData, isLoading: isLoadingServices } = useQuery({
    queryKey: ['barber-services', barber?.id],
    queryFn: () =>
      barber ? barberServicesService.getBarberServices(barber.id) : Promise.resolve({ barberId: '', services: [] }),
    enabled: isOpen && !!barber?.id,
  });

  const services = servicesData?.services || [];

  // Auto-select first service if not selected
  useEffect(() => {
    if (services.length > 0 && (!selectedServiceId || !services.some((s) => s.id === selectedServiceId))) {
      setSelectedServiceId(services[0].id);
    }
  }, [services, selectedServiceId]);

  // Fetch availability slots from Level 2.3 engine
  const {
    data: availabilityData,
    isLoading: isLoadingAvailability,
    error: availabilityError,
    refetch,
  } = useQuery({
    queryKey: ['availability', barber?.id, selectedDate, selectedServiceId],
    queryFn: () =>
      barber && selectedDate && selectedServiceId
        ? availabilityService.getAvailability(barber.id, selectedDate, selectedServiceId)
        : Promise.reject('Missing parameters'),
    enabled: isOpen && !!barber?.id && !!selectedDate && !!selectedServiceId,
    staleTime: 10_000,
  });

  if (!isOpen || !barber) return null;

  const selectedService = services.find((s) => s.id === selectedServiceId);
  const slots = availabilityData?.slots || [];

  return (
    <Portal onClose={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        />

        {/* Dialog Container */}
        <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/80 transition-all overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 bg-zinc-950/60">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-500 shadow-xs">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <span>Slot Engine & Availability</span>
                  <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Level 2.3
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Real-time slot engine evaluation for <strong className="text-zinc-200">{barber.name}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto p-6 space-y-5">
            {/* Parameters Row: Date Picker & Service Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4">
              {/* Date Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-amber-400" />
                  <span>Target Date (YYYY-MM-DD)</span>
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-hidden transition"
                />
              </div>

              {/* Service Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Scissors className="h-3.5 w-3.5 text-amber-400" />
                  <span>Assigned Service</span>
                </label>
                {isLoadingServices ? (
                  <div className="h-9 w-full rounded-xl bg-zinc-800/60 animate-pulse" />
                ) : services.length === 0 ? (
                  <p className="text-xs text-rose-400 py-2">
                    No services assigned to this barber yet.
                  </p>
                ) : (
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-hidden transition"
                  >
                    {services.map((svc) => (
                      <option key={svc.id} value={svc.id}>
                        {svc.name} ({svc.durationMinutes}m • ₹{svc.price})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Engine Calculation Specs */}
            {availabilityData && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-xs text-zinc-300">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-zinc-200">
                    <Hourglass className="h-3.5 w-3.5 text-amber-400" />
                    <span>
                      Duration: <strong>{availabilityData.serviceDurationMinutes}m</strong>
                    </span>
                    {availabilityData.bufferMinutes > 0 && (
                      <span className="text-zinc-400">
                        (+{availabilityData.bufferMinutes}m buffer)
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <Globe className="h-3.5 w-3.5 text-amber-400/80" />
                    <span>{availabilityData.timezone}</span>
                  </span>
                </div>
                <div className="font-semibold text-amber-400">
                  {slots.length} available {slots.length === 1 ? 'slot' : 'slots'}
                </div>
              </div>
            )}

            {/* Slots View Area */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Available Booking Slots
                </span>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition"
                >
                  Refresh calculation
                </button>
              </div>

              {isLoadingAvailability ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-12 rounded-xl bg-zinc-800/50 animate-pulse"
                    />
                  ))}
                </div>
              ) : availabilityError ? (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Availability Query Failed</strong>
                    <span>{String(availabilityError)}</span>
                  </div>
                </div>
              ) : slots.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/30 py-10 px-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800/80 text-zinc-400 mb-3">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">No Slots Available</h4>
                  <p className="mt-1 max-w-sm text-xs text-zinc-400">
                    The barber has no eligible slots on {selectedDate}. They may be off, on leave, or all available shifts for today have already passed.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {slots.map((slot, index) => (
                    <div
                      key={index}
                      className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/60 p-2.5 hover:border-amber-500/40 hover:bg-zinc-900 transition group"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-white group-hover:text-amber-400 transition">
                        <span>{formatTo12Hour(slot.startTime)}</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        until {formatTo12Hour(slot.endTime)}
                      </div>
                      <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        AVAILABLE
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end border-t border-zinc-800 bg-zinc-950/60 px-6 py-3.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 hover:text-white transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
