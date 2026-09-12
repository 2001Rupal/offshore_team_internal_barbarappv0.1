'use client';

import React, { useState } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serviceService, CreateServicePayload, UpdateServicePayload } from '../../../services/service.service';
import { ServiceItem } from '../../../types';
import {
  Sparkles,
  PlusCircle,
  Edit2,
  Power,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  IndianRupee,
} from 'lucide-react';

export default function ServicesPage() {
  const { shop } = useAuth();
  const queryClient = useQueryClient();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [deactivatingService, setDeactivatingService] = useState<ServiceItem | null>(null);

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states for Add / Edit
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [durationMinutes, setDurationMinutes] = useState<number | ''>('');

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services', shop?.id],
    queryFn: () => (shop ? serviceService.getServicesByShop(shop.id) : Promise.resolve([])),
    enabled: !!shop?.id,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateServicePayload) =>
      serviceService.createService(shop!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', shop?.id] });
      setIsAddModalOpen(false);
      resetForm();
      setFeedbackMsg({ type: 'success', text: 'Service added to catalog successfully!' });
    },
    onError: (err: any) => {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to add service' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateServicePayload }) =>
      serviceService.updateService(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', shop?.id] });
      setEditingService(null);
      resetForm();
      setFeedbackMsg({ type: 'success', text: 'Service details updated successfully!' });
    },
    onError: (err: any) => {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to update service' });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      serviceService.updateStatus(id, isActive),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['services', shop?.id] });
      setDeactivatingService(null);
      setFeedbackMsg({
        type: 'success',
        text: `Service ${variables.isActive ? 'activated' : 'deactivated'} successfully!`,
      });
    },
    onError: (err: any) => {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to update service status' });
    },
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setPrice('');
    setDurationMinutes('');
  };

  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const openEditModal = (service: ServiceItem) => {
    setName(service.name);
    setDescription(service.description || '');
    setPrice(service.price);
    setDurationMinutes(service.durationMinutes);
    setEditingService(service);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    createMutation.mutate({
      name,
      description: description || undefined,
      price: Number(price),
      durationMinutes: Number(durationMinutes),
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    updateMutation.mutate({
      id: editingService.id,
      payload: {
        name,
        description: description || undefined,
        price: Number(price),
        durationMinutes: Number(durationMinutes),
      },
    });
  };

  if (!shop) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
        <h2 className="text-base font-semibold text-zinc-200">Shop Required</h2>
        <p className="mt-1 text-xs text-zinc-400">
          Please create your shop first before managing services.
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
            Grooming Services
          </h1>
          <p className="text-sm text-zinc-400">
            Define service catalog, pricing, and treatment durations
          </p>
        </div>

        <button
          onClick={openAddModal}
          id="btn-add-service"
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-md transition hover:bg-amber-400"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Add Service</span>
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

      {/* Services Table / List */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 shadow-xl backdrop-blur-sm">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          </div>
        ) : services.length === 0 ? (
          <div className="p-12 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-zinc-600" />
            <h2 className="mt-3 text-sm font-semibold text-zinc-300">No services added yet</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Click &quot;Add Service&quot; to build your shop&apos;s service menu.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800/80 bg-zinc-950/40 text-xs uppercase text-zinc-400">
              <tr>
                <th className="px-6 py-3.5">Service</th>
                <th className="px-6 py-3.5">Price</th>
                <th className="px-6 py-3.5">Duration</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {services.map((service) => (
                <tr
                  key={service.id}
                  id={`service-row-${service.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  className="transition hover:bg-zinc-800/20"
                >
                  <td className="px-6 py-4 font-medium text-zinc-100">
                    <div>
                      <span className="font-semibold text-white">{service.name}</span>
                      {service.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-zinc-400">
                          {service.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-amber-400">
                    <span className="inline-flex items-center">
                      ₹{service.price}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-300">
                    <span className="inline-flex items-center gap-1 text-xs">
                      <Clock className="h-3.5 w-3.5 text-zinc-500" />
                      <span>{service.durationMinutes} min</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        service.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          service.isActive ? 'bg-emerald-400' : 'bg-zinc-500'
                        }`}
                      />
                      {service.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(service)}
                        title="Edit Service"
                        className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-1.5 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => setDeactivatingService(service)}
                        title={service.isActive ? 'Deactivate Service' : 'Reactivate Service'}
                        className={`rounded-lg border p-1.5 transition ${
                          service.isActive
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

      {/* Add Service Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-base font-semibold text-white">Add Service</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300">Service Name *</label>
                <input
                  type="text"
                  required
                  id="add-service-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Haircut"
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">Description</label>
                <textarea
                  rows={2}
                  id="add-service-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Classic men's haircut with wash and styling"
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    id="add-service-price"
                    value={price}
                    onChange={(e) =>
                      setPrice(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="250"
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300">
                    Duration (Minutes) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    id="add-service-duration"
                    value={durationMinutes}
                    onChange={(e) =>
                      setDurationMinutes(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="30"
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>
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
                  id="btn-confirm-add-service"
                  className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Adding...' : 'Add Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-base font-semibold text-white">Edit Service</h2>
              <button
                onClick={() => setEditingService(null)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300">Service Name *</label>
                <input
                  type="text"
                  required
                  id="edit-service-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">Description</label>
                <textarea
                  rows={2}
                  id="edit-service-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    id="edit-service-price"
                    value={price}
                    onChange={(e) =>
                      setPrice(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300">
                    Duration (Minutes) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    id="edit-service-duration"
                    value={durationMinutes}
                    onChange={(e) =>
                      setDurationMinutes(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="rounded-lg border border-zinc-800 px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  id="btn-confirm-edit-service"
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
      {deactivatingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h2 className="text-base font-semibold text-white">
              {deactivatingService.isActive ? 'Deactivate Service' : 'Reactivate Service'}
            </h2>
            <p className="mt-2 text-xs text-zinc-400">
              Are you sure you want to{' '}
              {deactivatingService.isActive ? 'deactivate' : 'reactivate'}{' '}
              <strong className="text-zinc-200">{deactivatingService.name}</strong>?
              {deactivatingService.isActive &&
                ' The service record will be preserved for appointment and transaction continuity.'}
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeactivatingService(null)}
                className="rounded-lg border border-zinc-800 px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-toggle-service"
                onClick={() =>
                  statusMutation.mutate({
                    id: deactivatingService.id,
                    isActive: !deactivatingService.isActive,
                  })
                }
                disabled={statusMutation.isPending}
                className={`rounded-lg px-4 py-2 text-xs font-semibold text-zinc-950 ${
                  deactivatingService.isActive
                    ? 'bg-amber-500 hover:bg-amber-400'
                    : 'bg-emerald-500 hover:bg-emerald-400'
                }`}
              >
                {statusMutation.isPending
                  ? 'Updating...'
                  : deactivatingService.isActive
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
