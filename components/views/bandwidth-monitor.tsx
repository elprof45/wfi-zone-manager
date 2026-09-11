'use client';

// components/views/bandwidth-monitor.tsx
// Moniteur de Bande Passante & Trafic d'Interfaces Réseau MikroTik en Temps Réel

import { useState, useEffect, useCallback } from 'react';
import {
    ArrowDownCircle,
    ArrowUpCircle,
    Play,
    Pause,
    Gauge
} from 'lucide-react';

interface InterfaceTraffic {
  name: string;
  rxBps: number;
  txBps: number;
  rxFormatted: string;
  txFormatted: string;
  rxPps: number;
  txPps: number;
  rxDrops: number;
  txDrops: number;
}

interface TrafficPoint {
  time: string;
  rxBps: number;
  txBps: number;
}

interface BandwidthMonitorProps {
  routerId?: string;
}

export function BandwidthMonitor({ routerId }: BandwidthMonitorProps) {
  const [interfaces, setInterfaces] = useState<InterfaceTraffic[]>([]);
  const [availableInterfaces, setAvailableInterfaces] = useState<string[]>([]);
  const [selectedInterface, setSelectedInterface] = useState<string>('all');
  const [totalRxFormatted, setTotalRxFormatted] = useState('0 bps');
  const [totalTxFormatted, setTotalTxFormatted] = useState('0 bps');
  const [totalRxBps, setTotalRxBps] = useState(0);
  const [totalTxBps, setTotalTxBps] = useState(0);
  const [history, setHistory] = useState<TrafficPoint[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [refreshIntervalMs, setRefreshIntervalMs] = useState(2500);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchTraffic = useCallback(async () => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams();
      if (routerId) queryParams.set('routerId', routerId);
      if (selectedInterface !== 'all') queryParams.set('interface', selectedInterface);

      const res = await fetch(`/api/mikrotik/traffic?${queryParams.toString()}`);
      const data = await res.json();

      if (data.success) {
        setInterfaces(data.interfaces || []);
        if (data.allAvailableInterfaces) {
          setAvailableInterfaces(data.allAvailableInterfaces);
        }
        setTotalRxBps(data.totalRxBps || 0);
        setTotalTxBps(data.totalTxBps || 0);
        setTotalRxFormatted(data.totalRxFormatted || '0 bps');
        setTotalTxFormatted(data.totalTxFormatted || '0 bps');
        setLastUpdated(new Date().toLocaleTimeString('fr-FR'));

        // Push to history (keep max 18 points)
        setHistory((prev) => {
          const now = new Date().toLocaleTimeString('fr-FR', {
            minute: '2-digit',
            second: '2-digit',
          });
          const updated = [
            ...prev,
            {
              time: now,
              rxBps: data.totalRxBps || 0,
              txBps: data.totalTxBps || 0,
            },
          ];
          return updated.slice(-18);
        });
      }
    } catch (err) {
      console.error('Erreur monitoring bande passante:', err);
    } finally {
      setIsLoading(false);
    }
  }, [routerId, selectedInterface]);

  useEffect(() => {
    const timer = setTimeout(() => { void fetchTraffic(); }, 0);
    return () => clearTimeout(timer);
  }, [fetchTraffic]);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(fetchTraffic, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [isLive, refreshIntervalMs, fetchTraffic]);

  // Compute SVG Polyline coordinates for history chart
  const maxRate = Math.max(
    ...history.map((h) => Math.max(h.rxBps, h.txBps)),
    100_000 // min scale 100 kbps
  );

  const chartWidth = 520;
  const chartHeight = 90;
  const paddingX = 10;
  const paddingY = 8;

  const getPoints = (isRx: boolean) => {
    if (history.length < 2) return '';
    const stepX = (chartWidth - paddingX * 2) / (history.length - 1);

    return history
      .map((pt, i) => {
        const x = paddingX + i * stepX;
        const val = isRx ? pt.rxBps : pt.txBps;
        const y =
          chartHeight -
          paddingY -
          (val / maxRate) * (chartHeight - paddingY * 2);
        return `${x},${Math.max(paddingY, y)}`;
      })
      .join(' ');
  };

  const rxPoints = getPoints(true);
  const txPoints = getPoints(false);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold tracking-tight text-white">
                Bande Passante & Débit en Direct
              </h3>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live ROS v7
              </span>
            </div>
            <p className="text-xs text-white/40 mt-0.5">
              Télémétrie des interfaces physiques & bridges RouterOS en temps réel
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Interface filter */}
          {availableInterfaces.length > 0 && (
            <select
              value={selectedInterface}
              onChange={(e) => setSelectedInterface(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white/80 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer"
            >
              <option value="all" className="bg-[#141416] text-white">
                🌐 Toutes interfaces ({availableInterfaces.length})
              </option>
              {availableInterfaces.map((iface) => (
                <option key={iface} value={iface} className="bg-[#141416] text-white">
                  {iface}
                </option>
              ))}
            </select>
          )}

          {/* Polling interval */}
          <select
            value={refreshIntervalMs}
            onChange={(e) => setRefreshIntervalMs(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white/80 focus:outline-none cursor-pointer"
          >
            <option value={1500} className="bg-[#141416] text-white">1.5s (Ultra-Rapide)</option>
            <option value={2500} className="bg-[#141416] text-white">2.5s (Standard)</option>
            <option value={5000} className="bg-[#141416] text-white">5.0s (Éco)</option>
          </select>

          {/* Live Toggle */}
          <button
            onClick={() => setIsLive((p) => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
              isLive
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-white/5 text-white/40 border border-white/10'
            }`}
          >
            {isLive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>{isLive ? 'Pause' : 'Reprendre'}</span>
          </button>
        </div>
      </div>

      {/* Main Stats: Download vs Upload */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Download */}
        <div className="p-4 rounded-xl bg-white/3 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs text-white/50">
            <span className="flex items-center gap-1.5 font-medium">
              <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
              Débit Descendant (Rx)
            </span>
            <span className="font-mono text-[10px]">Toutes interfaces</span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-emerald-400 font-mono">
            {totalRxFormatted}
          </div>
          <div className="text-[11px] text-white/40">
            Trafic reçu par le routeur
          </div>
        </div>

        {/* Total Upload */}
        <div className="p-4 rounded-xl bg-white/3 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs text-white/50">
            <span className="flex items-center gap-1.5 font-medium">
              <ArrowUpCircle className="w-4 h-4 text-sky-400" />
              Débit Montant (Tx)
            </span>
            <span className="font-mono text-[10px]">Toutes interfaces</span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-sky-400 font-mono">
            {totalTxFormatted}
          </div>
          <div className="text-[11px] text-white/40">
            Trafic envoyé par le routeur
          </div>
        </div>

        {/* Graph Preview */}
        <div className="sm:col-span-2 p-3 rounded-xl bg-black/40 border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-white/50 mb-1">
            <span className="flex items-center gap-3 font-mono">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Rx (Down)
              </span>
              <span className="flex items-center gap-1 text-sky-400">
                <span className="w-2 h-2 rounded-full bg-sky-400" /> Tx (Up)
              </span>
            </span>
            <span className="font-mono text-[10px] text-white/30">
              {lastUpdated ? `MAJ ${lastUpdated}` : 'Connexion...'}
            </span>
          </div>

          {/* SVG Sparkline */}
          <div className="w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-16"
              preserveAspectRatio="none"
            >
              {/* Grid line */}
              <line
                x1="0"
                y1={chartHeight / 2}
                x2={chartWidth}
                y2={chartHeight / 2}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="4 4"
              />
              {/* Rx line */}
              {rxPoints && (
                <polyline
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={rxPoints}
                />
              )}
              {/* Tx line */}
              {txPoints && (
                <polyline
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={txPoints}
                />
              )}
            </svg>
          </div>
        </div>
      </div>

      {/* Interface Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
        {interfaces.length === 0 ? (
          <div className="col-span-4 text-center py-4 text-xs text-white/30 font-mono">
            Interrogation des flux RouterOS en cours...
          </div>
        ) : (
          interfaces.map((iface) => (
            <div
              key={iface.name}
              className="p-3.5 rounded-xl bg-white/3 border border-white/5 text-xs space-y-2 hover:border-white/15 transition"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {iface.name}
                </span>
                <span className="text-[10px] font-mono text-white/40">
                  {iface.rxPps + iface.txPps} pps
                </span>
              </div>

              <div className="space-y-1 font-mono pt-1">
                <div className="flex items-center justify-between text-emerald-400">
                  <span className="text-white/40 font-sans text-[11px]">↓ Rx :</span>
                  <span className="font-semibold">{iface.rxFormatted}</span>
                </div>
                <div className="flex items-center justify-between text-sky-400">
                  <span className="text-white/40 font-sans text-[11px]">↑ Tx :</span>
                  <span className="font-semibold">{iface.txFormatted}</span>
                </div>
              </div>

              {(iface.rxDrops > 0 || iface.txDrops > 0) && (
                <div className="text-[10px] text-amber-400 font-mono pt-1 border-t border-white/5">
                  Drops: {iface.rxDrops + iface.txDrops}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
