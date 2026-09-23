'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { useQuery } from '@tanstack/react-query';
import { barberService } from '../../services/barber.service';
import { serviceService } from '../../services/service.service';
import {
  Store,
  Users,
  Sparkles,
  MapPin,
  Phone,
  ArrowUpRight,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  Clock,
  IndianRupee,
  Briefcase,
  Settings,
  Scissors,
  Calendar,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, shop } = useAuth();

  const { data: barbers = [] } = useQuery({
    queryKey: ['barbers', shop?.id],
    queryFn: () => (shop ? barberService.getBarbersByShop(shop.id) : Promise.resolve([])),
    enabled: !!shop?.id,
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services', shop?.id],
    queryFn: () => (shop ? serviceService.getServicesByShop(shop.id) : Promise.resolve([])),
    enabled: !!shop?.id,
  });

  const activeBarbers = barbers.filter((b) => b.isActive);
  const activeServices = services.filter((s) => s.isActive);

  const avgPrice =
    activeServices.length > 0
      ? Math.round(
          activeServices.reduce((acc, s) => acc + s.price, 0) / activeServices.length,
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Overview Executive Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
              Studio Workspace
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live</span>
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
            {shop ? shop.name : "Local's Cut"}
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Welcome back, <strong className="text-zinc-200">{user?.name || 'Owner'}</strong> • {shop?.city || 'Studio Hub'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/dashboard/appointments"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-zinc-950 shadow-md transition hover:bg-amber-400"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Client Bookings</span>
          </Link>
          <Link
            href="/dashboard/shifts"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:border-zinc-700 hover:text-white transition shadow-sm"
          >
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span>Manage Shifts</span>
          </Link>
          <Link
            href="/dashboard/services"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:border-zinc-700 hover:text-white transition shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Services</span>
          </Link>
        </div>
      </div>

      {/* Warning if no shop exists */}
      {!shop && (
        <div className="flex items-start gap-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-amber-300">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-amber-200">Shop Setup Required</h2>
            <p className="text-xs text-amber-300/80 leading-relaxed">
              You haven&apos;t created your shop profile yet. Complete your shop information to begin configuring your staff roster and grooming menu.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('open-shop-profile', { detail: { tab: 'shop' } }));
                  }
                }}
                className="inline-flex items-center text-xs font-semibold text-amber-400 underline-offset-4 hover:underline"
              >
                Open Shop Setup &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Staff Barbers */}
        <Link
          href="/dashboard/barbers"
          className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-lg backdrop-blur-sm transition hover:border-zinc-700 hover:bg-zinc-900/60 block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Team Barbers</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-white">{barbers.length}</p>
              <span className="text-xs text-emerald-400 font-semibold">
                {activeBarbers.length} active
              </span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">
              Assigned to shop shifts
            </p>
          </div>
          <div className="mt-4 border-t border-zinc-800/60 pt-3 flex items-center justify-between text-xs font-medium text-amber-400">
            <span>Manage staff</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </Link>

        {/* Grooming Services */}
        <Link
          href="/dashboard/services"
          className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-lg backdrop-blur-sm transition hover:border-zinc-700 hover:bg-zinc-900/60 block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Catalog Offerings</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-white">{services.length}</p>
              <span className="text-xs text-emerald-400 font-semibold">
                {activeServices.length} active
              </span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">
              Bookable haircut & styling menu
            </p>
          </div>
          <div className="mt-4 border-t border-zinc-800/60 pt-3 flex items-center justify-between text-xs font-medium text-amber-400">
            <span>View menu catalog</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </Link>

        {/* Average Price */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Average Treatment</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-white">₹{avgPrice}</p>
            <p className="mt-1 text-[11px] text-zinc-400">
              Across {activeServices.length} active services
            </p>
          </div>
          <div className="mt-4 border-t border-zinc-800/60 pt-3 text-[11px] text-zinc-400">
            Based on catalog pricing
          </div>
        </div>

        {/* Operating Base Clock */}
        <Link
          href="/dashboard/shifts"
          className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-lg backdrop-blur-sm transition hover:border-zinc-700 hover:bg-zinc-900/60 block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Studio Operating Base</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-lg font-bold text-white truncate">
              {shop?.timezone || 'Asia/Kolkata'}
            </p>
            <p className="mt-1 text-[11px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              <span>Shift engine active</span>
            </p>
          </div>
          <div className="mt-4 border-t border-zinc-800/60 pt-3 flex items-center justify-between text-xs font-medium text-amber-400">
            <span>Configure shifts</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </Link>
      </div>

      {/* Roster & Services Side-by-Side Panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Roster Highlights */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Barbers Roster</h2>
                <p className="text-xs text-zinc-400">Staff members and specialties</p>
              </div>
            </div>
            <Link
              href="/dashboard/barbers"
              className="text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              <span>View Roster</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {barbers.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">No barbers added yet</p>
            ) : (
              barbers.slice(0, 4).map((barber) => (
                <div
                  key={barber.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-950/40 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-amber-400">
                      {barber.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-200">{barber.name}</p>
                      <p className="text-[11px] text-zinc-400">
                        {barber.experienceYears !== undefined
                          ? `${barber.experienceYears} yrs exp`
                          : 'Staff member'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href="/dashboard/barbers"
                      title="Manage services & schedule"
                      className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-1.5 text-zinc-400 hover:border-amber-500/40 hover:text-amber-400 transition"
                    >
                      <Scissors className="h-3 w-3" />
                    </Link>
                    <Link
                      href="/dashboard/shifts"
                      title="Manage working hours & shifts"
                      className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-1.5 text-zinc-400 hover:border-amber-500/40 hover:text-amber-400 transition"
                    >
                      <Calendar className="h-3 w-3" />
                    </Link>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        barber.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      <span
                        className={`h-1 w-1 rounded-full ${
                          barber.isActive ? 'bg-emerald-400' : 'bg-zinc-500'
                        }`}
                      />
                      {barber.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Services Highlights */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Service Offerings</h2>
                <p className="text-xs text-zinc-400">Pricing and duration catalog</p>
              </div>
            </div>
            <Link
              href="/dashboard/services"
              className="text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {services.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">No services added yet</p>
            ) : (
              services.slice(0, 4).map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-950/40 p-3"
                >
                  <div>
                    <p className="text-xs font-semibold text-zinc-200">{service.name}</p>
                    <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-zinc-500" />
                      <span>{service.durationMinutes} minutes</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-amber-400">
                      ₹{service.price}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        service.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {service.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
