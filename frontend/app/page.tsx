'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Scissors,
  Calendar,
  Clock,
  Sparkles,
  MapPin,
  ChevronRight,
  ShieldCheck,
  Star,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { CustomerNav } from '../components/customer-nav';
import { CustomerFooter } from '../components/customer-footer';
import {
  publicService,
  PublicShop,
  PublicBarber,
  PublicServiceItem,
} from '../services/public.service';

const DEFAULT_SERVICES: PublicServiceItem[] = [
  { id: '6ab414edcaebc69792e1def3', name: 'Haircut', description: 'Classic haircut with wash and styling', durationMinutes: 30, price: 250, isActive: true },
  { id: '6ab414edcaebc69792e1def6', name: 'Beard', description: 'Precision beard trim & hot towel line up', durationMinutes: 20, price: 150, isActive: true },
  { id: '6ab414eecaebc69792e1def9', name: 'Fade', description: 'Skin fade with precision detailing', durationMinutes: 40, price: 300, isActive: true },
  { id: '6ab414eecaebc69792e1defc', name: 'Haircut+Beard', description: 'Complete grooming combo experience', durationMinutes: 50, price: 350, isActive: true },
];

const DEFAULT_BARBERS: PublicBarber[] = [
  { id: '6ab414e1caebc69792e1ded7', name: 'Rahul', bio: 'Specialist in modern fades & styling', experienceYears: 5, phone: '9876543210', isActive: true },
  { id: '6ab414e2caebc69792e1dedc', name: 'Amit', bio: 'Classic scissor cuts & beard sculpting', experienceYears: 3, phone: '9876543211', isActive: true },
  { id: '6ab414e4caebc69792e1dedf', name: 'Vikas', bio: 'Hot towel shave and modern styling', experienceYears: 2, phone: '9876543212', isActive: true },
];

export default function HomePage() {
  const [shop, setShop] = useState<PublicShop | null>(null);
  const [barbers, setBarbers] = useState<PublicBarber[]>(DEFAULT_BARBERS);
  const [services, setServices] = useState<PublicServiceItem[]>(DEFAULT_SERVICES);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadShopData() {
      try {
        const [shopData, barbersData, servicesData] = await Promise.all([
          publicService.getShop().catch(() => null),
          publicService.getShopBarbers().catch(() => []),
          publicService.getShopServices().catch(() => []),
        ]);
        if (!isMounted) return;
        if (shopData) setShop(shopData);
        if (barbersData.length > 0) setBarbers(barbersData);
        if (servicesData.length > 0) setServices(servicesData);
      } catch {
        // Keep resilient defaults
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadShopData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-theme-page text-theme-main transition-colors">
      <CustomerNav />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden py-16 sm:py-24 border-b border-theme-light">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-6">
              {/* Studio Pill */}
              <div className="inline-flex items-center gap-2 theme-badge-accent shadow-sm animate-pulse">
                <Sparkles className="h-3.5 w-3.5 accent-color" />
                <span>Premier Grooming Studio • {shop?.city || 'Indore'}</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-theme-main">
                Tailored Cuts & Sharp Styling at{' '}
                <span className="accent-color">{shop?.name || "Local's Cut"}</span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-theme-secondary max-w-2xl leading-relaxed">
                {shop?.description ||
                  "Experience precision haircuts, hot towel shaves, and beard grooming tailored to perfection. Choose your service, pick your favorite barber, and reserve your slot in seconds."}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-2 w-full sm:w-auto">
                <Link
                  href="/book"
                  className="w-full sm:w-auto theme-btn-primary px-8 py-3.5 text-sm sm:text-base font-bold shadow-lg gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Book Appointment Now</span>
                </Link>
                <Link
                  href="/services"
                  className="w-full sm:w-auto rounded-xl border border-theme bg-theme-surface hover:bg-theme-surface-elevated px-6 py-3.5 text-sm sm:text-base font-semibold text-theme-secondary hover:text-theme-main transition"
                >
                  <span>View Services Catalog</span>
                </Link>
              </div>

              {/* Quick Trust Highlights */}
              <div className="pt-6 grid grid-cols-3 gap-4 sm:gap-8 border-t border-theme-light w-full text-center">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xl sm:text-2xl font-bold accent-color">{barbers.length || 3}+</span>
                  <span className="text-xs text-theme-muted font-medium">Master Barbers</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xl sm:text-2xl font-bold accent-color">{services.length || 4}+</span>
                  <span className="text-xs text-theme-muted font-medium">Signature Services</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xl sm:text-2xl font-bold accent-color">100%</span>
                  <span className="text-xs text-theme-muted font-medium">Guaranteed Slots</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURED SERVICES SECTION */}
        <section className="py-16 sm:py-20 border-b border-theme-light">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest accent-color mb-1">
                  Menu & Offerings
                </p>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-theme-main tracking-tight">
                  Signature Grooming Services
                </h2>
              </div>
              <Link
                href="/services"
                className="inline-flex items-center gap-1 text-sm font-semibold accent-color hover:underline"
              >
                <span>Browse All Services</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-44 rounded-2xl bg-theme-surface animate-pulse border border-theme" />
                ))}
              </div>
            ) : services.length === 0 ? (
              <div className="rounded-2xl border border-theme bg-theme-surface p-10 text-center text-theme-muted">
                No active services listed at the moment.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="theme-card rounded-2xl p-5 flex flex-col justify-between hover:shadow-xl group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-lg font-black text-theme-main group-hover:text-amber-500 transition-colors">
                          ₹{service.price}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-lg bg-theme-surface-elevated border border-theme px-2 py-0.5 text-xs text-theme-muted font-medium">
                          <Clock className="h-3 w-3" />
                          <span>{service.durationMinutes}m</span>
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-theme-main mb-1.5 line-clamp-1">
                        {service.name}
                      </h3>
                      <p className="text-xs text-theme-secondary line-clamp-2 leading-relaxed mb-4">
                        {service.description || 'Premium styling & grooming experience.'}
                      </p>
                    </div>

                    <Link
                      href={`/book?serviceId=${service.id}`}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-theme bg-theme-surface-elevated group-hover:border-amber-500/40 group-hover:text-amber-500 py-2 text-xs font-bold text-theme-main transition-colors"
                    >
                      <Scissors className="h-3.5 w-3.5" />
                      <span>Book Service</span>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* OUR MASTER BARBERS SECTION */}
        <section className="py-16 sm:py-20 border-b border-theme-light bg-theme-surface/30">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest accent-color mb-1">
                  Craftsmen
                </p>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-theme-main tracking-tight">
                  Meet Our Master Barbers
                </h2>
              </div>
              <Link
                href="/barbers"
                className="inline-flex items-center gap-1 text-sm font-semibold accent-color hover:underline"
              >
                <span>View All Barbers</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-52 rounded-2xl bg-theme-surface animate-pulse border border-theme" />
                ))}
              </div>
            ) : barbers.length === 0 ? (
              <div className="rounded-2xl border border-theme bg-theme-surface p-10 text-center text-theme-muted">
                No active staff available right now.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {barbers.map((barber) => (
                  <div
                    key={barber.id}
                    className="theme-card rounded-2xl p-6 flex flex-col justify-between group hover:shadow-xl"
                  >
                    <div>
                      {/* Barber Avatar Badge */}
                      <div className="flex items-center gap-3.5 mb-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/20 border border-amber-500/30 font-black text-lg accent-color shadow-sm">
                          {barber.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-theme-main group-hover:text-amber-500 transition-colors">
                            {barber.name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-theme-muted font-medium">
                            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                            <span>
                              {barber.experienceYears ? `${barber.experienceYears} Years Exp` : 'Master Stylist'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-theme-secondary leading-relaxed mb-4">
                        {barber.bio || 'Expert in precision fades, scissor sculpting, and modern beard detailing.'}
                      </p>
                    </div>

                    <Link
                      href={`/book?barberId=${barber.id}`}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl theme-btn-primary py-2.5 text-xs font-bold shadow-sm"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Book with {barber.name}</span>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* STUDIO INFORMATION & HOURS */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-theme bg-theme-surface p-8 sm:p-12 shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <span className="theme-badge-accent">Studio Location & Hours</span>
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-theme-main">
                    Visit {shop?.name || "Local's Cut"}
                  </h3>
                  <p className="text-sm text-theme-secondary leading-relaxed">
                    Centrally located with dedicated parking, climate-controlled comfort, complimentary refreshments, and a curated soundtrack for the modern gent.
                  </p>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-3 text-sm text-theme-secondary">
                      <MapPin className="h-4 w-4 accent-color shrink-0" />
                      <span>
                        {shop ? `${shop.address}, ${shop.city}, ${shop.state || 'MP'}` : 'Main Road, Bhopal, India'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-theme-secondary">
                      <Clock className="h-4 w-4 accent-color shrink-0" />
                      <span>Open Monday — Sunday: 10:00 AM — 8:00 PM</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-theme-secondary">
                      <CheckCircle2 className="h-4 w-4 accent-color shrink-0" />
                      <span>Clean sanitized tools & hot towel steam treatment</span>
                    </div>
                  </div>
                </div>

                {/* Booking Callout Card */}
                <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-amber-500/15 p-6 sm:p-8 flex flex-col items-center text-center space-y-4">
                  <Scissors className="h-8 w-8 accent-color" />
                  <h4 className="text-xl font-bold text-theme-main">Ready for your fresh cut?</h4>
                  <p className="text-xs text-theme-secondary max-w-xs">
                    Skip the waiting room. Lock in your exact appointment slot with your favorite barber in under 60 seconds.
                  </p>
                  <Link
                    href="/book"
                    className="w-full theme-btn-primary py-3 text-sm font-bold shadow-md flex items-center justify-center gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Select Service & Time</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <CustomerFooter />
    </div>
  );
}
