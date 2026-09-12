// app/api/settings/route.ts
// System settings CRUD — reads/writes from systemSettings table via Drizzle

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAllSettings, getSetting, setSetting, type SettingKey } from '@/lib/db/queries/settings';
import { updateEnvFile } from '@/lib/env-manager';
import { requireRole, requireSession } from '@/lib/api-auth';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const SmtpSettingsSchema = z.object({
  host: z.string().optional().or(z.literal('')),
  port: z.number().int().min(1).max(65535).default(587),
  secure: z.boolean().default(false),
  user: z.string().optional().or(z.literal('')),
  pass: z.string().optional().or(z.literal('')),
  from: z.string().optional().or(z.literal('')),
  senderName: z.string().optional().or(z.literal('')),
  senderEmail: z.string().optional().or(z.literal('')),
  recipients: z.array(z.string()).default([]),
  resendTestRecipient: z.string().email().optional().or(z.literal('')),
  resendApiKey: z.string().optional().or(z.literal('')),
  provider: z.enum(['resend', 'smtp']).default('resend'),
});

const TelegramSettingsSchema = z.object({
  botToken: z.string().min(1),
  chatId: z.string().optional().or(z.literal('')),
  adminChatId: z.string().optional().or(z.literal('')),
  targetType: z.enum(['private', 'group', 'channel']).default('private'),
  enabled: z.boolean().default(true),
}).refine((value) => Boolean(value.chatId || value.adminChatId), {
  message: 'Un Chat ID Telegram est requis',
  path: ['chatId'],
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
  botToken: z.string().optional().or(z.literal('')),
  channelId: z.string().optional(),
  enabled: z.boolean().default(true),
});

const NotificationsSettingsSchema = z.object({
  telegram: z.boolean().default(true),
  email: z.boolean().default(true),
  discord: z.boolean().default(false),
});

const RouterOsConsoleSettingsSchema = z.object({
  config: z.record(z.string(), z.unknown()),
  flags: z.record(z.string(), z.boolean()),
});

const VALID_KEYS = [
  'general',
  'smtp',
  'telegram',
  'reportsAutomation',
  'isSetupCompleted',
  'database',
  'discord',
  'notifications',
  'routerosConsole',
] as const;

function getSchemaForKey(key: SettingKey) {
  switch (key) {
    case 'smtp': return SmtpSettingsSchema;
    case 'telegram': return TelegramSettingsSchema;
    case 'general': return GeneralSettingsSchema;
    case 'reportsAutomation': return ReportsAutomationSchema;
    case 'discord': return DiscordSettingsSchema;
    case 'notifications': return NotificationsSettingsSchema;
    case 'routerosConsole': return RouterOsConsoleSettingsSchema;
    default: return z.unknown();
  }
}

// ─── GET /api/settings ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const guard = await requireSession();
    if ('response' in guard) return guard.response;

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
    const guard = await requireRole(['super_admin', 'admin']);
    if ('response' in guard) return guard.response;

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

    const valueToStore = key === 'routerosConsole'
      ? sanitizeRouterOsConsoleSettings(parsed.data as { config: Record<string, unknown>; flags: Record<string, boolean> })
      : parsed.data;
    await setSetting(key as SettingKey, valueToStore);
    syncSettingToEnv(key as string, parsed.data);

    return NextResponse.json({ success: true, key, value: parsed.data });
  } catch (error) {
    console.error('[settings PUT]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

function sanitizeRouterOsConsoleSettings(value: { config: Record<string, unknown>; flags: Record<string, boolean> }) {
  const {
    password: _password,
    backupPassword: _backupPassword,
    tgToken: _tgToken,
    smtpPassword: _smtpPassword,
    ...safeConfig
  } = value.config;
  return { config: safeConfig, flags: value.flags };
}

function syncSettingToEnv(key: string, data: any) {
  try {
    if (process.env.NODE_ENV === 'production' || process.env.SETUP_ALLOW_ENV_WRITE !== 'true') {
      return;
    }
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
      if (data.chatId || data.adminChatId) envUpdates.TELEGRAM_CHAT_ID = data.chatId || data.adminChatId;
    } else if (key === 'discord') {
      if (data.botToken !== undefined) envUpdates.DISCORD_BOT_TOKEN = data.botToken;
      if (data.channelId !== undefined) envUpdates.DISCORD_CHANNEL_ID = data.channelId;
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
    const guard = await requireRole(['super_admin', 'admin']);
    if ('response' in guard) return guard.response;

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
