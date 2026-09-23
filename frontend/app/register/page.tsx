'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { ThemeToggle } from '../../components/theme-toggle';
import {
  Scissors,
  AlertCircle,
  Lock,
  Mail,
  Phone,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  User as UserIcon,
  Calendar,
  Sparkles,
} from 'lucide-react';

function RegisterForm() {
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') === 'OWNER' ? 'OWNER' : 'CUSTOMER';

  const { register, requestOtp, verifyOtp, user, isLoading } = useAuth();
  const router = useRouter();

  const [role, setRole] = useState<'CUSTOMER' | 'OWNER'>(initialRole);

  // Customer Registration State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAge, setCustomerAge] = useState('');
  const [customerGender, setCustomerGender] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Owner Registration State
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerConfirmPassword, setOwnerConfirmPassword] = useState('');

  // UI State
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'CUSTOMER') {
        router.push('/customer/profile');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, router]);

  // Request Customer Registration OTP (Email OTP linked to phone)
  const handleRequestCustomerOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!customerName || customerName.trim().length < 2) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!customerEmail || !customerEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address to receive your verification code.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await requestOtp({
        name: customerName.trim(),
        phone: cleanPhone,
        email: customerEmail.trim().toLowerCase(),
        age: customerAge ? parseInt(customerAge, 10) : undefined,
        gender: customerGender || undefined,
      });

      setOtpSent(true);
      setCountdown(60);
      setSuccessMsg(res.message || `Verification code sent to your email (${customerEmail})!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch verification code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Verify Customer OTP and Complete Registration
  const handleVerifyCustomerOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!otpCode || otpCode.trim().length < 4) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    setSubmitting(true);
    try {
      const cleanPhone = customerPhone.replace(/\D/g, '');
      await verifyOtp({
        name: customerName.trim(),
        phone: cleanPhone,
        email: customerEmail.trim().toLowerCase(),
        code: otpCode.trim(),
        age: customerAge ? parseInt(customerAge, 10) : undefined,
        gender: customerGender || undefined,
      });

      router.push('/customer/profile');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired verification code.');
    } finally {
      setSubmitting(false);
    }
  };

  // Owner Registration with Password
  const handleOwnerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (ownerPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (ownerPassword !== ownerConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await register(
        {
          name: ownerName,
          email: ownerEmail,
          password: ownerPassword,
          phone: ownerPhone || undefined,
        },
        'OWNER',
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-theme-page text-theme-main p-4 transition-colors relative">
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 group mb-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 shadow-xl shadow-amber-500/25 group-hover:scale-105 transition-transform">
              <Scissors className="h-7 w-7 text-zinc-950" />
            </div>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-theme-main">
            Local&apos;s Cut
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-theme-secondary">
            {role === 'CUSTOMER' ? 'Customer Quick Registration' : 'Register New Studio Owner'}
          </p>
        </div>

        {/* Card */}
        <div className="theme-card rounded-2xl p-6 sm:p-8 backdrop-blur-xl border border-theme shadow-2xl">
          {/* Main Role Switcher */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-theme-surface-elevated p-1 border border-theme">
            <button
              type="button"
              onClick={() => {
                setRole('CUSTOMER');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`rounded-lg py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                role === 'CUSTOMER'
                  ? 'accent-bg text-zinc-950 font-bold shadow-md'
                  : 'text-theme-secondary hover:text-theme-main'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Customer
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('OWNER');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`rounded-lg py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                role === 'OWNER'
                  ? 'accent-bg text-zinc-950 font-bold shadow-md'
                  : 'text-theme-secondary hover:text-theme-main'
              }`}
            >
              <Lock className="h-3.5 w-3.5" />
              Studio Owner
            </button>
          </div>

          {errorMsg && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-500">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* CUSTOMER REGISTRATION */}
          {role === 'CUSTOMER' ? (
            <div className="space-y-5">
              {!otpSent ? (
                <form onSubmit={handleRequestCustomerOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-theme-muted mb-1.5">
                      Full Name *
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted" />
                      <input
                        type="text"
                        required
                        id="customer-reg-name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Rahul Sharma"
                        className="theme-input w-full py-2.5 pl-10 pr-3.5 text-sm"
                      />
                    </div>
                  </div>

                  {/* Phone & Email */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-theme-muted mb-1.5">
                        Mobile Phone Number *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted" />
                        <input
                          type="tel"
                          required
                          id="customer-reg-phone"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="9876543210 (10 digits)"
                          className="theme-input w-full py-2.5 pl-10 pr-3.5 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-theme-muted mb-1">
                        Email Address *
                      </label>
                      <p className="text-[11px] text-theme-secondary mb-1.5">
                        Your 6-digit verification code will be sent to this email.
                      </p>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted" />
                        <input
                          type="email"
                          required
                          id="customer-reg-email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="rahul@example.com"
                          className="theme-input w-full py-2.5 pl-10 pr-3.5 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Age & Gender */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-theme-muted mb-1.5">
                        Age (Optional)
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted" />
                        <input
                          type="number"
                          id="customer-reg-age"
                          min={5}
                          max={120}
                          value={customerAge}
                          onChange={(e) => setCustomerAge(e.target.value)}
                          placeholder="e.g. 25"
                          className="theme-input w-full py-2.5 pl-10 pr-3.5 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-theme-muted mb-1.5">
                        Gender (Optional)
                      </label>
                      <select
                        id="customer-reg-gender"
                        value={customerGender}
                        onChange={(e) => setCustomerGender(e.target.value)}
                        className="theme-input w-full py-2.5 px-3 text-sm cursor-pointer"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Non-Binary">Non-Binary</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    id="btn-customer-reg-request-otp"
                    className="theme-btn-primary w-full py-3 text-sm font-bold shadow-md mt-2 flex items-center justify-center gap-2"
                  >
                    {submitting ? 'Sending code...' : 'Send Email Verification Code'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyCustomerOtp} className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-theme-secondary">
                      Verification code sent to:{' '}
                      <strong className="text-theme-main">{customerEmail}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtpCode('');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="accent-color hover:underline font-semibold text-[11px]"
                    >
                      Change Details
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-theme-muted mb-1.5">
                      Enter 6-Digit Verification Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      autoFocus
                      id="customer-reg-otp-input"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="• • • • • •"
                      className="theme-input w-full text-center text-xl font-mono tracking-widest py-3 font-bold"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    id="btn-customer-reg-verify-otp"
                    className="theme-btn-primary w-full py-3 text-sm font-bold shadow-md flex items-center justify-center gap-2"
                  >
                    {submitting ? 'Verifying...' : 'Verify Code & Complete Registration'}
                    <CheckCircle2 className="h-4 w-4" />
                  </button>

                  <div className="text-center pt-2">
                    {countdown > 0 ? (
                      <span className="text-xs text-theme-muted">
                        Resend code in <strong className="text-theme-main font-mono">{countdown}s</strong>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRequestCustomerOtp}
                        disabled={submitting}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold accent-color hover:underline"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>Resend Verification Code</span>
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* OWNER REGISTRATION */
            <form onSubmit={handleOwnerRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-theme-muted mb-1.5">
                  Studio Owner Name *
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted" />
                  <input
                    type="text"
                    required
                    id="owner-reg-name"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Vikram Singh"
                    className="theme-input w-full py-2.5 pl-10 pr-3.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-theme-muted mb-1.5">
                  Owner Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted" />
                  <input
                    type="email"
                    required
                    id="owner-reg-email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="owner@localscut.com"
                    className="theme-input w-full py-2.5 pl-10 pr-3.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-theme-muted mb-1.5">
                  Contact Phone (Optional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted" />
                  <input
                    type="tel"
                    id="owner-reg-phone"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="9876543210"
                    className="theme-input w-full py-2.5 pl-10 pr-3.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-theme-muted mb-1.5">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      id="owner-reg-password"
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      placeholder="Min 8 chars"
                      className="theme-input w-full py-2.5 pl-10 pr-3.5 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-theme-muted mb-1.5">
                    Confirm *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      id="owner-reg-confirm-password"
                      value={ownerConfirmPassword}
                      onChange={(e) => setOwnerConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="theme-input w-full py-2.5 pl-10 pr-3.5 text-sm"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                id="btn-owner-register"
                className="theme-btn-primary w-full py-3 text-sm font-bold shadow-md mt-2 flex items-center justify-center gap-2"
              >
                {submitting ? 'Creating Studio Workspace...' : 'Register as Studio Owner'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* Footer navigation */}
          <div className="mt-6 border-t border-theme-light pt-4 text-center">
            <p className="text-xs text-theme-secondary">
              Already have an account?{' '}
              <Link href="/login" className="font-bold accent-color hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-theme-page text-theme-main">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            <p className="text-xs text-theme-muted">Loading registration...</p>
          </div>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
