'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { UserProfileMenu } from '../../components/user-profile-menu';
import {
  Scissors,
  LayoutDashboard,
  Store,
  Users,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Building2,
  Menu,
  X,
  CalendarClock,
  Calendar,
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, shop, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <p className="text-xs text-zinc-400">Loading studio workspace...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    {
      name: 'Overview',
      href: '/dashboard',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: 'Appointments',
      href: '/dashboard/appointments',
      icon: Calendar,
    },
    {
      name: 'Staff & Barbers',
      href: '/dashboard/barbers',
      icon: Users,
    },
    {
      name: 'Manage Shifts',
      href: '/dashboard/shifts',
      icon: CalendarClock,
    },
    {
      name: 'Service Catalog',
      href: '/dashboard/services',
      icon: Sparkles,
    },
  ];

  return (
    <div className="studio-shell flex min-h-screen bg-zinc-950 text-zinc-100">
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-amber-500/10 bg-zinc-950/95 shadow-2xl shadow-black/30 backdrop-blur-xl transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-zinc-800/80 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 shadow-lg shadow-amber-500/25">
              <Scissors className="h-5 w-5 text-zinc-950" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-white text-base">
                Local&apos;s Cut
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white lg:hidden transition"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current Active Shop Card (Links to Shop Profile & Hours) */}
        <div className="border-b border-zinc-800/60 p-4">
          <Link
            href="/dashboard/shop"
            className="block w-full text-left rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3 transition hover:border-amber-500/40 hover:bg-zinc-900 group"
          >
            <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
              <div className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-amber-400" />
                <span>Current Shop</span>
              </div>
              <span
                className={`inline-flex items-center gap-1 text-[11px] ${
                  shop && shop.isActive ? 'text-emerald-400' : 'text-zinc-500'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    shop && shop.isActive ? 'bg-emerald-400' : 'bg-zinc-600'
                  }`}
                />
                {shop && shop.isActive ? 'Active' : 'Setup'}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <div className="min-w-0 pr-1">
                <p className="truncate text-sm font-semibold text-zinc-100 group-hover:text-amber-400 transition">
                  {shop ? shop.name : 'Setup Required'}
                </p>
                <p className="truncate text-[11px] text-zinc-400">
                  {shop ? `${shop.city}, ${shop.country || 'India'}` : 'Click to configure shop'}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-amber-400 shrink-0 transition" />
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 px-3 py-4">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-400 font-semibold shadow-sm border border-amber-500/20'
                    : 'text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-amber-400' : 'text-zinc-400'}`} />
                  <span>{item.name}</span>
                </div>
                {isActive && <ChevronRight className="h-4 w-4 text-amber-400/60" />}
              </Link>
            );
          })}
        </nav>

        {/* Consolidated Profile, Appearance & Signout Menu at bottom */}
        <div className="border-t border-zinc-200 dark:border-zinc-800/80 p-3 pb-6 lg:pb-3 shrink-0 bg-white/50 dark:bg-zinc-950/50">
          <UserProfileMenu />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col pl-0 lg:pl-64 transition-[padding] duration-200">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/80 px-4 sm:px-6 lg:px-8 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-2 text-zinc-600 dark:text-zinc-400 hover:border-amber-500/40 hover:text-amber-500 dark:hover:text-amber-400 lg:hidden transition shadow-sm"
              aria-label="Open sidebar"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <ShieldCheck className="h-4 w-4 text-amber-500 dark:text-amber-400 hidden sm:block" />
              <span className="text-zinc-500 dark:text-zinc-400 hidden sm:inline">Studio</span>
              <span className="text-zinc-400 dark:text-zinc-600 hidden sm:inline">/</span>
              <span className="text-zinc-900 dark:text-zinc-200 font-semibold">
                {pathname === '/dashboard'
                  ? 'Overview'
                  : pathname === '/dashboard/shifts' || pathname.startsWith('/dashboard/shifts')
                  ? 'Manage Shifts'
                  : pathname.startsWith('/dashboard/barbers')
                  ? 'Staff & Barbers'
                  : pathname.startsWith('/dashboard/services')
                  ? 'Service Catalog'
                  : pathname.startsWith('/dashboard/shop')
                  ? 'Shop Profile & Hours'
                  : 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400">
            {shop ? (
              <Link
                href="/dashboard/shop"
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-900/60 px-3 py-1.5 text-zinc-700 dark:text-zinc-300 hover:border-amber-500/40 hover:text-zinc-900 dark:hover:text-white transition"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                <span className="font-semibold text-zinc-900 dark:text-zinc-200">{shop.name}</span>
                <span className="text-zinc-400 dark:text-zinc-500 hidden sm:inline">•</span>
                <span className="hidden sm:inline text-zinc-500 dark:text-zinc-400">{shop.city}</span>
              </Link>
            ) : (
              <Link
                href="/dashboard/shop"
                className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-amber-500 dark:text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition"
              >
                Configure Shop
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="studio-content mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
