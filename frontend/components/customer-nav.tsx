'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Scissors, Calendar, User as UserIcon, LogOut, LayoutDashboard, Menu, X } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { ThemeToggle } from './theme-toggle';
import { publicService, PublicShop } from '../services/public.service';

export function CustomerNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [shop, setShop] = useState<PublicShop | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    publicService
      .getShop()
      .then(setShop)
      .catch(() => null);
  }, []);

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Services', href: '/services' },
    { name: 'Barbers', href: '/barbers' },
    { name: 'Book Appointment', href: '/book' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-theme bg-theme-surface/85 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-950 shadow-md group-hover:scale-105 transition-transform">
            <Scissors className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-base sm:text-lg text-theme-main">
              {shop?.name || "Local's Cut"}
            </span>
            <span className="hidden sm:inline-block ml-2 text-[11px] font-medium text-theme-muted uppercase tracking-widest">
              Studio
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive =
              link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'accent-color font-semibold accent-bg-subtle'
                    : 'text-theme-secondary hover:text-theme-main hover:bg-theme-surface-elevated'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions: Theme Toggle & User Auth Status */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <ThemeToggle showLabel={false} />
          </div>

          {user ? (
            user.role === 'CUSTOMER' ? (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/customer/appointments"
                  title="My Bookings"
                  className={`inline-flex items-center gap-1.5 rounded-xl border border-theme px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-theme-main hover:border-amber-500/50 transition-colors ${
                    pathname === '/customer/appointments' ? 'accent-bg-subtle accent-color' : 'bg-theme-surface'
                  }`}
                >
                  <Calendar className="h-4 w-4 text-amber-500" />
                  <span className="hidden md:inline">My Bookings</span>
                </Link>

                <Link
                  href="/customer/profile"
                  title="Profile"
                  className={`hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-theme px-3 py-1.5 text-xs font-semibold text-theme-main hover:border-amber-500/50 transition-colors ${
                    pathname === '/customer/profile' ? 'accent-bg-subtle accent-color' : 'bg-theme-surface'
                  }`}
                >
                  <UserIcon className="h-3.5 w-3.5" />
                  <span>{user.name?.split(' ')[0] || 'Account'}</span>
                </Link>

                <button
                  onClick={logout}
                  title="Sign Out"
                  className="hidden sm:flex rounded-xl border border-theme p-1.5 text-theme-muted hover:text-red-400 hover:border-red-500/30 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-xl accent-bg px-3 py-1.5 text-xs font-bold text-black shadow-sm hover:opacity-95 transition-opacity"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Owner Dashboard</span>
              </Link>
            )
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                href="/login"
                className="rounded-xl border border-theme px-2.5 sm:px-3 py-1.5 text-xs font-medium text-theme-secondary hover:text-theme-main hover:border-theme transition"
              >
                Sign In
              </Link>
              <Link
                href="/book"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl theme-btn-primary px-3.5 py-1.5 text-xs font-semibold shadow-sm"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Book Now</span>
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="rounded-xl border border-theme p-2 text-theme-secondary hover:text-theme-main md:hidden transition"
            aria-label="Toggle navigation menu"
          >
            {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="border-t border-theme bg-theme-surface/95 backdrop-blur-xl px-4 py-4 md:hidden space-y-3 shadow-xl">
          {user && (
            <div className="rounded-xl border border-theme bg-theme-surface-elevated p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-xs">
                  {user.name?.[0] || 'C'}
                </div>
                <div>
                  <p className="text-xs font-bold text-theme-main">{user.name}</p>
                  <p className="text-[10px] text-theme-secondary">{user.phone || user.email}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsMobileOpen(false);
                  logout();
                }}
                className="text-xs font-semibold text-red-400 hover:underline flex items-center gap-1"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </button>
            </div>
          )}

          <div className="space-y-1">
            {navLinks.map((link) => {
              const isActive =
                link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'accent-color font-bold accent-bg-subtle'
                      : 'text-theme-secondary hover:text-theme-main hover:bg-theme-surface-elevated'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}

            {user && user.role === 'CUSTOMER' && (
              <>
                <Link
                  href="/customer/appointments"
                  onClick={() => setIsMobileOpen(false)}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                    pathname === '/customer/appointments'
                      ? 'accent-color font-bold accent-bg-subtle'
                      : 'text-theme-secondary hover:text-theme-main hover:bg-theme-surface-elevated'
                  }`}
                >
                  My Bookings
                </Link>
                <Link
                  href="/customer/profile"
                  onClick={() => setIsMobileOpen(false)}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                    pathname === '/customer/profile'
                      ? 'accent-color font-bold accent-bg-subtle'
                      : 'text-theme-secondary hover:text-theme-main hover:bg-theme-surface-elevated'
                  }`}
                >
                  Profile Details
                </Link>
              </>
            )}
          </div>

          <div className="border-t border-theme-light pt-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-theme-muted">Theme</span>
            <ThemeToggle showLabel={true} />
          </div>

          {!user && (
            <div className="pt-2">
              <Link
                href="/book"
                onClick={() => setIsMobileOpen(false)}
                className="w-full flex items-center justify-center gap-2 rounded-xl theme-btn-primary py-2.5 text-sm font-semibold shadow-md"
              >
                <Calendar className="h-4 w-4" />
                <span>Book Appointment</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
