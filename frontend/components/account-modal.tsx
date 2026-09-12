'use client';

import React, { useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { useTheme } from '../lib/theme-context';
import {
  X,
  User,
  Store,
  Palette,
  Shield,
  Check,
  Mail,
  Phone,
  MapPin,
  Building2,
} from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'profile' | 'studio' | 'appearance';
}

export function AccountModal({
  isOpen,
  onClose,
  initialTab = 'profile',
}: AccountModalProps) {
  const { user, shop } = useAuth();
  const { theme, setTheme, availableThemes } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'studio' | 'appearance'>(initialTab);

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 border border-zinc-700/60 font-bold text-amber-400">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{user.name}</h2>
              <p className="text-xs text-zinc-400">Studio Owner Settings & Preferences</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-zinc-800/80 pt-4 pb-2 text-xs font-medium">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
              activeTab === 'profile'
                ? 'bg-zinc-800 text-white font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Profile</span>
          </button>
          <button
            onClick={() => setActiveTab('studio')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
              activeTab === 'studio'
                ? 'bg-zinc-800 text-white font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Store className="h-3.5 w-3.5" />
            <span>Studio Info</span>
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
              activeTab === 'appearance'
                ? 'bg-zinc-800 text-white font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Palette className="h-3.5 w-3.5" />
            <span>Appearance</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="py-5">
          {activeTab === 'profile' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-zinc-400" />
                  <div>
                    <span className="text-zinc-400">Account Name</span>
                    <p className="font-semibold text-zinc-100 text-sm">{user.name}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-zinc-400" />
                  <div>
                    <span className="text-zinc-400">Email Address</span>
                    <p className="font-semibold text-zinc-100 text-sm">{user.email}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5">
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-zinc-400" />
                  <div>
                    <span className="text-zinc-400">Platform Role</span>
                    <p className="font-semibold text-amber-400 text-sm">{user.role}</p>
                  </div>
                </div>
              </div>

              {user.phone && (
                <div className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-zinc-400" />
                    <div>
                      <span className="text-zinc-400">Direct Phone</span>
                      <p className="font-semibold text-zinc-100 text-sm">{user.phone}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'studio' && (
            <div className="space-y-4 text-xs">
              {shop ? (
                <>
                  <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-amber-400" />
                      <div>
                        <span className="text-zinc-400">Shop Name</span>
                        <p className="font-semibold text-zinc-100 text-sm">{shop.name}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-zinc-400" />
                      <div>
                        <span className="text-zinc-400">Address</span>
                        <p className="font-semibold text-zinc-100">
                          {shop.address}, {shop.city}
                          {shop.state ? `, ${shop.state}` : ''}
                          {shop.postalCode ? ` - ${shop.postalCode}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5">
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-zinc-400" />
                      <div>
                        <span className="text-zinc-400">Contact Phone</span>
                        <p className="font-semibold text-zinc-100">
                          {shop.phone || 'Not specified'}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-zinc-400 py-4 text-center">No shop configured yet.</p>
              )}
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-2.5">
              <p className="text-xs text-zinc-400 mb-2">
                Choose your preferred interface appearance:
              </p>
              {availableThemes.map((t) => {
                const isSelected = theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left text-xs transition ${
                      isSelected
                        ? 'border-amber-500/50 bg-zinc-900 text-white shadow-md'
                        : 'border-zinc-800/80 bg-zinc-900/30 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-4 w-4 rounded-full border border-white/20 shadow-sm"
                        style={{ backgroundColor: t.accentColor }}
                      />
                      <div>
                        <p className="font-semibold text-zinc-100">{t.name}</p>
                        <p className="text-[11px] text-zinc-400">{t.description}</p>
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-amber-400 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end border-t border-zinc-800 pt-4">
          <button
            onClick={onClose}
            className="rounded-xl bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
