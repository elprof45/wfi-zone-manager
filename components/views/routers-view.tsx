'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Router as RouterIcon,
  Plus,
  Cpu,
  HardDrive,
  Users,
  Activity,
  Trash2,
  Edit2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Server,
  Zap,
  Clock,
  Shield,
  Key,
} from 'lucide-react';
import { MikroTikRouter } from '@/lib/types';

interface RoutersViewProps {
  routers: MikroTikRouter[];
  onRefresh: () => void;
  onPurgeRouter: (id: string) => Promise<any>;
}

export function RoutersView({ routers, onRefresh, onPurgeRouter }: RoutersViewProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [purgingId, setPurgingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // New router form state
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    host: '',
    apiPort: 8728,
    connectionType: 'socket' as 'socket' | 'rest',
    username: 'admin',
    password: '',
    hotspotDnsName: 'hotspot.local',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTestPing = async (routerId: string) => {
    setTestingId(routerId);
    try {
      const res = await fetch('/api/routers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: routerId, action: 'ping' }),
      });
      const data = await res.json();
      if (data.alive) {
        setActionMessage(`Ping MikroTik réussi (${data.latencyMs}ms) — RouterOS ${data.version || ''} en ligne.`);
      } else {
        setActionError(`Ping MikroTik échoué (${data.latencyMs}ms) : ${data.error || 'Hôte injoignable'}`);
      }
      setTimeout(() => { setActionMessage(null); setActionError(null); }, 6000);
      onRefresh();
    } catch {
      setActionError('Erreur de communication lors du test de connectivité.');
      setTimeout(() => setActionError(null), 6000);
    } finally {
      setTestingId(null);
    }
  };

  const handleSync = async (routerId: string) => {
    setSyncingId(routerId);
    try {
      const res = await fetch(`/api/routers/${routerId}/sync`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Synchronisation réussie ! RouterOS connecté (${data.latencyMs}ms). Métriques réelles actualisées.`);
      } else {
        setActionError(`Erreur MikroTik (${data.status}) : ${data.error || 'Échec de synchronisation'}`);
      }
      setTimeout(() => { setActionMessage(null); setActionError(null); }, 6000);
      onRefresh();
    } catch (e: any) {
      setActionError(`Erreur réseau : ${e?.message || 'Serveur indisponible'}`);
      setTimeout(() => setActionError(null), 6000);
    } finally {
      setSyncingId(null);
    }
  };

  const handlePurge = async (routerId: string) => {
    setPurgingId(routerId);
    try {
      const data = await onPurgeRouter(routerId);
      if (data?.success) {
        setActionMessage(data?.message || 'Purge MikroTik exécutée avec succès!');
      } else {
        setActionError(data?.error || 'Échec de la purge sur le routeur MikroTik.');
      }
      setTimeout(() => { setActionMessage(null); setActionError(null); }, 6000);
      onRefresh();
    } catch (e: any) {
      setActionError(`Erreur lors de la purge : ${e?.message || 'Injoignable'}`);
      setTimeout(() => setActionError(null), 6000);
    } finally {
      setPurgingId(null);
    }
  };

  const handleAddRouter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.host) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/routers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const data = await res.json();
        setIsAddModalOpen(false);
        setFormData({
          name: '',
          location: '',
          host: '',
          apiPort: 8728,
          connectionType: 'socket',
          username: 'admin',
          password: '',
          hotspotDnsName: 'hotspot.local',
        });
        if (data.connected) {
          setActionMessage('Nouveau routeur MikroTik ajouté et connecté avec succès !');
        } else {
          setActionError(`Routeur enregistré mais Hors Ligne : ${data.connectionError || 'Vérifiez l\'adresse IP et le service API RouterOS'}`);
        }
        setTimeout(() => { setActionMessage(null); setActionError(null); }, 6000);
        onRefresh();
      } else {
        const errData = await res.json();
        setActionError(errData.error || 'Erreur lors de l’enregistrement');
        setTimeout(() => setActionError(null), 6000);
      }
    } catch {
      setActionError('Erreur de communication avec le serveur.');
      setTimeout(() => setActionError(null), 6000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRouter = async (id: string) => {
    if (!confirm('Supprimer ce routeur du système de gestion NetPulse ?')) return;
    try {
      await fetch(`/api/routers?id=${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      alert('Erreur');
    }
  };

  return (
    <div id="routers-view-container" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-neutral-950 dark:text-white flex items-center gap-2">
            <RouterIcon className="h-5 w-5 text-neutral-800 dark:text-neutral-200" />
            <span>Parc de Routeurs MikroTik ({routers.length})</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Découplage de la logique métier et télémétrie matérielle temps réel (Socket API 8728)
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/routeros-console"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-500/40 bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 text-xs font-semibold transition"
          >
            <Shield className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
            <span>Console Sécurité RouterOS</span>
          </Link>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Actualiser</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs font-medium transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Ajouter un Routeur</span>
          </button>
        </div>
      </div>

      {/* Notification banner if action performed */}
      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-medium">{actionMessage}</span>
        </div>
      )}

      {/* Error banner if action failed */}
      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in duration-200">
          <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <span className="font-semibold block">Erreur MikroTik :</span>
            <span className="font-mono text-[11px] break-words">{actionError}</span>
          </div>
        </div>
      )}

      {/* Routers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {routers.map((router) => {
          const hw = router.hardware || {
            model: 'RB951Ui-2HnD',
            cpuPercent: 12,
            ramTotalMb: 128,
            ramFreeMb: 82,
            flashTotalMb: 128,
            flashFreeMb: 94,
            uptime: '1d 02h',
            activeUsersCount: 0,
          };
          const isTesting = testingId === router.id;
          const isSyncing = syncingId === router.id;
          const isPurging = purgingId === router.id;
          const ramUsedMb = hw.ramTotalMb - hw.ramFreeMb;
          const ramPercent = Math.round((ramUsedMb / hw.ramTotalMb) * 100);

          return (
            <div
              key={router.id}
              className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4 hover:border-black/20 dark:hover:border-white/20 transition"
            >
              {/* Top row */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-neutral-950 dark:text-white text-base">
                      {router.name}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        router.status === 'online'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                          : router.status === 'warning'
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          router.status === 'online'
                            ? 'bg-emerald-500 animate-pulse'
                            : router.status === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                      />
                      {router.status === 'online' ? 'En ligne' : router.status === 'warning' ? 'Avertissement' : 'Hors ligne'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {router.location} • <span className="font-mono">{router.host}</span>
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDeleteRouter(router.id)}
                    className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                    title="Supprimer ce routeur"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Real RouterOS Error Callout if router is offline / error captured */}
              {hw.lastError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <strong className="font-semibold block text-[11px]">Dernière erreur RouterOS :</strong>
                    <p className="font-mono text-[10px] break-words mt-0.5 text-rose-600 dark:text-rose-400">
                      {hw.lastError}
                    </p>
                  </div>
                </div>
              )}

              {/* Hardware Model & Protocol Chip */}
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 font-mono text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700">
                  {hw.model}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 font-medium text-neutral-800 dark:text-neutral-200 border border-neutral-200/60 dark:border-neutral-700">
                  {router.connectionType === 'rest' ? 'REST (443)' : `Socket API (${router.apiPort})`}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium border border-neutral-200/60 dark:border-neutral-700">
                  {hw.activeUsersCount} connectés
                </span>
              </div>

              {/* Gauges */}
              <div className="space-y-3 pt-1 border-t border-neutral-100 dark:border-neutral-800/80">
                {/* CPU */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400 font-medium">
                      <Cpu className="h-3.5 w-3.5 text-neutral-500" />
                      Charge CPU
                    </span>
                    <span className="font-mono text-neutral-900 dark:text-neutral-100 font-medium">
                      {hw.cpuPercent}%
                    </span>
                  </div>
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        hw.cpuPercent > 80 ? 'bg-rose-500' : hw.cpuPercent > 50 ? 'bg-amber-500' : 'bg-neutral-900 dark:bg-white'
                      }`}
                      style={{ width: `${Math.min(100, hw.cpuPercent)}%` }}
                    />
                  </div>
                </div>

                {/* RAM */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400 font-medium">
                      <HardDrive className="h-3.5 w-3.5 text-neutral-500" />
                      Mémoire RAM Libre
                    </span>
                    <span className="font-medium text-neutral-900 dark:text-neutral-100 text-xs">
                      {hw.ramFreeMb} MB <span className="text-[10px] text-neutral-400">/ {hw.ramTotalMb}MB ({ramPercent}% utilisé)</span>
                    </span>
                  </div>
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-neutral-700 dark:bg-neutral-300 transition-all duration-300"
                      style={{ width: `${ramPercent}%` }}
                    />
                  </div>
                </div>

                {/* Flash Storage */}
                <div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
                  <span>Stockage Flash libre:</span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">
                    {hw.flashFreeMb} MB / {hw.flashTotalMb} MB
                  </span>
                </div>

                {/* Uptime */}
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Uptime RouterOS:
                  </span>
                  <span className="font-mono text-neutral-700 dark:text-neutral-300 font-medium">
                    {hw.uptime}
                  </span>
                </div>
              </div>

              {/* Action Buttons: 3 items (Ping, Sync, Purge) */}
              <div className="pt-2 grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleTestPing(router.id)}
                  disabled={isTesting}
                  title="Tester la connectivité réelle au port RouterOS"
                  className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl border border-neutral-200/80 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition cursor-pointer"
                >
                  <Activity className={`h-3.5 w-3.5 ${isTesting ? 'animate-spin text-blue-500' : ''}`} />
                  <span>{isTesting ? 'Ping...' : 'Ping'}</span>
                </button>

                <button
                  onClick={() => handleSync(router.id)}
                  disabled={isSyncing}
                  title="Interroger en direct la télémétrie MikroTik (CPU, RAM, Usagers actifs)"
                  className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium transition cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Sync...' : 'Sync'}</span>
                </button>

                <button
                  onClick={() => handlePurge(router.id)}
                  disabled={isPurging}
                  title="Purge réelle des sessions expirées (/ip/hotspot/active/remove)"
                  className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition cursor-pointer"
                >
                  <Trash2 className={`h-3.5 w-3.5 ${isPurging ? 'animate-spin' : ''}`} />
                  <span>{isPurging ? 'Purge...' : 'Purge'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add Router */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#141416] border border-black/[0.08] dark:border-white/[0.1] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
              <h3 className="text-base font-semibold text-neutral-950 dark:text-white flex items-center gap-2">
                <RouterIcon className="h-4 w-4 text-neutral-800 dark:text-neutral-200" />
                <span>Nouveau Routeur MikroTik</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white text-base leading-none transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRouter} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Nom du site *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Agence Akodessewa"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Localisation
                  </label>
                  <input
                    type="text"
                    placeholder="ex: Immeuble Le Rapprochement"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Adresse IP ou Host *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="192.168.88.1"
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Type de Protocole
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={formData.connectionType}
                      onChange={(e) => {
                        const type = e.target.value as 'socket' | 'rest';
                        setFormData({
                          ...formData,
                          connectionType: type,
                          apiPort: type === 'rest' ? 443 : 8728,
                        });
                      }}
                      className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white flex-1 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                    >
                      <option value="socket">Socket API (8728)</option>
                      <option value="rest">REST API (443)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Identifiant API *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Nom DNS Hotspot (pour le QR Code)
                </label>
                <input
                  type="text"
                  placeholder="hotspot.local ou wifi.netpulse.lan"
                  value={formData.hotspotDnsName}
                  onChange={(e) => setFormData({ ...formData, hotspotDnsName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-medium transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-full bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black font-medium transition"
                >
                  {isSubmitting ? 'Connexion...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
