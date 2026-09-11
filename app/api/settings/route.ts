// app/api/settings/route.ts
// System settings CRUD — reads/writes from systemSettings table via Drizzle

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAllSettings, getSetting, setSetting, type SettingKey } from '@/lib/db/queries/settings';
import { updateEnvFile } from '@/lib/env-manager';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const SmtpSettingsSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(587),
  secure: z.boolean().default(false),
  user: z.string().min(1),
  pass: z.string().min(1),
  from: z.string().email(),
  recipients: z.array(z.string().email()).default([]),
});

const TelegramSettingsSchema = z.object({
  botToken: z.string().min(1),
  chatId: z.string().min(1),
  enabled: z.boolean().default(true),
});

const GeneralSettingsSchema = z.object({
  businessName: z.string().min(1).default('NetPulse Hotspot'),
  currency: z.string().length(3).default('XOF'),
  timezone: z.string().default('Africa/Abidjan'),
  language: z.string().default('fr'),
  lowStockThreshold: z.number().int().min(0).default(10),
});

const ReportsAutomationSchema = z.object({
  enabled: z.boolean().default(true),
  dailyReportEnabled: z.boolean().default(true),
  dailyReportTime: z.string().regex(/^\d{2}:\d{2}$/).default('23:59'),
  weeklyReportEnabled: z.boolean().default(true),
  weeklyReportDay: z.enum(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']).default('sunday'),
  weeklyReportTime: z.string().regex(/^\d{2}:\d{2}$/).default('23:00'),
  monthlyReportEnabled: z.boolean().default(true),
  monthlyReportDay: z.number().int().min(1).max(28).default(1),
  monthlyReportTime: z.string().regex(/^\d{2}:\d{2}$/).default('08:00'),
  closureIncomeAlertEnabled: z.boolean().default(true),
  stockCriticalAlertEnabled: z.boolean().default(true),
  routerHealthAlertEnabled: z.boolean().default(true),
  emailRecipients: z.array(z.string().email()).default([]),
  telegramChatId: z.string().default(''),
});

const DiscordSettingsSchema = z.object({
  webhookUrl: z.string().url().optional().or(z.literal('')),
  botToken: z.string().optional(),
  channelId: z.string().optional(),
  enabled: z.boolean().default(true),
});

const SlackSettingsSchema = z.object({
  webhookUrl: z.string().url().optional().or(z.literal('')),
  channel: z.string().optional(),
  enabled: z.boolean().default(true),
});

const WhatsAppSettingsSchema = z.object({
  accountSid: z.string().optional(),
  authToken: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  enabled: z.boolean().default(true),
});

const NotificationsSettingsSchema = z.object({
  telegram: z.boolean().default(true),
  email: z.boolean().default(true),
  discord: z.boolean().default(false),
  slack: z.boolean().default(false),
  whatsapp: z.boolean().default(false),
});

const VALID_KEYS = [
  'general',
  'smtp',
  'telegram',
  'reportsAutomation',
  'isSetupCompleted',
  'database',
  'discord',
  'slack',
  'whatsapp',
  'notifications',
] as const;

function getSchemaForKey(key: SettingKey) {
  switch (key) {
    case 'smtp': return SmtpSettingsSchema;
    case 'telegram': return TelegramSettingsSchema;
    case 'general': return GeneralSettingsSchema;
    case 'reportsAutomation': return ReportsAutomationSchema;
    case 'discord': return DiscordSettingsSchema;
    case 'slack': return SlackSettingsSchema;
    case 'whatsapp': return WhatsAppSettingsSchema;
    case 'notifications': return NotificationsSettingsSchema;
    default: return z.unknown();
  }
}

// ─── GET /api/settings ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const key = req.nextUrl.searchParams.get('key') as SettingKey | null;

    if (key) {
      if (!VALID_KEYS.includes(key as any)) {
        return NextResponse.json({ error: `Clé invalide: ${key}` }, { status: 400 });
      }
      const value = await getSetting(key);
      return NextResponse.json({ key, value: value ?? null });
    }

    const all = await getAllSettings();
    return NextResponse.json(all);
  } catch (error) {
    console.error('[settings GET]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// ─── PUT /api/settings ────────────────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, value } = body as { key: unknown; value: unknown };

    if (typeof key !== 'string' || !VALID_KEYS.includes(key as any)) {
      return NextResponse.json({ error: 'Clé invalide ou manquante' }, { status: 400 });
    }

    const schema = getSchemaForKey(key as SettingKey);
    const parsed = schema.safeParse(value);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    await setSetting(key as SettingKey, parsed.data);
    syncSettingToEnv(key as string, parsed.data);

    return NextResponse.json({ success: true, key, value: parsed.data });
  } catch (error) {
    console.error('[settings PUT]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

function syncSettingToEnv(key: string, data: any) {
  try {
    const envUpdates: Record<string, string | number | boolean> = {};
    if (key === 'general') {
      if (data.businessName) envUpdates.NEXT_PUBLIC_APP_NAME = data.businessName;
      if (data.currency) envUpdates.DEFAULT_CURRENCY = data.currency;
      if (data.timezone) envUpdates.DEFAULT_TIMEZONE = data.timezone;
      if (data.lowStockThreshold) envUpdates.LOW_STOCK_THRESHOLD = Number(data.lowStockThreshold);
    } else if (key === 'smtp') {
      if (data.host) envUpdates.SMTP_HOST = data.host;
      if (data.port) envUpdates.SMTP_PORT = Number(data.port);
      if (data.secure !== undefined) envUpdates.SMTP_SECURE = Boolean(data.secure);
      if (data.user) envUpdates.SMTP_USER = data.user;
      if (data.pass) envUpdates.SMTP_PASS = data.pass;
      if (data.from) envUpdates.SMTP_FROM = data.from;
      if (Array.isArray(data.recipients)) envUpdates.NOTIFICATION_EMAILS = data.recipients.join(', ');
    } else if (key === 'telegram') {
      if (data.botToken) envUpdates.TELEGRAM_BOT_TOKEN = data.botToken;
      if (data.chatId) envUpdates.TELEGRAM_CHAT_ID = data.chatId;
    } else if (key === 'discord') {
      if (data.webhookUrl !== undefined) envUpdates.DISCORD_WEBHOOK_URL = data.webhookUrl;
      if (data.botToken !== undefined) envUpdates.DISCORD_BOT_TOKEN = data.botToken;
    } else if (key === 'slack') {
      if (data.webhookUrl !== undefined) envUpdates.SLACK_WEBHOOK_URL = data.webhookUrl;
    } else if (key === 'whatsapp') {
      if (data.accountSid !== undefined) envUpdates.TWILIO_ACCOUNT_SID = data.accountSid;
      if (data.authToken !== undefined) envUpdates.TWILIO_AUTH_TOKEN = data.authToken;
      if (data.from !== undefined) envUpdates.TWILIO_WHATSAPP_FROM = data.from;
      if (data.to !== undefined) envUpdates.TWILIO_WHATSAPP_TO = data.to;
    }

    if (Object.keys(envUpdates).length > 0) {
      updateEnvFile(envUpdates);
    }
  } catch (err) {
    console.warn('[settings] syncSettingToEnv error:', err);
  }
}

// ─── POST /api/settings — batch upsert multiple keys ─────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;

    const results: Record<string, 'ok' | string> = {};

    for (const [key, value] of Object.entries(body)) {
      if (!VALID_KEYS.includes(key as any)) {
        results[key] = `clé invalide`;
        continue;
      }
      try {
        const schema = getSchemaForKey(key as SettingKey);
        const parsed = schema.safeParse(value);
        if (!parsed.success) {
          results[key] = `validation échouée`;
          continue;
        }
        await setSetting(key as SettingKey, parsed.data);
        syncSettingToEnv(key, parsed.data);
        results[key] = 'ok';
      } catch (e) {
        results[key] = (e as Error).message;
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('[settings POST]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
