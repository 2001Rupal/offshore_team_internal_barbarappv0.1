'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../lib/auth-context';
import { useTheme, Theme } from '../lib/theme-context';
import { AccountModal } from './account-modal';
import {
  Sparkles,
  User,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  Store,
  Check,
  Palette,
  FileText,
  Info,
  Bug,
  Compass,
  Command,
  Sun,
  Moon,
} from 'lucide-react';

export function UserProfileMenu() {
  const { user, shop, logout } = useAuth();
  const { theme, setTheme, availableThemes } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<'none' | 'appearance' | 'help'>('none');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'profile' | 'studio' | 'appearance'>('profile');

  const containerRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveSubmenu('none');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'OW';

  const openModalWithTab = (tab: 'profile' | 'studio' | 'appearance') => {
    setModalTab(tab);
    setIsModalOpen(true);
    setIsOpen(false);
    setActiveSubmenu('none');
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* -------------------------------------------------------------
          MAIN POPOVER (Positioned directly above user trigger)
         ------------------------------------------------------------- */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-64 rounded-2xl border border-zinc-800 bg-[#18181b] p-1.5 shadow-2xl z-50 text-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
          {/* Top User Row */}
          <button
            type="button"
            onClick={() => openModalWithTab('profile')}
            className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 hover:bg-white/10 transition text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[11px] font-semibold text-zinc-200">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-zinc-100">{user.name}</p>
                <p className="truncate text-[10px] text-zinc-400 capitalize">
                  {user.role.toLowerCase()}
                </p>
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          </button>

          <div className="my-1 border-t border-white/10" />

          {/* Upgrade plan / Pro item */}
          <button
            type="button"
            onClick={() => openModalWithTab('studio')}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-zinc-200 hover:bg-white/10 transition text-left"
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>Studio Pro Active</span>
          </button>

          {/* Appearance item with Flyout */}
          <div
            className="relative"
            onMouseEnter={() => setActiveSubmenu('appearance')}
          >
            <button
              type="button"
              onClick={() =>
                setActiveSubmenu(activeSubmenu === 'appearance' ? 'none' : 'appearance')
              }
              className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 transition text-left ${
                activeSubmenu === 'appearance'
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-200 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Palette className="h-4 w-4 text-zinc-400" />
                <span>Appearance</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
            </button>

            {/* Appearance Submenu */}
            {activeSubmenu === 'appearance' && (
              <div className="absolute left-full bottom-0 ml-1.5 w-56 rounded-2xl border border-zinc-800 bg-[#1f1f23] p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 border-b border-white/10">
                  Theme Palette
                </div>
                <div className="mt-1 space-y-0.5">
                  {availableThemes.map((item) => {
                    const isSelected = theme === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setTheme(item.id);
                          setActiveSubmenu('none');
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left transition ${
                          isSelected
                            ? 'bg-white/10 text-white font-medium'
                            : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.accentColor }}
                          />
                          <span>{item.name}</span>
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 text-amber-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Profile item */}
          <button
            type="button"
            onClick={() => openModalWithTab('profile')}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-zinc-200 hover:bg-white/10 transition text-left"
          >
            <User className="h-4 w-4 text-zinc-400" />
            <span>Profile</span>
          </button>

          {/* Settings item */}
          <button
            type="button"
            onClick={() => openModalWithTab('studio')}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-zinc-200 hover:bg-white/10 transition text-left"
          >
            <Settings className="h-4 w-4 text-zinc-400" />
            <span>Settings</span>
          </button>

          <div className="my-1 border-t border-white/10" />

          {/* Help item with Flyout (matches screenshot exactly) */}
          <div
            className="relative"
            onMouseEnter={() => setActiveSubmenu('help')}
          >
            <button
              type="button"
              onClick={() => setActiveSubmenu(activeSubmenu === 'help' ? 'none' : 'help')}
              className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 transition text-left ${
                activeSubmenu === 'help'
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-200 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="h-4 w-4 text-zinc-400" />
                <span>Help</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
            </button>

            {/* Help Submenu */}
            {activeSubmenu === 'help' && (
              <div className="absolute left-full bottom-0 ml-1.5 w-52 rounded-2xl border border-zinc-800 bg-[#1f1f23] p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                <a
                  href="http://localhost:3001/api/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-zinc-300 hover:bg-white/10 hover:text-white transition"
                >
                  <Compass className="h-4 w-4 text-zinc-400" />
                  <span>API Documentation</span>
                </a>
                <button
                  type="button"
                  onClick={() => openModalWithTab('studio')}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-zinc-300 hover:bg-white/10 hover:text-white transition text-left"
                >
                  <FileText className="h-4 w-4 text-zinc-400" />
                  <span>Release notes</span>
                </button>
                <button
                  type="button"
                  onClick={() => openModalWithTab('profile')}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-zinc-300 hover:bg-white/10 hover:text-white transition text-left"
                >
                  <Command className="h-4 w-4 text-zinc-400" />
                  <span>Keyboard shortcuts</span>
                </button>

                <div className="my-1 border-t border-white/10" />

                <button
                  type="button"
                  onClick={() => openModalWithTab('studio')}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-zinc-300 hover:bg-white/10 hover:text-white transition text-left"
                >
                  <FileText className="h-4 w-4 text-zinc-400" />
                  <span>Terms of Service</span>
                </button>
                <button
                  type="button"
                  onClick={() => openModalWithTab('studio')}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-zinc-300 hover:bg-white/10 hover:text-white transition text-left"
                >
                  <Info className="h-4 w-4 text-zinc-400" />
                  <span>Privacy Policy</span>
                </button>
                <button
                  type="button"
                  onClick={() => openModalWithTab('profile')}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-zinc-300 hover:bg-white/10 hover:text-white transition text-left"
                >
                  <Bug className="h-4 w-4 text-zinc-400" />
                  <span>Report a bug</span>
                </button>
              </div>
            )}
          </div>

          {/* Log out item */}
          <button
            type="button"
            onClick={logout}
            id="btn-sidebar-logout"
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-zinc-300 hover:bg-red-500/10 hover:text-red-400 transition text-left"
          >
            <LogOut className="h-4 w-4" />
            <span>Log out</span>
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------
          TRIGGER PILL (Matches bottom row of user screenshot)
         ------------------------------------------------------------- */}
      <button
        type="button"
        id="btn-user-profile-trigger"
        onClick={() => {
          setIsOpen(!isOpen);
          setActiveSubmenu('none');
        }}
        className={`flex w-full items-center justify-between rounded-xl px-2 py-1.5 transition text-left ${
          isOpen ? 'bg-white/10' : 'hover:bg-white/5'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-semibold text-zinc-200">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-zinc-100">{user.name}</p>
            <p className="truncate text-[10px] text-zinc-400 capitalize">
              {user.role === 'OWNER' ? 'Studio Owner' : user.role.toLowerCase()}
            </p>
          </div>
        </div>

        <Store className="h-4 w-4 text-zinc-400 shrink-0 ml-1" />
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
