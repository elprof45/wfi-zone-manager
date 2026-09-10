'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Ticket,
  TrendingUp,
  Clock,
  Sparkles,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Send,
  Download,
  Calendar,
  LockKeyhole,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { SalesReportSummary } from '@/lib/reports-service';
import { generateSalesReportPdf } from '@/lib/sales-report-pdf';

interface ModernSalesAnalyticsProps {
  activeTab: 'daily' | 'weekly' | 'monthly' | 'closure';
  currency: string;
  onOpenDispatchModal: (reportType: 'daily' | 'weekly' | 'monthly' | 'closure') => void;
}

export function ModernSalesAnalytics({
  activeTab,
  currency,
  onOpenDispatchModal,
}: ModernSalesAnalyticsProps) {
  const [data, setData] = useState<SalesReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const res = await fetch(`/api/reports/sales?period=${activeTab}`);
        if (res.ok) {
          const json = await res.json();
          if (!ignore) {
            setData(json.summary);
          }
        }
      } catch (err) {
        console.error('Failed to fetch sales report summary', err);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [activeTab]);

  const handleDownloadPdf = () => {
    if (!data) return;
    const doc = generateSalesReportPdf(data, 'NetPulse Telecom & Hotspot SARL');
    doc.save(`Rapport_Ventes_NetPulse_${activeTab}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-8">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-6 w-6 text-neutral-400 animate-spin" />
          <p className="text-xs text-neutral-500 font-medium">Agrégation des statistiques de ventes 2026...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const monoColors = ['#171717', '#404040', '#737373', '#a3a3a3', '#d4d4d4'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Sub-Header with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-100/60 dark:bg-neutral-900/40 border border-black/[0.06] dark:border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-neutral-950 dark:text-white">
              {data.periodLabel}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
              Certifié 2026
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Données de ventes consolidées avec décomposition par profil, borne et créneau
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onOpenDispatchModal(activeTab)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs font-medium transition shadow-sm"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Diffuser (Telegram & Email)</span>
          </button>
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 hover:bg-white dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Télécharger Sales Report (PDF)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue Card */}
        <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-medium uppercase tracking-wider">Chiffre d&apos;Affaires</span>
            <DollarSign className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
            {data.totalRevenue.toLocaleString()} <span className="text-sm font-normal text-neutral-500">{currency}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
            <TrendingUp className="h-3.5 w-3.5 text-neutral-950 dark:text-white" />
            <span>+{data.comparisonVsPreviousPercent}% vs période antérieure</span>
          </div>
        </div>

        {/* Tickets Sold Count Card */}
        <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-medium uppercase tracking-wider">Tickets Émis & Vendus</span>
            <Ticket className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
            {data.ticketsCount} <span className="text-sm font-normal text-neutral-500">unités</span>
          </div>
          <div className="text-xs text-neutral-500">
            Coupons consommés sur routeurs
          </div>
        </div>

        {/* Average Basket Card */}
        <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-medium uppercase tracking-wider">Panier Moyen</span>
            <Layers className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
            {data.averageTicketPrice.toLocaleString()} <span className="text-sm font-normal text-neutral-500">{currency}</span>
          </div>
          <div className="text-xs text-neutral-500">
            Dépense moyenne par client
          </div>
        </div>

        {/* Peak Activity Card */}
        <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-medium uppercase tracking-wider">Pic de Vente</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="text-xl font-bold tracking-tight text-neutral-950 dark:text-white truncate">
            {data.peakLabel}
          </div>
          <div className="text-xs text-neutral-500">
            Créneau de plus forte affluence
          </div>
        </div>
      </div>

      {/* Primary Visual Chart: Time Series Distribution */}
      <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-neutral-950 dark:text-white text-base tracking-tight">
              {activeTab === 'daily'
                ? 'Rythme Horaire des Encaissements (Aujourd\'hui)'
                : activeTab === 'weekly'
                ? 'Évolution Quotidienne des Ventes (Semaine en Cours)'
                : activeTab === 'monthly'
                ? 'Progression Hebdomadaire des Recettes (30 Jours)'
                : 'Historique des Incomes et Clôtures de Caisse'}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Flux des recettes exprimé en {currency}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-neutral-900 dark:bg-white inline-block" />
              <span>Chiffre d&apos;Affaires</span>
            </span>
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {activeTab === 'monthly' ? (
              <AreaChart data={data.timeDistribution}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#000000" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#000000" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                <XAxis dataKey="label" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val.toLocaleString()} ${currency}`}
                />
                <Tooltip
                  formatter={(val: any) => [`${Number(val).toLocaleString()} ${currency}`, 'Recettes']}
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#27272a',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#171717" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            ) : (
              <BarChart data={data.timeDistribution} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                <XAxis dataKey="label" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val.toLocaleString()} ${currency}`}
                />
                <Tooltip
                  formatter={(val: any) => [`${Number(val).toLocaleString()} ${currency}`, 'Recettes']}
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#27272a',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="revenue" fill="#171717" radius={[6, 6, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Columns: Profile Breakdown & Router Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Breakdown */}
        <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-neutral-950 dark:text-white text-sm tracking-tight">
              Ventilation par Profil de Forfait
            </h4>
            <span className="text-xs text-neutral-500 font-normal">
              {data.profileBreakdown.length} profils actifs
            </span>
          </div>

          <div className="space-y-3">
            {data.profileBreakdown.map((item) => (
              <div key={item.profileId} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    {item.profileName}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500 font-normal">{item.count} tickets</span>
                    <span className="font-semibold text-neutral-950 dark:text-white">
                      {item.revenue.toLocaleString()} {currency} ({item.percentage}%)
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-neutral-900 dark:bg-white rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(4, item.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Router Breakdown */}
        <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-neutral-950 dark:text-white text-sm tracking-tight">
              Performance par Borne & Routeur MikroTik
            </h4>
            <span className="text-xs text-neutral-500 font-normal">
              {data.routerBreakdown.length} sites surveillés
            </span>
          </div>

          <div className="space-y-3">
            {data.routerBreakdown.map((rtr) => (
              <div key={rtr.routerId} className="p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-950 dark:text-white truncate">
                    {rtr.routerName}
                  </span>
                  <span className="font-bold text-neutral-950 dark:text-white">
                    {rtr.revenue.toLocaleString()} {currency}
                  </span>
                </div>
                <div className="flex items-center justify-between text-neutral-500 text-[11px]">
                  <span>{rtr.count} tickets vendus</span>
                  <span>Part : {rtr.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Incomes Closure & Status Section */}
      <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-neutral-950 dark:text-white text-sm">
                Certification Comptable & Registre des Incomes
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Arrêté de caisse scellé avec purge de la mémoire vive RouterOS et audit trail
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[11px] text-neutral-500">Recettes non scellées (Caisse en cours)</div>
            <div className="text-lg font-bold text-neutral-950 dark:text-white">
              {data.unclosedRevenue.toLocaleString()} {currency} ({data.unclosedTicketsCount} tickets)
            </div>
          </div>
        </div>

        {data.recentClosures && data.recentClosures.length > 0 && (
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-medium">
                <tr>
                  <th className="py-2.5 px-3">Session Scellée</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Montant Encaissé</th>
                  <th className="py-2.5 px-3">Tickets</th>
                  <th className="py-2.5 px-3">Purge MikroTik</th>
                  <th className="py-2.5 px-3">Canaux Notifiés</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-700 dark:text-neutral-300">
                {data.recentClosures.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2.5 px-3 font-mono font-medium text-neutral-950 dark:text-white">
                      {c.sessionCode}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-500">
                      {new Date(c.closedAt).toLocaleString('fr-FR')}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-neutral-950 dark:text-white">
                      {c.totalRevenue.toLocaleString()} {c.currency}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-500">
                      {c.ticketsSoldCount} unités
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-100 dark:bg-neutral-800 font-medium text-neutral-800 dark:text-neutral-200">
                        +{((c.mikrotikPurgedCount || 0) * 0.4).toFixed(1)} MB libres
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1 text-[10px]">
                        {c.notificationStatus?.telegramSent && (
                          <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium">
                            Telegram
                          </span>
                        )}
                        {c.notificationStatus?.emailSent && (
                          <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium">
                            Email
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
