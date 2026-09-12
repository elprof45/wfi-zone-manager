// Discord notifications through the official bot REST API.

import { getSetting } from '@/lib/db/queries/settings';
import { db } from '@/lib/db';
import { discordLogs } from '@/lib/db/schema';
import { nanoid } from '@/lib/db/utils';

export interface DiscordEmbedData {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
  timestamp?: string;
}

export interface DiscordMessageOptions {
  content?: string;
  embeds?: DiscordEmbedData[];
  botToken?: string;
  channelId?: string;
}

export interface DiscordResult {
  success: boolean;
  error?: string;
}

export const DISCORD_COLORS = {
  info: 0x5865f2,
  success: 0x57f287,
  warning: 0xfee75c,
  danger: 0xed4245,
  report: 0xeb459e,
} as const;

export async function sendDiscordMessage(options: DiscordMessageOptions): Promise<DiscordResult> {
  try {
    const settings = await getSetting<any>('discord');
    const botToken = options.botToken || settings?.botToken || process.env.DISCORD_BOT_TOKEN;
    const channelId = options.channelId || settings?.channelId || process.env.DISCORD_CHANNEL_ID;
    const logText = options.content || options.embeds?.[0]?.title || 'Discord notification';

    if (!botToken || !channelId) {
      console.log(`[Discord Mock Delivery] ${logText.slice(0, 80)}`);
      await db.insert(discordLogs).values({
        id: `dc_${nanoid()}`,
        timestamp: new Date(),
        type: 'outgoing_alert',
        text: logText,
        status: 'sent',
      });
      return { success: true };
    }

    const response = await fetch(
      `https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: options.content || undefined,
          embeds: options.embeds?.length ? options.embeds : undefined,
        }),
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw new Error(`Discord HTTP ${response.status}${details ? `: ${details}` : ''}`);
    }

    await db.insert(discordLogs).values({
      id: `dc_${nanoid()}`,
      timestamp: new Date(),
      type: 'outgoing_alert',
      text: logText,
      channelId,
      status: 'delivered',
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Discord] HTTP API error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

export function buildDiscordReportEmbed(data: {
  title: string;
  period: string;
  revenue: number;
  tickets: number;
  currency: string;
  comparison?: number;
  routerName?: string;
  color?: number;
}): DiscordEmbedData {
  return {
    title: `📊 ${data.title}`,
    color: data.color || DISCORD_COLORS.report,
    fields: [
      { name: '💰 Chiffre d’Affaires', value: `**${data.revenue.toLocaleString()} ${data.currency}**`, inline: true },
      { name: '🎟️ Tickets', value: `**${data.tickets}**`, inline: true },
      ...(data.comparison !== undefined
        ? [{ name: '📈 vs période préc.', value: `${data.comparison >= 0 ? '+' : ''}${data.comparison.toFixed(1)}%`, inline: true }]
        : []),
      ...(data.routerName ? [{ name: '📡 Routeur', value: data.routerName, inline: true }] : []),
    ],
    footer: { text: 'NetPulse Hotspot Manager' },
    timestamp: new Date().toISOString(),
  };
}
