// lib/notifications/discord.ts
// Discord webhook dispatcher for NetPulse Hotspot Manager
// Uses Discord Incoming Webhooks — no library required, pure fetch

import { getSetting } from '@/lib/db/queries/settings';
import { db } from '@/lib/db';
import { discordLogs } from '@/lib/db/schema';
import { nanoid } from '@/lib/db/utils';

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number; // integer color e.g. 0x5865F2
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
  timestamp?: string; // ISO 8601
}

export interface DiscordMessageOptions {
  content?: string;
  username?: string;
  embeds?: DiscordEmbed[];
  webhookUrl?: string; // override stored webhook
}

export interface DiscordResult {
  success: boolean;
  error?: string;
}

// Discord brand color
export const DISCORD_COLOR = 0x5865f2;
// Accent colors for status
export const DISCORD_COLORS = {
  info: 0x5865f2,    // blurple
  success: 0x57f287, // green
  warning: 0xfee75c, // yellow
  danger: 0xed4245,  // red
  report: 0xeb459e,  // fuchsia
} as const;

export async function sendDiscordMessage(
  options: DiscordMessageOptions
): Promise<DiscordResult> {
  try {
    const discordSettings = await getSetting<any>('discord');
    const webhookUrl = options.webhookUrl || discordSettings?.webhookUrl || process.env.DISCORD_WEBHOOK_URL;

    const logText = options.content || options.embeds?.[0]?.title || 'Discord notification';

    if (!webhookUrl) {
      console.log(`[Discord Mock Delivery] ${logText.slice(0, 80)}`);
      // Still log to DB as mock delivery
      await db.insert(discordLogs).values({
        id: `dc_${nanoid()}`,
        timestamp: new Date(),
        type: 'outgoing_alert',
        text: logText,
        status: 'sent',
      });
      return { success: true };
    }

    const payload: any = {
      username: options.username || discordSettings?.botUsername || 'NetPulse 📡',
      avatar_url: discordSettings?.avatarUrl || undefined,
    };

    if (options.content) payload.content = options.content;
    if (options.embeds?.length) payload.embeds = options.embeds;

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    // Discord returns 204 No Content on success
    const success = res.status === 204 || res.ok;
    const errorText = success ? undefined : await res.text().catch(() => `HTTP ${res.status}`);

    // Log to DB
    await db.insert(discordLogs).values({
      id: `dc_${nanoid()}`,
      timestamp: new Date(),
      type: 'outgoing_alert',
      text: logText,
      channelId: discordSettings?.channelId,
      status: success ? 'delivered' : 'failed',
    });

    if (!success) {
      console.error('[Discord] Send failed:', errorText);
      return { success: false, error: errorText };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[Discord] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Build a rich Discord embed for a sales/closure report
 */
export function buildDiscordReportEmbed(opts: {
  title: string;
  period: string;
  revenue: number;
  tickets: number;
  currency: string;
  comparison?: number;
  routerName?: string;
  color?: number;
}): DiscordEmbed {
  const trend = opts.comparison !== undefined
    ? opts.comparison >= 0
      ? `📈 +${opts.comparison.toFixed(1)}%`
      : `📉 ${opts.comparison.toFixed(1)}%`
    : undefined;

  return {
    title: opts.title,
    color: opts.color ?? DISCORD_COLORS.report,
    fields: [
      { name: '💰 Revenus', value: `**${opts.revenue.toLocaleString()} ${opts.currency}**`, inline: true },
      { name: '🎟️ Tickets vendus', value: `**${opts.tickets}**`, inline: true },
      ...(trend ? [{ name: '📊 vs période précédente', value: trend, inline: true }] : []),
      ...(opts.routerName ? [{ name: '📡 Routeur', value: opts.routerName, inline: true }] : []),
    ],
    footer: { text: `NetPulse Hotspot Manager • ${opts.period}` },
    timestamp: new Date().toISOString(),
  };
}
