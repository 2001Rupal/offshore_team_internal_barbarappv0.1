'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Star, Calendar, Scissors, Phone, Sparkles, Check } from 'lucide-react';
import { CustomerNav } from '../../components/customer-nav';
import { CustomerFooter } from '../../components/customer-footer';
import {
  publicService,
  PublicBarber,
  PublicShop,
  PublicServiceItem,
} from '../../services/public.service';

interface BarberWithServices extends PublicBarber {
  assignedServices?: PublicServiceItem[];
}

const DEFAULT_BARBERS: BarberWithServices[] = [
  { id: '6ab414e1caebc69792e1ded7', name: 'Rahul', bio: 'Specialist in modern fades & styling', experienceYears: 5, phone: '9876543210', isActive: true },
  { id: '6ab414e2caebc69792e1dedc', name: 'Amit', bio: 'Classic scissor cuts & beard sculpting', experienceYears: 3, phone: '9876543211', isActive: true },
  { id: '6ab414e4caebc69792e1dedf', name: 'Vikas', bio: 'Hot towel shave and modern styling', experienceYears: 2, phone: '9876543212', isActive: true },
];

export default function BarbersPage() {
  const [barbers, setBarbers] = useState<BarberWithServices[]>(DEFAULT_BARBERS);
  const [shop, setShop] = useState<PublicShop | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const [shopData, rawBarbers] = await Promise.all([
          publicService.getShop().catch(() => null),
          publicService.getShopBarbers().catch(() => []),
        ]);
        if (!isMounted) return;
        if (shopData) setShop(shopData);
        if (rawBarbers.length === 0) return;

        // Fetch assigned services for each active barber in parallel
        const withServices = await Promise.all(
          rawBarbers.map(async (barber) => {
            try {
              const res = await publicService.getBarberServices(barber.id);
              return { ...barber, assignedServices: res.services };
            } catch {
              return { ...barber, assignedServices: [] };
            }
          }),
        );
        setBarbers(withServices);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-theme-page text-theme-main transition-colors">
      <CustomerNav />

      <main className="flex-1 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="max-w-2xl mb-10 space-y-3">
            <span className="theme-badge-accent">Our Artisans</span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-theme-main">
              Master Barbers at {shop?.name || "Local's Cut"}
            </h1>
            <p className="text-sm sm:text-base text-theme-secondary">
              Each of our stylists is verified, experienced, and dedicated to craft excellence. Browse their specialties and assigned services.
            </p>
          </div>

          {/* Barbers Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-64 rounded-2xl bg-theme-surface animate-pulse border border-theme" />
              ))}
            </div>
          ) : barbers.length === 0 ? (
            <div className="rounded-2xl border border-theme bg-theme-surface p-12 text-center text-theme-muted">
              No active barbers listed at this time.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {barbers.map((barber) => (
                <div
                  key={barber.id}
                  className="theme-card rounded-2xl p-6 flex flex-col justify-between hover:shadow-xl group"
                >
                  <div className="space-y-4">
                    {/* Barber Header */}
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/20 border border-amber-500/30 font-black text-xl accent-color shadow-sm shrink-0">
                        {barber.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-theme-main group-hover:text-amber-500 transition-colors">
                          {barber.name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-theme-muted font-medium mt-0.5">
                          <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                          <span>
                            {barber.experienceYears
                              ? `${barber.experienceYears} Years Experience`
                              : 'Senior Stylist'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bio */}
                    <p className="text-xs text-theme-secondary leading-relaxed">
                      {barber.bio ||
                        'Specialist in classic scissor cuts, precision skin fades, and luxury beard sculpting.'}
                    </p>

                    {/* Assigned Services Tags */}
                    {barber.assignedServices && barber.assignedServices.length > 0 && (
                      <div className="pt-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-theme-muted mb-2">
                          Available Services:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {barber.assignedServices.map((svc) => (
                            <span
                              key={svc.id}
                              className="inline-flex items-center gap-1 rounded-md bg-theme-surface-elevated border border-theme px-2 py-0.5 text-[11px] font-medium text-theme-secondary"
                            >
                              <Check className="h-3 w-3 accent-color" />
                              <span>{svc.name}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-6">
                    <Link
                      href={`/book?barberId=${barber.id}`}
                      className="w-full flex items-center justify-center gap-2 rounded-xl theme-btn-primary py-2.5 text-xs font-bold shadow-sm"
                    >
                      <Calendar className="h-4 w-4" />
                      <span>Book with {barber.name}</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <CustomerFooter />
    </div>
  );
}
