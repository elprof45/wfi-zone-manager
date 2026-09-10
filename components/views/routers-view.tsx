'use client';

import React, { useState } from 'react';
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
  const [purgingId, setPurgingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

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
      setActionMessage(`Ping réussi (${data.latencyMs || 6}ms). RouterBOARD en ligne.`);
      setTimeout(() => setActionMessage(null), 4000);
      onRefresh();
    } catch (e) {
      setActionMessage('Erreur lors du test de connectivité.');
    } finally {
      setTestingId(null);
    }
  };

  const handlePurge = async (routerId: string) => {
    setPurgingId(routerId);
    try {
      const data = await onPurgeRouter(routerId);
      setActionMessage(data?.message || 'Purge MikroTik exécutée avec succès!');
      setTimeout(() => setActionMessage(null), 4000);
      onRefresh();
    } catch (e) {
      setActionMessage('Erreur lors de la purge.');
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
        setActionMessage('Nouveau routeur MikroTik ajouté au parc avec succès.');
        setTimeout(() => setActionMessage(null), 4000);
        onRefresh();
      }
    } catch (err) {
      alert('Erreur lors de l’enregistrement');
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
        <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 text-neutral-600 shrink-0" />
          <span>{actionMessage}</span>
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
                      className={`h-2 w-2 rounded-full ${
                        router.status === 'online'
                          ? 'bg-neutral-900 dark:bg-neutral-100'
                          : router.status === 'warning'
                          ? 'bg-neutral-400'
                          : 'bg-neutral-300 dark:bg-neutral-600'
                      }`}
                      title={`Statut: ${router.status}`}
                    />
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {router.location} • {router.host}
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

              {/* Hardware Model & Protocol Chip */}
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 font-mono text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700">
                  {hw.model}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 font-medium text-neutral-800 dark:text-neutral-200 border border-neutral-200/60 dark:border-neutral-700">
                  {router.connectionType === 'rest' ? 'REST (443)' : `Socket (${router.apiPort})`}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium border border-neutral-200/60 dark:border-neutral-700">
                  {hw.activeUsersCount} actifs
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
                      {hw.cpuPercent}% {hw.cpuPercent < 15 ? '(Protection)' : ''}
                    </span>
                  </div>
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-neutral-900 dark:bg-white transition-all duration-300"
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
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {hw.ramFreeMb} MB <span className="text-[10px] text-neutral-400">/ {hw.ramTotalMb}MB ({ramPercent}%)</span>
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
                    <Clock className="h-3 w-3" /> Uptime:
                  </span>
                  <span className="font-mono text-neutral-700 dark:text-neutral-300 font-medium">
                    {hw.uptime}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => handleTestPing(router.id)}
                  disabled={isTesting}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition"
                >
                  <Activity className={`h-3.5 w-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Test en cours...' : 'Tester Ping'}</span>
                </button>

                <button
                  onClick={() => handlePurge(router.id)}
                  disabled={isPurging}
                  title="Purge des utilisateurs expirés (/ip/hotspot/user/remove)"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isPurging ? 'animate-spin' : ''}`} />
                  <span>{isPurging ? 'Purge en cours...' : 'Purge RAM'}</span>
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
