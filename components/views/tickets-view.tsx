'use client';

import React, { useState, useEffect } from 'react';
import {
  Ticket,
  Plus,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  QrCode,
  DollarSign,
  Cpu,
  Layers,
  FileDown,
  RefreshCw,
  Eye,
  ShoppingCart,
  AlertCircle,
  Copy,
  ExternalLink,
  Check,
  CheckSquare,
  Square,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import QRCode from 'qrcode';
import { HotspotTicket, HotspotProfile, MikroTikRouter } from '@/lib/types';
import { generateTicketsPdf } from '@/lib/ticket-pdf';
import { exportTicketsToCsv, downloadCsvFile } from '@/lib/export-utils';
import { toast } from 'sonner';

interface TicketsViewProps {
  tickets: HotspotTicket[];
  profiles: HotspotProfile[];
  routers: MikroTikRouter[];
  onRefresh: () => void;
  currency: string;
}

export function TicketsView({ tickets, profiles, routers, onRefresh, currency }: TicketsViewProps) {
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [profileFilter, setProfileFilter] = useState('all');
  const [routerFilter, setRouterFilter] = useState('all');

  // Generator Modal State
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [genProfileId, setGenProfileId] = useState(profiles[0]?.id || '');
  const [genRouterId, setGenRouterId] = useState(routers[0]?.id || '');
  const [genCount, setGenCount] = useState<number>(50);
  const [genPrefix, setGenPrefix] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState<{
    processed: number;
    total: number;
    percent: number;
    currentCpu: number;
  } | null>(null);

  // Print Engine State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printFormat, setPrintFormat] = useState<'a4' | 'thermal80' | 'thermal58'>('a4');
  const [selectedForPrint, setSelectedForPrint] = useState<HotspotTicket[]>([]);
  const [qrCodeDataUrls, setQrCodeDataUrls] = useState<Record<string, string>>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Selection & PDF Export State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfFormat, setPdfFormat] = useState<'a4' | 'thermal80' | 'thermal58'>('a4');
  const [pdfScope, setPdfScope] = useState<'selected' | 'filtered' | 'available'>('filtered');
  const [pdfIncludeQr, setPdfIncludeQr] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Form default selection helper
  const activeGenProfileId = genProfileId || profiles[0]?.id || '';
  const activeGenRouterId = genRouterId || routers[0]?.id || '';

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      !search ||
      t.code.toLowerCase().includes(search.toLowerCase()) ||
      t.profileName.toLowerCase().includes(search.toLowerCase()) ||
      t.routerName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesProfile = profileFilter === 'all' || t.profileId === profileFilter;
    const matchesRouter = routerFilter === 'all' || t.routerId === routerFilter;
    return matchesSearch && matchesStatus && matchesProfile && matchesRouter;
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, profileFilter, routerFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize));
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Handle generation with real throttled batch feedback
  const handleStartGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGenProfileId || !activeGenRouterId) return;

    setIsGenerating(true);
    setGenProgress({ processed: 0, total: genCount, percent: 0, currentCpu: 8 });

    // Step-by-step progress simulation mirroring the server's throttled batch
    const batchSize = 20;
    const totalBatches = Math.ceil(genCount / batchSize);

    for (let b = 1; b <= totalBatches; b++) {
      const processed = Math.min(genCount, b * batchSize);
      const percent = Math.round((processed / genCount) * 100);
      const simulatedCpu = 10 + (b % 4); // Stay 10-13% (< 15%)
      setGenProgress({ processed, total: genCount, percent, currentCpu: simulatedCpu });
      await new Promise((r) => setTimeout(r, 60));
    }

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: activeGenProfileId,
          routerId: activeGenRouterId,
          count: genCount,
          prefix: genPrefix.toUpperCase(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsGenerating(false);
        setIsGenModalOpen(false);
        setGenProgress(null);
        onRefresh();

        toast.success(`${data.tickets?.length || genCount} tickets générés avec succès !`);
        // Automatically open print dialog for newly generated tickets if under 100
        if (data.tickets && data.tickets.length > 0 && data.tickets.length <= 100) {
          openPrintEngine(data.tickets);
        }
      }
    } catch (err) {
      toast.error('Erreur lors de la génération des tickets');
      setIsGenerating(false);
      setGenProgress(null);
    }
  };

  // Open Print Engine
  const openPrintEngine = async (ticketsToPrint: HotspotTicket[]) => {
    setSelectedForPrint(ticketsToPrint);
    setIsPrintModalOpen(true);

    // Generate QR codes for tickets
    const qrMap: Record<string, string> = {};
    for (const t of ticketsToPrint.slice(0, 100)) {
      try {
        const targetRouter = routers.find((r) => r.id === t.routerId);
        const dns = targetRouter?.hotspotDnsName || 'hotspot.local';
        const loginUrl = `http://${dns}/login?username=${t.code}&password=${t.password || t.code}`;
        const url = await QRCode.toDataURL(loginUrl, {
          width: 140,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
        });
        qrMap[t.id] = url;
      } catch (err) {
        console.error(err);
      }
    }
    setQrCodeDataUrls(qrMap);
  };

  const handleSellTicket = async (ticketId: string) => {
    try {
      const res = await fetch('/api/tickets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ticketId, action: 'sell' }),
      });
      if (res.ok) {
        toast.success('Ticket vendu et activé avec succès !');
        onRefresh();
      } else {
        toast.error('Erreur lors de la vente du ticket');
      }
    } catch (err) {
      toast.error('Erreur réseau lors de la vente du ticket');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleNativePrint = () => {
    window.print();
  };

  // Selection handlers
  const isAllFilteredSelected =
    filteredTickets.length > 0 && selectedIds.length === filteredTickets.length;

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTickets.map((t) => t.id));
    }
  };

  const handleToggleSelectTicket = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Target tickets resolver for export
  const getTargetTicketsForExport = (): HotspotTicket[] => {
    if (pdfScope === 'selected') {
      const selected = tickets.filter((t) => selectedIds.includes(t.id));
      return selected.length > 0 ? selected : filteredTickets;
    }
    if (pdfScope === 'available') {
      return tickets.filter((t) => t.status === 'available');
    }
    return filteredTickets;
  };

  // PDF Export Engine with jsPDF
  const handleExportPdf = async (
    ticketsToExport: HotspotTicket[],
    format: 'a4' | 'thermal80' | 'thermal58' = 'a4',
    includeQr: boolean = true
  ) => {
    if (ticketsToExport.length === 0) {
      toast.error("Aucun ticket sélectionné pour l'exportation PDF.");
      return;
    }

    setIsGeneratingPdf(true);
    setPdfProgress({ current: 0, total: ticketsToExport.length });

    try {
      const doc = await generateTicketsPdf({
        tickets: ticketsToExport,
        routers,
        format,
        includeQrCode: includeQr,
        onProgress: (current, total) => {
          setPdfProgress({ current, total });
        },
      });

      const formatLabel =
        format === 'a4' ? 'Planche_A4' : format === 'thermal80' ? 'Thermique_80mm' : 'Thermique_58mm';
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `NetPulse_Tickets_${formatLabel}_${ticketsToExport.length}fiches_${dateStr}.pdf`;

      doc.save(filename);

      toast.success(
        `Document PDF généré avec succès (${ticketsToExport.length} fiche${ticketsToExport.length > 1 ? 's' : ''}) !`
      );
      setPdfSuccessMessage(
        `Document PDF généré avec succès (${ticketsToExport.length} fiche${ticketsToExport.length > 1 ? 's' : ''}) !`
      );
      setTimeout(() => {
        setPdfSuccessMessage(null);
        setIsPdfModalOpen(false);
      }, 1800);
    } catch (err) {
      console.error('Erreur lors de la génération PDF:', err);
      toast.error('Une erreur est survenue lors de la génération du document PDF.');
    } finally {
      setIsGeneratingPdf(false);
      setPdfProgress(null);
    }
  };

  const availableCount = tickets.filter((t) => t.status === 'available').length;

  return (
    <div id="tickets-view-container" className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-neutral-950 dark:text-white flex items-center gap-2">
            <Ticket className="h-5 w-5 text-neutral-800 dark:text-neutral-200" />
            <span>Tickets & Fiches Hotspot ({tickets.length})</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Génération cryptographique en masse, planches d&apos;impression avec QR Code et attribution caisse
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2 sm:gap-2.5">
          {/* Export PDF Button */}
          <button
            onClick={() => {
              setPdfScope(selectedIds.length > 0 ? 'selected' : 'filtered');
              setIsPdfModalOpen(true);
            }}
            disabled={filteredTickets.length === 0 && selectedIds.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition disabled:opacity-40"
            title="Exporter les fiches en PDF haute définition"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>
              Exporter PDF
              {selectedIds.length > 0 ? ` (${selectedIds.length})` : ` (${filteredTickets.length})`}
            </span>
          </button>

          {/* Export CSV / Excel Button */}
          <button
            onClick={() => {
              const dataset = selectedIds.length > 0 ? tickets.filter((t) => selectedIds.includes(t.id)) : filteredTickets;
              const csv = exportTicketsToCsv(dataset);
              downloadCsvFile(csv, `NetPulse_Tickets_${new Date().toISOString().slice(0, 10)}.csv`);
              toast.success(`${dataset.length} coupon(s) exporté(s) au format CSV / Excel.`);
            }}
            disabled={filteredTickets.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition disabled:opacity-40 cursor-pointer"
            title="Exporter les fiches en CSV (compatible Excel)"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Exporter CSV</span>
          </button>

          <button
            onClick={() => openPrintEngine(filteredTickets.filter((t) => t.status === 'available'))}
            disabled={filteredTickets.filter((t) => t.status === 'available').length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300 text-xs font-medium transition disabled:opacity-40"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Imprimer le Stock ({filteredTickets.filter((t) => t.status === 'available').length})</span>
          </button>

          <button
            id="btn-open-generate-modal"
            onClick={() => setIsGenModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs font-medium transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nouveau Lot de Fiches</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Rechercher par code ou gérant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
          >
            <option value="all">Tous les statuts</option>
            <option value="available">Disponible en stock</option>
            <option value="active">Vendu & Actif en ligne</option>
            <option value="used">Consommé / Clôturé</option>
            <option value="expired">Expiré</option>
          </select>

          {/* Profile Filter */}
          <select
            value={profileFilter}
            onChange={(e) => setProfileFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
          >
            <option value="all">Tous les profils</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.price} {p.currency})
              </option>
            ))}
          </select>

          {/* Router Filter */}
          <select
            value={routerFilter}
            onChange={(e) => setRouterFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
          >
            <option value="all">Tous les routeurs</option>
            {routers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#141416] shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-900/60 border-b border-neutral-200/80 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-medium uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 pl-4 pr-1 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllFilteredSelected}
                    onChange={handleToggleSelectAll}
                    aria-label="Tout sélectionner"
                    className="rounded border-neutral-300 dark:border-neutral-700 text-black dark:text-white focus:ring-black dark:focus:ring-white h-3.5 w-3.5 cursor-pointer"
                    title="Tout sélectionner / désélectionner"
                  />
                </th>
                <th className="py-3 px-4">Code Coupon (Login)</th>
                <th className="py-3 px-4">Profil & Tarif</th>
                <th className="py-3 px-4">Routeur MikroTik</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4">Vente & Caisse</th>
                <th className="py-3 px-4">Clôture</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-700 dark:text-neutral-300">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-neutral-400 font-medium">
                    Aucun ticket trouvé selon les critères sélectionnés.
                  </td>
                </tr>
              ) : (
                paginatedTickets.map((ticket) => {
                  const isSelected = selectedIds.includes(ticket.id);
                  return (
                    <tr
                      key={ticket.id}
                      className={`hover:bg-neutral-50/70 dark:hover:bg-neutral-900/40 transition ${
                        isSelected ? 'bg-neutral-50/90 dark:bg-neutral-900/60' : ''
                      }`}
                    >
                      {/* Row Selection Checkbox */}
                      <td className="py-3 pl-4 pr-1 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectTicket(ticket.id)}
                          aria-label={`Sélectionner le ticket ${ticket.code}`}
                          className="rounded border-neutral-300 dark:border-neutral-700 text-black dark:text-white focus:ring-black dark:focus:ring-white h-3.5 w-3.5 cursor-pointer"
                        />
                      </td>

                      {/* Code Coupon */}
                      <td className="py-3 px-4 font-mono font-semibold text-neutral-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span>{ticket.code}</span>
                          <button
                            onClick={() => handleCopyCode(ticket.code)}
                            className="text-neutral-400 hover:text-black dark:hover:text-white transition p-0.5 rounded cursor-pointer"
                            title="Copier le code"
                          >
                            {copiedCode === ticket.code ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                        {ticket.password && (
                          <div className="text-[10px] text-neutral-400 font-mono">
                            Pass: {ticket.password}
                          </div>
                        )}
                      </td>

                      {/* Profile & Price */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-neutral-900 dark:text-white">
                          {ticket.profileName}
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          {ticket.price} {ticket.currency || currency} • {ticket.validityDuration}
                        </div>
                      </td>

                      {/* Router */}
                      <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                        {ticket.routerName}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {ticket.status === 'available' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-800 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700">
                            En stock
                          </span>
                        )}
                        {ticket.status === 'active' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-black text-white dark:bg-white dark:text-black">
                            Vendu & Actif
                          </span>
                        )}
                        {ticket.status === 'used' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700">
                            Consommé
                          </span>
                        )}
                        {ticket.status === 'expired' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-neutral-200 text-neutral-500 border border-neutral-300 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700">
                            Expiré
                          </span>
                        )}
                      </td>

                      {/* Sold & Cashier */}
                      <td className="py-3 px-4">
                        {ticket.soldAt ? (
                          <div>
                            <div className="font-medium text-neutral-800 dark:text-neutral-200">
                              {ticket.soldByUserName || 'Gérant Caisse'}
                            </div>
                            <div className="text-[10px] text-neutral-400">
                              {new Date(ticket.soldAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(ticket.soldAt).toLocaleDateString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-neutral-400 italic">Non vendu</span>
                        )}
                      </td>

                      {/* Closure Status */}
                      <td className="py-3 px-4">
                        {ticket.isClosed ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                            Clôturé
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400 border border-neutral-200/60 dark:border-neutral-700">
                            En cours
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {ticket.status === 'available' && (
                            <button
                              onClick={() => handleSellTicket(ticket.id)}
                              className="px-2.5 py-1 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black font-medium text-[11px] transition flex items-center gap-1 cursor-pointer"
                              title="Vendre immédiatement ce ticket"
                            >
                              <ShoppingCart className="h-3 w-3" />
                              <span>Vendre</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleExportPdf([ticket], 'a4', true)}
                            className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                            title="Télécharger le PDF de ce coupon"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => openPrintEngine([ticket])}
                            className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                            title="Imprimer cette fiche"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center flex-wrap gap-2">
            <span>
              Affichage de {filteredTickets.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} à {Math.min(currentPage * pageSize, filteredTickets.length)} sur {filteredTickets.length} coupon(s)
            </span>
            <span className="hidden sm:inline">•</span>
            <div className="flex items-center gap-1.5">
              <span>Lignes :</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-0.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-xs focus:outline-none"
              >
                <option value={20}>20</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-40 transition cursor-pointer text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Précédent</span>
            </button>
            <span className="px-2.5 py-1 font-medium text-neutral-700 dark:text-neutral-300">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-40 transition cursor-pointer text-xs"
            >
              <span>Suivant</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Bulk Action Bar for Selected Tickets */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2 rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-2xl border border-neutral-800 dark:border-neutral-200 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2 pr-1">
            <span className="flex h-2 w-2 rounded-full bg-neutral-400 dark:bg-neutral-600" />
            <span className="text-xs font-semibold whitespace-nowrap">
              {selectedIds.length} fiche{selectedIds.length > 1 ? 's' : ''} sélectionnée{selectedIds.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="h-4 w-px bg-neutral-700 dark:bg-neutral-300" />

          {/* Quick PDF export of selection */}
          <button
            onClick={() => {
              setPdfScope('selected');
              setIsPdfModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 text-xs font-medium transition"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>Exporter PDF</span>
          </button>

          {/* Quick print of selection */}
          <button
            onClick={() => {
              const toPrint = tickets.filter((t) => selectedIds.includes(t.id));
              openPrintEngine(toPrint);
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 text-xs font-medium transition"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Imprimer</span>
          </button>

          <button
            onClick={() => setSelectedIds([])}
            className="text-[11px] text-neutral-400 dark:text-neutral-500 hover:text-white dark:hover:text-black transition pl-1 font-medium"
          >
            Désélectionner
          </button>
        </div>
      )}

      {/* Generator Modal with Throttling CPU Protection */}
      {isGenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#141416] border border-black/[0.08] dark:border-white/[0.1] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
              <div>
                <h3 className="text-base font-semibold text-neutral-950 dark:text-white flex items-center gap-2">
                  <Layers className="h-4 w-4 text-neutral-800 dark:text-neutral-200" />
                  <span>Générateur de Fiches en Masse</span>
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Régulation automatique pour MikroTik RB951Ui (CPU &lt; 15%)
                </p>
              </div>
              <button
                onClick={() => !isGenerating && setIsGenModalOpen(false)}
                disabled={isGenerating}
                className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white text-base leading-none transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStartGeneration} className="space-y-4 text-xs">
              {/* Profile Selection */}
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Profil Hotspot & Tarification *
                </label>
                <select
                  value={genProfileId}
                  onChange={(e) => setGenProfileId(e.target.value)}
                  disabled={isGenerating}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.price.toLocaleString()} {p.currency} ({p.validityDuration} • {p.rateLimit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Router Selection */}
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Routeur MikroTik Cible *
                </label>
                <select
                  value={genRouterId}
                  onChange={(e) => setGenRouterId(e.target.value)}
                  disabled={isGenerating}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                >
                  {routers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.host} • {r.hardware.model.split(' ')[0]})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity Preset Buttons */}
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Quantité de fiches à générer
                </label>
                <div className="flex items-center gap-2 mb-2">
                  {[20, 50, 100, 200, 500].map((count) => (
                    <button
                      key={count}
                      type="button"
                      disabled={isGenerating}
                      onClick={() => setGenCount(count)}
                      className={`flex-1 py-1.5 rounded-xl font-medium border transition ${
                        genCount === count
                          ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-sm'
                          : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={genCount}
                  onChange={(e) => setGenCount(Math.max(1, parseInt(e.target.value) || 1))}
                  disabled={isGenerating}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                />
              </div>

              {/* Prefix */}
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Préfixe personnalisé (Optionnel)
                </label>
                <input
                  type="text"
                  placeholder="ex: NP ou VIP"
                  maxLength={4}
                  value={genPrefix}
                  onChange={(e) => setGenPrefix(e.target.value.toUpperCase())}
                  disabled={isGenerating}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white uppercase font-mono focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  Codes sans caractères ambigus (pas de 0, O, 1, I, L) pour un confort de saisie optimal.
                </p>
              </div>

              {/* Throttling Engine Status Box */}
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 space-y-2">
                <div className="flex items-center justify-between font-medium text-neutral-900 dark:text-neutral-100">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                    <span>Moteur de Throttling MikroTik</span>
                  </span>
                  <span className="text-[11px] font-mono text-neutral-500">
                    20 fiches / 50ms pause
                  </span>
                </div>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-tight">
                  Maintient le CPU du routeur sous le seuil critique lors de l&apos;injection `/ip/hotspot/user/add`.
                </p>

                {/* Progress if generating */}
                {isGenerating && genProgress && (
                  <div className="space-y-1.5 pt-2 border-t border-neutral-200/60 dark:border-neutral-800">
                    <div className="flex items-center justify-between text-[11px] font-medium text-neutral-900 dark:text-neutral-200">
                      <span>Injection: {genProgress.processed} / {genProgress.total} ({genProgress.percent}%)</span>
                      <span className="font-mono text-neutral-600 dark:text-neutral-300">CPU Routeur: {genProgress.currentCpu}%</span>
                    </div>
                    <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-neutral-900 dark:bg-white transition-all duration-150"
                        style={{ width: `${genProgress.percent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
                <button
                  type="button"
                  onClick={() => setIsGenModalOpen(false)}
                  disabled={isGenerating}
                  className="px-3.5 py-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-medium transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-4 py-2 rounded-full bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black font-medium transition flex items-center gap-2 shadow-sm"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Injection en cours...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>Générer {genCount} Fiches</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Engine Modal with QR Code & Multiple Layouts */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-[#141416] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/60 print:hidden">
              <div>
                <h3 className="text-base font-semibold text-neutral-950 dark:text-white flex items-center gap-2">
                  <Printer className="h-4 w-4 text-neutral-800 dark:text-neutral-200" />
                  <span>Impression des Fiches Hotspot ({selectedForPrint.length})</span>
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Planches pré-découpées avec QR Code de connexion automatique
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Format switcher */}
                <div className="flex items-center rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-0.5 text-xs">
                  <button
                    onClick={() => setPrintFormat('a4')}
                    className={`px-3 py-1 rounded-full font-medium transition ${
                      printFormat === 'a4' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    Planche A4
                  </button>
                  <button
                    onClick={() => setPrintFormat('thermal80')}
                    className={`px-3 py-1 rounded-full font-medium transition ${
                      printFormat === 'thermal80' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    80mm
                  </button>
                  <button
                    onClick={() => setPrintFormat('thermal58')}
                    className={`px-3 py-1 rounded-full font-medium transition ${
                      printFormat === 'thermal58' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    58mm
                  </button>
                </div>

                {/* Download PDF button directly in Print Engine */}
                <button
                  onClick={() => handleExportPdf(selectedForPrint, printFormat, true)}
                  disabled={isGeneratingPdf || selectedForPrint.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white text-xs font-medium transition disabled:opacity-50"
                  title="Télécharger les fiches affichées au format PDF"
                >
                  {isGeneratingPdf ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>{pdfProgress ? `${pdfProgress.current}/${pdfProgress.total}` : 'PDF...'}</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="h-3.5 w-3.5" />
                      <span>Télécharger PDF</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleNativePrint}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs font-medium transition"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Imprimer</span>
                </button>

                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white text-base leading-none transition ml-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-neutral-100 dark:bg-neutral-950 print:p-0 print:bg-white">
              {/* A4 Grid Format */}
              {printFormat === 'a4' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2">
                  {selectedForPrint.map((ticket) => {
                    const qrUrl = qrCodeDataUrls[ticket.id];
                    return (
                      <div
                        key={ticket.id}
                        className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-white p-3.5 text-neutral-900 shadow-sm print:shadow-none print:border-black flex flex-col justify-between"
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5 mb-1.5">
                          <div>
                            <span className="font-semibold text-xs tracking-tight text-neutral-950">NETPULSE HOTSPOT</span>
                            <div className="text-[9px] text-neutral-500 font-medium">{ticket.routerName}</div>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-xs text-neutral-900">
                              {ticket.price.toLocaleString()} {ticket.currency}
                            </span>
                            <div className="text-[9px] font-medium text-neutral-600">{ticket.validityDuration}</div>
                          </div>
                        </div>

                        {/* Body: QR Code + Credentials */}
                        <div className="flex items-center gap-3 my-1">
                          {qrUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={qrUrl} alt="QR Code" className="h-16 w-16 shrink-0 border border-neutral-200 p-0.5 rounded" />
                          ) : (
                            <div className="h-16 w-16 bg-neutral-100 flex items-center justify-center shrink-0 rounded">
                              <QrCode className="h-8 w-8 text-neutral-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-[9px] text-neutral-500 uppercase font-medium">Code d&apos;accès</div>
                            <div className="font-mono font-bold text-base text-neutral-950 tracking-wider">
                              {ticket.code}
                            </div>
                            <div className="text-[10px] text-neutral-600 font-mono mt-0.5">
                              Pass: <span className="font-medium">{ticket.password || ticket.code}</span>
                            </div>
                            <div className="text-[9px] text-neutral-500 font-medium truncate">
                              Débit: {ticket.rateLimit}
                            </div>
                          </div>
                        </div>

                        {/* Instructions */}
                        <div className="border-t border-neutral-100 pt-1 text-[8px] text-neutral-500 leading-tight">
                          Connectez-vous au Wi-Fi & scannez le QR code ou entrez le code sur le portail.
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Thermal 80mm / 58mm Format */}
              {(printFormat === 'thermal80' || printFormat === 'thermal58') && (
                <div className={`mx-auto space-y-4 ${printFormat === 'thermal80' ? 'max-w-xs' : 'max-w-[220px]'}`}>
                  {selectedForPrint.map((ticket) => {
                    const qrUrl = qrCodeDataUrls[ticket.id];
                    return (
                      <div
                        key={ticket.id}
                        className="rounded-lg border border-dashed border-neutral-400 bg-white p-3 text-center text-neutral-900 font-mono text-xs shadow-sm print:shadow-none print:border-black space-y-2"
                      >
                        <div className="font-bold text-sm tracking-widest text-neutral-950">
                          NETPULSE HOTSPOT
                        </div>
                        <div className="text-[10px] text-neutral-600">{ticket.routerName}</div>
                        <div className="border-t border-b border-dashed border-neutral-300 py-1.5 my-1">
                          <div className="font-bold text-sm">
                            {ticket.price.toLocaleString()} {ticket.currency}
                          </div>
                          <div className="text-[11px] text-neutral-700">{ticket.validityDuration} • {ticket.rateLimit}</div>
                        </div>

                        {/* QR Code */}
                        <div className="flex justify-center my-2">
                          {qrUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={qrUrl} alt="QR Code" className="h-24 w-24" />
                          ) : (
                            <QrCode className="h-16 w-16 text-neutral-400" />
                          )}
                        </div>

                        <div>
                          <div className="text-[10px] uppercase text-neutral-500 font-medium">Code de Connexion</div>
                          <div className="text-xl font-bold tracking-widest text-neutral-950 my-0.5">
                            {ticket.code}
                          </div>
                          <div className="text-[11px] text-neutral-700">
                            Mot de passe: {ticket.password || ticket.code}
                          </div>
                        </div>

                        <div className="border-t border-dashed border-neutral-300 pt-1 text-[9px] text-neutral-500">
                          Scannez pour vous connecter • Bon surf!
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dedicated PDF Export Modal */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#141416] border border-black/[0.08] dark:border-white/[0.1] p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
              <div>
                <h3 className="text-base font-semibold text-neutral-950 dark:text-white flex items-center gap-2">
                  <FileDown className="h-4 w-4 text-neutral-800 dark:text-neutral-200" />
                  <span>Exportation PDF Haute Définition</span>
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Génération de documents vectoriels avec QR Code pour impression propre
                </p>
              </div>
              <button
                onClick={() => !isGeneratingPdf && setIsPdfModalOpen(false)}
                disabled={isGeneratingPdf}
                className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition text-sm leading-none p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Scope Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                1. Périmètre des Tickets
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={isGeneratingPdf || selectedIds.length === 0}
                  onClick={() => setPdfScope('selected')}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    pdfScope === 'selected'
                      ? 'border-black dark:border-white bg-neutral-50 dark:bg-neutral-900 shadow-sm'
                      : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40'
                  } ${selectedIds.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <div className="text-[11px] font-medium text-neutral-500">Sélection</div>
                  <div className="font-bold text-sm text-neutral-950 dark:text-white mt-1">
                    {selectedIds.length} fiche{selectedIds.length > 1 ? 's' : ''}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Cochées au tableau</div>
                </button>

                <button
                  type="button"
                  disabled={isGeneratingPdf}
                  onClick={() => setPdfScope('filtered')}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    pdfScope === 'filtered'
                      ? 'border-black dark:border-white bg-neutral-50 dark:bg-neutral-900 shadow-sm'
                      : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40'
                  }`}
                >
                  <div className="text-[11px] font-medium text-neutral-500">Vue Filtrée</div>
                  <div className="font-bold text-sm text-neutral-950 dark:text-white mt-1">
                    {filteredTickets.length} fiche{filteredTickets.length > 1 ? 's' : ''}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Critères actifs</div>
                </button>

                <button
                  type="button"
                  disabled={isGeneratingPdf}
                  onClick={() => setPdfScope('available')}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    pdfScope === 'available'
                      ? 'border-black dark:border-white bg-neutral-50 dark:bg-neutral-900 shadow-sm'
                      : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40'
                  }`}
                >
                  <div className="text-[11px] font-medium text-neutral-500">En Stock</div>
                  <div className="font-bold text-sm text-neutral-950 dark:text-white mt-1">
                    {availableCount} fiche{availableCount > 1 ? 's' : ''}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Disponibles vente</div>
                </button>
              </div>
            </div>

            {/* Format Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                2. Format de Sortie & Mise en Page
              </label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  disabled={isGeneratingPdf}
                  onClick={() => setPdfFormat('a4')}
                  className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                    pdfFormat === 'a4'
                      ? 'border-black dark:border-white bg-neutral-50 dark:bg-neutral-900 ring-1 ring-black dark:ring-white'
                      : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-xs text-neutral-950 dark:text-white flex items-center gap-2">
                      <span>Planche A4 (Grille 3×4 — 12 coupons par page)</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                        Recommandé
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Repères de découpe en pointillés (✂) pour distribution propre au comptoir.
                    </p>
                  </div>
                  <div
                    className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                      pdfFormat === 'a4'
                        ? 'border-black dark:border-white bg-black dark:bg-white'
                        : 'border-neutral-300 dark:border-neutral-700'
                    }`}
                  >
                    {pdfFormat === 'a4' && <div className="h-1.5 w-1.5 rounded-full bg-white dark:bg-black" />}
                  </div>
                </button>

                <button
                  type="button"
                  disabled={isGeneratingPdf}
                  onClick={() => setPdfFormat('thermal80')}
                  className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                    pdfFormat === 'thermal80'
                      ? 'border-black dark:border-white bg-neutral-50 dark:bg-neutral-900 ring-1 ring-black dark:ring-white'
                      : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-xs text-neutral-950 dark:text-white">
                      Reçu Thermique 80mm (Rouleau POS Caisse)
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      1 fiche par ticket, format calibré pour imprimantes caisse (Epson, Xprinter, etc.).
                    </p>
                  </div>
                  <div
                    className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                      pdfFormat === 'thermal80'
                        ? 'border-black dark:border-white bg-black dark:bg-white'
                        : 'border-neutral-300 dark:border-neutral-700'
                    }`}
                  >
                    {pdfFormat === 'thermal80' && <div className="h-1.5 w-1.5 rounded-full bg-white dark:bg-black" />}
                  </div>
                </button>

                <button
                  type="button"
                  disabled={isGeneratingPdf}
                  onClick={() => setPdfFormat('thermal58')}
                  className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                    pdfFormat === 'thermal58'
                      ? 'border-black dark:border-white bg-neutral-50 dark:bg-neutral-900 ring-1 ring-black dark:ring-white'
                      : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-xs text-neutral-950 dark:text-white">
                      Reçu Thermique 58mm (Mini-Imprimante Portable)
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Format compact pour terminaux mobiles et imprimantes de poche.
                    </p>
                  </div>
                  <div
                    className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                      pdfFormat === 'thermal58'
                        ? 'border-black dark:border-white bg-black dark:bg-white'
                        : 'border-neutral-300 dark:border-neutral-700'
                    }`}
                  >
                    {pdfFormat === 'thermal58' && <div className="h-1.5 w-1.5 rounded-full bg-white dark:bg-black" />}
                  </div>
                </button>
              </div>
            </div>

            {/* Options Toggle: QR Code */}
            <div className="p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <QrCode className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                <div>
                  <div className="text-xs font-semibold text-neutral-900 dark:text-white">
                    Générer les QR Codes de connexion directe
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Permet aux clients de scanner pour se connecter sans taper le login
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={pdfIncludeQr}
                onChange={(e) => setPdfIncludeQr(e.target.checked)}
                disabled={isGeneratingPdf}
                className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700 text-black dark:text-white focus:ring-black dark:focus:ring-white cursor-pointer"
              />
            </div>

            {/* Progress Bar during generation */}
            {isGeneratingPdf && pdfProgress && (
              <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium text-neutral-800 dark:text-neutral-200">
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="h-3 w-3 animate-spin text-neutral-600 dark:text-neutral-400" />
                    <span>Génération vectorielle et calcul des QR codes...</span>
                  </span>
                  <span className="font-mono">
                    {pdfProgress.current} / {pdfProgress.total}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-black dark:bg-white transition-all duration-150"
                    style={{
                      width: `${Math.round((pdfProgress.current / Math.max(1, pdfProgress.total)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Success Message */}
            {pdfSuccessMessage && (
              <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 text-black dark:text-white shrink-0" />
                <span>{pdfSuccessMessage}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <div className="text-xs text-neutral-500 font-medium">
                Total à exporter:{' '}
                <span className="font-bold text-neutral-950 dark:text-white">
                  {getTargetTicketsForExport().length} fiche{getTargetTicketsForExport().length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPdfModalOpen(false)}
                  disabled={isGeneratingPdf}
                  className="px-3.5 py-1.5 text-xs text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white font-medium transition"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isGeneratingPdf || getTargetTicketsForExport().length === 0}
                  onClick={() =>
                    handleExportPdf(getTargetTicketsForExport(), pdfFormat, pdfIncludeQr)
                  }
                  className="px-4 py-2 rounded-full bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs font-medium transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isGeneratingPdf ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Génération...</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="h-3.5 w-3.5" />
                      <span>Télécharger le PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
