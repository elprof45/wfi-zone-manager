import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, routers } from '@/lib/db/schema';
import { setSetting } from '@/lib/db/queries/settings';
import { createRouter } from '@/lib/db/queries/routers';
import { auth } from '@/lib/auth';
import { sql, eq } from 'drizzle-orm';
import { getAppConfig } from '@/lib/config';
import { updateEnvFile } from '@/lib/env-manager';
import { encryptRouterPassword } from '@/lib/secret-crypto';
import { requireSetupAccess } from '@/lib/api-auth';
import { getClientKey, rateLimit } from '@/lib/rate-limit';
import { getDbConfig, getGeneralConfig, getMikrotikDefaultConfig } from '@/lib/config';
import { isDatabaseReady } from '@/lib/db';

export async function GET() {
  try {
    const dbConnected = await isDatabaseReady(1500);
    if (!dbConnected) {
      const [general, database, mikrotikDefault] = await Promise.all([
        getGeneralConfig().catch(() => ({
          appName: process.env.NEXT_PUBLIC_APP_NAME || 'NetPulse Hotspot Manager',
          companyName: process.env.NEXT_PUBLIC_APP_NAME || 'NetPulse Hotspot Manager',
          currency: process.env.DEFAULT_CURRENCY || 'FCFA',
          timezone: process.env.DEFAULT_TIMEZONE || 'Africa/Abidjan',
          lowStockThreshold: Number(process.env.LOW_STOCK_THRESHOLD) || 15,
          isSetupCompleted: false,
        })),
        getDbConfig().catch(() => ({
          host: process.env.POSTGRES_HOST || 'localhost',
          port: Number(process.env.POSTGRES_PORT) || 5434,
          databaseName: process.env.POSTGRES_DB || 'netpulse_hotspot_db',
          username: process.env.POSTGRES_USER || 'netpulse_hotspot',
          password: undefined,
          isConnected: false,
        })),
        getMikrotikDefaultConfig(),
      ]);

      return NextResponse.json({
        isSetupCompleted: general.isSetupCompleted,
        config: { general, database, mikrotikDefault, isSetupCompleted: general.isSetupCompleted },
        usersCount: 0,
        routersCount: 0,
        dbConnected: false,
        warning: 'PostgreSQL indisponible. Configuration environnementale chargée.',
      });
    }

    const [appConfig, [{ usersCount }], [{ routersCount }]] = await Promise.all([
      getAppConfig(),
      db.select({ usersCount: sql<number>`count(*)::int` }).from(users),
      db.select({ routersCount: sql<number>`count(*)::int` }).from(routers),
    ]);

    return NextResponse.json({
      isSetupCompleted: appConfig.isSetupCompleted,
      config: appConfig,
      usersCount,
      routersCount,
      dbConnected: true,
    });
  } catch (error) {
    console.error('[setup/status GET]', error);
    return NextResponse.json({
      isSetupCompleted: false,
      config: {
        general: {
          appName: process.env.NEXT_PUBLIC_APP_NAME || 'NetPulse Hotspot Manager',
          companyName: process.env.NEXT_PUBLIC_APP_NAME || 'NetPulse Hotspot Manager',
          currency: process.env.DEFAULT_CURRENCY || 'FCFA',
          timezone: process.env.DEFAULT_TIMEZONE || 'Africa/Abidjan',
          lowStockThreshold: Number(process.env.LOW_STOCK_THRESHOLD) || 15,
          isSetupCompleted: false,
        },
      },
      usersCount: 0,
      routersCount: 0,
      dbConnected: false,
      warning: 'Statut de configuration partiel : PostgreSQL est indisponible.',
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(getClientKey(req, 'setup'), 10, 15 * 60 * 1000);
    if (limited) return limited;

    const guard = await requireSetupAccess();
    if ('response' in guard) return guard.response;

    if (!(await isDatabaseReady(1500))) {
      return NextResponse.json(
        {
          success: false,
          error: 'PostgreSQL est indisponible. Démarrez la base de données et vérifiez DATABASE_URL avant d’enregistrer la configuration.',
          code: 'DATABASE_UNAVAILABLE',
        },
        { status: 503 }
      );
    }

    const body = await req.json();

    // 1. If super admin details provided
    if (body.superAdmin?.email && body.superAdmin?.password) {
      try {
        const adminRes = await auth.api.signUpEmail({
          body: {
            email: body.superAdmin.email.trim().toLowerCase(),
            password: body.superAdmin.password,
            name: body.superAdmin.name || 'Super Administrateur',
          },
        });
        if (adminRes?.user?.id) {
          await db.update(users).set({ role: 'super_admin' }).where(eq(users.id, adminRes.user.id));
        }
      } catch {
        // User may already exist
      }
    }

    // 2. Save General Configuration
    if (body.general) {
      await setSetting('general', {
        appName: body.general.appName || 'NetPulse Hotspot Manager',
        companyName: body.general.appName || 'NetPulse Hotspot Manager',
        currency: body.general.currency || 'FCFA',
        timezone: body.general.timezone || 'Africa/Abidjan',
        lowStockThreshold: Number(body.general.lowStockThreshold) || 15,
        isSetupCompleted: true,
      });
    }

    // 3. Save database metadata without inventing credentials.
    if (body.database) {
      await setSetting('database', {
        provider: body.database.provider || 'self-hosted',
        host: body.database.host || 'localhost',
        port: Number(body.database.port) || 5434,
        databaseName: body.database.databaseName || 'netpulse_hotspot_db',
        username: body.database.username || 'netpulse_hotspot',
        isConnected: true,
        lastTestedAt: new Date().toISOString(),
      });
    }

    // 4. Save SMTP Configuration
    if (body.smtp) {
      await setSetting('smtp', {
        host: body.smtp.host || '',
        port: Number(body.smtp.port) || 587,
        secure: Boolean(body.smtp.secure ?? body.smtp.useTls),
        username: body.smtp.username || '',
        password: body.smtp.password || '',
        senderEmail: body.smtp.senderEmail || '',
        resendTestRecipient: body.smtp.resendTestRecipient || '',
        senderName: body.smtp.senderName || body.general?.appName || 'NetPulse Hotspot',
        recipients: body.smtp.recipients || [],
        isConfigured: Boolean(body.smtp.host && body.smtp.senderEmail),
        lastTestedAt: new Date().toISOString(),
      });
    }

    // 5. Save Multi-Channel Notification Hub
    if (body.telegram) {
      await setSetting('telegram', {
        botToken: body.telegram.botToken || '',
        adminChatId: body.telegram.adminChatId || '',
        targetType: body.telegram.targetType || 'private',
        enabled: body.telegram.enabled ?? true,
        isConfigured: Boolean(body.telegram.botToken && body.telegram.adminChatId),
        lastTestedAt: new Date().toISOString(),
      });
    }

    if (body.discord) {
      await setSetting('discord', {
        botToken: body.discord.botToken || '',
        channelId: body.discord.channelId || '',
        applicationId: body.discord.applicationId || '',
        enabled: body.discord.enabled ?? true,
        isConfigured: Boolean(body.discord.botToken && body.discord.channelId),
        lastTestedAt: new Date().toISOString(),
      });
    }

    // 6. Save one or more optional MikroTik routers.
    const routersToCreate = Array.isArray(body.routers) ? body.routers : [body.router];
    for (const router of routersToCreate) {
      if (!router?.name || !router.host?.trim()) continue;
      await createRouter({
        name: router.name,
        location: router.location || 'Site Central',
        host: router.host,
        apiPort: Number(router.apiPort) || 8728,
        connectionType: router.connectionType || 'socket',
        username: router.username || 'admin',
        passwordEncrypted: encryptRouterPassword(router.password),
        hotspotDnsName: router.hotspotDnsName || 'hotspot.wifi',
        status: 'offline',
        lastSeenAt: null,
        hardwareJson: null,
      });
    }

    // 7. Mark setup completed globally
    await setSetting('isSetupCompleted', true);

    // 8. Synchronize to .env file directly for Docker / system persistence
    try {
      const envUpdates: Record<string, string | number | boolean> = {};

      if (body.general?.appName) envUpdates.NEXT_PUBLIC_APP_NAME = body.general.appName;
      if (body.general?.currency) envUpdates.DEFAULT_CURRENCY = body.general.currency;
      if (body.general?.timezone) envUpdates.DEFAULT_TIMEZONE = body.general.timezone;
      if (body.general?.lowStockThreshold) envUpdates.LOW_STOCK_THRESHOLD = Number(body.general.lowStockThreshold);

      const envWriteAllowed = process.env.NODE_ENV !== 'production' && process.env.SETUP_ALLOW_ENV_WRITE === 'true';
      if (envWriteAllowed && body.database?.connectionUrl) {
        envUpdates.DATABASE_URL = body.database.connectionUrl;
      }

      if (envWriteAllowed && body.database?.host) {
        envUpdates.POSTGRES_HOST = body.database.host;
        envUpdates.POSTGRES_PORT = Number(body.database.port) || 5434;
        envUpdates.POSTGRES_USER = body.database.username || 'netpulse_hotspot';
        if (body.database.password) envUpdates.POSTGRES_PASSWORD = body.database.password;
        envUpdates.POSTGRES_DB = body.database.databaseName || 'netpulse_hotspot_db';
      }

      if (envWriteAllowed && body.smtp?.host) {
        envUpdates.SMTP_HOST = body.smtp.host;
        envUpdates.SMTP_PORT = Number(body.smtp.port) || 587;
        envUpdates.SMTP_SECURE = Boolean(body.smtp.secure ?? body.smtp.useTls);
        envUpdates.SMTP_USER = body.smtp.username || '';
        if (body.smtp.password) envUpdates.SMTP_PASS = body.smtp.password;
        envUpdates.SMTP_FROM = body.smtp.senderEmail || '';
        if (Array.isArray(body.smtp.recipients) && body.smtp.recipients.length > 0) {
          envUpdates.NOTIFICATION_EMAILS = body.smtp.recipients.join(', ');
        }
      }

      if (envWriteAllowed && body.telegram?.botToken) envUpdates.TELEGRAM_BOT_TOKEN = body.telegram.botToken;
      if (envWriteAllowed && body.telegram?.adminChatId) envUpdates.TELEGRAM_CHAT_ID = body.telegram.adminChatId;

      if (envWriteAllowed && body.discord?.botToken) envUpdates.DISCORD_BOT_TOKEN = body.discord.botToken;
      if (envWriteAllowed && body.discord?.channelId) envUpdates.DISCORD_CHANNEL_ID = body.discord.channelId;
      if (envWriteAllowed && body.smtp?.resendApiKey) envUpdates.RESEND_API_KEY = body.smtp.resendApiKey;
      if (envWriteAllowed && body.ai?.apiKey) envUpdates.GEMINI_API_KEY = body.ai.apiKey;

      if (envWriteAllowed && Object.keys(envUpdates).length > 0) {
        updateEnvFile(envUpdates);
      }
    } catch (envErr) {
      console.warn('[setup/status] Could not update .env file:', envErr);
    }

    return NextResponse.json({
      success: true,
      message: process.env.NODE_ENV === 'production'
        ? 'Configuration enregistrée. Les secrets doivent rester fournis par le gestionnaire de secrets de production.'
        : 'Configuration initiale enregistrée. La synchronisation .env est désactivée par défaut.',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
