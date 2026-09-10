// lib/export-utils.ts
// Utility for exporting data to CSV and Excel-compatible spreadsheet formats

import { HotspotTicket } from './types';
import { SalesReportSummary } from './reports-service';

/**
 * Trigger download of a CSV file in the browser
 */
export function downloadCsvFile(csvContent: string, filename: string) {
  // Prepend UTF-8 BOM so Excel opens accents correctly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convert tickets array to CSV string
 */
export function exportTicketsToCsv(
  tickets: HotspotTicket[],
  delimiter: ';' | ',' = ';'
): string {
  const headers = [
    'Code Ticket',
    'Mot de passe',
    'Profil Hotspot',
    'Prix',
    'Devise',
    'Validité',
    'Routeur / Site',
    'Statut',
    'Vendu par',
    'Date de Vente',
    'Date de Création',
    'Clôturé en Caisse',
  ];

  const rows = tickets.map((t) => [
    `"${t.code}"`,
    `"${t.password || ''}"`,
    `"${t.profileName}"`,
    t.price,
    `"${t.currency}"`,
    `"${t.validityDuration}"`,
    `"${t.routerName}"`,
    `"${t.status}"`,
    `"${t.soldByUserName || 'N/A'}"`,
    `"${t.soldAt ? new Date(t.soldAt).toLocaleString('fr-FR') : ''}"`,
    `"${new Date(t.createdAt).toLocaleString('fr-FR')}"`,
    t.isClosed ? 'OUI' : 'NON',
  ]);

  return [headers.join(delimiter), ...rows.map((r) => r.join(delimiter))].join('\r\n');
}

/**
 * Convert sales report breakdown to CSV string
 */
export function exportSalesReportToCsv(
  summary: SalesReportSummary,
  delimiter: ';' | ',' = ';'
): string {
  const metaRows = [
    `Rapport NetPulse Hotspot${delimiter}Période: ${summary.periodLabel}`,
    `Chiffre d'Affaires Total${delimiter}${summary.totalRevenue} ${summary.currency}`,
    `Volume Tickets Vendus${delimiter}${summary.ticketsCount}`,
    `Panier Moyen${delimiter}${summary.averageTicketPrice} ${summary.currency}`,
    `Revenus en attente d'arrêté${delimiter}${summary.unclosedRevenue} ${summary.currency}`,
    '',
    `VENTILATION PAR PROFIL`,
    ['Profil', 'Quantité', `Montant (${summary.currency})`, 'Part (%)'].join(delimiter),
    ...summary.profileBreakdown.map((p) =>
      [`"${p.profileName}"`, p.count, p.revenue, `${p.percentage}%`].join(delimiter)
    ),
    '',
    `VENTILATION PAR ROUTEUR / SITE`,
    ['Routeur', 'Quantité', `Montant (${summary.currency})`, 'Part (%)'].join(delimiter),
    ...summary.routerBreakdown.map((r) =>
      [`"${r.routerName}"`, r.count, r.revenue, `${r.percentage}%`].join(delimiter)
    ),
  ];

  return metaRows.join('\r\n');
}
