import { NextRequest, NextResponse } from 'next/server';
import {
    getAllClosures,
    getUnclosedStats,
    createClosure,
    type ClosureWithStats,
} from '@/lib/db/queries/closures';
import { getUnclosedSoldTickets, markTicketsClosed } from '@/lib/db/queries/tickets';
import { getRouterById, getAllRouters } from '@/lib/db/queries/routers';
import { MikroTikClient } from '@/lib/mikrotik/client';
import { DailyClosure } from '@/lib/types';
import { db } from '@/lib/db';
import { dailyClosures } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { dispatchNotification } from '@/lib/reports-service';
import { createAuditLog } from '@/lib/db/queries/audit';
import { requireRole, requireSession } from '@/lib/api-auth';

function formatClosure(c: ClosureWithStats): DailyClosure {
  return {
    id: c.id,
    sessionCode: c.sessionCode,
    closedAt: c.closedAt.toISOString(),
    closedByUserId: c.closedByUserId,
    closedByUserName: 'Administrateur',
    routerId: c.routerId || 'all',
    routerName: c.routerName,
    totalRevenue: parseFloat(c.totalRevenue),
    currency: c.currency,
    ticketsSoldCount: c.ticketsSoldCount,
    breakdownByProfile: c.breakdownByProfile,
    mikrotikPurgedCount: c.mikrotikPurgedCount,
    notificationStatus: {
      emailSent: c.emailSent,
      telegramSent: c.telegramSent,
    },
    notes: c.notes ?? undefined,
  };
}

export async function GET(req: NextRequest) {
  try {
    const guard = await requireSession();
    if ('response' in guard) return guard.response;

    const searchParams = req.nextUrl.searchParams;
    const routerFilter = searchParams.get('routerId') || 'all';

    const [unclosedStats, allClosures] = await Promise.all([
      getUnclosedStats(routerFilter),
      getAllClosures(),
    ]);

    const filteredClosures =
      routerFilter === 'all'
        ? allClosures
        : allClosures.filter((c) => !c.routerId || c.routerId === routerFilter);

    return NextResponse.json({
      unclosedStats,
      closures: filteredClosures.map(formatClosure),
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

import { z } from 'zod';

const ClosureCreateSchema = z.object({
  routerId: z.string().optional().default('all'),
  notes: z.string().max(1000).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const guard = await requireRole(['super_admin', 'admin']);
    if ('response' in guard) return guard.response;

    const rawBody = await req.json();
    const parseResult = ClosureCreateSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { routerId, notes } = parseResult.data;

    const userId = guard.session.user.id;

    // 1. Fetch unclosed tickets
    const unclosedTickets = await getUnclosedSoldTickets(routerId);
    if (unclosedTickets.length === 0) {
      return NextResponse.json(
        { error: 'Aucun ticket vendu en attente de clôture pour ce périmètre.' },
        { status: 400 }
      );
    }

    // 2. Compute revenue & breakdown
    let totalRev = 0;
    const breakdownMap = new Map<
      string,
      { profileId: string; profileName: string; count: number; revenue: number }
    >();

    for (const t of unclosedTickets) {
      const price = parseFloat(t.price);
      totalRev += price;
      const cur = breakdownMap.get(t.profileId) || {
        profileId: t.profileId,
        profileName: t.profileName,
        count: 0,
        revenue: 0,
      };
      cur.count += 1;
      cur.revenue += price;
      breakdownMap.set(t.profileId, cur);
    }

    // 3. Resolve Router name
    let routerName = 'Tous les sites consolidés';
    if (routerId !== 'all') {
      const rtr = await getRouterById(routerId);
      if (rtr) routerName = rtr.name;
    }

    // 4. Generate unique session code
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const sessionCode = `CLOT-${dateStr}-${Math.floor(100 + Math.random() * 900)}`;

    // ── Execute real purge on MikroTik RouterOS ──
    let purgedCount = 0;
    try {
      const targetRouters = routerId === 'all'
        ? await getAllRouters()
        : [await getRouterById(routerId)].filter(Boolean);

      for (const r of targetRouters) {
        if (!r) continue;
        const client = new MikroTikClient({
          host: r.host,
          port: r.apiPort,
          user: r.username,
          password: r.passwordEncrypted ?? undefined,
          connectionType: r.connectionType as 'socket' | 'rest',
          timeout: 8,
        });
        const res = await client.purgeExpiredSessions();
        purgedCount += res.purgedCount;
      }
    } catch (purgeErr) {
      console.warn('⚠️ [Closure] Purge MikroTik non bloquante terminée avec avertissement:', purgeErr);
    }

    // 5. Create closure record
    const closure = await createClosure({
      sessionCode,
      closedAt: now,
      closedByUserId: userId,
      routerId: routerId === 'all' ? null : routerId,
      routerName,
      totalRevenue: totalRev.toFixed(2),
      currency: unclosedTickets[0]?.currency || 'FCFA',
      ticketsSoldCount: unclosedTickets.length,
      breakdownJson: Array.from(breakdownMap.values()),
      mikrotikPurgedCount: purgedCount,
      emailSent: false,
      telegramSent: false,
      notes: notes || 'Clôture de caisse validée.',
    });

    // 6. Lock all unclosed tickets
    const ticketIds = unclosedTickets.map((t) => t.id);
    await markTicketsClosed(ticketIds, closure.id);

    // 7. Automated notification dispatch (Telegram, Discord, Email/Resend, Slack)
    let emailSent = false;
    let telegramSent = false;
    try {
      const notifRes = await dispatchNotification({
        reportType: 'closure',
        channel: 'all', // Dispatches to Discord, Telegram, Resend/Email, Slack
        customNotes: notes || `Session ${sessionCode}`,
      });
      if (notifRes.success) {
        emailSent = true;
        telegramSent = true;
        await db
          .update(dailyClosures)
          .set({ emailSent: true, telegramSent: true })
          .where(eq(dailyClosures.id, closure.id));
      }
    } catch (notifErr) {
      console.warn('⚠️ [Closure] Échec de la notification automatique de clôture:', notifErr);
    }

    // 8. Record audit log
    await createAuditLog({
      userId,
      action: 'closure.execute',
      entityType: 'closure',
      entityId: closure.id,
      metadata: {
        sessionCode,
        totalRevenue: totalRev,
        ticketsCount: unclosedTickets.length,
        routerName,
      },
    });

    const formatted = formatClosure({
      ...closure,
      emailSent,
      telegramSent,
      breakdownByProfile: Array.from(breakdownMap.values()),
    });

    return NextResponse.json({
      success: true,
      message: `Clôture de caisse validée avec succès! Session comptable ${sessionCode} verrouillée (${unclosedTickets.length} tickets, ${totalRev.toLocaleString()} FCFA). ${purgedCount} sessions expirées purgées.`,
      closure: formatted,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
