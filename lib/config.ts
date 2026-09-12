// lib/config.ts
// Unified dynamic configuration resolver:
// Hierarchy: PostgreSQL (system_settings) -> Environment Variables (.env) -> Sensible Defaults

import { getSetting } from '@/lib/db/queries/settings';

export interface DatabaseConfig {
  host: string;
  port: number;
  databaseName: string;
  username: string;
  password?: string;
  isConnected: boolean;
}

export interface GeneralConfig {
  appName: string;
  companyName: string;
  currency: string;
  timezone: string;
  lowStockThreshold: number;
  isSetupCompleted: boolean;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password?: string;
  senderEmail: string;
  senderName: string;
  recipients: string[];
  isConfigured: boolean;
}

export interface TelegramConfig {
  botToken: string;
  adminChatId: string;
  enabled: boolean;
  isConfigured: boolean;
}

export interface DiscordConfig {
  botToken: string;
  channelId: string;
  applicationId?: string;
  enabled: boolean;
  isConfigured: boolean;
}

export interface MikrotikDefaultConfig {
  host: string;
  apiPort: number;
  connectionType: 'socket' | 'rest';
  username: string;
  password?: string;
  hotspotDnsName: string;
}

/**
 * Safely parse a PostgreSQL connection string into connection parameters
 */
export function parseDatabaseUrl(rawUrl?: string): Omit<DatabaseConfig, 'isConnected'> {
  const defaultParsed = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT) || 5434,
    databaseName: process.env.POSTGRES_DB || 'netpulse_hotspot_db',
    username: process.env.POSTGRES_USER || 'netpulse_hotspot',
    password: process.env.POSTGRES_PASSWORD || 'netpulse_hotspot',
  };

  const urlStr = rawUrl || process.env.DATABASE_URL;
  if (!urlStr) return defaultParsed;

  try {
    const parsed = new URL(urlStr);
    return {
      host: parsed.hostname || defaultParsed.host,
      port: parsed.port ? Number(parsed.port) : defaultParsed.port,
      databaseName: parsed.pathname ? parsed.pathname.replace(/^\//, '') : defaultParsed.databaseName,
      username: parsed.username ? decodeURIComponent(parsed.username) : defaultParsed.username,
      password: parsed.password ? decodeURIComponent(parsed.password) : defaultParsed.password,
    };
  } catch {
    return defaultParsed;
  }
}

/**
 * Get dynamic General Application Settings
 */
export async function getGeneralConfig(): Promise<GeneralConfig> {
  const dbSetting = await getSetting<any>('general');
  const isCompleted = (await getSetting<boolean>('isSetupCompleted')) === true;

  const appName = dbSetting?.appName || dbSetting?.businessName || process.env.NEXT_PUBLIC_APP_NAME || 'NetPulse Hotspot Manager';
  const currency = dbSetting?.currency || process.env.DEFAULT_CURRENCY || 'FCFA';
  const timezone = dbSetting?.timezone || process.env.DEFAULT_TIMEZONE || 'Africa/Abidjan';
  const lowStockThreshold = Number(dbSetting?.lowStockThreshold) || Number(process.env.LOW_STOCK_THRESHOLD) || 15;

  return {
    appName,
    companyName: appName,
    currency,
    timezone,
    lowStockThreshold,
    isSetupCompleted: isCompleted,
  };
}

/**
 * Get dynamic Database Configuration
 */
export async function getDbConfig(): Promise<DatabaseConfig> {
  const dbSetting = await getSetting<any>('database');
  const parsed = parseDatabaseUrl();

  return {
    host: dbSetting?.host || parsed.host,
    port: Number(dbSetting?.port) || parsed.port,
    databaseName: dbSetting?.databaseName || parsed.databaseName,
    username: dbSetting?.username || parsed.username,
    password: dbSetting?.password || parsed.password,
    isConnected: dbSetting?.isConnected ?? true,
  };
}

/**
 * Get dynamic SMTP Gateway Configuration
 */
export async function getSmtpConfig(): Promise<SmtpConfig> {
  const dbSetting = await getSetting<any>('smtp');

  const host = dbSetting?.host || process.env.SMTP_HOST || '';
  const port = Number(dbSetting?.port) || Number(process.env.SMTP_PORT) || 587;
  const secure = dbSetting?.secure ?? (Boolean(dbSetting?.useTls) || port === 465 || process.env.SMTP_SECURE === 'true');
  const username = dbSetting?.username || dbSetting?.user || process.env.SMTP_USER || '';
  const password = dbSetting?.password || dbSetting?.pass || process.env.SMTP_PASS || '';
  const senderEmail = dbSetting?.senderEmail || dbSetting?.from || process.env.SMTP_FROM || '';
  const senderName = dbSetting?.senderName || process.env.NEXT_PUBLIC_APP_NAME || 'NetPulse Hotspot';
  
  const recipientsRaw = dbSetting?.recipients || (process.env.NOTIFICATION_EMAILS ? process.env.NOTIFICATION_EMAILS.split(',') : []);
  const recipients = (Array.isArray(recipientsRaw) ? recipientsRaw : [recipientsRaw])
    .map((r: string) => r.trim())
    .filter(Boolean);

  const isConfigured = Boolean(host && senderEmail);

  return {
    host,
    port,
    secure,
    username,
    password,
    senderEmail,
    senderName,
    recipients,
    isConfigured,
  };
}

/**
 * Get dynamic Telegram Bot Configuration
 */
export async function getTelegramConfig(): Promise<TelegramConfig> {
  const dbSetting = await getSetting<any>('telegram');

  const botToken = dbSetting?.botToken || process.env.TELEGRAM_BOT_TOKEN || '';
  const adminChatId = dbSetting?.adminChatId || dbSetting?.chatId || process.env.TELEGRAM_CHAT_ID || '';
  const enabled = dbSetting?.enabled ?? true;
  const isConfigured = Boolean(botToken && adminChatId);

  return {
    botToken,
    adminChatId,
    enabled,
    isConfigured,
  };
}

/**
 * Get dynamic Discord Configuration
 */
export async function getDiscordConfig(): Promise<DiscordConfig> {
  const dbSetting = await getSetting<any>('discord');

  const botToken = dbSetting?.botToken || process.env.DISCORD_BOT_TOKEN || '';
  const channelId = dbSetting?.channelId || process.env.DISCORD_CHANNEL_ID || '';
  const applicationId = dbSetting?.applicationId || process.env.DISCORD_APPLICATION_ID || '';
  const enabled = dbSetting?.enabled ?? true;
  const isConfigured = Boolean(botToken && channelId);

  return {
    botToken,
    channelId,
    applicationId,
    enabled,
    isConfigured,
  };
}

/**
 * Get default MikroTik Router Configuration for Setup
 */
export async function getMikrotikDefaultConfig(): Promise<MikrotikDefaultConfig> {
  return {
    host: process.env.MIKROTIK_HOST || '192.168.88.1',
    apiPort: Number(process.env.MIKROTIK_PORT) || 8728,
    connectionType: (process.env.MIKROTIK_CONNECTION_TYPE as 'socket' | 'rest') || 'socket',
    username: process.env.MIKROTIK_USER || 'admin',
    password: process.env.MIKROTIK_PASSWORD || '',
    hotspotDnsName: process.env.MIKROTIK_DNS_NAME || 'hotspot.wifi',
  };
}

/**
 * Get all combined dynamic configuration for the application
 */
export async function getAppConfig() {
  const [general, database, smtp, telegram, discord, mikrotikDefault] = await Promise.all([
    getGeneralConfig(),
    getDbConfig(),
    getSmtpConfig(),
    getTelegramConfig(),
    getDiscordConfig(),
    getMikrotikDefaultConfig(),
  ]);

  return {
    general,
    database,
    smtp,
    telegram,
    discord,
    mikrotikDefault,
    isSetupCompleted: general.isSetupCompleted,
  };
}
