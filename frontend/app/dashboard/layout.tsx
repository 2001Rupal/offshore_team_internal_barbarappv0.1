'use client';

import React, { useEffect } from 'react';
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
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, shop, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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
      name: 'Shop Profile',
      href: '/dashboard/shop',
      icon: Store,
    },
    {
      name: 'Staff & Barbers',
      href: '/dashboard/barbers',
      icon: Users,
    },
    {
      name: 'Service Catalog',
      href: '/dashboard/services',
      icon: Sparkles,
    },
  ];

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      {/* Sidebar Navigation */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-zinc-800/80 bg-zinc-950/95 backdrop-blur-xl">
        {/* Brand Header */}
        <div className="flex h-16 items-center gap-3 border-b border-zinc-800/80 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-md shadow-amber-500/20">
            <Scissors className="h-5 w-5 text-zinc-950" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-white text-base">
              Barber Studio
            </span>
            <span className="ml-2 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20">
              PRO
            </span>
          </div>
        </div>

        {/* Current Active Shop Card */}
        <div className="border-b border-zinc-800/60 p-4">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3 transition hover:border-zinc-700">
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
                {shop && shop.isActive ? 'Active' : 'Unconfigured'}
              </span>
            </div>
            <div className="mt-1.5">
              <p className="truncate text-sm font-semibold text-zinc-100">
                {shop ? shop.name : 'Setup Required'}
              </p>
              <p className="truncate text-[11px] text-zinc-400">
                {shop ? `${shop.city}, ${shop.country || 'India'}` : 'Click to create shop'}
              </p>
            </div>
          </div>
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
        <div className="border-t border-zinc-800/80 p-3.5">
          <UserProfileMenu />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-8 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
            <ShieldCheck className="h-4 w-4 text-amber-400" />
            <span>Studio Management System</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400">
            {shop ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-2.5 py-1 text-zinc-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="font-medium text-zinc-200">{shop.name}</span>
                <span className="text-zinc-500">•</span>
                <span>{shop.city}</span>
              </span>
            ) : (
              <span className="text-amber-400 text-xs font-medium">Shop Setup Incomplete</span>
            )}
          </div>
        </header>

        <main className="flex-1 p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
