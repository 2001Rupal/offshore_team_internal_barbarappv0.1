'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { useQuery } from '@tanstack/react-query';
import { barberService } from '../../../services/barber.service';
import { barberServicesService } from '../../../services/barber-service.service';
import { scheduleService } from '../../../services/schedule.service';
import { Barber } from '../../../types';
import {
  CalendarDays,
  Scissors,
  Search,
  Users,
  CheckCircle2,
  Clock,
  Briefcase,
  AlertCircle,
  Calendar,
  Sparkles,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import BarberScheduleModal, { formatTo12Hour } from '../../../components/barbers/BarberScheduleModal';
import BarberServicesModal from '../../../components/barbers/BarberServicesModal';
import AvailabilityModal from '../../../components/barbers/AvailabilityModal';

function BarberShiftSummaryBadge({ barberId }: { barberId: string }) {
  const { data: schedule = [], isLoading } = useQuery({
    queryKey: ['schedule', barberId],
    queryFn: () => scheduleService.getWeeklySchedule(barberId),
    staleTime: 30_000,
  });

  if (isLoading) {
    return <span className="text-[11px] text-zinc-400 dark:text-zinc-500 animate-pulse">Loading shifts...</span>;
  }

  const workingDays = schedule.filter((d) => d.isWorking);

  if (workingDays.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/50 px-2.5 py-1 text-[11px] text-zinc-500 dark:text-zinc-400">
        <Clock className="h-3 w-3 text-zinc-400 dark:text-zinc-500" />
        <span>No weekly shifts configured</span>
      </span>
    );
  }

  // Pick first working day as reference for typical hours
  const sample = workingDays[0];
  const timeSummary =
    sample && sample.startTime && sample.endTime
      ? `${formatTo12Hour(sample.startTime)} – ${formatTo12Hour(sample.endTime)}`
      : 'Hours configured';

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs text-zinc-900 dark:text-zinc-200">
        <Clock className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
        <span className="font-semibold">{timeSummary}</span>
      </div>
      <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
        <span>{workingDays.length} working days / week</span>
      </div>
    </div>
  );
}

function BarberServicesBadge({
  barberId,
  onAssign,
}: {
  barberId: string;
  onAssign: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['barber-services', barberId],
    queryFn: () => barberServicesService.getBarberServices(barberId),
    staleTime: 30_000,
  });

  if (isLoading) {
    return <span className="text-[11px] text-zinc-400 dark:text-zinc-500 animate-pulse">Loading catalog...</span>;
  }

  const assigned = data?.services || [];

  if (assigned.length === 0) {
    return (
      <button
        type="button"
        onClick={onAssign}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline underline-offset-4 transition"
      >
        <Scissors className="h-3.5 w-3.5" />
        <span>Assign catalog services</span>
      </button>
    );
  }

  const totalDuration = assigned.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {assigned.slice(0, 3).map((service) => (
          <span
            key={service.id}
            className="rounded-lg bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/60 px-2 py-0.5 text-[11px] font-medium text-zinc-800 dark:text-zinc-200 shadow-xs"
          >
            {service.name}
          </span>
        ))}
        {assigned.length > 3 && (
          <span className="rounded-lg bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
            +{assigned.length - 3} more
          </span>
        )}
      </div>
      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
        {assigned.length} services • ~{totalDuration}m total capability
      </span>
    </div>
  );
}

export default function ManageShiftsPage() {
  const { shop } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [selectedBarberForSchedule, setSelectedBarberForSchedule] = useState<Barber | null>(null);
  const [selectedBarberForServices, setSelectedBarberForServices] = useState<Barber | null>(null);
  const [selectedBarberForAvailability, setSelectedBarberForAvailability] = useState<Barber | null>(null);

  const { data: barbers = [], isLoading } = useQuery({
    queryKey: ['barbers', shop?.id],
    queryFn: () => (shop ? barberService.getBarbersByShop(shop.id) : Promise.resolve([])),
    enabled: !!shop?.id,
  });

  const filteredBarbers = useMemo(() => {
    return barbers.filter((barber) => {
      const matchesSearch =
        barber.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (barber.bio && barber.bio.toLowerCase().includes(searchQuery.toLowerCase()));

      if (statusFilter === 'ACTIVE') return matchesSearch && barber.isActive;
      if (statusFilter === 'INACTIVE') return matchesSearch && !barber.isActive;
      return matchesSearch;
    });
  }, [barbers, searchQuery, statusFilter]);

  if (!shop) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 p-8 text-center">
        <AlertCircle className="h-10 w-10 text-amber-500" />
        <h2 className="mt-4 text-base font-semibold text-white">Shop Profile Required</h2>
        <p className="mt-1 text-xs text-zinc-400">
          Please configure your shop profile before managing barber shifts and services.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Interactive KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`rounded-2xl border p-4 text-left transition ${
            statusFilter === 'ALL'
              ? 'border-amber-500/50 bg-amber-500/5 shadow-xs ring-1 ring-amber-500/20'
              : 'border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Staff Roster</span>
            <Users className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{barbers.length}</p>
          <span className="mt-1 block text-[11px] text-zinc-500 dark:text-zinc-400">Total team members</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('ACTIVE')}
          className={`rounded-2xl border p-4 text-left transition ${
            statusFilter === 'ACTIVE'
              ? 'border-emerald-500/50 bg-emerald-500/5 shadow-xs ring-1 ring-emerald-500/20'
              : 'border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Active on Roster</span>
            <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {barbers.filter((b) => b.isActive).length}
          </p>
          <span className="mt-1 block text-[11px] text-zinc-500 dark:text-zinc-400">Currently taking appointments</span>
        </button>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 p-4 text-left shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Studio Timezone</span>
            <Clock className="h-4 w-4 text-amber-500 dark:text-amber-400" />
          </div>
          <p className="mt-2 text-xl font-bold text-zinc-900 dark:text-white truncate">
            {shop.timezone || 'Asia/Kolkata'}
          </p>
          <span className="mt-1 block text-[11px] text-zinc-500 dark:text-zinc-400">Operating base clock</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Search barber by name or specialty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 py-2 pl-10 pr-4 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-amber-500 focus:outline-none shadow-xs"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-900/60 p-1 text-xs overflow-x-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`rounded-lg px-3 py-1 font-medium transition ${
              statusFilter === 'ALL'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs border border-zinc-200/80 dark:border-transparent'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            All ({barbers.length})
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`rounded-lg px-3 py-1 font-medium transition ${
              statusFilter === 'ACTIVE'
                ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs border border-zinc-200/80 dark:border-transparent'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Active ({barbers.filter((b) => b.isActive).length})
          </button>
          <button
            onClick={() => setStatusFilter('INACTIVE')}
            className={`rounded-lg px-3 py-1 font-medium transition ${
              statusFilter === 'INACTIVE'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-300 shadow-xs border border-zinc-200/80 dark:border-transparent'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Inactive ({barbers.filter((b) => !b.isActive).length})
          </button>
        </div>
      </div>

      {/* Shifts & Services Management Cards */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          </div>
        ) : filteredBarbers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-12 text-center bg-zinc-50/50 dark:bg-transparent">
            <Users className="h-10 w-10 text-zinc-400 dark:text-zinc-600" />
            <p className="mt-3 text-sm font-semibold text-zinc-800 dark:text-zinc-300">No barbers found</p>
            <p className="mt-1 text-xs text-zinc-500">
              {searchQuery ? 'Try adjusting your search criteria.' : 'Add team members on the Staff roster.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredBarbers.map((barber) => (
              <div
                key={barber.id}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 p-5 shadow-sm hover:shadow-md transition space-y-4"
              >
                {/* Header Row: Barber Identity + Direct Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-sm">
                      {barber.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">{barber.name}</h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            barber.isActive
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                          }`}
                        >
                          {barber.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                        {barber.bio || 'Staff Barber'}
                        {barber.experienceYears ? ` • ${barber.experienceYears}y exp` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Actions (Responsively wraps or stacks) */}
                  <div className="flex items-center gap-2 pt-1 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => setSelectedBarberForAvailability(barber)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition shadow-xs"
                      title="Test Level 2.3 availability and slot engine"
                    >
                      <Clock className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                      <span>Slot Engine</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedBarberForServices(barber)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:border-amber-500/40 hover:text-amber-600 dark:hover:text-amber-400 transition shadow-xs"
                    >
                      <Scissors className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                      <span>Assign Services</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedBarberForSchedule(barber)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 transition shadow-xs"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Configure Shifts</span>
                    </button>
                  </div>
                </div>

                {/* Details Grid: Shifts & Catalog Capability */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3.5 border-t border-zinc-100 dark:border-zinc-800/80">
                  {/* Shift Hours */}
                  <div className="rounded-xl border border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/40 p-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1.5">
                      Weekly Working Shifts
                    </span>
                    <BarberShiftSummaryBadge barberId={barber.id} />
                  </div>

                  {/* Assigned Services */}
                  <div className="rounded-xl border border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/40 p-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1.5">
                      Assigned Catalog Services
                    </span>
                    <BarberServicesBadge
                      barberId={barber.id}
                      onAssign={() => setSelectedBarberForServices(barber)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Availability Test Modal (Level 2.3 Engine Verification) */}
      {selectedBarberForAvailability && (
        <AvailabilityModal
          barber={selectedBarberForAvailability}
          onClose={() => setSelectedBarberForAvailability(null)}
        />
      )}

      {/* Schedule Modal */}
      {selectedBarberForSchedule && (
        <BarberScheduleModal
          barber={selectedBarberForSchedule}
          onClose={() => setSelectedBarberForSchedule(null)}
        />
      )}

      {/* Services Modal */}
      {selectedBarberForServices && (
        <BarberServicesModal
          barber={selectedBarberForServices}
          onClose={() => setSelectedBarberForServices(null)}
        />
      )}
    </div>
  );
}
