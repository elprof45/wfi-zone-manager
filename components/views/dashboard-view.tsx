'use client';

import React from 'react';
import {
  DollarSign,
  Users,
  Cpu,
  HardDrive,
  AlertTriangle,
  TrendingUp,
  Activity,
  Zap,
  Ticket,
  LockKeyhole,
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
          <RefreshCw className="h-6 w-6 text-muted-foreground animate-spin" />
          <p className="text-xs text-muted-foreground font-medium">Chargement des métriques réseau MikroTik...</p>
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
    selectedRouter = null,
  } = metrics;

  const ramUsedPercent = hardware?.ramTotalMb > 0
    ? Math.round(((hardware.ramTotalMb - hardware.ramFreeMb) / hardware.ramTotalMb) * 100)
    : 0;
  const flashUsedPercent = hardware?.flashTotalMb > 0
    ? Math.round(((hardware.flashTotalMb - hardware.flashFreeMb) / hardware.flashTotalMb) * 100)
    : 0;

  // Safe accessor for selectedRouter
  const routerModel = selectedRouter?.hardware?.model?.split(' ')[0] ?? 'Multi-sites';

  // Use CSS variable colors for charts
  const chartColors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  // Shared card class
  const cardClass = 'rounded-2xl border border-border bg-card text-card-foreground p-5 shadow-xs transition hover:border-border/80';

  return (
    <div id="dashboard-view-container" className="space-y-6">

      {/* Stock Alert Banner */}
      {stockAlerts.length > 0 && (
        <div id="critical-stock-alert-banner" className={`${cardClass} border-destructive/40 bg-destructive/5`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <span>Stock faible détecté</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                    Attention
                  </span>
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stockAlerts.map((a: any) => `${a.profileName} (${a.availableCount} fiches restantes)`).join(', ')}.
                </p>
              </div>
            </div>
            <button
              onClick={onQuickGenerate}
              className="self-start sm:self-center px-3.5 py-1.5 bg-primary text-primary-foreground hover:opacity-90 rounded-full text-xs font-medium transition cursor-pointer"
            >
              Réapprovisionner
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* CA du jour */}
        <div id="kpi-today-revenue" className={cardClass}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              CA (Jour)
            </span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              {todayRevenue.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{currency}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground flex items-center">
                <TrendingUp className="h-3 w-3 mr-0.5 text-primary" /> +12.4%
              </span>
              <span>• {unclosedTicketsCount} fiches vendues</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground text-[11px]">Session ouverte</span>
            <button onClick={onTriggerClosure} className="text-foreground font-medium hover:underline flex items-center gap-0.5 text-xs cursor-pointer">
              Clôturer <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Sessions actives */}
        <div id="kpi-active-users" className={cardClass}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Sessions Actives
            </span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground flex items-center gap-2">
              <span>{activeUsersCount}</span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                LIVE
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">/ip/hotspot/active temps réel</p>
          </div>
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span className="text-[11px]">Débit estimé:</span>
            <span className="font-medium text-foreground text-xs font-mono">
              {(activeUsersCount * 1.8).toFixed(1)} Mbps
            </span>
          </div>
        </div>

        {/* CPU MikroTik */}
        <div id="kpi-mikrotik-cpu" className={cardClass}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              CPU MikroTik
            </span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Cpu className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground font-mono">
                {hardware.cpuPercent}%
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                {hardware.cpuPercent < 15 ? 'Optimal' : 'Actif'}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-2.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(100, hardware.cpuPercent)}%` }}
              />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground text-[11px]">Guard actif</span>
            <button onClick={onPurgeRam} className="text-foreground font-medium hover:underline flex items-center gap-0.5 text-xs cursor-pointer">
              Purge RAM
            </button>
          </div>
        </div>

        {/* RAM & Flash */}
        <div id="kpi-mikrotik-memory" className={cardClass}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Mémoire Dispo
            </span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <HardDrive className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              {hardware.ramFreeMb} <span className="text-xs font-normal text-muted-foreground">MB Libre</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
              <span>Total: {hardware.ramTotalMb}MB</span>
              <span>Flash: {hardware.flashFreeMb}MB</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-2.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${ramUsedPercent}%` }}
              />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span className="text-[11px]">RAM utilisée: {ramUsedPercent}%</span>
            <span className="text-muted-foreground text-[11px]">{routerModel}</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Line Chart: CA horaire */}
        <div id="chart-revenue-comparison" className={`lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-xs`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
            <div>
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                Progression du Chiffre d&apos;Affaires
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Comparaison horaire : Aujourd&apos;hui (J) vs Même jour semaine passée (J-7)
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">Aujourd&apos;hui</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                <span className="text-muted-foreground">J-7</span>
              </div>
            </div>
          </div>

          <div className="h-60 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourlyComparison} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="hour" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    borderRadius: '12px',
                    color: 'var(--card-foreground)',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`${Number(val).toLocaleString()} ${currency}`, '']}
                />
                <Line type="monotone" dataKey="jourJ" name="Aujourd'hui" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--primary)' }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="jourJ7" name="J-7" stroke="var(--muted-foreground)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Répartition profils */}
        <div id="chart-profiles-popularity" className={`rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between`}>
          <div>
            <h3 className="font-semibold text-foreground text-sm">Répartition des Ventes</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Part relative par profil de ticket</p>
          </div>

          {profileSalesDistribution.length > 0 ? (
            <>
              <div className="h-48 w-full my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={profileSalesDistribution} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3}>
                      {profileSalesDistribution.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px', color: 'var(--card-foreground)', fontSize: '12px' }}
                      formatter={(value: any, name: any, item: any) => [`${value} fiches (${(item.payload.revenue || 0).toLocaleString()} ${currency})`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 border-t border-border pt-3">
                {profileSalesDistribution.slice(0, 4).map((item: any, idx: number) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: chartColors[idx % chartColors.length] }} />
                      <span className="truncate text-foreground font-medium">{item.name}</span>
                    </div>
                    <span className="font-medium text-foreground">
                      {item.count} <span className="text-[10px] text-muted-foreground">({(item.revenue || 0).toLocaleString()})</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-muted-foreground text-center">Aucune vente enregistrée aujourd&apos;hui</p>
            </div>
          )}
        </div>
      </div>

      {/* 7-Day Trend + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Bar Chart: Tendance 7 jours */}
        <div id="chart-7days-trend" className={`lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-xs`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground text-sm">Historique des 7 Derniers Jours</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Chiffre d&apos;affaires validé par arrêté comptable</p>
            </div>
            <button onClick={() => onNavigate('reports')} className="text-xs text-primary font-medium hover:underline flex items-center gap-1 cursor-pointer">
              Journal <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daysTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px', color: 'var(--card-foreground)', fontSize: '12px' }}
                  formatter={(val: any) => [`${Number(val).toLocaleString()} ${currency}`, 'CA']}
                />
                <Bar dataKey="ca" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Operations */}
        <div id="quick-operations-panel" className={`rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between`}>
          <div>
            <h3 className="font-semibold text-foreground text-sm">Actions Opérationnelles</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Commandes directes vers le réseau et la caisse</p>
          </div>

          <div className="space-y-2.5 my-4">
            {[
              { id: 'btn-quick-generate-action', icon: Ticket, label: 'Générer un lot de fiches', desc: 'Création en masse avec throttling', action: onQuickGenerate },
              { id: 'btn-quick-closure-action', icon: LockKeyhole, label: 'Clôture de Caisse', desc: 'Verrouille le CA & purge MikroTik', action: onTriggerClosure },
              { id: 'btn-quick-purge-ram-action', icon: RefreshCw, label: 'Purge Mémoire (/cleandisk)', desc: 'Libère la RAM du routeur', action: onPurgeRam },
            ].map(({ id, icon: Icon, label, desc, action }) => (
              <button
                key={id}
                id={id}
                onClick={action}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted transition group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-foreground">{label}</div>
                    <div className="text-[11px] text-muted-foreground">{desc}</div>
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition shrink-0" />
              </button>
            ))}
          </div>

          <div className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1.5">
            <Activity className="h-3 w-3 text-primary animate-pulse" />
            MikroTik Socket API • Latence 4ms
          </div>
        </div>
      </div>
    </div>
  );
}
