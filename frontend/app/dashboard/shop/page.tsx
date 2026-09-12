'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { shopService } from '../../../services/shop.service';
import { Store, PlusCircle, CheckCircle2, AlertCircle, Save } from 'lucide-react';

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
        setSuccessMsg('Shop created successfully!');
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
        setSuccessMsg('Shop details saved successfully!');
      }
      await refreshShop();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save shop details');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Shop Information
        </h1>
        <p className="text-sm text-zinc-400">
          Configure profile, location, and contact information for your barber shop.
        </p>
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
            You haven&apos;t created your shop yet.
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Fill out the form below to initialize your barber shop profile.
          </p>
        </div>
      )}

      {/* Shop Details Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 shadow-xl backdrop-blur-sm"
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-300">
              Shop Name *
            </label>
            <input
              type="text"
              required
              id="shop-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Royal Cuts"
              className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-300">
              Description
            </label>
            <textarea
              rows={3}
              id="shop-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Modern men's barber shop specializing in fades, beard grooming, and hot towel shave"
              className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

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
              placeholder="e.g. Main Road, Suite 401"
              className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
              className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
              className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
              className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
              className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-300">
              Contact Phone
            </label>
            <input
              type="tel"
              id="shop-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9999999999"
              className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end border-t border-zinc-800/80 pt-5">
          <button
            type="submit"
            disabled={isSubmitting}
            id="btn-save-shop"
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-md transition hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50"
          >
            {shop ? <Save className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
            <span>{isSubmitting ? 'Saving...' : shop ? 'Save Changes' : 'Create Shop'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
