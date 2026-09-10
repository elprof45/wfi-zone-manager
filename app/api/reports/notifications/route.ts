import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notificationLogs, telegramLogs } from '@/lib/db/schema';
import { getSetting, setSetting } from '@/lib/db/queries/settings';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const [notifList, telegramList, reportsAutomation, general] = await Promise.all([
      db.select().from(notificationLogs).orderBy(desc(notificationLogs.timestamp)).limit(50),
      db.select().from(telegramLogs).orderBy(desc(telegramLogs.timestamp)).limit(50),
      getSetting<any>('reportsAutomation'),
      getSetting<any>('general'),
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
      companyName: general?.appName || 'NetPulse Hotspot',
      currency: general?.currency || 'FCFA',
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.reportsAutomation) {
      const current = (await getSetting<any>('reportsAutomation')) || {};
      const updated = { ...current, ...body.reportsAutomation };
      await setSetting('reportsAutomation', updated);
      return NextResponse.json({ success: true, reportsAutomation: updated });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
