import { jsPDF } from 'jspdf';
import { SalesReportSummary } from './reports-service';

export function generateSalesReportPdf(summary: SalesReportSummary, companyName: string): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const marginX = 14;

  // Header Background Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Title in Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('NETPULSE HOTSPOT — RAPPORT OFFICIEL DES VENTES', marginX, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`SYSTÈME DE GESTION MIKROTIK • VERSION 2026 • ${companyName.toUpperCase()}`, marginX, 21);

  // Metadata block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`PÉRIODE : ${summary.periodLabel.toUpperCase()}`, marginX, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const nowStr = new Date().toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Document certifié généré le ${nowStr} — Émis par : NetPulse Central Server`, marginX, 44);

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, 48, pageWidth - marginX, 48);

  // 4 KPI Cards in a row
  const cardWidth = (pageWidth - marginX * 2 - 3 * 4) / 4;
  const cardY = 52;
  const cardHeight = 22;

  const kpis = [
    { label: 'CHIFFRE D\'AFFAIRES', value: `${summary.totalRevenue.toLocaleString()} ${summary.currency}` },
    { label: 'TICKETS VENDUS', value: `${summary.ticketsCount} unités` },
    { label: 'PANIER MOYEN', value: `${summary.averageTicketPrice.toLocaleString()} ${summary.currency}` },
    { label: 'PIC D\'ACTIVITÉ', value: summary.peakLabel },
  ];

  kpis.forEach((kpi, idx) => {
    const x = marginX + idx * (cardWidth + 4);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 2, 2, 'D');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 3, cardY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, x + 3, cardY + 15, { maxWidth: cardWidth - 6 });
  });

  // Table 1: Breakdown by Profile
  let currentY = 82;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. VENTILATION DES VENTES PAR PROFIL TARIFAIRE', marginX, currentY);

  currentY += 4;
  doc.setFillColor(241, 245, 249);
  doc.rect(marginX, currentY, pageWidth - marginX * 2, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('PROFIL HOTSPOT', marginX + 3, currentY + 4.8);
  doc.text('TICKETS VENDUS', marginX + 80, currentY + 4.8);
  doc.text('MONTANT TOTAL', marginX + 125, currentY + 4.8);
  doc.text('PART (%)', marginX + 165, currentY + 4.8);

  currentY += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  summary.profileBreakdown.forEach((item, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, currentY, pageWidth - marginX * 2, 6.5, 'F');
    }
    doc.setTextColor(15, 23, 42);
    doc.text(item.profileName, marginX + 3, currentY + 4.5);
    doc.text(`${item.count} tickets`, marginX + 80, currentY + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`${item.revenue.toLocaleString()} ${summary.currency}`, marginX + 125, currentY + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${item.percentage}%`, marginX + 165, currentY + 4.5);
    currentY += 6.5;
  });

  // Total Line Profile
  doc.setDrawColor(15, 23, 42);
  doc.line(marginX, currentY, pageWidth - marginX * 2, currentY);
  currentY += 1;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('TOTAL CONSOLIDÉ', marginX + 3, currentY + 4.5);
  doc.text(`${summary.ticketsCount} tickets`, marginX + 80, currentY + 4.5);
  doc.text(`${summary.totalRevenue.toLocaleString()} ${summary.currency}`, marginX + 125, currentY + 4.5);
  doc.text('100%', marginX + 165, currentY + 4.5);

  currentY += 14;

  // Table 2: Breakdown by Router
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. RÉPARTITION GÉOGRAPHIQUE PAR ROUTEUR MIKROTIK', marginX, currentY);

  currentY += 4;
  doc.setFillColor(241, 245, 249);
  doc.rect(marginX, currentY, pageWidth - marginX * 2, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('ROUTEUR / BORNE', marginX + 3, currentY + 4.8);
  doc.text('TICKETS', marginX + 80, currentY + 4.8);
  doc.text('REVENU SCELLÉ', marginX + 125, currentY + 4.8);
  doc.text('PART', marginX + 165, currentY + 4.8);

  currentY += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  summary.routerBreakdown.forEach((rtr, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, currentY, pageWidth - marginX * 2, 6.5, 'F');
    }
    doc.setTextColor(15, 23, 42);
    doc.text(rtr.routerName, marginX + 3, currentY + 4.5);
    doc.text(`${rtr.count} tickets`, marginX + 80, currentY + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`${rtr.revenue.toLocaleString()} ${summary.currency}`, marginX + 125, currentY + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${rtr.percentage}%`, marginX + 165, currentY + 4.5);
    currentY += 6.5;
  });

  // Footer Certification Block
  const footerY = 245;
  doc.setDrawColor(203, 213, 225);
  doc.line(marginX, footerY, pageWidth - marginX, footerY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('CERTIFICAT DE CONFORMITÉ COMPTABLE & TECHNIQUE', marginX, footerY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Ce rapport de vente est généré par le moteur cryptographique NetPulse 2026. Toutes les transactions correspondent à des fiches Hotspot injectées dans les routeurs MikroTik et vérifiées dans le registre immuable.',
    marginX,
    footerY + 11,
    { maxWidth: pageWidth - marginX * 2 }
  );

  // Signatures
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('VISA DU CAISSIER / GÉRANT', marginX, footerY + 24);
  doc.text('DIRECTION / AUDIT COMPTABLE', marginX + 105, footerY + 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('[ Signature & Date ]', marginX, footerY + 34);
  doc.text('[ Cachet certifié NetPulse ]', marginX + 105, footerY + 34);

  return doc;
}
