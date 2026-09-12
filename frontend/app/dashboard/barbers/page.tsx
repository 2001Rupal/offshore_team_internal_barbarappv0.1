'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { barberService, CreateBarberPayload, UpdateBarberPayload } from '../../../services/barber.service';
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
  Filter,
} from 'lucide-react';

export default function BarbersPage() {
  const { shop } = useAuth();
  const queryClient = useQueryClient();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [deactivatingBarber, setDeactivatingBarber] = useState<Barber | null>(null);

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
      {/* Header & Main Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Staff Barbers
            </h1>
            <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-300">
              {barbers.length} Total
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Manage your barbershop team roster, qualifications, and active work statuses
          </p>
        </div>

        <button
          onClick={openAddModal}
          id="btn-add-barber"
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-md transition hover:bg-amber-400"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Add New Barber</span>
        </button>
      </div>

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

      {/* Search & Filter Toolbar */}
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

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1 text-xs">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`rounded-lg px-3 py-1 font-medium transition ${
              statusFilter === 'ALL'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All ({barbers.length})
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`rounded-lg px-3 py-1 font-medium transition ${
              statusFilter === 'ACTIVE'
                ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Active ({barbers.filter((b) => b.isActive).length})
          </button>
          <button
            onClick={() => setStatusFilter('INACTIVE')}
            className={`rounded-lg px-3 py-1 font-medium transition ${
              statusFilter === 'INACTIVE'
                ? 'bg-zinc-800 text-zinc-300 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Inactive ({barbers.filter((b) => !b.isActive).length})
          </button>
        </div>
      </div>

      {/* Barbers Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 shadow-xl backdrop-blur-sm">
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
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800/80 bg-zinc-950/40 text-xs uppercase text-zinc-400">
              <tr>
                <th className="px-6 py-3.5">Barber Profile</th>
                <th className="px-6 py-3.5">Experience</th>
                <th className="px-6 py-3.5">Contact Details</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredBarbers.map((barber) => (
                <tr
                  key={barber.id}
                  id={`barber-row-${barber.name.toLowerCase()}`}
                  className="transition hover:bg-zinc-800/20"
                >
                  <td className="px-6 py-4 font-medium text-zinc-100">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-xs font-bold text-amber-400 border border-zinc-700/60">
                        {barber.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-semibold text-white">{barber.name}</span>
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
                  <td className="px-6 py-4 text-zinc-300">
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <Briefcase className="h-3.5 w-3.5 text-amber-400" />
                      {barber.experienceYears !== undefined && barber.experienceYears !== null
                        ? `${barber.experienceYears} ${
                            barber.experienceYears === 1 ? 'year' : 'years'
                          }`
                        : 'Not specified'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-zinc-400">
                    <div className="space-y-0.5">
                      {barber.phone && (
                        <a
                          href={`tel:${barber.phone}`}
                          className="flex items-center gap-1.5 text-zinc-300 hover:text-amber-400 transition"
                        >
                          <Phone className="h-3 w-3 text-zinc-500" />
                          <span>{barber.phone}</span>
                        </a>
                      )}
                      {barber.email && (
                        <a
                          href={`mailto:${barber.email}`}
                          className="flex items-center gap-1.5 text-zinc-300 hover:text-amber-400 transition"
                        >
                          <Mail className="h-3 w-3 text-zinc-500" />
                          <span>{barber.email}</span>
                        </a>
                      )}
                      {!barber.phone && !barber.email && <span>—</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
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
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(barber)}
                        title="Edit Barber"
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
        )}
      </div>

      {/* Add Barber Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3.5">
              <div>
                <h2 className="text-base font-semibold text-white">Add Staff Barber</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Create a team profile for your shop</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-300">Barber Name *</label>
                <input
                  type="text"
                  required
                  id="add-barber-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">
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
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">Contact Phone</label>
                <input
                  type="tel"
                  id="add-barber-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9999999999"
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">Email Address</label>
                <input
                  type="email"
                  id="add-barber-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. rahul@example.com"
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">Specialty & Bio</label>
                <textarea
                  rows={2}
                  id="add-barber-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="e.g. Specialist in skin fades, beard line-ups, and modern texture"
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2.5 pt-3 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-zinc-800 px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-900 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  id="btn-confirm-add-barber"
                  className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 transition disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Adding to team...' : 'Save to Roster'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Barber Modal */}
      {editingBarber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3.5">
              <div>
                <h2 className="text-base font-semibold text-white">Edit Barber</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Update team member details</p>
              </div>
              <button
                onClick={() => setEditingBarber(null)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-300">Barber Name *</label>
                <input
                  type="text"
                  required
                  id="edit-barber-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">
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
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">Contact Phone</label>
                <input
                  type="tel"
                  id="edit-barber-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">Email Address</label>
                <input
                  type="email"
                  id="edit-barber-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">Specialty & Bio</label>
                <textarea
                  rows={2}
                  id="edit-barber-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2.5 pt-3 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setEditingBarber(null)}
                  className="rounded-xl border border-zinc-800 px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-900 transition"
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
      )}

      {/* Confirmation Modal for Toggle Status */}
      {deactivatingBarber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <h2 className="text-base font-semibold text-white">
              {deactivatingBarber.isActive ? 'Deactivate Barber' : 'Reactivate Barber'}
            </h2>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
              Are you sure you want to{' '}
              {deactivatingBarber.isActive ? 'temporarily deactivate' : 'reactivate'}{' '}
              <strong className="text-zinc-200">{deactivatingBarber.name}</strong>?
              {deactivatingBarber.isActive &&
                ' Staff records and historical logs will be preserved.'}
            </p>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeactivatingBarber(null)}
                className="rounded-xl border border-zinc-800 px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-900 transition"
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
      )}
    </div>
  );
}
