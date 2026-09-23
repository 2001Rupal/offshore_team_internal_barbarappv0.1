'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Scissors, MapPin, Phone, Clock, Shield } from 'lucide-react';
import { publicService, PublicShop } from '../services/public.service';

export function CustomerFooter() {
  const [shop, setShop] = useState<PublicShop | null>(null);

  useEffect(() => {
    publicService
      .getShop()
      .then(setShop)
      .catch(() => null);
  }, []);

  return (
    <footer className="border-t border-theme bg-theme-surface/60 py-12 transition-colors mt-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Shop Brand & Tagline */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-950 font-bold">
                <Scissors className="h-4 w-4" />
              </div>
              <span className="font-bold text-lg text-theme-main">
                {shop?.name || "Local's Cut"}
              </span>
            </div>
            <p className="text-sm text-theme-secondary max-w-sm">
              {shop?.description ||
                "Premier men's barber & grooming studio. Tailored haircuts, precision beard sculpting, and sharp modern styling."}
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs text-theme-muted">
              <Shield className="h-3.5 w-3.5 accent-color" />
              <span>Certified master barbers & authentic grooming standards</span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-theme-muted mb-3">
              Explore
            </h4>
            <ul className="space-y-2 text-sm text-theme-secondary">
              <li>
                <Link href="/" className="hover:text-theme-main transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-theme-main transition-colors">
                  Services & Pricing
                </Link>
              </li>
              <li>
                <Link href="/barbers" className="hover:text-theme-main transition-colors">
                  Our Master Barbers
                </Link>
              </li>
              <li>
                <Link href="/book" className="hover:text-theme-main accent-color font-medium transition-colors">
                  Book an Appointment
                </Link>
              </li>
            </ul>
          </div>

          {/* Location & Contact */}
          <div className="space-y-2.5 text-sm text-theme-secondary">
            <h4 className="text-xs font-bold uppercase tracking-wider text-theme-muted mb-3">
              Studio Location
            </h4>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-theme-muted shrink-0 mt-0.5" />
              <span>
                {shop ? `${shop.address}, ${shop.city}, ${shop.country || 'India'}` : 'Main Road, Bhopal, India'}
              </span>
            </div>
            {shop?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-theme-muted shrink-0" />
                <span>{shop.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-theme-muted shrink-0" />
              <span>Mon - Sun: 10:00 AM - 8:00 PM</span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-theme-light flex flex-col sm:flex-row items-center justify-between text-xs text-theme-muted gap-3">
          <p>© {new Date().getFullYear()} {shop?.name || "Local's Cut Studio"}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Powered by Local&apos;s Cut Studio Platform</span>
            <span>•</span>
            <Link href="/login" className="hover:text-theme-main transition-colors">
              Owner Sign In
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
