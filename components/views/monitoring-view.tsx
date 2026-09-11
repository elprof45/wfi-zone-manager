'use client';

// components/views/monitoring-view.tsx
// Real-time MikroTik Telemetry & Cron Worker Dashboard

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Activity,
    Wifi,
    WifiOff,
    Cpu,
    MemoryStick,
    Users,
    Clock,
    Zap,
    RefreshCw,
    Play,
    Download,
    CheckCircle2,
    Radio,
    Server,
    Thermometer,
    Timer,
    Terminal,
    FlaskConical,
    ArrowUpRight,
    Signal,
    ShieldCheck,
    Ban
} from 'lucide-react';
import { BandwidthMonitor } from './bandwidth-monitor';

interface RouterTelemetry {
  routerId: string;
  routerName: string;
  host: string;
  location: string;
  status: string;
  lastSeenAt: string | null;
  connectionType: string;
  isHeartbeatPushed: boolean;
  healthScore: number;
  telemetry: {
    cpuLoad: number | null;       // from heartbeat push (cpuLoad) or poll (cpuPercent)
    freeMemory: number | null;    // raw bytes (heartbeat) or null
    totalMemory: number | null;
    memoryPercent: number | null;
    ramFreeMb: number | null;     // from DB canonical field
    ramTotalMb: number | null;
    uptime: string | null;
    version: string | null;
    boardName: string | null;
    voltage: number | null;
    temperature: number | null;
    activeUsers: number | null;
    lastHeartbeatPush: string | null;
    source: string;
  };
}

interface MonitoringSummary {
  total: number;
  online: number;
  offline: number;
  heartbeatPushed: number;
  criticalCpu: number;
  criticalMemory: number;
}

interface CronStats {
  initialized: boolean;
  isBackgroundEnabled: boolean;
  stats: {
    lastHealthCheck?: { timestamp: string; checked: number; online: number; errors: number };
    lastStockCheck?: { timestamp: string; criticalCount: number };
    lastDailyClosure?: { timestamp: string; success: boolean };
  };
}

interface MonitoringData {
  success: boolean;
  dbConnected: boolean;
  timestamp: string;
  routers: RouterTelemetry[];
  cron: CronStats;
  summary: MonitoringSummary;
}

interface LogEntry {
  ts: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return 'N/A';
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} Go`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} Mo`;
  return `${(bytes / 1024).toFixed(0)} Ko`;
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'Jamais';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `Il y a ${Math.floor(diff / 1000)}s`;
  if (diff < 3600_000) return `Il y a ${Math.floor(diff / 60_000)}m`;
  if (diff < 86400_000) return `Il y a ${Math.floor(diff / 3600_000)}h`;
  return new Date(iso).toLocaleDateString('fr-FR');
}

function HealthBar({ score }: { score: number }) {
  const color =
    score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono font-semibold tabular-nums" style={{ color }}>
        {score}%
      </span>
    </div>
  );
}

function MetricGauge({ value, max = 100, label, unit = '%', criticalThreshold = 85 }: {
  value: number | null;
  max?: number;
  label: string;
  unit?: string;
  criticalThreshold?: number;
}) {
  const pct = value !== null ? Math.min((value / max) * 100, 100) : 0;
  const isCritical = value !== null && value >= criticalThreshold;
  const isWarning = value !== null && value >= criticalThreshold * 0.75 && !isCritical;
  const color = isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#6366f1';

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-white/50">{label}</span>
        <span className={`text-xs font-mono font-bold ${isCritical ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-white/80'}`}>
          {value !== null ? `${value}${unit}` : 'N/A'}
          {isCritical && ' ⚠️'}
        </span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function RouterCard({ router, onDownloadScript, onTestHeartbeat }: {
  router: RouterTelemetry;
  onDownloadScript: (routerId: string) => void;
  onTestHeartbeat: (routerId: string) => void;
}) {
  const isOnline = router.status === 'online';
  const isPushing = router.isHeartbeatPushed;
  const lastPush = router.telemetry.lastHeartbeatPush;
  const pushRecent = isPushing;

  return (
    <div className={`
      relative rounded-2xl border p-5 flex flex-col gap-4 transition-all duration-300
      ${isOnline
        ? 'bg-white/5 border-white/10 hover:border-indigo-500/30'
        : 'bg-red-950/20 border-red-500/20 hover:border-red-500/40'}
    `}>
      {/* Status pulse */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5">
        {isOnline ? (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs text-emerald-400 font-medium">En ligne</span>
          </>
        ) : (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="text-xs text-red-400 font-medium">Hors ligne</span>
          </>
        )}
      </div>

      {/* Header */}
      <div className="pr-24">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl ${isOnline ? 'bg-indigo-500/10' : 'bg-red-500/10'}`}>
            <Server className={`w-5 h-5 ${isOnline ? 'text-indigo-400' : 'text-red-400'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">{router.routerName}</h3>
            <p className="text-xs text-white/40 font-mono">{router.host}</p>
            {router.telemetry.boardName && (
              <p className="text-xs text-white/30">{router.telemetry.boardName}</p>
            )}
          </div>
        </div>
      </div>

      {/* Health Score */}
      <HealthBar score={router.healthScore} />

      {/* Metrics Grid */}
      {isOnline && (
        <div className="grid grid-cols-2 gap-3">
          <MetricGauge
            value={router.telemetry.cpuLoad}
            label="CPU"
            criticalThreshold={85}
          />
          <MetricGauge
            value={router.telemetry.memoryPercent}
            label="Mémoire"
            criticalThreshold={90}
          />
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/5 rounded-xl px-3 py-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Users className="w-3 h-3 text-white/40" />
            <span className="text-xs text-white/40">Utilisateurs</span>
          </div>
          <p className="text-sm font-bold text-white">
            {router.telemetry.activeUsers ?? '—'}
          </p>
        </div>
        <div className="bg-white/5 rounded-xl px-3 py-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Clock className="w-3 h-3 text-white/40" />
            <span className="text-xs text-white/40">Uptime</span>
          </div>
          <p className="text-xs font-mono text-white truncate">
            {router.telemetry.uptime ?? '—'}
          </p>
        </div>
        {router.telemetry.temperature !== null && (
          <div className="bg-white/5 rounded-xl px-3 py-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Thermometer className="w-3 h-3 text-white/40" />
              <span className="text-xs text-white/40">Temp.</span>
            </div>
            <p className={`text-sm font-bold ${(router.telemetry.temperature ?? 0) > 70 ? 'text-red-400' : 'text-white'}`}>
              {router.telemetry.temperature}°C
            </p>
          </div>
        )}
        <div className="bg-white/5 rounded-xl px-3 py-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Radio className={`w-3 h-3 ${isPushing && pushRecent ? 'text-emerald-400' : 'text-white/40'}`} />
            <span className="text-xs text-white/40">Heartbeat</span>
          </div>
          <p className={`text-xs font-medium truncate ${isPushing && pushRecent ? 'text-emerald-400' : 'text-white/40'}`}>
            {isPushing && pushRecent ? `✓ ${formatRelativeTime(lastPush)}` : 'Via polling'}
          </p>
        </div>
      </div>

      {/* RouterOS Version */}
      {router.telemetry.version && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/30">RouterOS</span>
          <span className="font-mono text-white/50">{router.telemetry.version}</span>
        </div>
      )}

      {/* Last seen */}
      <div className="flex items-center justify-between text-xs border-t border-white/5 pt-3">
        <span className="text-white/30">{router.location}</span>
        <span className="text-white/30">Vu {formatRelativeTime(router.lastSeenAt)}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onTestHeartbeat(router.routerId)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-medium rounded-xl transition cursor-pointer"
        >
          <FlaskConical className="w-3.5 h-3.5" />
          Tester heartbeat
        </button>
        <button
          onClick={() => onDownloadScript(router.routerId)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-white/60 text-xs font-medium rounded-xl transition cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          Script .rsc
        </button>
      </div>
    </div>
  );
}

export function MonitoringView() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [testingRouter, setTestingRouter] = useState<string | null>(null);
  const [triggeringTask, setTriggeringTask] = useState<string | null>(null);
  const logsRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    const entry: LogEntry = {
      ts: new Date().toLocaleTimeString('fr-FR'),
      type,
      message,
    };
    setLogs((prev) => [entry, ...prev].slice(0, 100));
  }, []);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch('/api/mikrotik/logs');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      if (isManual) {
        addLog('info', `Données actualisées — ${json.summary?.online ?? 0}/${json.summary?.total ?? 0} routeurs en ligne`);
      }
    } catch (e: any) {
      addLog('error', `Erreur de récupération: ${e.message}`);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, [addLog]);

  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [kickingSession, setKickingSession] = useState<string | null>(null);

  const fetchActiveSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch('/api/mikrotik/active');
      const json = await res.json();
      if (json.success) {
        setActiveSessions(json.sessions || []);
      }
    } catch {} finally {
      setLoadingSessions(false);
    }
  }, []);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const initialFetch = setTimeout(() => {
      void fetchData();
      void fetchActiveSessions();
    }, 0);
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        void fetchData();
        void fetchActiveSessions();
      }, 15_000);
    }
    return () => {
      clearTimeout(initialFetch);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData, fetchActiveSessions, autoRefresh]);

  const handleKickSession = async (target: string, userLabel: string) => {
    if (!confirm(`Voulez-vous vraiment déconnecter la session "${userLabel}" du routeur MikroTik ?`)) return;
    setKickingSession(target);
    try {
      const res = await fetch('/api/mikrotik/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });
      const json = await res.json();
      if (json.success) {
        addLog('success', `✅ Session ${userLabel} déconnectée avec succès du routeur.`);
        await fetchActiveSessions();
      } else {
        addLog('error', `❌ ${json.error}`);
      }
    } catch (e: any) {
      addLog('error', `Erreur de déconnexion: ${e.message}`);
    } finally {
      setKickingSession(null);
    }
  };

  const handleTestHeartbeat = async (routerId: string) => {
    setTestingRouter(routerId);
    addLog('info', `Envoi heartbeat de test pour routeur ${routerId}...`);
    try {
      const res = await fetch('/api/mikrotik/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routerId }),
      });
      const json = await res.json();
      if (json.success) {
        addLog('success', `✅ ${json.message} — CPU: ${json.payload?.cpu}%, Actifs: ${json.payload?.activeUsers}`);
        await fetchData();
      } else {
        addLog('error', `❌ ${json.error || json.message}`);
      }
    } catch (e: any) {
      addLog('error', `Erreur test heartbeat: ${e.message}`);
    } finally {
      setTestingRouter(null);
    }
  };

  const handleDownloadScript = (routerId: string) => {
    const url = `/api/mikrotik/script?routerId=${routerId}&download=1`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `netpulse-heartbeat-${routerId}.rsc`;
    a.click();
    addLog('info', `Téléchargement script heartbeat pour routeur ${routerId}`);
  };

  const handleTriggerTask = async (task: 'ping_routers' | 'stock_check' | 'daily_closure') => {
    setTriggeringTask(task);
    const label = task === 'ping_routers' ? 'Ping Routeurs' : task === 'stock_check' ? 'Vérif. Stock' : 'Clôture Journalière';
    addLog('info', `Déclenchement manuel : ${label}...`);
    try {
      const res = await fetch('/api/cron/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task }),
      });
      const json = await res.json();
      if (json.success) {
        addLog('success', `✅ ${json.message}`);
        await fetchData();
      } else {
        addLog('error', `❌ ${json.error}`);
      }
    } catch (e: any) {
      addLog('error', `Erreur déclenchement: ${e.message}`);
    } finally {
      setTriggeringTask(null);
    }
  };

  const summary = data?.summary;
  const cron = data?.cron;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Monitoring MikroTik
          </h1>
          <p className="text-xs text-white/40 mt-0.5">
            Télémétrie en temps réel · Heartbeat RouterOS · Worker cron
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh((p) => !p)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
              autoRefresh
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-white/5 text-white/50 border border-white/10'
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            Auto (15s)
          </button>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-medium rounded-xl transition cursor-pointer border border-indigo-500/20 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total', value: summary.total, icon: Server, color: 'text-white/60' },
            { label: 'En ligne', value: summary.online, icon: CheckCircle2, color: 'text-emerald-400' },
            { label: 'Hors ligne', value: summary.offline, icon: Ban, color: 'text-red-400' },
            { label: 'Heartbeat', value: summary.heartbeatPushed, icon: Radio, color: 'text-indigo-400' },
            { label: 'CPU ⚠️', value: summary.criticalCpu, icon: Cpu, color: 'text-amber-400' },
            { label: 'Mém. ⚠️', value: summary.criticalMemory, icon: MemoryStick, color: 'text-rose-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white/5 rounded-xl p-3 border border-white/5">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                <span className="text-xs text-white/40">{label}</span>
              </div>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Cron Worker Status */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            État du Worker Cron
          </h2>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
              cron?.isBackgroundEnabled
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-white/5 text-white/40'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cron?.isBackgroundEnabled ? 'bg-emerald-400' : 'bg-white/30'}`} />
              {cron?.isBackgroundEnabled ? 'Actif' : 'Désactivé'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Last Health Check */}
          <div className="bg-white/5 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Signal className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs text-white/50 font-medium">Dernier Ping Routeurs</span>
            </div>
            {cron?.stats?.lastHealthCheck ? (
              <>
                <p className="text-xs text-white/70">
                  {cron.stats.lastHealthCheck.checked} vérifié(s) ·{' '}
                  <span className="text-emerald-400">{cron.stats.lastHealthCheck.online} en ligne</span>{' '}
                  {cron.stats.lastHealthCheck.errors > 0 && (
                    <span className="text-red-400">· {cron.stats.lastHealthCheck.errors} err.</span>
                  )}
                </p>
                <p className="text-xs text-white/30 mt-1">
                  {formatRelativeTime(cron.stats.lastHealthCheck.timestamp)}
                </p>
              </>
            ) : (
              <p className="text-xs text-white/30">Aucune exécution</p>
            )}
            <button
              onClick={() => handleTriggerTask('ping_routers')}
              disabled={triggeringTask === 'ping_routers'}
              className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs rounded-lg transition cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-3 h-3 ${triggeringTask === 'ping_routers' ? 'animate-spin' : ''}`} />
              Exécuter maintenant
            </button>
          </div>

          {/* Last Stock Check */}
          <div className="bg-white/5 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs text-white/50 font-medium">Dernier Contrôle Stock</span>
            </div>
            {cron?.stats?.lastStockCheck ? (
              <>
                <p className="text-xs text-white/70">
                  {cron.stats.lastStockCheck.criticalCount === 0
                    ? '✅ Tous les stocks OK'
                    : <span className="text-amber-400">⚠️ {cron.stats.lastStockCheck.criticalCount} profil(s) critique(s)</span>}
                </p>
                <p className="text-xs text-white/30 mt-1">
                  {formatRelativeTime(cron.stats.lastStockCheck.timestamp)}
                </p>
              </>
            ) : (
              <p className="text-xs text-white/30">Aucune exécution</p>
            )}
            <button
              onClick={() => handleTriggerTask('stock_check')}
              disabled={triggeringTask === 'stock_check'}
              className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs rounded-lg transition cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-3 h-3 ${triggeringTask === 'stock_check' ? 'animate-spin' : ''}`} />
              Exécuter maintenant
            </button>
          </div>

          {/* Last Daily Closure */}
          <div className="bg-white/5 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Timer className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs text-white/50 font-medium">Dernière Clôture Auto</span>
            </div>
            {cron?.stats?.lastDailyClosure ? (
              <>
                <p className="text-xs text-white/70">
                  {cron.stats.lastDailyClosure.success
                    ? '✅ Clôture réussie'
                    : <span className="text-red-400">❌ Échec clôture</span>}
                </p>
                <p className="text-xs text-white/30 mt-1">
                  {formatRelativeTime(cron.stats.lastDailyClosure.timestamp)}
                </p>
              </>
            ) : (
              <p className="text-xs text-white/30">Aucune exécution</p>
            )}
            <button
              onClick={() => handleTriggerTask('daily_closure')}
              disabled={triggeringTask === 'daily_closure'}
              className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs rounded-lg transition cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-3 h-3 ${triggeringTask === 'daily_closure' ? 'animate-spin' : ''}`} />
              Exécuter maintenant
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Bandwidth & Traffic Monitor */}
      <BandwidthMonitor />

      {/* Real-time Active Hotspot Sessions */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                Clients Connectés en Direct
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-emerald-500/20 text-emerald-300 font-bold">
                  {activeSessions.length} actif{activeSessions.length > 1 ? 's' : ''}
                </span>
              </h2>
              <p className="text-xs text-white/40">Sessions hotspot actuellement authentifiées sur le routeur MikroTik</p>
            </div>
          </div>
          <button
            onClick={() => fetchActiveSessions()}
            disabled={loadingSessions}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 text-xs rounded-lg transition cursor-pointer self-start sm:self-auto disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingSessions ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {activeSessions.length === 0 ? (
          <div className="text-center py-8 text-white/30 text-xs font-mono">
            Aucun client hotspot actuellement connecté.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white/70">
              <thead className="text-[11px] font-mono text-white/40 uppercase bg-white/3 border-b border-white/5">
                <tr>
                  <th className="px-4 py-2.5">Utilisateur / Ticket</th>
                  <th className="px-4 py-2.5">Adresse IP</th>
                  <th className="px-4 py-2.5">Adresse MAC</th>
                  <th className="px-4 py-2.5">Serveur</th>
                  <th className="px-4 py-2.5">Durée</th>
                  <th className="px-4 py-2.5">Temps Restant</th>
                  <th className="px-4 py-2.5">Consommation</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {activeSessions.map((s, idx) => (
                  <tr key={s.id || idx} className="hover:bg-white/3 transition">
                    <td className="px-4 py-3 font-semibold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      {s.user}
                    </td>
                    <td className="px-4 py-3 font-mono text-indigo-300">{s.address}</td>
                    <td className="px-4 py-3 font-mono text-white/50">{s.macAddress}</td>
                    <td className="px-4 py-3 text-white/50">{s.server}</td>
                    <td className="px-4 py-3 font-mono text-white/70">{s.uptime}</td>
                    <td className="px-4 py-3 font-mono text-amber-300">{s.sessionTimeLeft}</td>
                    <td className="px-4 py-3 font-mono text-white/60">
                      ↓ {s.bytesInFormatted} / ↑ {s.bytesOutFormatted}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleKickSession(s.id || s.user, s.user)}
                        disabled={kickingSession === (s.id || s.user)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs transition cursor-pointer disabled:opacity-50"
                        title="Déconnecter immédiatement cette session"
                      >
                        <Ban className={`w-3 h-3 ${kickingSession === (s.id || s.user) ? 'animate-spin' : ''}`} />
                        Déconnecter
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Router Telemetry Cards */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Wifi className="w-4 h-4 text-indigo-400" />
          Télémétrie Routeurs MikroTik
          {data && (
            <span className="text-xs text-white/30 font-normal">
              — actualisé à {new Date(data.timestamp).toLocaleTimeString('fr-FR')}
            </span>
          )}
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 bg-white/5 border border-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : data?.routers && data.routers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.routers.map((router) => (
              <RouterCard
                key={router.routerId}
                router={router}
                onDownloadScript={handleDownloadScript}
                onTestHeartbeat={handleTestHeartbeat}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 bg-white/3 border border-white/5 rounded-2xl">
            <WifiOff className="w-10 h-10 text-white/20 mb-3" />
            <p className="text-sm text-white/40">Aucun routeur configuré</p>
            <p className="text-xs text-white/25 mt-1">Ajoutez des routeurs MikroTik dans l&apos;onglet Routeurs</p>
          </div>
        )}
      </div>

      {/* Activity Log */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-white/40" />
            Journal d&apos;activité
          </h2>
          <button
            onClick={() => setLogs([])}
            className="text-xs text-white/30 hover:text-white/60 transition cursor-pointer"
          >
            Vider
          </button>
        </div>
        <div ref={logsRef} className="h-48 overflow-y-auto p-4 space-y-1 font-mono text-xs">
          {logs.length === 0 ? (
            <p className="text-white/20 text-center mt-12">Aucune activité récente</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-white/25 shrink-0">{log.ts}</span>
                <span className={
                  log.type === 'success' ? 'text-emerald-400' :
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'warning' ? 'text-amber-400' :
                  'text-white/60'
                }>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Info Cards: How to set up heartbeat */}
      <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-indigo-300 flex items-center gap-2 mb-3">
          <ArrowUpRight className="w-4 h-4" />
          Comment activer le Heartbeat RouterOS ?
        </h3>
        <div className="space-y-2 text-xs text-white/50">
          <p>1. Téléchargez le script <span className="font-mono text-indigo-300">.rsc</span> depuis n&apos;importe quelle carte routeur ci-dessus</p>
          <p>2. Importez dans RouterOS : <code className="bg-white/5 px-1.5 py-0.5 rounded font-mono text-indigo-300">/import netpulse-heartbeat-xxx.rsc</code></p>
          <p>3. Ou directement via terminal WinBox/SSH, collez et exécutez le script</p>
          <p>4. Le routeur enverra automatiquement sa télémétrie toutes les 5 minutes à NetPulse</p>
          <p>5. Les alertes critiques (CPU &gt; 90%, mémoire saturée) déclencheront automatiquement les bots configurés</p>
        </div>
      </div>
    </div>
  );
}
