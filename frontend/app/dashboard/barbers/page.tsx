'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { barberService, CreateBarberPayload, UpdateBarberPayload } from '../../../services/barber.service';
import { barberServicesService } from '../../../services/barber-service.service';
import { Barber } from '../../../types';
import {
  Users,
  PlusCircle,
  Edit2,
  Power,
  X,
  AlertCircle,
  CheckCircle2,
  Briefcase,
  Phone,
  Mail,
  Search,
  Calendar,
  Scissors,
  CheckCheck,
  UserX,
  Sparkles,
} from 'lucide-react';
import BarberScheduleModal from '../../../components/barbers/BarberScheduleModal';
import BarberServicesModal from '../../../components/barbers/BarberServicesModal';
import { Portal } from '../../../components/portal';

function BarberServicesCell({
  barberId,
  isActive,
  onManage,
}: {
  barberId: string;
  isActive: boolean;
  onManage: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['barber-services', barberId],
    queryFn: () => barberServicesService.getBarberServices(barberId),
    staleTime: 30_000,
  });

  if (isLoading) {
    return <span className="text-[11px] text-zinc-500 animate-pulse">Checking services...</span>;
  }

  const assigned = data?.services || [];

  if (assigned.length === 0) {
    return (
      <button
        type="button"
        onClick={onManage}
        disabled={!isActive}
        className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 underline underline-offset-4 disabled:opacity-40 disabled:no-underline transition"
      >
        <Scissors className="h-3 w-3" />
        <span>Assign services</span>
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
      {assigned.slice(0, 2).map((service) => (
        <span
          key={service.id}
          className="rounded-lg bg-zinc-800/80 border border-zinc-700/60 px-2 py-0.5 text-[11px] font-medium text-zinc-200"
        >
          {service.name}
        </span>
      ))}
      {assigned.length > 2 && (
        <button
          type="button"
          onClick={onManage}
          className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 hover:bg-amber-500/20 transition"
        >
          +{assigned.length - 2} more
        </button>
      )}
    </div>
  );
}

function BarberServicesActionButton({
  barber,
  onManage,
}: {
  barber: Barber;
  onManage: () => void;
}) {
  const { data } = useQuery({
    queryKey: ['barber-services', barber.id],
    queryFn: () => barberServicesService.getBarberServices(barber.id),
    staleTime: 30_000,
  });

  const count = data?.services?.length ?? 0;

  return (
    <button
      onClick={onManage}
      disabled={!barber.isActive}
      id={`btn-services-${barber.name.toLowerCase()}`}
      title="Manage Services"
      className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-amber-500/40 hover:text-amber-400 transition shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Scissors className="h-3.5 w-3.5 text-amber-400" />
      <span>Services</span>
      {count > 0 && (
        <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-300">
          {count}
        </span>
      )}
    </button>
  );
}

export default function BarbersPage() {
  const { shop } = useAuth();
  const queryClient = useQueryClient();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [deactivatingBarber, setDeactivatingBarber] = useState<Barber | null>(null);
  const [schedulingBarber, setSchedulingBarber] = useState<Barber | null>(null);
  const [servicesBarber, setServicesBarber] = useState<Barber | null>(null);

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Form states for Add / Edit
  const [name, setName] = useState('');
  const [experienceYears, setExperienceYears] = useState<number | ''>('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');

  const { data: barbers = [], isLoading } = useQuery({
    queryKey: ['barbers', shop?.id],
    queryFn: () => (shop ? barberService.getBarbersByShop(shop.id) : Promise.resolve([])),
    enabled: !!shop?.id,
  });

  const activeBarbers = useMemo(() => barbers.filter((b) => b.isActive), [barbers]);
  const inactiveBarbers = useMemo(() => barbers.filter((b) => !b.isActive), [barbers]);

  const filteredBarbers = useMemo(() => {
    return barbers.filter((barber) => {
      const matchesSearch =
        barber.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (barber.bio && barber.bio.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (barber.phone && barber.phone.includes(searchQuery));

      if (statusFilter === 'ACTIVE') return matchesSearch && barber.isActive;
      if (statusFilter === 'INACTIVE') return matchesSearch && !barber.isActive;
      return matchesSearch;
    });
  }, [barbers, searchQuery, statusFilter]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateBarberPayload) =>
      barberService.createBarber(shop!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barbers', shop?.id] });
      setIsAddModalOpen(false);
      resetForm();
      setFeedbackMsg({ type: 'success', text: 'Barber successfully added to roster.' });
    },
    onError: (err: any) => {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to add barber' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateBarberPayload }) =>
      barberService.updateBarber(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barbers', shop?.id] });
      setEditingBarber(null);
      resetForm();
      setFeedbackMsg({ type: 'success', text: 'Barber details successfully updated.' });
    },
    onError: (err: any) => {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to update barber' });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      barberService.updateStatus(id, isActive),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['barbers', shop?.id] });
      setDeactivatingBarber(null);
      setFeedbackMsg({
        type: 'success',
        text: `Barber ${variables.isActive ? 'activated' : 'deactivated'} successfully.`,
      });
    },
    onError: (err: any) => {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to update barber status' });
    },
  });

  const resetForm = () => {
    setName('');
    setExperienceYears('');
    setPhone('');
    setEmail('');
    setBio('');
  };

  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const openEditModal = (barber: Barber) => {
    setName(barber.name);
    setExperienceYears(barber.experienceYears ?? '');
    setPhone(barber.phone || '');
    setEmail(barber.email || '');
    setBio(barber.bio || '');
    setEditingBarber(barber);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    createMutation.mutate({
      name,
      experienceYears: experienceYears === '' ? undefined : Number(experienceYears),
      phone: phone || undefined,
      email: email || undefined,
      bio: bio || undefined,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBarber) return;
    updateMutation.mutate({
      id: editingBarber.id,
      payload: {
        name,
        experienceYears: experienceYears === '' ? undefined : Number(experienceYears),
        phone: phone || undefined,
        email: email || undefined,
        bio: bio || undefined,
      },
    });
  };

  if (!shop) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 text-center">
        <Users className="mx-auto h-12 w-12 text-zinc-600" />
        <h2 className="mt-4 text-base font-semibold text-zinc-200">Shop Profile Required</h2>
        <p className="mt-1 text-xs text-zinc-400">
          Please configure your shop profile before adding staff barbers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {feedbackMsg && (
        <div
          className={`flex items-center justify-between rounded-xl border p-4 text-sm ${
            feedbackMsg.type === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
              : 'border-red-500/20 bg-red-500/10 text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)}>
            <X className="h-4 w-4 text-zinc-400 hover:text-zinc-200" />
          </button>
        </div>
      )}

      {/* Quick Interactive KPI Stat Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`rounded-2xl border p-4 text-left transition ${
            statusFilter === 'ALL'
              ? 'border-amber-500/50 bg-amber-500/5 shadow-md'
              : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Total Team Roster</span>
            <Users className="h-4 w-4 text-zinc-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{barbers.length}</p>
          <span className="mt-1 block text-[11px] text-zinc-400">All registered barbers</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('ACTIVE')}
          className={`rounded-2xl border p-4 text-left transition ${
            statusFilter === 'ACTIVE'
              ? 'border-emerald-500/50 bg-emerald-500/5 shadow-md'
              : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Active & Working</span>
            <CheckCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-400">{activeBarbers.length}</p>
          <span className="mt-1 block text-[11px] text-zinc-400">Available for bookings & shifts</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('INACTIVE')}
          className={`rounded-2xl border p-4 text-left transition ${
            statusFilter === 'INACTIVE'
              ? 'border-zinc-500/50 bg-zinc-800/40 shadow-md'
              : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Inactive Staff</span>
            <UserX className="h-4 w-4 text-zinc-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-zinc-400">{inactiveBarbers.length}</p>
          <span className="mt-1 block text-[11px] text-zinc-400">Temporarily off-duty</span>
        </button>
      </div>

      {/* Search & Filter Toolbar with Add Barber Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by name, phone, or specialty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-2 pl-10 pr-4 text-xs text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filter Segmented Control */}
          <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`rounded-lg px-3 py-1.5 font-medium transition ${
                statusFilter === 'ALL'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All ({barbers.length})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`rounded-lg px-3 py-1.5 font-medium transition ${
                statusFilter === 'ACTIVE'
                  ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Active ({activeBarbers.length})
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={`rounded-lg px-3 py-1.5 font-medium transition ${
                statusFilter === 'INACTIVE'
                  ? 'bg-zinc-800 text-zinc-300 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Inactive ({inactiveBarbers.length})
            </button>
          </div>

          {/* Add Barber Button relocated next to active/inactive filter */}
          <button
            onClick={openAddModal}
            id="btn-add-barber"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-semibold text-zinc-950 shadow-md transition hover:bg-amber-400"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Barber</span>
          </button>
        </div>
      </div>

      {/* Barbers Table */}
      <div className="studio-surface overflow-hidden rounded-2xl">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          </div>
        ) : filteredBarbers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-zinc-600" />
            <h2 className="mt-3 text-sm font-semibold text-zinc-300">
              {searchQuery ? 'No matching barbers found' : 'No barbers on roster yet'}
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              {searchQuery
                ? 'Try adjusting your search criteria or clear the filter.'
                : 'Click "Add New Barber" to build your shop team.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800/80 bg-zinc-950/40 text-xs uppercase text-zinc-400">
                <tr>
                  <th className="px-5 py-3.5">Barber Profile</th>
                  <th className="px-5 py-3.5">Assigned Services</th>
                  <th className="px-5 py-3.5">Experience & Contact</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredBarbers.map((barber) => (
                  <tr
                    key={barber.id}
                    id={`barber-row-${barber.name.toLowerCase()}`}
                    className="transition hover:bg-zinc-800/20"
                  >
                    <td className="px-5 py-4 font-medium text-zinc-100">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-xs font-bold text-amber-400 border border-zinc-700/60">
                          {barber.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-white block">{barber.name}</span>
                          {barber.bio ? (
                            <p className="mt-0.5 line-clamp-1 text-xs text-zinc-400 max-w-xs">
                              {barber.bio}
                            </p>
                          ) : (
                            <p className="text-[11px] text-zinc-500">Master Barber</p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <BarberServicesCell
                        barberId={barber.id}
                        isActive={barber.isActive}
                        onManage={() => setServicesBarber(barber)}
                      />
                    </td>

                    <td className="px-5 py-4 text-xs text-zinc-400">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1.5 text-zinc-300 font-medium">
                          <Briefcase className="h-3.5 w-3.5 text-amber-400" />
                          {barber.experienceYears !== undefined && barber.experienceYears !== null
                            ? `${barber.experienceYears} ${
                                barber.experienceYears === 1 ? 'yr' : 'yrs'
                              } exp`
                            : 'Experience not set'}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                          {barber.phone && <span>{barber.phone}</span>}
                          {barber.phone && barber.email && <span>•</span>}
                          {barber.email && <span className="truncate max-w-[120px]">{barber.email}</span>}
                          {!barber.phone && !barber.email && <span>No contact info</span>}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                          barber.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            barber.isActive ? 'bg-emerald-400' : 'bg-zinc-500'
                          }`}
                        />
                        {barber.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <BarberServicesActionButton
                          barber={barber}
                          onManage={() => setServicesBarber(barber)}
                        />

                        <button
                          onClick={() => setSchedulingBarber(barber)}
                          id={`btn-schedule-${barber.name.toLowerCase()}`}
                          title="Manage Schedule & Exceptions"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-amber-500/40 hover:text-amber-400 transition shadow-sm"
                        >
                          <Calendar className="h-3.5 w-3.5 text-amber-400" />
                          <span>Schedule</span>
                        </button>

                        <button
                          onClick={() => openEditModal(barber)}
                          title="Edit Details"
                          className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-2 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition shadow-sm"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => setDeactivatingBarber(barber)}
                          title={barber.isActive ? 'Deactivate Barber' : 'Reactivate Barber'}
                          className={`rounded-xl border p-2 transition shadow-sm ${
                            barber.isActive
                              ? 'border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-amber-500/30 hover:text-amber-400'
                              : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Barber Modal */}
      {isAddModalOpen && (
        <Portal onClose={() => !createMutation.isPending && setIsAddModalOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget && !createMutation.isPending) setIsAddModalOpen(false);
            }}
          >
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-950 p-6 sm:p-7 shadow-2xl text-zinc-900 dark:text-zinc-100 my-auto max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150 ring-1 ring-black/5 dark:ring-white/5">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3.5 shrink-0">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">Add Staff Barber</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Create a team profile for your shop</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5 overflow-y-auto flex-1 pr-0.5 min-h-0">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Barber Name *</label>
                <input
                  type="text"
                  required
                  id="add-barber-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Experience (Years)
                </label>
                <input
                  type="number"
                  min="0"
                  id="add-barber-experience"
                  value={experienceYears}
                  onChange={(e) =>
                    setExperienceYears(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  placeholder="e.g. 5"
                  className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Contact Phone</label>
                <input
                  type="tel"
                  id="add-barber-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Email Address</label>
                <input
                  type="email"
                  id="add-barber-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. rahul@localscut.com"
                  className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Specialty & Bio</label>
                <textarea
                  rows={2}
                  id="add-barber-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="e.g. Specialist in modern fades and beard sculpting"
                  className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  id="btn-confirm-add-barber"
                  className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 transition disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Adding...' : 'Add Barber'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </Portal>
      )}

      {/* Edit Barber Modal */}
      {editingBarber && (
        <Portal onClose={() => !updateMutation.isPending && setEditingBarber(null)}>
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget && !updateMutation.isPending) setEditingBarber(null);
            }}
          >
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-950 p-6 sm:p-7 shadow-2xl text-zinc-900 dark:text-zinc-100 my-auto max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150 ring-1 ring-black/5 dark:ring-white/5">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3.5 shrink-0">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">Edit Barber</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Update team member details</p>
              </div>
              <button
                onClick={() => setEditingBarber(null)}
                className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3.5 overflow-y-auto flex-1 pr-0.5 min-h-0">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Barber Name *</label>
                <input
                  type="text"
                  required
                  id="edit-barber-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Experience (Years)
                </label>
                <input
                  type="number"
                  min="0"
                  id="edit-barber-experience"
                  value={experienceYears}
                  onChange={(e) =>
                    setExperienceYears(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Contact Phone</label>
                <input
                  type="tel"
                  id="edit-barber-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Email Address</label>
                <input
                  type="email"
                  id="edit-barber-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Specialty & Bio</label>
                <textarea
                  rows={2}
                  id="edit-barber-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingBarber(null)}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  id="btn-confirm-edit-barber"
                  className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 transition disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </Portal>
      )}

      {/* Confirmation Modal for Toggle Status */}
      {deactivatingBarber && (
        <Portal onClose={() => !statusMutation.isPending && setDeactivatingBarber(null)}>
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget && !statusMutation.isPending) setDeactivatingBarber(null);
            }}
          >
          <div className="relative w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-950 p-6 shadow-2xl text-zinc-900 dark:text-zinc-100 my-auto animate-in zoom-in-95 duration-150 ring-1 ring-black/5 dark:ring-white/5">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              {deactivatingBarber.isActive ? 'Deactivate Barber' : 'Reactivate Barber'}
            </h2>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Are you sure you want to{' '}
              {deactivatingBarber.isActive ? 'temporarily deactivate' : 'reactivate'}{' '}
              <strong className="text-zinc-900 dark:text-zinc-200">{deactivatingBarber.name}</strong>?
              {deactivatingBarber.isActive &&
                ' Staff records, working schedules, and historical assignments will be preserved.'}
            </p>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeactivatingBarber(null)}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-toggle-barber"
                onClick={() =>
                  statusMutation.mutate({
                    id: deactivatingBarber.id,
                    isActive: !deactivatingBarber.isActive,
                  })
                }
                disabled={statusMutation.isPending}
                className={`rounded-xl px-4 py-2 text-xs font-semibold text-zinc-950 transition ${
                  deactivatingBarber.isActive
                    ? 'bg-amber-500 hover:bg-amber-400'
                    : 'bg-emerald-500 hover:bg-emerald-400'
                }`}
              >
                {statusMutation.isPending
                  ? 'Updating...'
                  : deactivatingBarber.isActive
                  ? 'Confirm Deactivation'
                  : 'Confirm Activation'}
              </button>
            </div>
          </div>
        </div>
        </Portal>
      )}

      {/* Barber Schedule & Exceptions Modal */}
      {schedulingBarber && (
        <BarberScheduleModal
          barber={schedulingBarber}
          onClose={() => setSchedulingBarber(null)}
        />
      )}

      {/* Barber Services Assignment Modal */}
      {servicesBarber && (
        <BarberServicesModal
          barber={servicesBarber}
          onClose={() => setServicesBarber(null)}
          onSuccess={(text) => setFeedbackMsg({ type: 'success', text })}
        />
      )}
    </div>
  );
}
