// lib/notifications/slack.ts
// Slack Incoming Webhook dispatcher for NetPulse Hotspot Manager
// Uses Slack Block Kit for rich messages — pure fetch, no SDK

import { getSetting } from '@/lib/db/queries/settings';
import { db } from '@/lib/db';
import { slackLogs } from '@/lib/db/schema';
import { nanoid } from '@/lib/db/utils';

export interface SlackBlock {
  type: string;
  [key: string]: any;
}

export interface SlackMessageOptions {
  text: string;           // fallback plain text (required by Slack)
  blocks?: SlackBlock[];  // rich Block Kit blocks
  webhookUrl?: string;    // override stored webhook
  channel?: string;       // override channel (only works with Bot Token, not webhooks)
  username?: string;
  iconEmoji?: string;
}

export interface SlackResult {
  success: boolean;
  error?: string;
}

export async function sendSlackMessage(options: SlackMessageOptions): Promise<SlackResult> {
  try {
    const slackSettings = await getSetting<any>('slack');
    const webhookUrl = options.webhookUrl || slackSettings?.webhookUrl || process.env.SLACK_WEBHOOK_URL;

    const logText = options.text.slice(0, 200);

    if (!webhookUrl) {
      console.log(`[Slack Mock Delivery] ${logText}`);
      await db.insert(slackLogs).values({
        id: `sl_${nanoid()}`,
        timestamp: new Date(),
        type: 'outgoing_alert',
        text: logText,
        channelId: slackSettings?.channelId,
        status: 'sent',
      });
      return { success: true };
    }

    const payload: any = {
      text: options.text,
      username: options.username || slackSettings?.botUsername || 'NetPulse 📡',
      icon_emoji: options.iconEmoji || slackSettings?.iconEmoji || ':satellite:',
    };

    if (options.blocks?.length) payload.blocks = options.blocks;
    if (options.channel) payload.channel = options.channel;

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    // Slack returns "ok" as plain text on success
    const body = await res.text();
    const success = res.ok && body === 'ok';
    const errorText = success ? undefined : body || `HTTP ${res.status}`;

    await db.insert(slackLogs).values({
      id: `sl_${nanoid()}`,
      timestamp: new Date(),
      type: 'outgoing_alert',
      text: logText,
      channelId: slackSettings?.channelId,
      status: success ? 'delivered' : 'failed',
    });

    if (!success) {
      console.error('[Slack] Send failed:', errorText);
      return { success: false, error: errorText };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[Slack] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Build Slack Block Kit blocks for a sales/closure report.
 */
export function buildSlackReportBlocks(opts: {
  title: string;
  period: string;
  revenue: number;
  tickets: number;
  currency: string;
  comparison?: number;
  routerName?: string;
}): SlackBlock[] {
  const trend = opts.comparison !== undefined
    ? opts.comparison >= 0
      ? `📈 *+${opts.comparison.toFixed(1)}%* vs période précédente`
      : `📉 *${opts.comparison.toFixed(1)}%* vs période précédente`
    : '';

  const fields = [
    `*💰 Revenus:*\n${opts.revenue.toLocaleString()} ${opts.currency}`,
    `*🎟️ Tickets vendus:*\n${opts.tickets}`,
  ];

  if (opts.routerName) fields.push(`*📡 Routeur:*\n${opts.routerName}`);

  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: opts.title, emoji: true },
    },
    {
      type: 'section',
      fields: fields.map((f) => ({ type: 'mrkdwn', text: f })),
    },
    ...(trend
      ? [{ type: 'section', text: { type: 'mrkdwn', text: trend } }]
      : []),
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `📅 ${opts.period} • NetPulse Hotspot Manager`,
        },
      ],
    },
    { type: 'divider' },
  ];
}
