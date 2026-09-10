// lib/notifications/whatsapp.ts
// WhatsApp notification dispatcher via Twilio WhatsApp API
// Supports both Twilio sandbox (development) and production numbers

import { getSetting } from '@/lib/db/queries/settings';
import { db } from '@/lib/db';
import { whatsappLogs } from '@/lib/db/schema';
import { nanoid } from '@/lib/db/utils';

export interface WhatsAppResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

export interface WhatsAppOptions {
  to?: string;          // recipient e.g. "whatsapp:+2250700000000"
  message: string;
  // Twilio overrides (optional — fallback to system_settings)
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;  // e.g. "whatsapp:+14155238886" (sandbox) or your prod number
}

function normalizeTo(phone: string): string {
  // Ensure format: whatsapp:+XXXXX
  if (phone.startsWith('whatsapp:')) return phone;
  return `whatsapp:${phone.startsWith('+') ? phone : '+' + phone}`;
}

export async function sendWhatsAppMessage(options: WhatsAppOptions): Promise<WhatsAppResult> {
  try {
    const waSettings = await getSetting<any>('whatsapp');

    const accountSid = options.accountSid || waSettings?.accountSid || process.env.TWILIO_ACCOUNT_SID;
    const authToken = options.authToken || waSettings?.authToken || process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = options.fromNumber || waSettings?.fromNumber || process.env.TWILIO_WHATSAPP_FROM;
    const toNumber = options.to || waSettings?.adminPhone || process.env.TWILIO_WHATSAPP_TO;

    const logText = options.message.slice(0, 200);

    if (!accountSid || !authToken || !fromNumber || !toNumber) {
      console.log(`[WhatsApp Mock Delivery] To: ${toNumber}, Message: ${logText}`);
      await db.insert(whatsappLogs).values({
        id: `wa_${nanoid()}`,
        timestamp: new Date(),
        to: toNumber || 'unknown',
        text: logText,
        status: 'sent',
      });
      return { success: true };
    }

    const from = normalizeTo(fromNumber);
    const to = normalizeTo(toNumber);

    // Twilio REST API — no SDK needed
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const body = new URLSearchParams({
      From: from,
      To: to,
      Body: options.message,
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();
    const success = res.ok && data.sid;

    await db.insert(whatsappLogs).values({
      id: `wa_${nanoid()}`,
      timestamp: new Date(),
      to,
      text: logText,
      messageSid: data.sid || null,
      status: success ? 'delivered' : 'failed',
    });

    if (!success) {
      const errorMsg = data.message || data.error_message || `HTTP ${res.status}`;
      console.error('[WhatsApp] Send failed:', errorMsg);
      return { success: false, error: errorMsg };
    }

    return { success: true, messageSid: data.sid };
  } catch (error: any) {
    console.error('[WhatsApp] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Format a WhatsApp report message (plain text with emojis, no markdown)
 */
export function buildWhatsAppReport(opts: {
  title: string;
  period: string;
  revenue: number;
  tickets: number;
  currency: string;
  comparison?: number;
}): string {
  const trend = opts.comparison !== undefined
    ? opts.comparison >= 0
      ? `📈 +${opts.comparison.toFixed(1)}% vs période précédente`
      : `📉 ${opts.comparison.toFixed(1)}% vs période précédente`
    : '';

  return [
    `🛰️ *${opts.title}*`,
    `📅 ${opts.period}`,
    ``,
    `💰 Revenus: ${opts.revenue.toLocaleString()} ${opts.currency}`,
    `🎟️ Tickets vendus: ${opts.tickets}`,
    trend,
    ``,
    `—`,
    `NetPulse Hotspot Manager`,
  ]
    .filter((l) => l !== undefined)
    .join('\n');
}
