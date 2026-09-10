'use client';

import React from 'react';
import {
  DollarSign,
  Users,
  Cpu,
  HardDrive,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Zap,
  Ticket,
  LockKeyhole,
  CheckCircle2,
  Clock,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

interface DashboardViewProps {
  metrics: any;
  onNavigate: (section: any) => void;
  onQuickGenerate: () => void;
  onTriggerClosure: () => void;
  onPurgeRam: () => void;
  currency: string;
}

export function DashboardView({
  metrics,
  onNavigate,
  onQuickGenerate,
  onTriggerClosure,
  onPurgeRam,
  currency,
}: DashboardViewProps) {
  if (!metrics) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-6 w-6 text-neutral-400 animate-spin" />
          <p className="text-xs text-neutral-500 font-medium">Chargement des métriques réseau MikroTik...</p>
        </div>
      </div>
    );
  }

  const {
    todayRevenue = 0,
    unclosedTicketsCount = 0,
    activeUsersCount = 0,
    hardware = { cpuPercent: 12, ramFreeMb: 82, ramTotalMb: 128, flashFreeMb: 94, flashTotalMb: 128 },
    stockAlerts = [],
    hourlyComparison = [],
    daysTrend = [],
    profileSalesDistribution = [],
    selectedRouter,
  } = metrics;

  const ramUsedPercent = Math.round(((hardware.ramTotalMb - hardware.ramFreeMb) / hardware.ramTotalMb) * 100);
  const flashUsedPercent = Math.round(((hardware.flashTotalMb - hardware.flashFreeMb) / hardware.flashTotalMb) * 100);

  // Apple monochromatic grayscale palette for pie chart
  const appleMonoColors = ['#171717', '#525252', '#737373', '#a3a3a3', '#d4d4d4'];

  return (
    <div id="dashboard-view-container" className="space-y-6">
      {/* Top Banner if stock alerts exist */}
      {stockAlerts.length > 0 && (
        <div
          id="critical-stock-alert-banner"
          className="rounded-2xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-[#141416] p-4 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <span>Stock faible détecté</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium">
                    Attention
                  </span>
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {stockAlerts.map((a: any) => `${a.profileName} (${a.availableCount} fiches restantes)`).join(', ')}.
                </p>
              </div>
            </div>
            <button
              onClick={onQuickGenerate}
              className="self-start sm:self-center px-3.5 py-1.5 bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black rounded-full text-xs font-medium transition"
            >
              Réapprovisionner
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: CA du jour */}
        <div
          id="kpi-today-revenue"
          className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition hover:border-black/20 dark:hover:border-white/20"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Chiffre d&apos;Affaires (Jour)
            </span>
            <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-950 dark:text-white">
              {todayRevenue.toLocaleString()} <span className="text-xs font-normal text-neutral-400">{currency}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="font-medium text-neutral-900 dark:text-neutral-100 flex items-center">
                <TrendingUp className="h-3 w-3 mr-0.5" /> +12.4%
              </span>
              <span>• {unclosedTicketsCount} fiches vendues</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-xs">
            <span className="text-neutral-400 text-[11px]">Session ouverte</span>
            <button
              onClick={onTriggerClosure}
              className="text-neutral-900 dark:text-neutral-100 font-medium hover:underline flex items-center gap-0.5 text-xs"
            >
              Clôturer <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Card 2: Utilisateurs en ligne */}
        <div
          id="kpi-active-users"
          className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition hover:border-black/20 dark:hover:border-white/20"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Sessions Actives
            </span>
            <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-950 dark:text-white flex items-center gap-2">
              <span>{activeUsersCount}</span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700">
                LIVE
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              /ip/hotspot/active temps réel
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-xs text-neutral-500">
            <span className="text-[11px]">Débit estimé:</span>
            <span className="font-medium text-neutral-800 dark:text-neutral-200 text-xs">
              {(activeUsersCount * 1.8).toFixed(1)} Mbps
            </span>
          </div>
        </div>

        {/* Card 3: Charge CPU MikroTik */}
        <div
          id="kpi-mikrotik-cpu"
          className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition hover:border-black/20 dark:hover:border-white/20"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              CPU MikroTik
            </span>
            <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
              <Cpu className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-950 dark:text-white font-mono">
                {hardware.cpuPercent}%
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700">
                {hardware.cpuPercent < 15 ? 'Optimal (< 15%)' : 'Actif'}
              </span>
            </div>
            {/* Minimalist progress bar */}
            <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-neutral-900 dark:bg-white transition-all duration-500"
                style={{ width: `${Math.min(100, hardware.cpuPercent)}%` }}
              />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-xs">
            <span className="text-neutral-400 text-[11px]">Guard actif</span>
            <button
              onClick={onPurgeRam}
              className="text-neutral-900 dark:text-neutral-100 font-medium hover:underline flex items-center gap-0.5 text-xs"
            >
              Purge RAM
            </button>
          </div>
        </div>

        {/* Card 4: RAM & Flash MikroTik */}
        <div
          id="kpi-mikrotik-memory"
          className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition hover:border-black/20 dark:hover:border-white/20"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Mémoire Disponible
            </span>
            <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
              <HardDrive className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-950 dark:text-white">
              {hardware.ramFreeMb} <span className="text-xs font-normal text-neutral-400">MB Libre</span>
            </div>
            <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              <span>Total: {hardware.ramTotalMb}MB</span>
              <span>Flash: {hardware.flashFreeMb}MB libre</span>
            </div>
            <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-neutral-800 dark:bg-neutral-200 transition-all duration-500"
                style={{ width: `${ramUsedPercent}%` }}
              />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-xs text-neutral-500">
            <span className="text-[11px]">Utilisation RAM: {ramUsedPercent}%</span>
            <span className="text-neutral-400 text-[11px]">{selectedRouter ? selectedRouter.hardware.model.split(' ')[0] : 'Multi-sites'}</span>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart: CA Comparatif Jour J vs J-7 (2 columns) */}
        <div
          id="chart-revenue-comparison"
          className="lg:col-span-2 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="font-semibold text-neutral-950 dark:text-white text-base flex items-center gap-2">
                <span>Progression du Chiffre d&apos;Affaires</span>
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Comparaison horaire : Aujourd&apos;hui (J) vs Même jour semaine passée (J-7)
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-neutral-950 dark:bg-white" />
                <span className="text-neutral-700 dark:text-neutral-300">Aujourd&apos;hui (J)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-neutral-400 dark:bg-neutral-600" />
                <span className="text-neutral-400 dark:text-neutral-500">Semaine J-7</span>
              </div>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourlyComparison} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-100 dark:stroke-neutral-800" vertical={false} />
                <XAxis dataKey="hour" tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#171717',
                    borderColor: '#262626',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                  formatter={(val: any) => [`${Number(val).toLocaleString()} ${currency}`, '']}
                />
                <Line
                  type="monotone"
                  dataKey="jourJ"
                  name="Aujourd'hui (J)"
                  stroke="#171717"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#171717' }}
                  activeDot={{ r: 5, fill: '#171717' }}
                />
                <Line
                  type="monotone"
                  dataKey="jourJ7"
                  name="Semaine J-7"
                  stroke="#a3a3a3"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut/Pie Chart: Popularité des profils (1 column) */}
        <div
          id="chart-profiles-popularity"
          className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between"
        >
          <div>
            <h3 className="font-semibold text-neutral-950 dark:text-white text-base">
              Répartition des Ventes
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Part relative par profil de ticket
            </p>
          </div>

          <div className="h-52 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={profileSalesDistribution}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={75}
                  paddingAngle={2}
                >
                  {profileSalesDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={appleMonoColors[index % appleMonoColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#171717',
                    borderColor: '#262626',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(value: any, name: any, item: any) => [
                    `${value} fiches (${item.payload.revenue.toLocaleString()} ${currency})`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Mini Legend */}
          <div className="space-y-2 border-t border-neutral-100 dark:border-neutral-800 pt-3">
            {profileSalesDistribution.slice(0, 4).map((item: any, idx: number) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: appleMonoColors[idx % appleMonoColors.length] }}
                  />
                  <span className="truncate text-neutral-700 dark:text-neutral-300 font-medium">{item.name}</span>
                </div>
                <span className="font-medium text-neutral-900 dark:text-white">
                  {item.count} <span className="text-[10px] text-neutral-400">({item.revenue.toLocaleString()})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7 Days Bar Chart Trend & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend 7 days */}
        <div
          id="chart-7days-trend"
          className="lg:col-span-2 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-neutral-950 dark:text-white text-base">
                Historique des 7 Derniers Jours
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Chiffre d&apos;affaires validé par arrêté comptable quotidien
              </p>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs text-neutral-900 dark:text-white font-medium hover:underline flex items-center gap-1"
            >
              Consulter le journal <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daysTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-100 dark:stroke-neutral-800" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#171717',
                    borderColor: '#262626',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`${Number(val).toLocaleString()} ${currency}`, 'CA']}
                />
                <Bar dataKey="ca" fill="#262626" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Operations panel */}
        <div
          id="quick-operations-panel"
          className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between"
        >
          <div>
            <h3 className="font-semibold text-neutral-950 dark:text-white text-base">
              Actions Opérationnelles
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Commandes directes vers le réseau et la caisse
            </p>
          </div>

          <div className="space-y-2.5 my-3">
            <button
              id="btn-quick-generate-action"
              onClick={onQuickGenerate}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50 hover:bg-neutral-100/90 dark:hover:bg-neutral-800/80 text-neutral-900 dark:text-white transition group"
            >
              <div className="flex items-center gap-2.5 text-left">
                <Ticket className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                <div>
                  <div className="text-xs font-semibold">Générer un lot de fiches</div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400">Création en masse avec throttling</div>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-neutral-400 group-hover:translate-x-0.5 transition" />
            </button>

            <button
              id="btn-quick-closure-action"
              onClick={onTriggerClosure}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50 hover:bg-neutral-100/90 dark:hover:bg-neutral-800/80 text-neutral-900 dark:text-white transition group"
            >
              <div className="flex items-center gap-2.5 text-left">
                <LockKeyhole className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                <div>
                  <div className="text-xs font-semibold">Clôture de Caisse</div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400">Verrouille le CA & purge MikroTik</div>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-neutral-400 group-hover:translate-x-0.5 transition" />
            </button>

            <button
              id="btn-quick-purge-ram-action"
              onClick={onPurgeRam}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50 hover:bg-neutral-100/90 dark:hover:bg-neutral-800/80 text-neutral-900 dark:text-white transition group"
            >
              <div className="flex items-center gap-2.5 text-left">
                <RefreshCw className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                <div>
                  <div className="text-xs font-semibold">Purge Mémoire (/cleandisk)</div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400">Libère la RAM du RB951Ui</div>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-neutral-400 group-hover:translate-x-0.5 transition" />
            </button>
          </div>

          <div className="text-[11px] text-neutral-400 text-center">
            Synchronisation MikroTik Socket API • Latence 4ms
          </div>
        </div>
      </div>
    </div>
  );
}
