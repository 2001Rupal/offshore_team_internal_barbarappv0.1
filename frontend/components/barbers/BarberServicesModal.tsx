'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Loader2,
  X,
  AlertCircle,
  Scissors,
  Search,
  CheckCheck,
  RotateCcw,
  Clock,
  IndianRupee,
  ShieldAlert,
} from 'lucide-react';
import { Barber, ServiceItem } from '../../types';
import { barberServicesService } from '../../services/barber-service.service';
import { serviceService } from '../../services/service.service';
import { Portal } from '../portal';

interface Props {
  barber: Barber;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export default function BarberServicesModal({ barber, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState('');

  // 1. Fetch current barber assignments
  const assignments = useQuery({
    queryKey: ['barber-services', barber.id],
    queryFn: () => barberServicesService.getBarberServices(barber.id),
  });

  // 2. Fetch all shop catalog services
  const catalog = useQuery({
    queryKey: ['services', barber.shopId],
    queryFn: () => serviceService.getServicesByShop(barber.shopId),
  });

  // Sync selected IDs once assignments are fetched
  useEffect(() => {
    if (assignments.data?.services) {
      setSelectedIds(assignments.data.services.map((s) => s.id));
    }
  }, [assignments.data]);

  // 3. Mutation to replace all assignments
  const mutation = useMutation({
    mutationFn: () => barberServicesService.updateBarberServices(barber.id, selectedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barber-services', barber.id] });
      queryClient.invalidateQueries({ queryKey: ['barbers', barber.shopId] });
      onSuccess?.(`Assigned services updated for ${barber.name}.`);
      onClose();
    },
  });

  const allServices: ServiceItem[] = catalog.data || [];
  const activeServices = useMemo(() => allServices.filter((s) => s.isActive), [allServices]);

  const filteredServices = useMemo(() => {
    if (!searchFilter.trim()) return allServices;
    const term = searchFilter.toLowerCase();
    return allServices.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        (s.description && s.description.toLowerCase().includes(term)),
    );
  }, [allServices, searchFilter]);

  const toggle = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((val) => val !== id) : [...current, id],
    );
  };

  const selectAllActive = () => {
    const activeIds = activeServices.map((s) => s.id);
    setSelectedIds(Array.from(new Set([...selectedIds, ...activeIds])));
  };

  const clearAll = () => {
    setSelectedIds([]);
  };

  // Calculate totals of currently selected services
  const selectedStats = useMemo(() => {
    const selectedServices = allServices.filter((s) => selectedIds.includes(s.id));
    const totalDuration = selectedServices.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const totalPrice = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
    return { count: selectedServices.length, totalDuration, totalPrice };
  }, [allServices, selectedIds]);

  const isLoading = assignments.isLoading || catalog.isLoading;
  const error = (assignments.error || catalog.error || mutation.error) as Error | null;

  return (
    <Portal onClose={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget && !mutation.isPending) onClose();
        }}
      >
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-950 p-6 sm:p-7 shadow-2xl text-zinc-900 dark:text-zinc-100 my-auto max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150 ring-1 ring-black/5 dark:ring-white/5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 dark:text-amber-400">
              <Scissors className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
                  Manage Services — {barber.name}
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
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Assign grooming treatments and services this barber is qualified to perform
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={mutation.isPending}
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Inactive Barber Warning */}
        {!barber.isActive && (
          <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 shrink-0">
            <ShieldAlert className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Barber is Inactive:</span> Service management is
              disabled. Reactivate <strong className="text-zinc-900 dark:text-white">{barber.name}</strong> on the
              staff roster to edit assignments.
            </div>
          </div>
        )}

        {/* Filter Toolbar & Quick Selection */}
        {allServices.length > 0 && (
          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between shrink-0">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Search catalog services..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 py-2 pl-9 pr-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={selectAllActive}
                disabled={!barber.isActive || mutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-40"
              >
                <CheckCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Select All Active ({activeServices.length})</span>
              </button>

              <button
                type="button"
                onClick={clearAll}
                disabled={!barber.isActive || mutation.isPending || selectedIds.length === 0}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 px-3 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-red-500 transition disabled:opacity-40"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Services Grid */}
        <div className="flex-1 overflow-y-auto mt-4 pr-1 grid grid-cols-1 md:grid-cols-2 gap-2.5 content-start min-h-0">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-400 gap-2 col-span-full">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              <span className="text-xs">Loading service assignments...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500 dark:text-red-300 col-span-full">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error.message || 'Unable to load or save barber services.'}</span>
            </div>
          )}

          {!isLoading && !error && allServices.length === 0 && (
            <div className="py-12 text-center text-xs text-zinc-500 col-span-full">
              No services in this shop catalog yet. Add services in the Service Catalog tab first.
            </div>
          )}

          {!isLoading &&
            !error &&
            allServices.length > 0 &&
            filteredServices.length === 0 && (
              <div className="py-8 text-center text-xs text-zinc-500 col-span-full">
                No services matching &quot;{searchFilter}&quot;
              </div>
            )}

          {!isLoading &&
            !error &&
            filteredServices.map((service) => {
              const isChecked = selectedIds.includes(service.id);
              const isDisabled = !barber.isActive || !service.isActive || mutation.isPending;

              return (
                <label
                  key={service.id}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${
                    !service.isActive || !barber.isActive
                      ? 'cursor-not-allowed border-zinc-200 dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-900/30 opacity-40'
                      : isChecked
                      ? 'border-amber-500/50 bg-amber-50/70 dark:bg-amber-500/10 hover:border-amber-500'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isDisabled}
                      onChange={() => toggle(service.id)}
                      className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-amber-500 accent-amber-500 focus:ring-0 focus:ring-offset-0"
                    />
                    <div>
                      <span className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {service.name}
                      </span>
                      {service.description && (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                          {service.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right shrink-0">
                    <div className="text-xs">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-200 block">₹{service.price}</span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{service.durationMinutes} min</span>
                    </div>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                        service.isActive
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {service.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </label>
              );
            })}
        </div>

        {/* Empty State Banner when 0 services selected */}
        {!isLoading && !error && selectedIds.length === 0 && (
          <p className="mt-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-2.5 text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
            No services assigned yet. Assign services this barber can perform.
          </p>
        )}

        {/* Modal Footer */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-zinc-200 dark:border-zinc-800/80 pt-3.5 gap-3 shrink-0">
          <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <span>
              Selected: <strong className="text-amber-600 dark:text-amber-400">{selectedStats.count}</strong>
            </span>
            {selectedStats.count > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-zinc-400 dark:text-zinc-500" />
                  <span>{selectedStats.totalDuration} min max</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-semibold text-zinc-900 dark:text-zinc-300">
                  <IndianRupee className="h-3 w-3 text-zinc-400 dark:text-zinc-500" />
                  <span>₹{selectedStats.totalPrice}</span>
                </span>
              </>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              id="btn-save-barber-services"
              onClick={() => mutation.mutate()}
              disabled={isLoading || !barber.isActive || mutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 transition disabled:opacity-50"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Save Assignments</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
    </Portal>
  );
}
