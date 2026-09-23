'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { shopService } from '../../../services/shop.service';
import { Store, PlusCircle, CheckCircle2, AlertCircle, Save, MapPin, Phone, Building2 } from 'lucide-react';

export default function ShopManagementPage() {
  const { shop, refreshShop } = useAuth();

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
  }, [shop]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      if (!shop) {
        // Create shop
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
        setSuccessMsg('Shop profile successfully created.');
      } else {
        // Update shop
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
        setSuccessMsg('Shop settings updated successfully.');
      }
      await refreshShop();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save shop settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-6">
        <div>
          <p className="studio-kicker mb-2">Business profile</p>
          <div className="flex items-center gap-2.5">
            <h1 className="studio-page-title text-2xl font-bold tracking-tight text-white">
              Shop Profile & Settings
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                shop && shop.isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {shop && shop.isActive ? 'Live Studio' : 'Unconfigured'}
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Configure your shop identity, storefront address, and client contact information
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {!shop && (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
            <Store className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-base font-semibold text-zinc-200">
            You haven&apos;t set up your shop profile yet
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Complete the form below to configure your studio storefront.
          </p>
        </div>
      )}

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
        className="studio-surface rounded-2xl p-7 space-y-7"
      >
        {/* Section 1: Identity */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-4">
            <Building2 className="h-4 w-4" />
            <span>Storefront Identity</span>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-300">
                Shop / Brand Name *
              </label>
              <input
                type="text"
                required
                id="shop-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Local's Cut Studio"
                className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-300">
                Shop Bio & Headline
              </label>
              <textarea
                rows={3}
                id="shop-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Premier gentlemen's grooming parlor specializing in skin fades, beard sculpting, and hot towel treatments"
                className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Location */}
        <div className="border-t border-zinc-800/80 pt-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-4">
            <MapPin className="h-4 w-4" />
            <span>Location & Address</span>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-300">
                Street Address *
              </label>
              <input
                type="text"
                required
                id="shop-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 104 Main Street, Commercial Arcade"
                className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300">
                City *
              </label>
              <input
                type="text"
                required
                id="shop-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Bhopal"
                className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300">
                State / Province
              </label>
              <input
                type="text"
                id="shop-state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Madhya Pradesh"
                className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300">
                Country
              </label>
              <input
                type="text"
                id="shop-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. India"
                className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300">
                Postal / PIN Code
              </label>
              <input
                type="text"
                id="shop-postal-code"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="e.g. 462001"
                className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Contact Details */}
        <div className="border-t border-zinc-800/80 pt-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-4">
            <Phone className="h-4 w-4" />
            <span>Storefront Contact</span>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-300">
                Primary Phone Number
              </label>
              <input
                type="tel"
                id="shop-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 9999999999"
                className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end border-t border-zinc-800/80 pt-5">
          <button
            type="submit"
            disabled={isSubmitting}
            id="btn-save-shop"
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-md transition hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50"
          >
            {shop ? <Save className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
            <span>{isSubmitting ? 'Saving settings...' : shop ? 'Save Changes' : 'Initialize Shop'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
