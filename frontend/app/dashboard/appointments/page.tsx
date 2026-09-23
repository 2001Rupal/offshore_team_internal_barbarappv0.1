'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { appointmentService, Appointment } from '../../../services/appointment.service';
import {
  Calendar,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  Phone,
  User,
  Scissors,
  Filter,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

export default function OwnerAppointmentsPage() {
  const { user, shop } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'TODAY' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await appointmentService.getOwnerAppointments();
      setAppointments(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'OWNER') {
      fetchAppointments();
    }
  }, [user]);

  const handleCopy = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleStatusUpdate = async (id: string, newStatus: 'COMPLETED' | 'CANCELLED') => {
    setActionLoadingId(id);
    try {
      if (newStatus === 'CANCELLED') {
        await appointmentService.cancel(id);
      } else {
        await appointmentService.updateStatus(id, newStatus);
      }
      // Update local state
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a)),
      );
    } catch (err: any) {
      alert(err?.message || 'Failed to update appointment.');
    } finally {
      setActionLoadingId(null);
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

  const todayIsoDate = new Date().toISOString().split('T')[0];

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      // 1. Status/Time filter
      const apptDate = appt.startAt.split('T')[0];
      const isPast = new Date(appt.endAt) < new Date();

      if (statusFilter === 'TODAY' && apptDate !== todayIsoDate) {
        return false;
      }
      if (statusFilter === 'UPCOMING' && (isPast || appt.status === 'CANCELLED' || appt.status === 'COMPLETED')) {
        return false;
      }
      if (statusFilter === 'COMPLETED' && appt.status !== 'COMPLETED') {
        return false;
      }
      if (statusFilter === 'CANCELLED' && appt.status !== 'CANCELLED') {
        return false;
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchToken = appt.bookingToken.toLowerCase().includes(query);
        const matchName = appt.customerNameSnapshot?.toLowerCase().includes(query);
        const matchPhone = appt.customerPhoneSnapshot?.includes(query);
        const matchBarber = appt.barberNameSnapshot?.toLowerCase().includes(query);
        const matchService = appt.serviceNameSnapshot?.toLowerCase().includes(query);
        return matchToken || matchName || matchPhone || matchBarber || matchService;
      }

      return true;
    });
  }, [appointments, statusFilter, searchQuery, todayIsoDate]);

  // Metrics
  const stats = useMemo(() => {
    const total = appointments.length;
    const today = appointments.filter((a) => a.startAt.split('T')[0] === todayIsoDate).length;
    const completed = appointments.filter((a) => a.status === 'COMPLETED').length;
    const cancelled = appointments.filter((a) => a.status === 'CANCELLED').length;
    const pendingUpcoming = appointments.filter((a) => a.status === 'CONFIRMED' && new Date(a.endAt) >= new Date()).length;
    return { total, today, completed, cancelled, pendingUpcoming };
  }, [appointments, todayIsoDate]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
              Studio Operations
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-time</span>
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
            Client Appointments & Bookings
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage incoming reservations, client check-ins, and schedule completions for {shop?.name || 'Studio'}.
          </p>
        </div>

        <button
          onClick={fetchAppointments}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-zinc-700 hover:text-white transition shadow-sm"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-amber-500' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <span className="text-[10px] uppercase font-bold text-zinc-400">Today&apos;s Bookings</span>
          <p className="text-2xl font-black text-amber-400 mt-1">{stats.today}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Scheduled for today</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <span className="text-[10px] uppercase font-bold text-zinc-400">Upcoming Active</span>
          <p className="text-2xl font-black text-emerald-400 mt-1">{stats.pendingUpcoming}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Awaiting visit</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <span className="text-[10px] uppercase font-bold text-zinc-400">Completed</span>
          <p className="text-2xl font-black text-blue-400 mt-1">{stats.completed}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Finished services</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <span className="text-[10px] uppercase font-bold text-zinc-400">Total Bookings</span>
          <p className="text-2xl font-black text-zinc-100 mt-1">{stats.total}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">All recorded</p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'TODAY', 'UPCOMING', 'COMPLETED', 'CANCELLED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === tab
                  ? 'bg-amber-500 text-black font-bold shadow-sm'
                  : 'border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 hover:text-white'
              }`}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search token, client, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 flex items-center gap-3 text-red-400 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Appointments List / Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-zinc-900/60 border border-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/30 p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-zinc-800/60 flex items-center justify-center mx-auto text-zinc-500">
            <Calendar className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-200">No appointments found</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {searchQuery
              ? 'No appointments matched your search query.'
              : 'There are currently no bookings under this filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((appt) => {
            const isPast = new Date(appt.endAt) < new Date();
            const isToday = appt.startAt.split('T')[0] === todayIsoDate;

            return (
              <div
                key={appt.id}
                className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 sm:p-5 transition hover:border-zinc-700 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/60 pb-3">
                  {/* Left: Token & Status */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 flex items-center gap-1.5">
                      <span className="font-mono font-black text-xs text-amber-400 tracking-wider">
                        {appt.bookingToken}
                      </span>
                      <button
                        onClick={() => handleCopy(appt.bookingToken)}
                        title="Copy token"
                        className="text-zinc-400 hover:text-amber-400 transition"
                      >
                        {copiedToken === appt.bookingToken ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        appt.status === 'CONFIRMED'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : appt.status === 'COMPLETED'
                          ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                          : 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30 line-through'
                      }`}
                    >
                      {appt.status}
                    </span>

                    {isToday && (
                      <span className="rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold">
                        TODAY
                      </span>
                    )}

                    {isPast && appt.status === 'CONFIRMED' && (
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold">
                        (Past Slot)
                      </span>
                    )}
                  </div>

                  {/* Right: Actions */}
                  {appt.status === 'CONFIRMED' && (
                    <div className="flex items-center gap-2">
                      <button
                        disabled={actionLoadingId === appt.id}
                        onClick={() => handleStatusUpdate(appt.id, 'COMPLETED')}
                        className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Mark Completed</span>
                      </button>

                      <button
                        disabled={actionLoadingId === appt.id}
                        onClick={() => {
                          if (confirm(`Cancel appointment ${appt.bookingToken} for ${appt.customerNameSnapshot}?`)) {
                            handleStatusUpdate(appt.id, 'CANCELLED');
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-zinc-500">Customer</span>
                    <p className="font-bold text-sm text-zinc-100 mt-0.5 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-amber-500" />
                      <span>{appt.customerNameSnapshot}</span>
                    </p>
                    {appt.customerPhoneSnapshot && (
                      <a
                        href={`tel:${appt.customerPhoneSnapshot}`}
                        className="text-[11px] text-amber-400/90 hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <Phone className="h-3 w-3" />
                        <span>{appt.customerPhoneSnapshot}</span>
                      </a>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-zinc-500">Service</span>
                    <p className="font-bold text-sm text-zinc-100 mt-0.5 flex items-center gap-1.5">
                      <Scissors className="h-3.5 w-3.5 text-amber-500" />
                      <span>{appt.serviceNameSnapshot}</span>
                    </p>
                    <p className="text-zinc-400 text-[11px] mt-0.5">
                      ₹{appt.servicePriceSnapshot} • {appt.serviceDurationSnapshot} mins
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-zinc-500">Barber</span>
                    <p className="font-bold text-sm text-zinc-100 mt-0.5">
                      {appt.barberNameSnapshot}
                    </p>
                    <p className="text-zinc-400 text-[11px] mt-0.5">Staff Stylist</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-zinc-500">Date & Time</span>
                    <p className="font-bold text-sm text-zinc-100 mt-0.5">
                      {formatDate(appt.startAt, appt.timezone)}
                    </p>
                    <p className="text-amber-400 font-semibold text-[11px] mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatTime(appt.startAt, appt.timezone)} – {formatTime(appt.endAt, appt.timezone)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
