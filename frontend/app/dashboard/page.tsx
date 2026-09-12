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

  const activeBarbers = barbers.filter((b) => b.isActive).length;
  const activeServices = services.filter((s) => s.isActive).length;

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Welcome back, {user?.name}
          </h1>
          <p className="text-sm text-zinc-400">
            Overview and configuration for your barber shop
          </p>
        </div>

        {!shop && (
          <Link
            href="/dashboard/shop"
            id="btn-create-shop-banner"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-md transition hover:bg-amber-400"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create Your Shop</span>
          </Link>
        )}
      </div>

      {/* Warning if no shop exists */}
      {!shop && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-amber-300">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-amber-200">Shop Setup Required</h2>
            <p className="text-xs text-amber-300/80">
              You haven&apos;t created your shop yet. To add barbers and services, you must first initialize your shop profile.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard/shop"
                className="inline-flex items-center text-xs font-semibold text-amber-400 underline-offset-4 hover:underline"
              >
                Go to Shop Setup &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Shop Card */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Shop Status</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <Store className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xl font-bold text-white">
              {shop ? shop.name : 'Not Created'}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
              {shop ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{shop.city || 'Configured'} • {shop.isActive ? 'Active' : 'Inactive'}</span>
                </>
              ) : (
                <span>Action required</span>
              )}
            </p>
          </div>
          <div className="mt-4 border-t border-zinc-800/60 pt-3">
            <Link
              href="/dashboard/shop"
              className="flex items-center justify-between text-xs font-medium text-amber-400 hover:text-amber-300"
            >
              <span>{shop ? 'Edit shop profile' : 'Create shop now'}</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Barbers Metric */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Staff Barbers</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-white">{barbers.length}</p>
              <span className="text-xs text-zinc-400">
                ({activeBarbers} active)
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              Barbers on shop roster
            </p>
          </div>
          <div className="mt-4 border-t border-zinc-800/60 pt-3">
            <Link
              href="/dashboard/barbers"
              className="flex items-center justify-between text-xs font-medium text-amber-400 hover:text-amber-300"
            >
              <span>Manage barbers</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Services Metric */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Grooming Services</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-white">{services.length}</p>
              <span className="text-xs text-zinc-400">
                ({activeServices} active)
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              Available catalog offerings
            </p>
          </div>
          <div className="mt-4 border-t border-zinc-800/60 pt-3">
            <Link
              href="/dashboard/services"
              className="flex items-center justify-between text-xs font-medium text-amber-400 hover:text-amber-300"
            >
              <span>Manage services</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Shop Details Preview */}
      {shop && (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">{shop.name}</h2>
              <p className="text-xs text-zinc-400">{shop.description || 'Barber shop'}</p>
            </div>
            <Link
              href="/dashboard/shop"
              className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700"
            >
              Edit Details
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3 text-xs text-zinc-300">
              <MapPin className="h-4 w-4 shrink-0 text-zinc-500" />
              <div>
                <p className="font-medium text-zinc-200">Address</p>
                <p className="text-zinc-400">
                  {shop.address}, {shop.city}
                  {shop.state ? `, ${shop.state}` : ''}
                  {shop.postalCode ? ` - ${shop.postalCode}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-xs text-zinc-300">
              <Phone className="h-4 w-4 shrink-0 text-zinc-500" />
              <div>
                <p className="font-medium text-zinc-200">Contact</p>
                <p className="text-zinc-400">{shop.phone || 'Not specified'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
