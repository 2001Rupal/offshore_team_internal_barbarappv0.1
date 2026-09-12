'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';

export default function BarbersPage() {
  const { shop } = useAuth();
  const queryClient = useQueryClient();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [deactivatingBarber, setDeactivatingBarber] = useState<Barber | null>(null);

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const createMutation = useMutation({
    mutationFn: (payload: CreateBarberPayload) =>
      barberService.createBarber(shop!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barbers', shop?.id] });
      setIsAddModalOpen(false);
      resetForm();
      setFeedbackMsg({ type: 'success', text: 'Barber added to roster successfully!' });
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
      setFeedbackMsg({ type: 'success', text: 'Barber details updated successfully!' });
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
        text: `Barber ${variables.isActive ? 'activated' : 'deactivated'} successfully!`,
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
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
        <h2 className="text-base font-semibold text-zinc-200">Shop Required</h2>
        <p className="mt-1 text-xs text-zinc-400">
          Please create your shop first before managing barbers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Add Action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Staff Barbers
          </h1>
          <p className="text-sm text-zinc-400">
            Manage your shop&apos;s team of barbers and stylists
          </p>
        </div>

        <button
          onClick={openAddModal}
          id="btn-add-barber"
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-md transition hover:bg-amber-400"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Add Barber</span>
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

      {/* Barbers Table / List */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 shadow-xl backdrop-blur-sm">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          </div>
        ) : barbers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-zinc-600" />
            <h2 className="mt-3 text-sm font-semibold text-zinc-300">No barbers added yet</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Click &quot;Add Barber&quot; to build your shop roster.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800/80 bg-zinc-950/40 text-xs uppercase text-zinc-400">
              <tr>
                <th className="px-6 py-3.5">Name</th>
                <th className="px-6 py-3.5">Experience</th>
                <th className="px-6 py-3.5">Contact</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {barbers.map((barber) => (
                <tr
                  key={barber.id}
                  id={`barber-row-${barber.name.toLowerCase()}`}
                  className="transition hover:bg-zinc-800/20"
                >
                  <td className="px-6 py-4 font-medium text-zinc-100">
                    <div>
                      <span className="font-semibold text-white">{barber.name}</span>
                      {barber.bio && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-zinc-400">
                          {barber.bio}
                        </p>
                      )}
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
                        <p className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-zinc-500" />
                          <span>{barber.phone}</span>
                        </p>
                      )}
                      {barber.email && (
                        <p className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-zinc-500" />
                          <span>{barber.email}</span>
                        </p>
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
                        className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-1.5 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => setDeactivatingBarber(barber)}
                        title={barber.isActive ? 'Deactivate Barber' : 'Reactivate Barber'}
                        className={`rounded-lg border p-1.5 transition ${
                          barber.isActive
                            ? 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-amber-500/30 hover:text-amber-400'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-base font-semibold text-white">Add Barber</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300">Name *</label>
                <input
                  type="text"
                  required
                  id="add-barber-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul"
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
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
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">Phone</label>
                <input
                  type="tel"
                  id="add-barber-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9999999999"
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">Email</label>
                <input
                  type="email"
                  id="add-barber-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. rahul@example.com"
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">Bio / Specialty</label>
                <textarea
                  rows={2}
                  id="add-barber-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="e.g. Specialist in modern fades and beard grooming"
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg border border-zinc-800 px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  id="btn-confirm-add-barber"
                  className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Adding...' : 'Add Barber'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Barber Modal */}
      {editingBarber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-base font-semibold text-white">Edit Barber</h2>
              <button
                onClick={() => setEditingBarber(null)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300">Name *</label>
                <input
                  type="text"
                  required
                  id="edit-barber-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
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
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">Phone</label>
                <input
                  type="tel"
                  id="edit-barber-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">Email</label>
                <input
                  type="email"
                  id="edit-barber-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">Bio / Specialty</label>
                <textarea
                  rows={2}
                  id="edit-barber-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingBarber(null)}
                  className="rounded-lg border border-zinc-800 px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  id="btn-confirm-edit-barber"
                  className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h2 className="text-base font-semibold text-white">
              {deactivatingBarber.isActive ? 'Deactivate Barber' : 'Reactivate Barber'}
            </h2>
            <p className="mt-2 text-xs text-zinc-400">
              Are you sure you want to{' '}
              {deactivatingBarber.isActive ? 'deactivate' : 'reactivate'}{' '}
              <strong className="text-zinc-200">{deactivatingBarber.name}</strong>?
              {deactivatingBarber.isActive &&
                ' The barber record will remain stored for future historical continuity.'}
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeactivatingBarber(null)}
                className="rounded-lg border border-zinc-800 px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800"
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
                className={`rounded-lg px-4 py-2 text-xs font-semibold text-zinc-950 ${
                  deactivatingBarber.isActive
                    ? 'bg-amber-500 hover:bg-amber-400'
                    : 'bg-emerald-500 hover:bg-emerald-400'
                }`}
              >
                {statusMutation.isPending
                  ? 'Updating...'
                  : deactivatingBarber.isActive
                  ? 'Deactivate'
                  : 'Reactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
