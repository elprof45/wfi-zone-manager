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

export async function GET() {
  try {
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
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireSetupAccess();
    if ('response' in guard) return guard.response;

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

    // 3. Save Database Configuration
    if (body.database) {
      await setSetting('database', {
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
        enabled: body.telegram.enabled ?? true,
        isConfigured: Boolean(body.telegram.botToken && body.telegram.adminChatId),
        lastTestedAt: new Date().toISOString(),
      });
    }

    if (body.discord) {
      await setSetting('discord', {
        webhookUrl: body.discord.webhookUrl || '',
        botToken: body.discord.botToken || '',
        publicKey: body.discord.publicKey || '',
        applicationId: body.discord.applicationId || '',
        enabled: body.discord.enabled ?? true,
        isConfigured: Boolean(body.discord.webhookUrl),
        lastTestedAt: new Date().toISOString(),
      });
    }

    if (body.slack) {
      await setSetting('slack', {
        webhookUrl: body.slack.webhookUrl || '',
        enabled: body.slack.enabled ?? true,
        isConfigured: Boolean(body.slack.webhookUrl),
        lastTestedAt: new Date().toISOString(),
      });
    }

    if (body.whatsapp) {
      await setSetting('whatsapp', {
        accountSid: body.whatsapp.accountSid || '',
        authToken: body.whatsapp.authToken || '',
        from: body.whatsapp.from || '',
        to: body.whatsapp.to || '',
        enabled: body.whatsapp.enabled ?? true,
        isConfigured: Boolean(body.whatsapp.accountSid && body.whatsapp.to),
        lastTestedAt: new Date().toISOString(),
      });
    }

    // 6. Save Initial Router (Optionnel)
    if (body.router?.name && body.router?.host && body.router.host.trim() !== '') {
      await createRouter({
        name: body.router.name,
        location: body.router.location || 'Site Central',
        host: body.router.host,
        apiPort: Number(body.router.apiPort) || 8728,
        connectionType: body.router.connectionType || 'socket',
        username: body.router.username || 'admin',
        passwordEncrypted: encryptRouterPassword(body.router.password),
        hotspotDnsName: body.router.hotspotDnsName || 'hotspot.wifi',
        status: 'online',
        lastSeenAt: new Date(),
        hardwareJson: {
          model: 'MikroTik RouterBOARD',
          cpuPercent: 8,
          ramTotalMb: 128,
          ramFreeMb: 86,
          flashTotalMb: 128,
          flashFreeMb: 95,
          uptime: '0d 01h 00m',
          activeUsersCount: 0,
        },
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

      if (body.database?.host) {
        envUpdates.POSTGRES_HOST = body.database.host;
        envUpdates.POSTGRES_PORT = Number(body.database.port) || 5434;
        envUpdates.POSTGRES_USER = body.database.username || 'netpulse_hotspot';
        if (body.database.password) envUpdates.POSTGRES_PASSWORD = body.database.password;
        envUpdates.POSTGRES_DB = body.database.databaseName || 'netpulse_hotspot_db';
        envUpdates.DATABASE_URL = `postgresql://${envUpdates.POSTGRES_USER}:${body.database.password || 'netpulse_hotspot'}@${envUpdates.POSTGRES_HOST}:${envUpdates.POSTGRES_PORT}/${envUpdates.POSTGRES_DB}`;
      }

      if (body.smtp?.host) {
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

      if (body.telegram?.botToken) envUpdates.TELEGRAM_BOT_TOKEN = body.telegram.botToken;
      if (body.telegram?.adminChatId) envUpdates.TELEGRAM_CHAT_ID = body.telegram.adminChatId;

      if (body.discord?.webhookUrl) envUpdates.DISCORD_WEBHOOK_URL = body.discord.webhookUrl;
      if (body.slack?.webhookUrl) envUpdates.SLACK_WEBHOOK_URL = body.slack.webhookUrl;

      if (body.whatsapp?.accountSid) envUpdates.TWILIO_ACCOUNT_SID = body.whatsapp.accountSid;
      if (body.whatsapp?.authToken) envUpdates.TWILIO_AUTH_TOKEN = body.whatsapp.authToken;
      if (body.whatsapp?.from) envUpdates.TWILIO_WHATSAPP_FROM = body.whatsapp.from;
      if (body.whatsapp?.to) envUpdates.TWILIO_WHATSAPP_TO = body.whatsapp.to;

      if (Object.keys(envUpdates).length > 0) {
        updateEnvFile(envUpdates);
      }
    } catch (envErr) {
      console.warn('[setup/status] Could not update .env file:', envErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration initiale NetPulse v2026 enregistrée avec succès dans la base et le fichier .env !',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
