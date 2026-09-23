'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  Scissors,
  User,
  Download,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Copy,
  Check,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { appointmentService, Appointment } from '../../../services/appointment.service';
import { CustomerNav } from '../../../components/customer-nav';
import { CustomerFooter } from '../../../components/customer-footer';

// Helper to generate and download an .ics iCalendar file
function downloadIcsFile(appt: Appointment) {
  const formatIcsDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const icsStart = formatIcsDate(new Date(appt.startAt));
  const icsEnd = formatIcsDate(new Date(appt.endAt));

  const content = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Local\'s Cut//Barber Appointment//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:appt-${appt.id}@localscut.com`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${icsStart}`,
    `DTEND:${icsEnd}`,
    `SUMMARY:${appt.serviceNameSnapshot} - Local's Cut Studio`,
    `DESCRIPTION:Appointment for ${appt.serviceNameSnapshot} with ${appt.barberNameSnapshot}. Booking Token: ${appt.bookingToken}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `appointment-${appt.bookingToken}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function CustomerAppointmentsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Cancellation Popup State
  const [cancellingAppt, setCancellingAppt] = useState<Appointment | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'CUSTOMER')) {
      if (user?.role === 'OWNER') {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && user.role === 'CUSTOMER') {
      appointmentService
        .getMy()
        .then((data) => {
          // Hide cancelled bookings so customer only sees their active and confirmed schedule
          setAppointments(data.filter((a) => a.status !== 'CANCELLED'));
        })
        .catch((err) => {
          setError(err?.message || 'Failed to load your appointments.');
        })
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleCopy = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingAppt) return;
    setIsCancelling(true);
    try {
      await appointmentService.cancel(cancellingAppt.id);
      // Remove immediately so customer cannot see the cancelled booking
      setAppointments((prev) => prev.filter((a) => a.id !== cancellingAppt.id));
      const token = cancellingAppt.bookingToken;
      setCancellingAppt(null);
      setCancelSuccessMsg(`Appointment ${token} has been cancelled and removed from your schedule.`);
      setTimeout(() => setCancelSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Failed to cancel appointment.');
    } finally {
      setIsCancelling(false);
    }
  };

  const formatDate = (isoString: string, timezone: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: timezone || 'Asia/Kolkata',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(d);
    } catch {
      return isoString.split('T')[0];
    }
  };

  const formatTime = (isoString: string, timezone: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: timezone || 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    } catch {
      return isoString.split('T')[1]?.substring(0, 5) || '';
    }
  };

  return (
    <div className="min-h-screen bg-theme-base text-theme-main flex flex-col justify-between">
      <CustomerNav />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="theme-badge-accent">Customer Account</span>
              <span className="text-xs text-theme-muted">• Local&apos;s Cut Studio</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-theme-main tracking-tight">
              My Appointments
            </h1>
            <p className="text-xs sm:text-sm text-theme-secondary">
              Review your scheduled visits, token details, and calendar downloads.
            </p>
          </div>

          <Link
            href="/book"
            className="theme-btn-primary self-start sm:self-auto px-4 py-2 text-xs sm:text-sm font-bold shadow-md inline-flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            <span>Book New Appointment</span>
          </Link>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-36 rounded-2xl bg-theme-surface animate-pulse border border-theme"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 flex items-center gap-3 text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        ) : appointments.length === 0 ? (
          <div className="rounded-3xl border border-theme bg-theme-surface p-12 text-center space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
              <Calendar className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-theme-main">No appointments yet</h3>
              <p className="text-xs text-theme-muted max-w-sm mx-auto">
                Ready for a fresh trim or beard style? Choose a service and date to get started.
              </p>
            </div>
            <Link
              href="/book"
              className="inline-flex items-center gap-2 theme-btn-primary px-6 py-2.5 text-xs sm:text-sm font-bold shadow-md"
            >
              <span>Explore Services & Book</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appt) => {
              const isPast = new Date(appt.endAt) < new Date();
              return (
                <div
                  key={appt.id}
                  className="rounded-2xl border border-theme bg-theme-surface p-5 sm:p-6 transition hover:border-amber-500/30 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-theme-light pb-4 mb-4">
                    {/* Token & Status */}
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 flex items-center gap-2">
                        <span className="text-xs font-mono font-black tracking-wider text-amber-400">
                          {appt.bookingToken}
                        </span>
                        <button
                          onClick={() => handleCopy(appt.bookingToken)}
                          title="Copy Booking Token"
                          className="text-theme-muted hover:text-amber-400 transition"
                        >
                          {copiedToken === appt.bookingToken ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          appt.status === 'CONFIRMED'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : appt.status === 'COMPLETED'
                            ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            : 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30 line-through'
                        }`}
                      >
                        <ShieldCheck className="h-3 w-3" />
                        <span>{appt.status}</span>
                      </span>

                      {isPast && appt.status === 'CONFIRMED' && (
                        <span className="text-[10px] uppercase font-bold text-theme-muted tracking-wider">
                          (Past)
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      {appt.status === 'CONFIRMED' && !isPast && (
                        <button
                          onClick={() => setCancellingAppt(appt)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Cancel Booking</span>
                        </button>
                      )}

                      <button
                        onClick={() => downloadIcsFile(appt)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-theme px-3 py-1.5 text-xs font-semibold text-theme-secondary hover:text-theme-main hover:border-amber-500/40 transition"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Add to Calendar</span>
                      </button>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-theme-muted">
                        Service
                      </span>
                      <p className="font-bold text-sm text-theme-main mt-0.5">
                        {appt.serviceNameSnapshot}
                      </p>
                      <p className="text-theme-secondary mt-0.5">
                        ₹{appt.servicePriceSnapshot} • {appt.serviceDurationSnapshot}m
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase text-theme-muted">
                        Barber
                      </span>
                      <p className="font-bold text-sm text-theme-main mt-0.5">
                        {appt.barberNameSnapshot}
                      </p>
                      <p className="text-theme-secondary mt-0.5">Master Barber</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase text-theme-muted">
                        Date
                      </span>
                      <p className="font-bold text-sm text-theme-main mt-0.5">
                        {formatDate(appt.startAt, appt.timezone)}
                      </p>
                      <p className="text-theme-muted mt-0.5">{appt.timezone}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase text-theme-muted">
                        Time
                      </span>
                      <p className="font-bold text-sm accent-color mt-0.5">
                        {formatTime(appt.startAt, appt.timezone)} –{' '}
                        {formatTime(appt.endAt, appt.timezone)}
                      </p>
                      <p className="text-theme-muted mt-0.5">
                        {appt.serviceDurationSnapshot} mins
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cancellation Success Toast */}
        {cancelSuccessMsg && (
          <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-emerald-500/30 bg-zinc-950/95 p-4 text-xs text-emerald-400 shadow-2xl flex items-center gap-2.5 backdrop-blur-xl animate-in slide-in-from-bottom-2 duration-200">
            <Check className="h-4 w-4 text-emerald-400" />
            <span className="font-medium">{cancelSuccessMsg}</span>
          </div>
        )}

        {/* Cancellation Confirmation Modal Popup */}
        {cancellingAppt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-theme-surface p-6 sm:p-7 space-y-5 shadow-2xl relative">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-theme-main">Cancel Appointment?</h3>
                  <p className="text-xs text-theme-secondary leading-relaxed">
                    Are you sure you want to cancel this booking? Once cancelled, it will be removed from your schedule and your slot will be freed immediately.
                  </p>
                </div>
              </div>

              {/* Appointment Brief Card */}
              <div className="rounded-2xl border border-theme bg-theme-surface-elevated p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-theme-light pb-2">
                  <span className="text-[10px] font-bold uppercase text-theme-muted">Booking Token</span>
                  <span className="font-mono font-black text-amber-400">{cancellingAppt.bookingToken}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-[10px] text-theme-muted uppercase font-bold">Service</span>
                    <p className="font-bold text-theme-main">{cancellingAppt.serviceNameSnapshot}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-theme-muted uppercase font-bold">Barber</span>
                    <p className="font-bold text-theme-main">{cancellingAppt.barberNameSnapshot}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-theme-muted uppercase font-bold">Scheduled Time</span>
                    <p className="font-bold text-amber-400">
                      {formatDate(cancellingAppt.startAt, cancellingAppt.timezone)} • {formatTime(cancellingAppt.startAt, cancellingAppt.timezone)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex flex-col-reverse sm:flex-row items-center gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={() => setCancellingAppt(null)}
                  className="w-full sm:w-1/2 rounded-xl border border-theme py-2.5 text-xs font-semibold text-theme-secondary hover:text-theme-main transition"
                >
                  Keep Appointment
                </button>
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={handleConfirmCancel}
                  className="w-full sm:w-1/2 rounded-xl bg-red-600 hover:bg-red-500 py-2.5 text-xs font-bold text-white shadow-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isCancelling ? (
                    <span>Cancelling...</span>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      <span>Yes, Cancel</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <CustomerFooter />
    </div>
  );
}
