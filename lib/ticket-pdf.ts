import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { HotspotTicket, MikroTikRouter } from '@/lib/types';

export interface GenerateTicketPdfOptions {
  tickets: HotspotTicket[];
  routers: MikroTikRouter[];
  format: 'a4' | 'thermal80' | 'thermal58';
  includeQrCode?: boolean;
  onProgress?: (current: number, total: number) => void;
}

/**
 * Generates an optimized, vector PDF document for hotspot tickets.
 * Supports A4 cut sheets (12 tickets/page) and Thermal POS slips (80mm / 58mm).
 */
export async function generateTicketsPdf({
  tickets,
  routers,
  format,
  includeQrCode = true,
  onProgress,
}: GenerateTicketPdfOptions): Promise<jsPDF> {
  // Pre-generate QR code data URLs
  const routerMap = new Map<string, MikroTikRouter>();
  routers.forEach((r) => routerMap.set(r.id, r));

  const qrMap = new Map<string, string>();
  if (includeQrCode) {
    for (let i = 0; i < tickets.length; i++) {
      const t = tickets[i];
      try {
        const targetRouter = routerMap.get(t.routerId);
        const dns = targetRouter?.hotspotDnsName || 'hotspot.local';
        const loginUrl = `http://${dns}/login?username=${encodeURIComponent(t.code)}&password=${encodeURIComponent(t.password || t.code)}`;
        const qrDataUrl = await QRCode.toDataURL(loginUrl, {
          width: 180,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
        });
        qrMap.set(t.id, qrDataUrl);
      } catch (err) {
        console.error('Failed to generate QR for ticket', t.id, err);
      }
      if (onProgress) {
        onProgress(i + 1, tickets.length);
      }
    }
  }

  if (format === 'thermal80') {
    return generateThermalPdf(tickets, qrMap, 80, 76);
  }

  if (format === 'thermal58') {
    return generateThermalPdf(tickets, qrMap, 58, 68);
  }

  // Default: Planche A4
  return generateA4GridPdf(tickets, qrMap);
}

/**
 * A4 Grid generation: 3 columns x 4 rows = 12 coupons per page.
 */
function generateA4GridPdf(tickets: HotspotTicket[], qrMap: Map<string, string>): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4', // 210 x 297 mm
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 9;
  const marginTop = 12;
  const cols = 3;
  const rows = 4;
  const ticketsPerPage = cols * rows; // 12
  const gapX = 3;
  const gapY = 3.5;

  const cardWidth = (pageWidth - marginX * 2 - gapX * (cols - 1)) / cols; // ~61mm
  const cardHeight = (pageHeight - marginTop - 14 - gapY * (rows - 1)) / rows; // ~64mm

  const totalPages = Math.ceil(tickets.length / ticketsPerPage) || 1;

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    if (pageIdx > 0) {
      doc.addPage('a4', 'portrait');
    }

    // Page header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    doc.text('NETPULSE HOTSPOT — PLANCHE D\'IMPRESSION DES TICKETS', marginX, 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    const dateStr = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    doc.text(`Édité le ${dateStr} — Page ${pageIdx + 1}/${totalPages}`, pageWidth - marginX, 7, {
      align: 'right',
    });

    const pageTickets = tickets.slice(pageIdx * ticketsPerPage, (pageIdx + 1) * ticketsPerPage);

    pageTickets.forEach((ticket, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);

      const x = marginX + col * (cardWidth + gapX);
      const y = marginTop + row * (cardHeight + gapY);

      // Card boundary (dashed cut guide)
      doc.setDrawColor(180, 180, 180);
      doc.setLineDashPattern([1.5, 1.5], 0);
      doc.rect(x, y, cardWidth, cardHeight);

      // Scissor symbol cut mark at top-left
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(160, 160, 160);
      doc.text('✄', x + 1.2, y + 2.8);

      // Ticket Header area
      doc.setFillColor(247, 247, 248);
      doc.setLineDashPattern([], 0);
      doc.rect(x + 0.5, y + 0.5, cardWidth - 1, 9.5, 'F');

      // NetPulse Brand
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(10, 10, 10);
      doc.text('NETPULSE', x + 5, y + 4.2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(100, 100, 100);
      doc.text(ticket.routerName || 'Wi-Fi Hotspot', x + 5, y + 7.8);

      // Price & Validity in top-right
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(10, 10, 10);
      const priceText = `${ticket.price.toLocaleString()} ${ticket.currency}`;
      doc.text(priceText, x + cardWidth - 2.5, y + 4.2, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(80, 80, 80);
      doc.text(ticket.validityDuration || 'Illimité', x + cardWidth - 2.5, y + 7.8, { align: 'right' });

      // Separator line
      doc.setDrawColor(220, 220, 220);
      doc.line(x + 1, y + 10, x + cardWidth - 1, y + 10);

      // QR Code on Left
      const qrSize = 19;
      const qrY = y + 12;
      const qrX = x + 2.5;
      const qrDataUrl = qrMap.get(ticket.id);

      if (qrDataUrl) {
        doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      } else {
        doc.setDrawColor(200, 200, 200);
        doc.rect(qrX, qrY, qrSize, qrSize);
        doc.setFontSize(6);
        doc.setTextColor(150, 150, 150);
        doc.text('QR', qrX + qrSize / 2, qrY + qrSize / 2, { align: 'center' });
      }

      // Credentials on Right
      const credX = x + qrSize + 5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(110, 110, 110);
      doc.text('CODE D\'ACCÈS (LOGIN)', credX, y + 14);

      // Prominent Coupon Code
      doc.setFont('courier', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(0, 0, 0);
      doc.text(ticket.code, credX, y + 19);

      // Password line
      doc.setFont('courier', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(70, 70, 70);
      const passText = `Pass: ${ticket.password || ticket.code}`;
      doc.text(passText, credX, y + 23.5);

      // Rate limit / Profile pill
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(90, 90, 90);
      doc.text(`Débit: ${ticket.rateLimit || 'Par défaut'}`, credX, y + 27.5);
      doc.text(`Profil: ${ticket.profileName}`, credX, y + 31);

      // Divider before footer instructions
      doc.setDrawColor(230, 230, 230);
      doc.line(x + 2, y + cardHeight - 8.5, x + cardWidth - 2, y + cardHeight - 8.5);

      // Instructions footer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.2);
      doc.setTextColor(100, 100, 100);
      doc.text(
        '1. Connectez-vous au Wi-Fi  2. Scannez le QR ou saisissez le code',
        x + cardWidth / 2,
        y + cardHeight - 5,
        { align: 'center', maxWidth: cardWidth - 4 }
      );
      doc.setFontSize(4.8);
      doc.setTextColor(140, 140, 140);
      doc.text('Assistance & support auprès de la caisse • Bon surf !', x + cardWidth / 2, y + cardHeight - 2, {
        align: 'center',
      });
    });

    // Page footer note
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(150, 150, 150);
    doc.text(
      'Découpez les coupons selon les repères en pointillés pour distribution au comptoir.',
      marginX,
      pageHeight - 5
    );
  }

  return doc;
}

/**
 * Thermal POS Slip Generation (80mm or 58mm roll).
 * Generates one individual page per ticket for clean cutter integration.
 */
function generateThermalPdf(
  tickets: HotspotTicket[],
  qrMap: Map<string, string>,
  widthMm: number,
  heightMm: number
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [widthMm, heightMm],
  });

  tickets.forEach((ticket, idx) => {
    if (idx > 0) {
      doc.addPage([widthMm, heightMm], 'portrait');
    }

    const centerX = widthMm / 2;

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('NETPULSE HOTSPOT', centerX, 7, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text(ticket.routerName || 'Borne Wi-Fi', centerX, 11, { align: 'center' });

    // Dotted separator
    doc.setLineDashPattern([1, 1], 0);
    doc.setDrawColor(120, 120, 120);
    doc.line(4, 13, widthMm - 4, 13);

    // Price and Duration block
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    doc.text(`${ticket.price.toLocaleString()} ${ticket.currency}`, centerX, 18, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(70, 70, 70);
    doc.text(`${ticket.validityDuration} • ${ticket.rateLimit || 'Standard'}`, centerX, 22, {
      align: 'center',
    });

    // Dotted separator
    doc.line(4, 24, widthMm - 4, 24);

    // QR Code
    const qrSize = widthMm === 80 ? 25 : 20;
    const qrY = 26;
    const qrX = centerX - qrSize / 2;
    const qrDataUrl = qrMap.get(ticket.id);

    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    }

    // Code
    const afterQrY = qrY + qrSize + 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(90, 90, 90);
    doc.text('CODE DE CONNEXION', centerX, afterQrY, { align: 'center' });

    doc.setFont('courier', 'bold');
    doc.setFontSize(widthMm === 80 ? 13 : 11);
    doc.setTextColor(0, 0, 0);
    doc.text(ticket.code, centerX, afterQrY + 5.5, { align: 'center' });

    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);
    doc.text(`Mot de passe: ${ticket.password || ticket.code}`, centerX, afterQrY + 9.5, { align: 'center' });

    // Dotted line before footer
    doc.line(4, heightMm - 8, widthMm - 4, heightMm - 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(110, 110, 110);
    doc.text('Scannez pour vous connecter • Bon surf !', centerX, heightMm - 4, { align: 'center' });
  });

  return doc;
}
