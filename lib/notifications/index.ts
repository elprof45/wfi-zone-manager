import { getSetting } from '../db/queries/settings';
import { db } from '../db';
import { telegramLogs } from '../db/schema';
import { nanoid } from '../db/utils';
import { sendDiscordMessage, buildDiscordReportEmbed, DISCORD_COLORS } from './discord';
import { sendEmail } from './email';

// Re-export channel modules for direct use
export { sendDiscordMessage, buildDiscordReportEmbed, DISCORD_COLORS } from './discord';
export { sendEmail, type SendEmailOptions } from './email';

export interface SendTelegramOptions {
  chatId?: string;
  message: string;
  parseMode?: 'Markdown' | 'HTML';
}

/**
 * Send a Telegram notification using Telegram Bot API
 */
export async function sendTelegramMessage(options: SendTelegramOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const telegramConfig = await getSetting<any>('telegram');
    const token = telegramConfig?.botToken;
    const targetChat = options.chatId || telegramConfig?.adminChatId;

    if (!token || !targetChat) {
      console.log(`[Telegram Mock Delivery] Chat: ${targetChat}, Message: ${options.message.slice(0, 80)}...`);
      return { success: true };
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChat,
        text: options.message,
        parse_mode: options.parseMode || 'Markdown',
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return { success: false, error: errJson.description || `HTTP ${res.status}` };
    }

    // Log to telegram_logs in DB
    await db.insert(telegramLogs).values({
      id: `tg_${nanoid()}`,
      timestamp: new Date(),
      type: 'outgoing_alert',
      text: options.message,
      status: 'delivered',
    });

    return { success: true };
  } catch (error: any) {
    console.error('Telegram send error:', error);
    return { success: false, error: error.message };
  }
}

// ─── Unified Multi-Channel Dispatcher ────────────────────────────────────────

export type NotificationChannel = 'telegram' | 'email' | 'discord';

export interface DispatchPayload {
  /** Plain text message for Telegram and Discord */
  text: string;
  /** HTML body for email */
  emailHtml?: string;
  /** Email subject */
  emailSubject?: string;
  /** Optional override recipient email */
  recipientEmail?: string;
  /** Rich data for Discord embeds */
  reportData?: {
    title: string;
    period: string;
    revenue: number;
    tickets: number;
    currency: string;
    comparison?: number;
    routerName?: string;
  };
}

export interface DispatchResult {
  channel: NotificationChannel;
  success: boolean;
  error?: string;
}

/**
 * Dispatch a notification to all configured/enabled channels in parallel.
 * Reads active channels from system_settings key 'notifications'.
 *
 * @param payload  Message content for each channel type
 * @param channels Override which channels to use (default: reads from settings)
 */
export async function dispatchToAllChannels(
  payload: DispatchPayload,
  channels?: NotificationChannel[]
): Promise<DispatchResult[]> {
  // Determine active channels
  let activeChannels = channels;
  if (!activeChannels) {
    const notifSettings = await getSetting<any>('notifications');
    activeChannels = [];
    if (notifSettings?.telegram) activeChannels.push('telegram');
    if (notifSettings?.email) activeChannels.push('email');
    if (notifSettings?.discord) activeChannels.push('discord');
    // Default to telegram + email if nothing is configured
    if (activeChannels.length === 0) activeChannels = ['telegram', 'email'];
  }

  const tasks: Promise<DispatchResult>[] = activeChannels.map(async (channel) => {
    try {
      switch (channel) {
        case 'telegram': {
          const r = await sendTelegramMessage({ message: payload.text });
          return { channel, success: r.success, error: r.error };
        }

        case 'email': {
          const smtpConfig = await getSetting<any>('smtp');
          const recipient =
            payload.recipientEmail ||
            smtpConfig?.reportRecipient ||
            smtpConfig?.senderEmail ||
            smtpConfig?.recipients?.[0];
          if (!recipient) return { channel, success: false, error: 'Email recipient not configured' };
          const r = await sendEmail({
            to: recipient,
            subject: payload.emailSubject || 'NetPulse — Rapport de ventes',
            html: payload.emailHtml || `<pre>${payload.text}</pre>`,
            text: payload.text,
          });
          return { channel, success: r.success, error: r.error };
        }

        case 'discord': {
          const embeds = payload.reportData
            ? [buildDiscordReportEmbed({ ...payload.reportData, color: DISCORD_COLORS.report })]
            : undefined;
          const r = await sendDiscordMessage({ content: embeds ? undefined : payload.text, embeds });
          return { channel, success: r.success, error: r.error };
        }

        default:
          return { channel, success: false, error: 'Unknown channel' };
      }
    } catch (err: any) {
      return { channel, success: false, error: err.message };
    }
  });

  const results = await Promise.allSettled(tasks);
  return results.map((r) =>
    r.status === 'fulfilled'
      ? r.value
      : { channel: 'telegram' as NotificationChannel, success: false, error: String(r.reason) }
  );
}

