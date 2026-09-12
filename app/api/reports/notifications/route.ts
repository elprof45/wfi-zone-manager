import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notificationLogs, telegramLogs } from '@/lib/db/schema';
import { getSetting, setSetting } from '@/lib/db/queries/settings';
import { desc } from 'drizzle-orm';
import { requireRole, requireSession } from '@/lib/api-auth';

export async function GET() {
  try {
    const guard = await requireSession();
    if ('response' in guard) return guard.response;

    const [notifList, telegramList, reportsAutomation, general, notifications] = await Promise.all([
      db.select().from(notificationLogs).orderBy(desc(notificationLogs.timestamp)).limit(50),
      db.select().from(telegramLogs).orderBy(desc(telegramLogs.timestamp)).limit(50),
      getSetting<any>('reportsAutomation'),
      getSetting<any>('general'),
      getSetting<any>('notifications'),
    ]);

    const formattedNotifs = notifList.map((n) => ({
      id: n.id,
      type: n.type,
      channel: n.channel,
      timestamp: n.timestamp.toISOString(),
      recipient: n.recipient,
      status: n.status,
      title: n.title,
      summary: n.summary,
      revenueAmount: n.revenueAmount ? parseFloat(n.revenueAmount) : undefined,
      ticketsCount: n.ticketsCount ?? undefined,
    }));

    const formattedTelegram = telegramList.map((t) => ({
      id: t.id,
      timestamp: t.timestamp.toISOString(),
      type: t.type,
      command: t.command ?? undefined,
      text: t.text,
      status: t.status,
    }));

    return NextResponse.json({
      notificationLogs: formattedNotifs,
      telegramLogs: formattedTelegram,
      reportsAutomation: reportsAutomation || {
        dailyAutoClosureTime: '23:59',
        autoPurgeExpiredSessions: true,
        notifyOnStockUnder: 15,
      },
      notifications: notifications || {
        telegram: true,
        email: true,
        discord: false,
      },
      companyName: general?.appName || 'NetPulse Hotspot',
      currency: general?.currency || 'FCFA',
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const guard = await requireRole(['super_admin', 'admin']);
    if ('response' in guard) return guard.response;

    const body = await req.json();
    if (body.reportsAutomation) {
      const current = (await getSetting<any>('reportsAutomation')) || {};
      const updated = { ...current, ...body.reportsAutomation };
      await setSetting('reportsAutomation', updated);
    }
    if (body.notifications) {
      const currentNotifs = (await getSetting<any>('notifications')) || {};
      const updatedNotifs = { ...currentNotifs, ...body.notifications };
      await setSetting('notifications', updatedNotifs);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
