'use client';

import React, { useState } from 'react';
import {
  LockKeyhole,
  CheckCircle2,
  Printer,
  Clock,
  ShieldCheck,
  RefreshCw,
  Eye,
  FileText,
} from 'lucide-react';
import { DailyClosure, MikroTikRouter } from '@/lib/types';
import { generateClosureZReportPdf } from '@/lib/ticket-pdf';

import { toast } from 'sonner';

interface ClosureViewProps {
  unclosedStats: {
    totalRevenue: number;
    ticketsCount: number;
    currency: string;
    breakdown: Array<{ profileId: string; profileName: string; count: number; revenue: number }>;
    lastClosureTime: string | null;
  };
  closures: DailyClosure[];
  routers: MikroTikRouter[];
  onExecuteClosure: (routerId: string, notes?: string) => Promise<any>;
  currency: string;
}

export function ClosureView({
  unclosedStats,
  closures,
  onExecuteClosure,
  currency,
}: ClosureViewProps) {
  const [selectedRouterId] = useState('all');
  const [notes, setNotes] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [lastExecutedResult, setLastExecutedResult] = useState<any>(null);
  const [selectedClosureDetail, setSelectedClosureDetail] = useState<DailyClosure | null>(null);
  const [isPrintingZ, setIsPrintingZ] = useState(false);

  const handlePrintZReport = async (closure: DailyClosure, format: 'thermal80' | 'thermal58' = 'thermal80') => {
    try {
      setIsPrintingZ(true);
      const doc = await generateClosureZReportPdf(closure, format);
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(blobUrl, '_blank');
      if (!printWindow) {
        doc.save(`Rapport-Z-${closure.sessionCode}.pdf`);
      }
      toast.success(`Ticket Z (${format === 'thermal80' ? '80mm' : '58mm'}) généré avec succès !`);
    } catch (err) {
      console.error('Erreur impression Ticket Z', err);
      toast.error('Erreur lors de la génération du Ticket Z');
    } finally {
      setIsPrintingZ(false);
    }
  };

  const handleRunClosure = () => {
    if (unclosedStats.ticketsCount === 0) {
      toast.info('Aucune vente en attente de clôture pour le moment.');
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const confirmExecution = async () => {
    setIsConfirmModalOpen(false);
    setIsExecuting(true);
    try {
      const res = await onExecuteClosure(selectedRouterId, notes);
      setLastExecutedResult(res);
      setNotes('');
      toast.success(res?.message || 'Clôture de caisse validée avec succès !');
    } catch {
      toast.error('Erreur lors de la clôture de caisse');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div id="closure-view-container" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-neutral-950 dark:text-white flex items-center gap-2">
            <LockKeyhole className="h-5 w-5 text-neutral-900 dark:text-neutral-100" />
            <span>Clôture Journalière & Arrêté de Caisse</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Verrouillage immuable des ventes (`isClosed = true`), archivage comptable et purge mémoire MikroTik
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium px-3.5 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/80 dark:border-neutral-700">
          <Clock className="h-3.5 w-3.5 text-neutral-500" />
          <span>Automatisation programmée (23h59)</span>
        </div>
      </div>

      {/* Confirmation Success Banner */}
      {lastExecutedResult && (
        <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-black/[0.08] dark:border-white/[0.1] text-neutral-900 dark:text-neutral-100 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium text-sm">
              <CheckCircle2 className="h-4 w-4 text-neutral-950 dark:text-white" />
              <span>Session Comptable {lastExecutedResult.closure?.sessionCode} Clôturée avec Succès</span>
            </div>
            <button
              onClick={() => setLastExecutedResult(null)}
              className="text-xs text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition"
            >
              Fermer
            </button>
          </div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400 grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-neutral-200/60 dark:border-neutral-800">
            <div>
              Montant scellé : <strong className="text-neutral-950 dark:text-white">{lastExecutedResult.closure?.totalRevenue.toLocaleString()} {currency}</strong>
            </div>
            <div>
              Tickets archivés : <strong className="text-neutral-950 dark:text-white">{lastExecutedResult.closure?.ticketsSoldCount} unités</strong>
            </div>
            <div>
              RAM MikroTik libérée : <strong className="text-neutral-950 dark:text-white">+{((lastExecutedResult.closure?.mikrotikPurgedCount || 0) * 0.4).toFixed(1)} MB</strong> ({lastExecutedResult.closure?.mikrotikPurgedCount} expirés supprimés)
            </div>
          </div>
        </div>
      )}

      {/* Current Unclosed Session Card */}
      <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold tracking-tight text-neutral-950 dark:text-white">
                  Session de Caisse en Cours
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                  Ouverte
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Dernière clôture :{' '}
                {unclosedStats.lastClosureTime
                  ? new Date(unclosedStats.lastClosureTime).toLocaleString()
                  : 'Aucune clôture antérieure'}
              </p>
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-neutral-200 dark:sm:border-neutral-800 sm:pl-6">
            <div className="text-xs font-medium text-neutral-500">Chiffre d&apos;Affaires Non Verrouillé</div>
            <div className="text-3xl font-semibold tracking-tight text-neutral-950 dark:text-white mt-0.5">
              {unclosedStats.totalRevenue.toLocaleString()} <span className="text-sm font-normal text-neutral-500">{currency}</span>
            </div>
            <div className="text-xs text-neutral-500 font-normal mt-0.5">
              {unclosedStats.ticketsCount} tickets vendus en attente
            </div>
          </div>
        </div>

        {/* Breakdown by Profile */}
        <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 p-4 space-y-3">
          <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Ventilation des Ventes par Profil
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {unclosedStats.breakdown.length === 0 ? (
              <div className="col-span-4 text-center py-4 text-xs text-neutral-400">
                Aucune vente en cours. Les transactions de la journée apparaîtront ici.
              </div>
            ) : (
              unclosedStats.breakdown.map((item) => (
                <div
                  key={item.profileId}
                  className="p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-[#18181b] text-xs space-y-1"
                >
                  <div className="font-medium text-neutral-950 dark:text-white truncate">
                    {item.profileName}
                  </div>
                  <div className="flex items-center justify-between text-neutral-500">
                    <span>{item.count} tickets</span>
                    <span className="font-semibold text-neutral-950 dark:text-white">
                      {item.revenue.toLocaleString()} {currency}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Closure Execution Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 pt-2">
          <div className="flex-1">
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Notes comptables de fin de journée (Optionnel)
            </label>
            <input
              type="text"
              placeholder="ex: Caisse conforme, montant vérifié, versement superviseur effectué."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
            />
          </div>

          <button
            onClick={handleRunClosure}
            disabled={isExecuting || unclosedStats.ticketsCount === 0}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 disabled:opacity-40 text-white dark:text-black text-xs font-medium transition shadow-sm self-stretch sm:self-auto whitespace-nowrap"
          >
            {isExecuting ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Verrouillage en cours...</span>
              </>
            ) : (
              <>
                <LockKeyhole className="h-3.5 w-3.5" />
                <span>Clôturer la Caisse & Purger MikroTik</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Historical Closures List */}
      <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 shadow-sm space-y-4">
        <div>
          <h3 className="font-semibold text-neutral-950 dark:text-white text-base tracking-tight">
            Registre des Clôtures Archivées ({closures.length})
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Sessions comptables scellées et immuables
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/75 dark:bg-neutral-900/60 border-b border-neutral-200/80 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-medium">
              <tr>
                <th className="py-3 px-4">Code Session</th>
                <th className="py-3 px-4">Date & Heure</th>
                <th className="py-3 px-4">Chiffre d&apos;Affaires</th>
                <th className="py-3 px-4">Tickets</th>
                <th className="py-3 px-4">Clôturé Par</th>
                <th className="py-3 px-4">Purge MikroTik</th>
                <th className="py-3 px-4">Alertes</th>
                <th className="py-3 px-4 text-right">Reçu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80 text-neutral-700 dark:text-neutral-300">
              {closures.map((closure) => (
                <tr key={closure.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40 transition">
                  <td className="py-3 px-4 font-mono font-medium text-neutral-950 dark:text-white">
                    {closure.sessionCode}
                  </td>
                  <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                    {new Date(closure.closedAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-semibold text-neutral-950 dark:text-white">
                    {closure.totalRevenue.toLocaleString()} {closure.currency}
                  </td>
                  <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                    {closure.ticketsSoldCount} tickets
                  </td>
                  <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                    {closure.closedByUserName}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                      +{((closure.mikrotikPurgedCount || 0) * 0.4).toFixed(1)} MB libérés
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 text-[10px] font-medium">
                      {closure.notificationStatus?.telegramSent && (
                        <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                          Telegram
                        </span>
                      )}
                      {closure.notificationStatus?.emailSent && (
                        <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                          Email
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handlePrintZReport(closure, 'thermal80')}
                        disabled={isPrintingZ}
                        className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition cursor-pointer"
                        title="Imprimer Ticket Z Thermique (80mm)"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setSelectedClosureDetail(closure)}
                        className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg transition cursor-pointer"
                        title="Voir le reçu de clôture"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Closure Receipt Detail Modal */}
      {selectedClosureDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#141416] border border-black/[0.08] dark:border-white/[0.1] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-neutral-900 dark:text-white" />
                <h3 className="text-base font-semibold text-neutral-950 dark:text-white">
                  Reçu Certifié de Clôture
                </h3>
              </div>
              <button
                onClick={() => setSelectedClosureDetail(null)}
                className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white text-base leading-none transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 font-mono space-y-1 text-neutral-600 dark:text-neutral-400">
                <div>SESSION: <span className="text-neutral-950 dark:text-white font-bold">{selectedClosureDetail.sessionCode}</span></div>
                <div>DATE: {new Date(selectedClosureDetail.closedAt).toLocaleString()}</div>
                <div>RESPONSABLE: {selectedClosureDetail.closedByUserName}</div>
                <div>NOTES: {selectedClosureDetail.notes || 'Aucune note'}</div>
              </div>

              <div className="border-t border-b border-neutral-100 dark:border-neutral-800/80 py-2.5 space-y-2">
                <div className="flex items-center justify-between font-semibold text-sm text-neutral-950 dark:text-white">
                  <span>CHIFFRE D&apos;AFFAIRES :</span>
                  <span>{selectedClosureDetail.totalRevenue.toLocaleString()} {selectedClosureDetail.currency}</span>
                </div>
                <div className="flex items-center justify-between text-neutral-500">
                  <span>TICKETS VENDUS :</span>
                  <span>{selectedClosureDetail.ticketsSoldCount} unités</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="font-medium text-neutral-700 dark:text-neutral-300">Détail par Profil :</div>
                {selectedClosureDetail.breakdownByProfile.map((b) => (
                  <div key={b.profileName} className="flex justify-between text-neutral-500">
                    <span>• {b.profileName} ({b.count} tickets)</span>
                    <span className="font-medium text-neutral-950 dark:text-neutral-200">
                      {b.revenue.toLocaleString()} {selectedClosureDetail.currency}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
              <button
                onClick={() => handlePrintZReport(selectedClosureDetail, 'thermal58')}
                disabled={isPrintingZ}
                className="px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 text-xs font-medium flex items-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Ticket Z (58mm)</span>
              </button>
              <button
                onClick={() => handlePrintZReport(selectedClosureDetail, 'thermal80')}
                disabled={isPrintingZ}
                className="px-3.5 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Ticket Z (80mm)</span>
              </button>
              <button
                onClick={() => setSelectedClosureDetail(null)}
                className="px-3.5 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center shrink-0">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-950 dark:text-white text-base">
                  Confirmer la clôture de caisse
                </h3>
                <p className="text-xs text-neutral-500">Action comptable définitive</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Vous vous apprêtez à verrouiller <strong className="text-neutral-950 dark:text-white">{unclosedStats.ticketsCount} tickets</strong> pour un montant de <strong className="text-neutral-950 dark:text-white">{unclosedStats.totalRevenue.toLocaleString()} {currency}</strong>.
              Cette opération est irréversible et purgera également les sessions expirées de la mémoire des routeurs.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmExecution}
                className="px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition shadow-sm cursor-pointer"
              >
                Confirmer le verrouillage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

