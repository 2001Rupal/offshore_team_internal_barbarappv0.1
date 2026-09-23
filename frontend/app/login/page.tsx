'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';

export default function LoginPage() {
  const { login, requestOtp, verifyOtp, user, isLoading } = useAuth();
  const router = useRouter();

  // Primary Role: CUSTOMER by default
  const [role, setRole] = useState<'CUSTOMER' | 'OWNER'>('CUSTOMER');

  // Customer Login State
  const [customerInput, setCustomerInput] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Owner Credentials State
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');

  // UI state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Route if already authenticated
  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'CUSTOMER') {
        router.push('/customer/profile');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, router]);

  // Request Customer OTP
  const handleRequestCustomerOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const val = customerInput.trim();
    if (!val) {
      setErrorMsg('Please enter your mobile phone number or email address.');
      return;
    }

    const isEmail = val.includes('@');
    const cleanDigits = val.replace(/\D/g, '');

    if (!isEmail && cleanDigits.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number or email address.');
      return;
    }

    setSubmitting(true);
    try {
      const target = isEmail
        ? { email: val.toLowerCase() }
        : { phone: cleanDigits };

      const res = await requestOtp(target);
      setOtpSent(true);
      setCountdown(60);
      if (res.email) {
        setTargetEmail(res.email);
      }
      setSuccessMsg(res.message || 'Verification code sent to your registered email!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch verification code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Verify Customer OTP and Authenticate
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
      const isEmail = customerInput.trim().includes('@');
      const cleanDigits = customerInput.trim().replace(/\D/g, '');

      const target = isEmail
        ? { email: customerInput.trim().toLowerCase(), code: otpCode.trim() }
        : { phone: cleanDigits, email: targetEmail || undefined, code: otpCode.trim() };

      await verifyOtp(target);
      router.push('/customer/profile');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired verification code.');
    } finally {
      setSubmitting(false);
    }
  };

  // Owner Password Login
  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!ownerEmail || !ownerPassword) {
      setErrorMsg('Please enter both your studio owner email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await login({ email: ownerEmail, password: ownerPassword }, 'OWNER');
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-theme-page text-theme-main p-4 transition-colors relative">
      {/* Top right theme toggle */}
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
            {role === 'CUSTOMER' ? 'Customer Passwordless Portal' : 'Studio Owner Workspace'}
          </p>
        </div>

        {/* Login Card */}
        <div className="theme-card rounded-2xl p-6 sm:p-8 backdrop-blur-xl border border-theme shadow-2xl">
          {/* Main Role Switcher: Customer vs Shop Owner */}
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

          {/* Feedback Alerts */}
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

          {/* CUSTOMER PASSWORDLESS OTP SECTION */}
          {role === 'CUSTOMER' ? (
            <div className="space-y-5">
              {!otpSent ? (
                <form onSubmit={handleRequestCustomerOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-theme-muted mb-1">
                      Mobile Number or Email
                    </label>
                    <p className="text-[11px] text-theme-secondary mb-2">
                      Enter your 10-digit mobile number. We match your account and send a 6-digit verification code to your registered email.
                    </p>
                    <div className="relative">
                      {customerInput.includes('@') ? (
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted" />
                      ) : (
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted" />
                      )}
                      <input
                        type="text"
                        required
                        id="customer-login-input"
                        value={customerInput}
                        onChange={(e) => setCustomerInput(e.target.value)}
                        placeholder="e.g. 9876543210 or name@example.com"
                        className="theme-input w-full py-2.5 pl-10 pr-3.5 text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    id="btn-customer-request-otp"
                    className="theme-btn-primary w-full py-3 text-sm font-bold shadow-md flex items-center justify-center gap-2"
                  >
                    {submitting ? 'Sending Code...' : 'Send Verification Code'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                /* Step 2: Enter OTP Form */
                <form onSubmit={handleVerifyCustomerOtp} className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-theme-secondary">
                      Destination:{' '}
                      <strong className="text-theme-main">{customerInput}</strong>
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
                      Change Number
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-theme-muted mb-1.5">
                      Enter 6-Digit Email Verification Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      autoFocus
                      id="customer-otp-input"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="• • • • • •"
                      className="theme-input w-full text-center text-xl font-mono tracking-widest py-3 font-bold"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    id="btn-customer-verify-otp"
                    className="theme-btn-primary w-full py-3 text-sm font-bold shadow-md flex items-center justify-center gap-2"
                  >
                    {submitting ? 'Verifying...' : 'Verify Code & Sign In'}
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
            /* SHOP OWNER PASSWORD LOGIN */
            <form onSubmit={handleOwnerLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-theme-muted mb-1.5">
                  Studio Owner Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted" />
                  <input
                    type="email"
                    required
                    id="owner-login-email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="owner@localscut.com"
                    className="theme-input w-full py-2.5 pl-10 pr-3.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-theme-muted mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted" />
                  <input
                    type="password"
                    required
                    id="owner-login-password"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="••••••••"
                    className="theme-input w-full py-2.5 pl-10 pr-3.5 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                id="btn-owner-login"
                className="theme-btn-primary w-full py-3 text-sm font-bold shadow-md mt-2 flex items-center justify-center gap-2"
              >
                {submitting ? 'Authenticating...' : 'Sign In to Studio Workspace'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* Footer navigation */}
          <div className="mt-6 border-t border-theme-light pt-4 text-center">
            <p className="text-xs text-theme-secondary">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-bold accent-color hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
