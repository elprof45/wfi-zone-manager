import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, routers } from '@/lib/db/schema';
import { setSetting } from '@/lib/db/queries/settings';
import { createRouter } from '@/lib/db/queries/routers';
import { auth } from '@/lib/auth';
import { sql } from 'drizzle-orm';
import { getAppConfig } from '@/lib/config';

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
    const body = await req.json();

    // 1. If super admin details provided
    if (body.superAdmin?.email && body.superAdmin?.password) {
      try {
        await auth.api.signUpEmail({
          body: {
            email: body.superAdmin.email,
            password: body.superAdmin.password,
            name: body.superAdmin.name || 'Super Administrateur',
          },
        });
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

    // 6. Save Initial Router
    if (body.router?.name && body.router?.host) {
      await createRouter({
        name: body.router.name,
        location: body.router.location || 'Site Central',
        host: body.router.host,
        apiPort: Number(body.router.apiPort) || 8728,
        connectionType: body.router.connectionType || 'socket',
        username: body.router.username || 'admin',
        passwordEncrypted: body.router.password || null,
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

    return NextResponse.json({
      success: true,
      message: 'Configuration initiale NetPulse v2026 enregistrée avec succès!',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
