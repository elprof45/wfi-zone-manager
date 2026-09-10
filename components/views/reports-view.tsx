'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Search,
  Printer,
  FileSpreadsheet,
  ArrowUpDown,
  User,
  Calendar,
  Download,
  X,
  CheckCircle2,
  SlidersHorizontal,
  ChevronDown,
  Send,
  Bot,
  FileText,
  Clock,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import { HotspotTicket, HotspotProfile, MikroTikRouter } from '@/lib/types';
import { ModernSalesAnalytics } from '@/components/reports/modern-sales-analytics';
import { TelegramEmailModal } from '@/components/reports/telegram-email-modal';
import { generateSalesReportPdf } from '@/lib/sales-report-pdf';

interface ReportsViewProps {
  tickets: HotspotTicket[];
  profiles: HotspotProfile[];
  routers: MikroTikRouter[];
  currency: string;
}

type PeriodPreset = 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'custom';
type ReportTab = 'journal' | 'daily' | 'weekly' | 'monthly' | 'closure';

export function ReportsView({ tickets, profiles, routers, currency }: ReportsViewProps) {
  // Main view tab
  const [activeTab, setActiveTab] = useState<ReportTab>('daily');

  // Telegram / Email Dispatch modal
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatchReportType, setDispatchReportType] = useState<'daily' | 'weekly' | 'monthly' | 'closure'>('daily');

  // Filters state (for Journal table)
  const [search, setSearch] = useState('');
  const [profileFilter, setProfileFilter] = useState('all');
  const [routerFilter, setRouterFilter] = useState('all');
  const [closureFilter, setClosureFilter] = useState('all');
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState<'date' | 'price' | 'code'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Export Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'filtered' | 'all' | 'custom_period'>('filtered');
  const [exportPeriodPreset, setExportPeriodPreset] = useState<PeriodPreset>('all');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportDelimiter, setExportDelimiter] = useState<';' | ','>(';');
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  const handleOpenDispatchModal = (type: 'daily' | 'weekly' | 'monthly' | 'closure' = 'daily') => {
    setDispatchReportType(type);
    setIsDispatchModalOpen(true);
  };

  const handleDownloadPdfCurrentTab = async () => {
    const period = activeTab === 'journal' ? 'daily' : activeTab;
    try {
      const res = await fetch(`/api/reports/sales?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        const doc = generateSalesReportPdf(data.summary, 'NetPulse Hotspot Telecom');
        doc.save(`NetPulse_Rapport_${period.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.pdf`);
      }
    } catch (e) {
      console.error('Failed to download PDF', e);
    }
  };

  // Helper to handle date preset selection for main view
  const handlePeriodPresetChange = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    const now = new Date();

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      setStartDate(yesterdayStr);
      setEndDate(yesterdayStr);
    } else if (preset === '7days') {
      const past7 = new Date(now);
      past7.setDate(now.getDate() - 7);
      setStartDate(past7.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === '30days') {
      const past30 = new Date(now);
      past30.setDate(now.getDate() - 30);
      setStartDate(past30.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    }
  };

  // Helper to handle date preset selection inside export modal
  const handleExportPeriodPresetChange = (preset: PeriodPreset) => {
    setExportPeriodPreset(preset);
    const now = new Date();

    if (preset === 'all') {
      setExportStartDate('');
      setExportEndDate('');
    } else if (preset === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      setExportStartDate(todayStr);
      setExportEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      setExportStartDate(yesterdayStr);
      setExportEndDate(yesterdayStr);
    } else if (preset === '7days') {
      const past7 = new Date(now);
      past7.setDate(now.getDate() - 7);
      setExportStartDate(past7.toISOString().split('T')[0]);
      setExportEndDate(now.toISOString().split('T')[0]);
    } else if (preset === '30days') {
      const past30 = new Date(now);
      past30.setDate(now.getDate() - 30);
      setExportStartDate(past30.toISOString().split('T')[0]);
      setExportEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setExportStartDate(firstDay.toISOString().split('T')[0]);
      setExportEndDate(now.toISOString().split('T')[0]);
    }
  };

  // Base list of sold/used tickets
  const soldTickets = useMemo(() => {
    return tickets.filter((t) => t.status === 'active' || t.status === 'used' || t.status === 'expired');
  }, [tickets]);

  // Filtered tickets for the table view
  const filteredTickets = useMemo(() => {
    return soldTickets.filter((t) => {
      const matchesSearch =
        !search ||
        t.code.toLowerCase().includes(search.toLowerCase()) ||
        t.profileName.toLowerCase().includes(search.toLowerCase()) ||
        (t.soldByUserName && t.soldByUserName.toLowerCase().includes(search.toLowerCase()));

      const matchesProfile = profileFilter === 'all' || t.profileId === profileFilter;
      const matchesRouter = routerFilter === 'all' || t.routerId === routerFilter;
      const matchesClosure =
        closureFilter === 'all'
          ? true
          : closureFilter === 'closed'
          ? t.isClosed
          : !t.isClosed;

      let matchesDate = true;
      const ticketDate = t.soldAt || t.createdAt;
      if (startDate && ticketDate) {
        matchesDate = matchesDate && new Date(ticketDate) >= new Date(`${startDate}T00:00:00`);
      }
      if (endDate && ticketDate) {
        matchesDate = matchesDate && new Date(ticketDate) <= new Date(`${endDate}T23:59:59.999`);
      }

      return matchesSearch && matchesProfile && matchesRouter && matchesClosure && matchesDate;
    });
  }, [soldTickets, search, profileFilter, routerFilter, closureFilter, startDate, endDate]);

  // Sort filtered tickets
  const sortedTickets = useMemo(() => {
    const list = [...filteredTickets];
    list.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        const timeA = new Date(a.soldAt || a.createdAt).getTime();
        const timeB = new Date(b.soldAt || b.createdAt).getTime();
        comparison = timeA - timeB;
      } else if (sortField === 'price') {
        comparison = a.price - b.price;
      } else if (sortField === 'code') {
        comparison = a.code.localeCompare(b.code);
      }
      return sortDirection === 'desc' ? -comparison : comparison;
    });
    return list;
  }, [filteredTickets, sortField, sortDirection]);

  // Aggregate stats
  const totalRevenue = sortedTickets.reduce((acc, t) => acc + t.price, 0);
  const totalCount = sortedTickets.length;
  const avgBasket = totalCount > 0 ? Math.round(totalRevenue / totalCount) : 0;
  const closedCount = sortedTickets.filter((t) => t.isClosed).length;

  // Tickets matching export settings
  const ticketsToExport = useMemo(() => {
    if (exportScope === 'filtered') {
      return sortedTickets;
    } else if (exportScope === 'all') {
      return soldTickets;
    } else {
      // custom_period
      return soldTickets.filter((t) => {
        const ticketDate = t.soldAt || t.createdAt;
        let matches = true;
        if (exportStartDate && ticketDate) {
          matches = matches && new Date(ticketDate) >= new Date(`${exportStartDate}T00:00:00`);
        }
        if (exportEndDate && ticketDate) {
          matches = matches && new Date(ticketDate) <= new Date(`${exportEndDate}T23:59:59.999`);
        }
        return matches;
      });
    }
  }, [exportScope, sortedTickets, soldTickets, exportStartDate, exportEndDate]);

  // Core Excel CSV generation logic
  const generateAndDownloadCSV = (dataset: HotspotTicket[], filenameSuffix: string) => {
    const delim = exportDelimiter;

    // Excel friendly columns
    const headers = [
      'ID_Transaction',
      'Code_Coupon',
      'Profil_Hotspot',
      'Duree_Validite',
      'Debit_Alloue',
      'Routeur_Nom',
      'Prix_Montant',
      'Devise',
      'Vendu_Par',
      'Date_Vente',
      'Heure_Vente',
      'Date_Premiere_Connexion',
      'Date_Expiration',
      'Statut_Ticket',
      'Statut_Cloture',
      'Ref_Cloture_Caisse',
    ];

    const escapeCell = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(delim) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = dataset.map((t) => {
      const soldDateObj = t.soldAt ? new Date(t.soldAt) : t.createdAt ? new Date(t.createdAt) : null;
      const datePart = soldDateObj ? soldDateObj.toLocaleDateString('fr-FR') : 'N/A';
      const timePart = soldDateObj ? soldDateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A';
      const actPart = t.activatedAt ? new Date(t.activatedAt).toLocaleString('fr-FR') : 'Non activé';
      const expPart = t.expiresAt ? new Date(t.expiresAt).toLocaleString('fr-FR') : 'N/A';

      return [
        escapeCell(t.id),
        escapeCell(t.code),
        escapeCell(t.profileName),
        escapeCell(t.validityDuration || 'N/A'),
        escapeCell(t.rateLimit || 'Illimité'),
        escapeCell(t.routerName || 'Site non attribué'),
        escapeCell(t.price), // Numerical value for easy SUM() in Excel
        escapeCell(t.currency || currency),
        escapeCell(t.soldByUserName || 'Gérant de Caisse'),
        escapeCell(datePart),
        escapeCell(timePart),
        escapeCell(actPart),
        escapeCell(expPart),
        escapeCell(t.status === 'used' ? 'Consommé' : t.status === 'active' ? 'En cours' : t.status === 'expired' ? 'Expiré' : 'Disponible'),
        escapeCell(t.isClosed ? 'CLOTURE_VERROUILLE' : 'EN_ATTENTE_CLOTURE'),
        escapeCell(t.closureId || 'N/A'),
      ].join(delim);
    });

    // \uFEFF UTF-8 BOM is essential for Excel on Windows & Mac to render French accents properly
    const csvContent = '\uFEFF' + [headers.join(delim), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    const dateStamp = new Date().toISOString().split('T')[0];
    link.download = `NetPulse_Journal_Ventes_${filenameSuffix}_${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportSuccessMessage(`Export réussi : ${dataset.length} transaction(s) téléchargée(s) au format Excel.`);
    setTimeout(() => {
      setExportSuccessMessage(null);
      setIsExportModalOpen(false);
    }, 1500);
  };

  const handleToggleSort = (field: 'date' | 'price' | 'code') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setProfileFilter('all');
    setRouterFilter('all');
    setClosureFilter('all');
    setPeriodPreset('all');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div id="reports-view-container" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-neutral-950 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-neutral-900 dark:text-neutral-100" />
            <span>Rapports de Vente & Incomes (2026)</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Tableau d&apos;encaissement, rapports automatisés Telegram & Email, clôture de caisse scellée et exports certifiés
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenDispatchModal(activeTab === 'journal' ? 'daily' : activeTab)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-xs font-medium shadow-sm transition"
          >
            <Bot className="h-3.5 w-3.5" />
            <span>Diffuser (Telegram & Email)</span>
          </button>

          <button
            onClick={handleDownloadPdfCurrentTab}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Sales Report (PDF)</span>
          </button>

          <button
            id="btn-open-export-modal"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Exporter CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 text-neutral-500 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Imprimer</span>
          </button>
        </div>
      </div>

      {/* Modern Sub-Tabs Switcher */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 rounded-2xl bg-neutral-100 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800/80 w-fit">
        {[
          { id: 'daily', label: 'Rapport Journalier', icon: Clock, badge: 'Aujourd\'hui' },
          { id: 'weekly', label: 'Rapport Hebdomadaire', icon: Calendar, badge: '7 Jours' },
          { id: 'monthly', label: 'Rapport Mensuel', icon: TrendingUp, badge: '30 Jours' },
          { id: 'closure', label: 'Clôture Incomes', icon: ShieldCheck, badge: 'Certifié' },
          { id: 'journal', label: 'Journal des Transactions', icon: FileText, badge: `${totalCount} fiches` },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ReportTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition whitespace-nowrap ${
                isActive
                  ? 'bg-white dark:bg-[#141416] text-neutral-950 dark:text-white shadow-sm border border-black/[0.06] dark:border-white/[0.08]'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-white/50 dark:hover:bg-neutral-800/40'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-neutral-950 dark:text-white' : 'text-neutral-400'}`} />
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold'
                    : 'bg-neutral-200/60 dark:bg-neutral-800/60 text-neutral-500'
                }`}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Render selected view */}
      {activeTab !== 'journal' ? (
        <ModernSalesAnalytics
          activeTab={activeTab}
          currency={currency}
          onOpenDispatchModal={handleOpenDispatchModal}
        />
      ) : (
        <>
          {/* Summary Metric Cards for Journal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 shadow-sm">
              <div className="text-xs font-medium text-neutral-500">Chiffre d&apos;Affaires Filtré</div>
              <div className="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white mt-1">
                {totalRevenue.toLocaleString()} <span className="text-xs font-normal text-neutral-500">{currency}</span>
              </div>
              <div className="text-[11px] text-neutral-400 mt-1">Total encaissé sur la sélection</div>
            </div>

            <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 shadow-sm">
              <div className="text-xs font-medium text-neutral-500">Tickets Écoulés</div>
              <div className="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white mt-1">
                {totalCount} <span className="text-xs font-normal text-neutral-500">unités</span>
              </div>
              <div className="text-[11px] text-neutral-400 mt-1">Transactions validées</div>
            </div>

            <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 shadow-sm">
              <div className="text-xs font-medium text-neutral-500">Panier Moyen</div>
              <div className="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white mt-1">
                {avgBasket.toLocaleString()} <span className="text-xs font-normal text-neutral-500">{currency}</span>
              </div>
              <div className="text-[11px] text-neutral-400 mt-1">Moyenne par transaction</div>
            </div>

            <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 shadow-sm">
              <div className="text-xs font-medium text-neutral-500">Statut des Clôtures</div>
              <div className="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white mt-1">
                {closedCount} / {totalCount}
              </div>
              <div className="text-[11px] text-neutral-400 mt-1">
                {totalCount > 0 ? `${Math.round((closedCount / totalCount) * 100)}% verrouillés en clôture` : '0%'}
              </div>
            </div>
          </div>

      {/* Filter Toolbar with Period Selection */}
      <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-4 shadow-sm space-y-3">
        {/* Main Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Code, profil ou caissier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
            />
          </div>

          {/* Profile */}
          <select
            value={profileFilter}
            onChange={(e) => setProfileFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs text-neutral-700 dark:text-neutral-200 focus:outline-none"
          >
            <option value="all">Tous les profils</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Router */}
          <select
            value={routerFilter}
            onChange={(e) => setRouterFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs text-neutral-700 dark:text-neutral-200 focus:outline-none"
          >
            <option value="all">Tous les routeurs</option>
            {routers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          {/* Closure status */}
          <select
            value={closureFilter}
            onChange={(e) => setClosureFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs text-neutral-700 dark:text-neutral-200 focus:outline-none"
          >
            <option value="all">Tous les états</option>
            <option value="closed">Clôturés (Verrouillés)</option>
            <option value="unclosed">En attente de clôture</option>
          </select>

          {/* Reset button */}
          <button
            onClick={handleResetFilters}
            className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium transition"
          >
            Réinitialiser
          </button>
        </div>

        {/* Period Filter Bar */}
        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-neutral-400 mr-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Période :
            </span>
            <button
              onClick={() => handlePeriodPresetChange('all')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                periodPreset === 'all'
                  ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              Historique complet
            </button>
            <button
              onClick={() => handlePeriodPresetChange('today')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                periodPreset === 'today'
                  ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              Aujourd&apos;hui
            </button>
            <button
              onClick={() => handlePeriodPresetChange('yesterday')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                periodPreset === 'yesterday'
                  ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              Hier
            </button>
            <button
              onClick={() => handlePeriodPresetChange('7days')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                periodPreset === '7days'
                  ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              7 derniers jours
            </button>
            <button
              onClick={() => handlePeriodPresetChange('30days')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                periodPreset === '30days'
                  ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              30 derniers jours
            </button>
            <button
              onClick={() => handlePeriodPresetChange('this_month')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                periodPreset === 'this_month'
                  ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              Ce mois
            </button>
          </div>

          {/* Date range picker */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-neutral-400">Du</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriodPreset('custom');
              }}
              className="px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs font-mono text-neutral-800 dark:text-neutral-200"
            />
            <span className="text-[11px] text-neutral-400">Au</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriodPreset('custom');
              }}
              className="px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs font-mono text-neutral-800 dark:text-neutral-200"
            />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/75 dark:bg-neutral-900/60 border-b border-neutral-200/80 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-medium">
              <tr>
                <th
                  onClick={() => handleToggleSort('code')}
                  className="py-3 px-4 cursor-pointer hover:text-neutral-950 dark:hover:text-white transition select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Code Coupon</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Profil</th>
                <th className="py-3 px-4">Routeur</th>
                <th
                  onClick={() => handleToggleSort('price')}
                  className="py-3 px-4 cursor-pointer hover:text-neutral-950 dark:hover:text-white transition select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Montant</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Caissier</th>
                <th
                  onClick={() => handleToggleSort('date')}
                  className="py-3 px-4 cursor-pointer hover:text-neutral-950 dark:hover:text-white transition select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Date & Heure</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Clôture Caisse</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80 text-neutral-700 dark:text-neutral-300">
              {sortedTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-400 font-normal">
                    Aucune transaction ne correspond à vos filtres.
                  </td>
                </tr>
              ) : (
                sortedTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40 transition">
                    <td className="py-3 px-4 font-mono font-medium text-neutral-950 dark:text-white">
                      {ticket.code}
                    </td>
                    <td className="py-3 px-4 font-medium text-neutral-800 dark:text-neutral-200">
                      {ticket.profileName}
                    </td>
                    <td className="py-3 px-4 text-neutral-500">
                      {ticket.routerName}
                    </td>
                    <td className="py-3 px-4 font-semibold text-neutral-950 dark:text-white">
                      {ticket.price.toLocaleString()} {ticket.currency}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-neutral-400" />
                        <span>{ticket.soldByUserName || 'Gérant Caisse'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-neutral-500 font-mono text-[11px]">
                      {ticket.soldAt ? new Date(ticket.soldAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      {ticket.isClosed ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                          Verrouillé
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
                          En cours
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Export CSV Modal (Apple Theme) */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  <FileSpreadsheet className="h-4 w-4 text-neutral-950 dark:text-white" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-neutral-950 dark:text-white">
                    Exportation des Ventes vers CSV
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Format certifié compatible Microsoft Excel, LibreOffice et ERP
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scope selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Périmètre des données à exporter
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportScope('filtered')}
                  className={`p-3 rounded-xl text-left border transition flex flex-col justify-between ${
                    exportScope === 'filtered'
                      ? 'border-neutral-950 dark:border-white bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                      : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <div className="font-medium text-xs">Sélection filtrée actuelle</div>
                  <div className={`text-[11px] mt-1 ${exportScope === 'filtered' ? 'text-neutral-300 dark:text-neutral-600' : 'text-neutral-400'}`}>
                    {sortedTickets.length} transaction(s) avec les filtres en cours
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExportScope('all')}
                  className={`p-3 rounded-xl text-left border transition flex flex-col justify-between ${
                    exportScope === 'all'
                      ? 'border-neutral-950 dark:border-white bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                      : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <div className="font-medium text-xs">Historique complet</div>
                  <div className={`text-[11px] mt-1 ${exportScope === 'all' ? 'text-neutral-300 dark:text-neutral-600' : 'text-neutral-400'}`}>
                    {soldTickets.length} transaction(s) totales enregistrées
                  </div>
                </button>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setExportScope('custom_period')}
                  className={`w-full p-2.5 rounded-xl text-left border text-xs transition flex items-center justify-between ${
                    exportScope === 'custom_period'
                      ? 'border-neutral-950 dark:border-white bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                      : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="font-medium">Filtrer par une période spécifique pour l&apos;export</span>
                  </div>
                  <span className="text-[11px] opacity-70">
                    {exportScope === 'custom_period' ? `${ticketsToExport.length} transactions` : 'Personnaliser'}
                  </span>
                </button>
              </div>
            </div>

            {/* If custom period chosen */}
            {exportScope === 'custom_period' && (
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3 animate-fade-in">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleExportPeriodPresetChange('today')}
                    className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium transition ${
                      exportPeriodPreset === 'today'
                        ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950'
                        : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    Aujourd&apos;hui
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportPeriodPresetChange('yesterday')}
                    className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium transition ${
                      exportPeriodPreset === 'yesterday'
                        ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950'
                        : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    Hier
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportPeriodPresetChange('7days')}
                    className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium transition ${
                      exportPeriodPreset === '7days'
                        ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950'
                        : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    7 derniers jours
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportPeriodPresetChange('30days')}
                    className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium transition ${
                      exportPeriodPreset === '30days'
                        ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950'
                        : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    30 derniers jours
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportPeriodPresetChange('this_month')}
                    className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium transition ${
                      exportPeriodPreset === 'this_month'
                        ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950'
                        : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    Ce mois
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[11px] text-neutral-500 mb-1 block">Date de début</label>
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => {
                        setExportStartDate(e.target.value);
                        setExportPeriodPreset('custom');
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-500 mb-1 block">Date de fin</label>
                    <input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => {
                        setExportEndDate(e.target.value);
                        setExportPeriodPreset('custom');
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Options format Excel */}
            <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Options de formatage Excel
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setExportDelimiter(';')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    exportDelimiter === ';'
                      ? 'border-neutral-950 dark:border-white bg-neutral-100 dark:bg-neutral-800 text-neutral-950 dark:text-white font-medium'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                  }`}
                >
                  <div className="font-semibold">Point-virgule (;)</div>
                  <div className="text-[10.5px] text-neutral-400">Recommandé pour Excel (France / Europe)</div>
                </button>
                <button
                  type="button"
                  onClick={() => setExportDelimiter(',')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    exportDelimiter === ','
                      ? 'border-neutral-950 dark:border-white bg-neutral-100 dark:bg-neutral-800 text-neutral-950 dark:text-white font-medium'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                  }`}
                >
                  <div className="font-semibold">Virgule (,)</div>
                  <div className="text-[10.5px] text-neutral-400">Standard anglophone (US / UK)</div>
                </button>
              </div>
              <div className="text-[11px] text-neutral-400 leading-relaxed pt-1">
                Le fichier CSV généré intègre la signature UTF-8 BOM (`\uFEFF`) afin que les accents et les dates s&apos;ouvrent instantanément dans Microsoft Excel sans problème d&apos;encodage.
              </div>
            </div>

            {/* Success notification */}
            {exportSuccessMessage && (
              <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="h-4 w-4 text-neutral-950 dark:text-white shrink-0" />
                <span>{exportSuccessMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  const suffix = exportScope === 'all' ? 'Complet' : exportScope === 'filtered' ? 'Filtre' : 'Periode';
                  generateAndDownloadCSV(ticketsToExport, suffix);
                }}
                disabled={ticketsToExport.length === 0}
                className="flex items-center gap-2 px-5 py-2 rounded-full bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs font-medium transition shadow-sm disabled:opacity-40 disabled:pointer-events-none"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Télécharger le CSV ({ticketsToExport.length} lignes)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Telegram & Email Dispatch Modal */}
      <TelegramEmailModal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        defaultReportType={dispatchReportType}
        currency={currency}
      />
    </div>
  );
}


