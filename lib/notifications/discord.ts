// lib/notifications/discord.ts
// Discord dispatcher using official discord.js WebhookClient & EmbedBuilder

import { WebhookClient, EmbedBuilder } from 'discord.js';
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
  username?: string;
  avatarUrl?: string;
  embeds?: DiscordEmbedData[];
  webhookUrl?: string;
}

export interface DiscordResult {
  success: boolean;
  error?: string;
}

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

    if (!webhookUrl || webhookUrl.trim() === '') {
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

    // Build embeds using discord.js EmbedBuilder
    const builtEmbeds = (options.embeds || []).map((e) => {
      const builder = new EmbedBuilder();
      if (e.title) builder.setTitle(e.title);
      if (e.description) builder.setDescription(e.description);
      if (e.color !== undefined) builder.setColor(e.color);
      if (e.footer) builder.setFooter({ text: e.footer.text });
      if (e.timestamp) builder.setTimestamp(new Date(e.timestamp));
      if (e.fields && e.fields.length > 0) {
        builder.addFields(e.fields.map((f) => ({ name: f.name, value: f.value, inline: f.inline ?? false })));
      }
      return builder;
    });

    // Send via official discord.js WebhookClient
    const webhookClient = new WebhookClient({ url: webhookUrl.trim() });

    await webhookClient.send({
      username: options.username || discordSettings?.botUsername || 'NetPulse Hotspot 📡',
      avatarURL: options.avatarUrl || discordSettings?.avatarUrl || undefined,
      content: options.content || undefined,
      embeds: builtEmbeds.length > 0 ? builtEmbeds : undefined,
    });

    // Log success in DB
    await db.insert(discordLogs).values({
      id: `dc_${nanoid()}`,
      timestamp: new Date(),
      type: 'outgoing_alert',
      text: logText,
      channelId: discordSettings?.channelId,
      status: 'delivered',
    });

    console.log(`📡 [Discord] Notification expédiée via discord.js WebhookClient`);
    return { success: true };
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ [Discord] Erreur WebhookClient discord.js:', errorMsg);

    // Log failure
    try {
      await db.insert(discordLogs).values({
        id: `dc_${nanoid()}`,
        timestamp: new Date(),
        type: 'outgoing_alert',
        text: options.content || options.embeds?.[0]?.title || 'Erreur webhook',
        status: 'failed',
      });
    } catch {
      // ignore db logging error
    }

    return { success: false, error: errorMsg };
  }
}

/**
 * Build rich Discord report embed data
 */
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
      {
        name: '💰 Chiffre d’Affaires',
        value: `**${data.revenue.toLocaleString()} ${data.currency}**`,
        inline: true,
      },
      {
        name: '🎟️ Tickets',
        value: `**${data.tickets}**`,
        inline: true,
      },
      ...(data.comparison !== undefined
        ? [
            {
              name: '📈 vs période préc.',
              value:
                data.comparison >= 0
                  ? `+${data.comparison.toFixed(1)}%`
                  : `${data.comparison.toFixed(1)}%`,
              inline: true,
            },
          ]
        : []),
      ...(data.routerName
        ? [{ name: '📡 Routeur', value: data.routerName, inline: true }]
        : []),
    ],
    footer: { text: 'NetPulse Hotspot Manager' },
    timestamp: new Date().toISOString(),
  };
}
