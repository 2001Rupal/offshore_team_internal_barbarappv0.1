'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../lib/auth-context';
import { useTheme } from '../lib/theme-context';
import { AccountModal } from './account-modal';
import {
  User,
  LogOut,
  ChevronRight,
  ChevronDown,
  Store,
  Check,
  Palette,
  Shield,
} from 'lucide-react';

export function UserProfileMenu() {
  const { user, shop, logout } = useAuth();
  const { theme, setTheme, availableThemes } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'shop' | 'profile' | 'appearance'>('shop');

  const containerRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsAppearanceOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen for custom open-shop-profile events from other components
  useEffect(() => {
    function handleOpenEvent(e: Event) {
      const customEvent = e as CustomEvent;
      const tab = customEvent.detail?.tab || 'shop';
      setModalTab(tab);
      setIsModalOpen(true);
      setIsOpen(false);
    }
    window.addEventListener('open-shop-profile', handleOpenEvent);
    return () => window.removeEventListener('open-shop-profile', handleOpenEvent);
  }, []);

  if (!user) return null;

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'LC';

  const openModalWithTab = (tab: 'shop' | 'profile' | 'appearance') => {
    setModalTab(tab);
    setIsModalOpen(true);
    setIsOpen(false);
    setIsAppearanceOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* -------------------------------------------------------------
          MAIN POPOVER (Positioned directly above bottom-left user trigger)
          Fully responsive: fits comfortably within mobile sidebar
         ------------------------------------------------------------- */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-full min-w-[240px] max-w-[280px] rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2 shadow-2xl z-50 text-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
          {/* Top User Header Row */}
          <button
            type="button"
            onClick={() => openModalWithTab('profile')}
            className="flex w-full items-center justify-between rounded-xl p-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-950 text-xs font-bold shadow-xs">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold text-zinc-900 dark:text-zinc-100">{user.name}</p>
                <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-400 capitalize">
                  {user.role === 'OWNER' ? 'Studio Owner' : user.role.toLowerCase()}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />
          </button>

          <div className="my-1.5 border-t border-zinc-200 dark:border-zinc-800" />

          {/* Shop Profile Item */}
          <button
            type="button"
            id="btn-menu-shop-profile"
            onClick={() => openModalWithTab('shop')}
            className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-left"
          >
            <div className="flex items-center gap-2.5">
              <Store className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="font-semibold text-xs">Studio Details</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          </button>

          {/* Appearance Item with INLINE Accordion (Never cuts off on mobile) */}
          <div>
            <button
              type="button"
              onClick={() => setIsAppearanceOpen(!isAppearanceOpen)}
              className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-left"
            >
              <div className="flex items-center gap-2.5">
                <Palette className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="font-semibold text-xs">Appearance</span>
              </div>
              {isAppearanceOpen ? (
                <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              )}
            </button>

            {/* Inline Theme Selection */}
            {isAppearanceOpen && (
              <div className="mt-1 space-y-1 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 p-1.5 border border-zinc-200 dark:border-zinc-800/80">
                {availableThemes.map((item) => {
                  const isSelected = theme === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setTheme(item.id);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                        isSelected
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold'
                          : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: item.accentColor }}
                        />
                        <span>{item.name}</span>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-amber-500 font-bold" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="my-1.5 border-t border-zinc-200 dark:border-zinc-800" />

          {/* Log Out Item */}
          <button
            type="button"
            onClick={logout}
            id="btn-sidebar-logout"
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition text-left font-semibold text-xs"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------
          TRIGGER BUTTON (Bottom left of sidebar on both desktop & mobile)
         ------------------------------------------------------------- */}
      <button
        type="button"
        id="btn-user-profile-trigger"
        onClick={() => {
          setIsOpen(!isOpen);
          setIsAppearanceOpen(false);
        }}
        className={`flex w-full items-center justify-between rounded-xl p-2 transition text-left border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-900 shadow-xs ${
          isOpen ? 'ring-2 ring-amber-500/40 border-amber-500/50' : ''
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-950 text-xs font-bold shadow-xs">
            {initials}
          </div>
          <div className="min-w-0 pr-1">
            <p className="truncate text-xs font-bold text-zinc-900 dark:text-zinc-100">{user.name}</p>
            <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-400 capitalize">
              {user.role === 'OWNER' ? 'Studio Owner' : user.role.toLowerCase()}
            </p>
          </div>
        </div>

        <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0 ml-1" />
      </button>

      {/* Settings / Profile Modal */}
      <AccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialTab={modalTab}
      />
    </div>
  );
}
