'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Scissors, Clock, Search, Sparkles, ChevronRight, Calendar } from 'lucide-react';
import { CustomerNav } from '../../components/customer-nav';
import { CustomerFooter } from '../../components/customer-footer';
import { publicService, PublicServiceItem, PublicShop } from '../../services/public.service';

export default function ServicesPage() {
  const [services, setServices] = useState<PublicServiceItem[]>([]);
  const [shop, setShop] = useState<PublicShop | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      publicService.getShop().catch(() => null),
      publicService.getShopServices().catch(() => []),
    ])
      .then(([s, svc]) => {
        setShop(s);
        setServices(svc);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="min-h-screen flex flex-col bg-theme-page text-theme-main transition-colors">
      <CustomerNav />

      <main className="flex-1 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="max-w-2xl mb-10 space-y-3">
            <span className="theme-badge-accent">Studio Menu</span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-theme-main">
              Services & Pricing at {shop?.name || "Local's Cut"}
            </h1>
            <p className="text-sm sm:text-base text-theme-secondary">
              Transparent rates, dedicated service durations, and top-tier grooming products. Choose your service to start booking.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative max-w-md mb-8">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted" />
            <input
              type="text"
              placeholder="Search services (e.g., Haircut, Beard, Fade)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="theme-input w-full pl-10 pr-4 py-2.5 text-sm"
            />
          </div>

          {/* Services Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-44 rounded-2xl bg-theme-surface animate-pulse border border-theme" />
              ))}
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="rounded-2xl border border-theme bg-theme-surface p-12 text-center text-theme-muted">
              No services match your search query.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className="theme-card rounded-2xl p-6 flex flex-col justify-between hover:shadow-xl group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-black text-theme-main group-hover:text-amber-500 transition-colors">
                        ₹{service.price}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-theme-surface-elevated border border-theme px-2.5 py-1 text-xs text-theme-muted font-medium">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{service.durationMinutes} mins</span>
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-theme-main group-hover:text-amber-500 transition-colors">
                        {service.name}
                      </h3>
                      <p className="text-xs text-theme-secondary mt-1 leading-relaxed">
                        {service.description || 'Includes consultation, hair wash, and customized finish.'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-6">
                    <Link
                      href={`/book?serviceId=${service.id}`}
                      className="w-full flex items-center justify-center gap-2 rounded-xl theme-btn-primary py-2.5 text-xs font-bold shadow-sm"
                    >
                      <Calendar className="h-4 w-4" />
                      <span>Book This Service</span>
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
