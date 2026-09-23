'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import { customerService } from '../../../services/customer.service';
import { CustomerNav } from '../../../components/customer-nav';
import { CustomerFooter } from '../../../components/customer-footer';
import {
  User,
  Mail,
  Phone,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';

export default function CustomerProfilePage() {
  const { user, isLoading, refreshUser } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'CUSTOMER')) {
      if (user?.role === 'OWNER') {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setAge(user.age ? String(user.age) : '');
      setGender(user.gender || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);
    setSaving(true);

    try {
      await customerService.updateProfile({
        name,
        phone,
        age: age ? parseInt(age, 10) : undefined,
        gender: gender || undefined,
      });
      await refreshUser();
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-theme-page text-theme-main">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <p className="text-xs text-theme-muted">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-theme-page text-theme-main transition-colors">
      <CustomerNav />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12">
        <div className="max-w-xl mx-auto space-y-6">
          {/* Header Card */}
          <div className="theme-card rounded-2xl p-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/25 accent-color">
                  <User className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-theme-main tracking-tight">Customer Profile</h1>
                  <p className="text-xs text-theme-secondary mt-0.5">
                    Your universal identity for appointment bookings.
                  </p>
                </div>
              </div>
              <Link
                href="/book"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl theme-btn-primary px-3.5 py-2 text-xs font-semibold shadow-sm"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Book Slot</span>
              </Link>
            </div>
          </div>

          {/* Feedback Messages */}
          {successMsg && (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Profile Form */}
          <form
            onSubmit={handleSubmit}
            className="theme-card rounded-2xl p-6 shadow-xl space-y-4"
          >
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-theme-secondary flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 accent-color" />
                <span>Full Name</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="theme-input w-full px-3.5 py-2.5 text-sm"
              />
            </div>

            {/* Email (Read-only) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-theme-secondary flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 accent-color" />
                  <span>Email Address</span>
                </span>
                <span className="text-[10px] text-theme-muted uppercase tracking-wider font-bold">
                  {user.email ? 'Primary Email' : 'Not Provided'}
                </span>
              </label>
              <input
                type="email"
                disabled
                value={user.email || 'None'}
                className="theme-input w-full px-3.5 py-2.5 text-sm opacity-60 cursor-not-allowed select-none"
              />
              <p className="text-[11px] text-theme-muted">
                Email address is linked to your account and used for OTP verification.
              </p>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-theme-secondary flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 accent-color" />
                <span>Phone Number</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="theme-input w-full px-3.5 py-2.5 text-sm"
              />
            </div>

            {/* Age & Gender Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Age */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-theme-secondary flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 accent-color" />
                  <span>Age</span>
                </label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 26"
                  className="theme-input w-full px-3.5 py-2.5 text-sm"
                />
              </div>

              {/* Gender */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-theme-secondary flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 accent-color" />
                  <span>Gender</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="theme-input w-full px-3.5 py-2.5 text-sm bg-theme-input"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>

            {/* Role indicator */}
            <div className="pt-3 flex items-center justify-between border-t border-theme-light text-xs text-theme-muted">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Account Role: <strong className="text-theme-main">Customer</strong></span>
              </span>
              <span className="text-[11px] theme-badge-accent">
                Active Account
              </span>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl theme-btn-primary px-4 py-2.5 text-xs font-bold shadow-md disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      </main>

      <CustomerFooter />
    </div>
  );
}
