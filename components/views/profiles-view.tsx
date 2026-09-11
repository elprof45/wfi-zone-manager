'use client';

import React, { useState } from 'react';
import {
  Zap,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  Layers,
  CheckCircle2,
  Clock,
  Gauge,
  Ticket,
  RefreshCw,
} from 'lucide-react';
import { HotspotProfile } from '@/lib/types';
import { toast } from 'sonner';

interface ProfilesViewProps {
  profiles: HotspotProfile[];
  onRefresh: () => void;
  onGenerateForProfile: (profileId: string) => void;
  currency: string;
}

export function ProfilesView({
  profiles,
  onRefresh,
  onGenerateForProfile,
  currency,
}: ProfilesViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<HotspotProfile | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    rateLimit: '5M/5M',
    validityDuration: '24 Heures',
    validityMinutes: 1440,
    price: 500,
    currency: currency || 'FCFA',
    sharedUsers: 1,
    minStockAlert: 15,
    color: '#000000',
  });

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncFromMikrotik = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/mikrotik/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_profiles' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Profils synchronisés depuis le routeur MikroTik !');
        onRefresh();
      } else {
        toast.error(data.error || 'Échec de synchronisation des profils');
      }
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingProfile(null);
    setFormData({
      name: '',
      rateLimit: '5M/5M',
      validityDuration: '24 Heures',
      validityMinutes: 1440,
      price: 500,
      currency: currency || 'FCFA',
      sharedUsers: 1,
      minStockAlert: 15,
      color: '#000000',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prof: HotspotProfile) => {
    setEditingProfile(prof);
    setFormData({
      name: prof.name,
      rateLimit: prof.rateLimit,
      validityDuration: prof.validityDuration,
      validityMinutes: prof.validityMinutes,
      price: prof.price,
      currency: prof.currency,
      sharedUsers: prof.sharedUsers,
      minStockAlert: prof.minStockAlert,
      color: prof.color,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProfile) {
        await fetch('/api/profiles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingProfile.id, ...formData }),
        });
      } else {
        await fetch('/api/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }
      setIsModalOpen(false);
      onRefresh();
    } catch {
      alert('Erreur lors de l’enregistrement du profil');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce profil de tarif Hotspot ?')) return;
    try {
      await fetch(`/api/profiles?id=${id}`, { method: 'DELETE' });
      onRefresh();
    } catch {
      alert('Erreur');
    }
  };

  return (
    <div id="profiles-view-container" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-neutral-950 dark:text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-neutral-900 dark:text-neutral-100" />
            <span>Profils & Vitesses Hotspot ({profiles.length})</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Paramétrage des débits MikroTik (Rate-Limit), durées de validité et seuils d&apos;alerte de stock
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleSyncFromMikrotik}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-black/[0.12] dark:border-white/[0.12] bg-neutral-100 hover:bg-neutral-200 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition disabled:opacity-50 cursor-pointer"
            title="Importer et synchroniser automatiquement les profils depuis le routeur MikroTik"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Synchronisation...' : 'Sync MikroTik'}</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs font-medium shadow-sm transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nouveau Profil</span>
          </button>
        </div>
      </div>

      {/* Grid of Profiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {profiles.map((prof) => {
          const available = prof.availableCount ?? 0;
          const isLowStock = available < prof.minStockAlert;

          return (
            <div
              key={prof.id}
              className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 shadow-sm space-y-4 hover:border-black/[0.16] dark:hover:border-white/[0.16] transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header and actions */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-neutral-900 dark:bg-white shrink-0" />
                    <h3 className="font-semibold text-neutral-950 dark:text-white text-sm tracking-tight">
                      {prof.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(prof)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg transition"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(prof.id)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Price Display */}
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">
                    {prof.price.toLocaleString()}
                  </span>
                  <span className="text-xs font-medium text-neutral-500">{prof.currency}</span>
                </div>

                {/* Specs List */}
                <div className="space-y-2 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 text-xs">
                  <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                    <span className="flex items-center gap-1.5">
                      <Gauge className="h-3.5 w-3.5 text-neutral-500" />
                      Débit Max (Rate-Limit)
                    </span>
                    <span className="font-mono font-medium text-neutral-950 dark:text-neutral-200">
                      {prof.rateLimit}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-neutral-500" />
                      Validité Session
                    </span>
                    <span className="font-medium text-neutral-950 dark:text-neutral-200">
                      {prof.validityDuration}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-neutral-500" />
                      Appareils simultanés
                    </span>
                    <span className="font-medium text-neutral-950 dark:text-neutral-200">
                      {prof.sharedUsers} client(s)
                    </span>
                  </div>
                </div>

                {/* Stock Indicator */}
                <div
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-medium transition ${
                    isLowStock
                      ? 'bg-neutral-100 dark:bg-neutral-800/80 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100'
                      : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200/80 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {isLowStock ? <AlertTriangle className="h-3.5 w-3.5 text-neutral-900 dark:text-white" /> : <CheckCircle2 className="h-3.5 w-3.5 text-neutral-500" />}
                    <span>Stock</span>
                  </span>
                  <span className="font-medium">
                    {available} fiches {isLowStock ? `(Seuil < ${prof.minStockAlert})` : ''}
                  </span>
                </div>
              </div>

              {/* Action */}
              <button
                onClick={() => onGenerateForProfile(prof.id)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 font-medium text-xs transition mt-3"
              >
                <Ticket className="h-3.5 w-3.5" />
                <span>Générer des fiches</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Profile Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#141416] border border-black/[0.08] dark:border-white/[0.1] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
              <h3 className="text-base font-semibold text-neutral-950 dark:text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-neutral-800 dark:text-neutral-200" />
                <span>{editingProfile ? 'Modifier le Profil' : 'Nouveau Profil Hotspot'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white text-base leading-none transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Nom du Profil *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Pass 24 Heures (Standard)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Prix (Tarif Vente) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Débit Max (Rate-Limit) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="2M/2M ou 5M/5M"
                    value={formData.rateLimit}
                    onChange={(e) => setFormData({ ...formData, rateLimit: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Libellé Durée *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="24 Heures, 1 Mois..."
                    value={formData.validityDuration}
                    onChange={(e) => setFormData({ ...formData, validityDuration: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Minutes de validité *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.validityMinutes}
                    onChange={(e) => setFormData({ ...formData, validityMinutes: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Seuil alerte stock critique
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.minStockAlert}
                    onChange={(e) => setFormData({ ...formData, minStockAlert: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Clients simultanés
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.sharedUsers}
                    onChange={(e) => setFormData({ ...formData, sharedUsers: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-medium transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black font-medium transition shadow-sm"
                >
                  Enregistrer le profil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

