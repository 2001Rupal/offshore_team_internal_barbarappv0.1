'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../lib/auth-context';
import { useTheme } from '../lib/theme-context';
import { shopService } from '../services/shop.service';
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
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'shop' | 'profile' | 'appearance';
}

export function AccountModal({
  isOpen,
  onClose,
  initialTab = 'shop',
}: AccountModalProps) {
  const { user, shop, refreshShop } = useAuth();
  const { theme, setTheme, availableThemes } = useTheme();
  const [activeTab, setActiveTab] = useState<'shop' | 'profile' | 'appearance'>(initialTab);

  const [mounted, setMounted] = useState(false);

  // Shop form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll and handle Escape key while open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (shop) {
      setName(shop.name || '');
      setDescription(shop.description || '');
      setAddress(shop.address || '');
      setCity(shop.city || '');
      setState(shop.state || '');
      setCountry(shop.country || 'India');
      setPostalCode(shop.postalCode || '');
      setPhone(shop.phone || '');
    }
  }, [shop, isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSaveShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      if (!shop) {
        await shopService.createShop({
          name,
          description: description || undefined,
          address,
          city,
          state: state || undefined,
          country: country || undefined,
          postalCode: postalCode || undefined,
          phone: phone || undefined,
        });
        setSuccessMsg('Shop profile created successfully!');
      } else {
        await shopService.updateShop(shop.id, {
          name,
          description: description || undefined,
          address,
          city,
          state: state || undefined,
          country: country || undefined,
          postalCode: postalCode || undefined,
          phone: phone || undefined,
        });
        setSuccessMsg('Shop settings updated successfully!');
      }
      await refreshShop();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save shop details');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !mounted || !user) return null;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-950 p-4 sm:p-7 shadow-2xl text-zinc-900 dark:text-zinc-100 my-auto max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150 ring-1 ring-black/5 dark:ring-white/5">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 font-bold text-amber-500 dark:text-amber-400 text-sm shrink-0">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                {shop ? shop.name : 'Studio Profile & Settings'}
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">
                Manage storefront information, owner account, and visual preferences
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-xl p-1.5 sm:p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-700 dark:hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-b border-zinc-200 dark:border-zinc-800/80 pt-3 pb-2 text-xs font-medium shrink-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('shop')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition shrink-0 whitespace-nowrap ${
              activeTab === 'shop'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/30'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            <Store className="h-3.5 w-3.5" />
            <span>Shop Profile</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition shrink-0 whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/30'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Owner Account</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition shrink-0 whitespace-nowrap ${
              activeTab === 'appearance'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/30'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            <Palette className="h-3.5 w-3.5" />
            <span>Appearance</span>
          </button>
        </div>

        {/* Tab Content (Scrollable) */}
        <div className="py-4 overflow-y-auto flex-1 pr-1">
          {/* TAB 1: SHOP PROFILE FORM */}
          {activeTab === 'shop' && (
            <form onSubmit={handleSaveShop} className="space-y-4 text-xs">
              {successMsg && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Shop / Studio Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Local's Cut Studio"
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Shop Headline / Bio
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Premier gentlemen's grooming parlor specializing in skin fades and hot towel treatments"
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 104 Main Street, Commercial Arcade"
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Mumbai"
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    State / Region
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Maharashtra"
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Country
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="India"
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="e.g. 400001"
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Shop Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 9999999999"
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 shadow-md hover:bg-amber-400 transition disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{isSubmitting ? 'Saving changes...' : 'Save Shop Profile'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: OWNER PROFILE DETAILS */}
          {activeTab === 'profile' && (
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/50 p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 font-semibold text-xs">
                    {user.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Account Owner</span>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{user.name}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/50 p-3.5">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                  <div>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Email Address</span>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">{user.email}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/50 p-3.5">
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                  <div>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Platform Role</span>
                    <p className="font-semibold text-amber-600 dark:text-amber-400">
                      {user.role === 'OWNER' ? 'Shop Owner (Admin)' : user.role}
                    </p>
                  </div>
                </div>
              </div>

              {user.phone && (
                <div className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/50 p-3.5">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                    <div>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Direct Phone</span>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{user.phone}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: APPEARANCE PALETTES */}
          {activeTab === 'appearance' && (
            <div className="space-y-2.5">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                Choose your studio workspace theme:
              </p>
              {availableThemes.map((t) => {
                const isSelected = theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left text-xs transition ${
                      isSelected
                        ? 'border-amber-500/50 bg-amber-500/10 dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-md'
                        : 'border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/30 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-4 w-4 rounded-full border border-black/10 dark:border-white/20 shadow-sm"
                        style={{ backgroundColor: t.accentColor }}
                      />
                      <div>
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">{t.name}</p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{t.description}</p>
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-between items-center border-t border-zinc-200 dark:border-zinc-800 pt-3.5 shrink-0">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {shop ? `Connected to ${shop.name} (${shop.city})` : "Local's Cut Workspace"}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-zinc-100 dark:bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
