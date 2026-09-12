'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { Scissors, AlertCircle, Lock, Mail, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await login({ email, password });
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('owner@example.com');
    setPassword('change-me');
    setErrorMsg(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md">
        {/* Logo and Brand Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg shadow-amber-500/20">
            <Scissors className="h-7 w-7 text-zinc-950" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Barber Platform
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Shop Owner Portal — Level 1
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-8 shadow-2xl backdrop-blur-xl">
          <h2 className="text-lg font-semibold text-zinc-100">Welcome back</h2>
          <p className="text-xs text-zinc-400">Sign in to manage your shop, barbers, and services</p>

          {errorMsg && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300">
                Email Address
              </label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="email"
                  required
                  id="login-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@example.com"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 py-2.5 pl-10 pr-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300">
                Password
              </label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="password"
                  required
                  id="login-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 py-2.5 pl-10 pr-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              id="btn-login-submit"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 py-2.5 text-sm font-semibold text-zinc-950 shadow-md transition hover:from-amber-400 hover:to-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Demo Helper Button */}
          <div className="mt-6 border-t border-zinc-800/80 pt-4 text-center">
            <button
              type="button"
              onClick={handleFillDemo}
              className="text-xs text-amber-400/90 underline-offset-4 hover:underline"
            >
              Fill Demo Owner Credentials (owner@example.com)
            </button>
          </div>
        </div>

        {/* Footer link to register */}
        <p className="mt-6 text-center text-xs text-zinc-400">
          Don&apos;t have an owner account?{' '}
          <Link
            href="/register"
            className="font-medium text-amber-400 hover:text-amber-300 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
