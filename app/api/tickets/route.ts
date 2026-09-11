import { NextRequest, NextResponse } from 'next/server';
import {
    getTicketsPage,
    createTicketsBatch,
    sellTicket,
    deleteTicket,
    getTicketById,
    type TicketWithRelations,
} from '@/lib/db/queries/tickets';
import { getProfileById } from '@/lib/db/queries/profiles';
import { getRouterById } from '@/lib/db/queries/routers';
import { MikroTikClient } from '@/lib/mikrotik/client';
import { generateVoucherCode, generateVoucherPassword, throttledBatchProcess } from '@/lib/crypto-generator';
import { HotspotTicket } from '@/lib/types';
import { db } from '@/lib/db';
import { hotspotTickets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createAuditLog } from '@/lib/db/queries/audit';
import { requireRole, requireSession } from '@/lib/api-auth';

function formatTicket(t: TicketWithRelations): HotspotTicket {
  return {
    id: t.id,
    code: t.code,
    password: t.password ?? undefined,
    profileId: t.profileId,
    profileName: t.profileName,
    routerId: t.routerId,
    routerName: t.routerName,
    price: Number(t.price),
    currency: t.currency,
    validityDuration: t.validityLabel,
    rateLimit: t.rateLimit,
    status: t.status as HotspotTicket['status'],
    createdAt: t.createdAt.toISOString(),
    soldAt: t.soldAt ? t.soldAt.toISOString() : undefined,
    soldByUserId: t.soldByUserId ?? undefined,
    soldByUserName: t.soldByUserName ?? undefined,
    activatedAt: t.activatedAt ? t.activatedAt.toISOString() : undefined,
    expiresAt: t.expiresAt ? t.expiresAt.toISOString() : undefined,
    isClosed: t.isClosed,
    closureId: t.closureId ?? undefined,
  };
}

export async function GET(req: NextRequest) {
  try {
    const guard = await requireSession();
    if ('response' in guard) return guard.response;

    const searchParams = req.nextUrl.searchParams;

    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const profileId = searchParams.get('profileId') || undefined;
    const routerId = searchParams.get('routerId') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const isClosedParam = searchParams.get('isClosed');
    const isClosed = isClosedParam === 'true' ? true : isClosedParam === 'false' ? false : undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    const result = await getTicketsPage({
      page,
      pageSize,
      search,
      status,
      profileId,
      routerId,
      isClosed,
      startDate,
      endDate,
    });

    return NextResponse.json({
      tickets: result.tickets.map(formatTicket),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
      hasMore: result.hasMore,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

import { z } from 'zod';

const TicketGenerateSchema = z.object({
  profileId: z.string().min(1, 'Le profil est obligatoire'),
  routerId: z.string().min(1, 'Le routeur est obligatoire'),
  count: z.coerce.number().int().min(1).max(1000).optional().default(20),
  prefix: z.string().max(10).optional().default(''),
  markAsSoldImmediately: z.boolean().optional().default(false),
});

const TicketActionSchema = z.object({
  id: z.string().min(1, 'Identifiant du ticket obligatoire'),
  action: z.enum(['sell', 'expire']),
});

export async function POST(req: NextRequest) {
  try {
    const guard = await requireRole(['super_admin', 'admin']);
    if ('response' in guard) return guard.response;

    const rawBody = await req.json();
    const parseResult = TicketGenerateSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { profileId, routerId, count, prefix, markAsSoldImmediately } = parseResult.data;

    const profile = await getProfileById(profileId);
    if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });

    const router = await getRouterById(routerId);
    if (!router) return NextResponse.json({ error: 'Routeur introuvable' }, { status: 404 });

    const numTickets = count;
    const batchId = `batch_${Date.now()}`;
    const ticketsToCreate: Array<{
      profileId: string;
      routerId: string;
      code: string;
      password: string;
      price: string;
      currency: string;
      batchId: string;
    }> = [];

    const rawItems = Array.from({ length: numTickets }, (_, i) => i + 1);

    await throttledBatchProcess(
      rawItems,
      20,
      50,
      (processed, total, cpuEstimate) => {
        // Simulated throttled progress
      },
      () => {
        const code = generateVoucherCode(6, prefix);
        ticketsToCreate.push({
          profileId: profile.id,
          routerId: router.id,
          code,
          password: generateVoucherPassword(4),
          price: profile.price,
          currency: profile.currency,
          batchId,
        });
      }
    );

    // Persist tickets to PostgreSQL via helper (handles id generation)
    const createdRows = await createTicketsBatch(ticketsToCreate);

    // ── Inject tickets into physical MikroTik RouterOS ──
    let injectedCount = 0;
    let injectionError: string | undefined;
    try {
      const client = new MikroTikClient({
        host: router.host,
        port: router.apiPort,
        user: router.username,
        password: router.passwordEncrypted ?? undefined,
        connectionType: router.connectionType as 'socket' | 'rest',
        timeout: 10,
      });

      const ticketsForRos = ticketsToCreate.map((t) => ({
        code: t.code,
        password: t.password,
        profileName: profile.name,
        comment: `np-${batchId}`,
      }));

      const res = await client.injectHotspotTickets(ticketsForRos);
      injectedCount = res.injectedCount;
    } catch (rosErr: any) {
      console.warn('⚠️ [MikroTik Injection Warning]:', rosErr.message);
      injectionError = rosErr.message;
    }

    // If mark as sold immediately
    if (markAsSoldImmediately) {
      const soldBy = guard.session.user.id;
      for (const t of createdRows) {
        await db
          .update(hotspotTickets)
          .set({
            status: 'active',
            soldAt: new Date(),
            soldByUserId: soldBy,
            activatedAt: new Date(),
            expiresAt: new Date(Date.now() + profile.validityMinutes * 60000),
          })
          .where(eq(hotspotTickets.id, t.id));
      }
    }

    // Audit log
    await createAuditLog({
      userId: guard.session.user.id,
      action: 'ticket.create_batch',
      entityType: 'ticket_batch',
      entityId: batchId,
      metadata: {
        count: createdRows.length,
        injectedToRouter: injectedCount,
        profileId: profile.id,
        profileName: profile.name,
        routerId: router.id,
        routerName: router.name,
        injectionError,
      },
    });

    const createdTickets: HotspotTicket[] = createdRows.map((t) => ({
      id: t.id,
      code: t.code,
      password: t.password ?? undefined,
      profileId: profile.id,
      profileName: profile.name,
      routerId: router.id,
      routerName: router.name,
      price: Number(profile.price),
      currency: profile.currency,
      validityDuration: profile.validityLabel,
      rateLimit: profile.rateLimit,
      status: markAsSoldImmediately ? 'active' : 'available',
      createdAt: t.createdAt.toISOString(),
      soldAt: markAsSoldImmediately ? new Date().toISOString() : undefined,
      activatedAt: markAsSoldImmediately ? new Date().toISOString() : undefined,
      isClosed: false,
    }));

    return NextResponse.json({
      success: true,
      message: `${createdTickets.length} tickets générés (dont ${injectedCount} injectés sur le routeur ${router.name}) !`,
      tickets: createdTickets,
      batchSize: 20,
      batchDelayMs: 50,
      injectedCount,
      injectionError,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const guard = await requireSession();
    if ('response' in guard) return guard.response;

    const rawBody = await req.json();
    const parseResult = TicketActionSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { id, action } = parseResult.data;

    const ticket = await getTicketById(id);
    if (!ticket) return NextResponse.json({ error: 'Ticket non trouvé' }, { status: 404 });

    if (ticket.isClosed) {
      return NextResponse.json(
        { error: 'Action interdite : ce ticket est déjà verrouillé dans une clôture de caisse passée.' },
        { status: 403 }
      );
    }

    if (action === 'sell') {
      const userId = guard.session.user.id;
      const updated = await sellTicket(id, userId);

      if (!updated) {
        return NextResponse.json(
          { error: 'Ticket déjà vendu, expiré ou indisponible.' },
          { status: 409 }
        );
      }

      await createAuditLog({
        userId,
        action: 'ticket.sell',
        entityType: 'ticket',
        entityId: id,
        metadata: {
          code: ticket.code,
          price: ticket.price,
          currency: ticket.currency,
          profileName: ticket.profileName,
        },
      });

      return NextResponse.json({ success: true, ticket: updated });
    } else if (action === 'expire') {
      await db
        .update(hotspotTickets)
        .set({ status: 'expired' })
        .where(eq(hotspotTickets.id, id));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const guard = await requireRole(['super_admin', 'admin']);
    if ('response' in guard) return guard.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

    const ticket = await getTicketById(id);
    if (!ticket) return NextResponse.json({ error: 'Ticket non trouvé' }, { status: 404 });

    // Clean up ticket from physical MikroTik RouterOS if router available
    try {
      const router = await getRouterById(ticket.routerId);
      if (router) {
        const client = new MikroTikClient({
          host: router.host,
          port: router.apiPort,
          user: router.username,
          password: router.passwordEncrypted ?? undefined,
          connectionType: router.connectionType as 'socket' | 'rest',
        });
        await client.kickSession(ticket.code); // kick if currently active
        // Remove from /ip/hotspot/user via REST
        const auth = Buffer.from(`${router.username}:${router.passwordEncrypted ?? ''}`).toString('base64');
        const searchRes = await fetch(`http://${router.host}:80/rest/ip/hotspot/user?name=${ticket.code}`, {
          headers: { Authorization: `Basic ${auth}` },
          signal: AbortSignal.timeout(4000),
        });
        if (searchRes.ok) {
          const found = await searchRes.json();
          if (found && found[0]?.['.id']) {
            await fetch(`http://${router.host}:80/rest/ip/hotspot/user/${found[0]['.id']}`, {
              method: 'DELETE',
              headers: { Authorization: `Basic ${auth}` },
              signal: AbortSignal.timeout(4000),
            });
          }
        }
      }
    } catch {}

    const deleted = await deleteTicket(id);
    if (!deleted) return NextResponse.json({ error: 'Ticket non trouvé ou déjà vendu' }, { status: 404 });

    return NextResponse.json({ success: true, message: `Ticket ${ticket.code} supprimé avec succès.` });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
