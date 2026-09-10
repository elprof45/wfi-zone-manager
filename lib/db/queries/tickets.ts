// Drizzle queries — Tickets domain

import { eq, and, desc, lt, gt, gte, lte, isNull, inArray, sql, ne } from 'drizzle-orm';
import { db } from '../index';
import {
  hotspotTickets,
  hotspotProfiles,
  routers,
  users,
  type NewHotspotTicket,
  type HotspotTicket,
} from '../schema';
import { nanoid } from '../utils';

export interface TicketWithRelations extends HotspotTicket {
  profileName: string;
  routerName: string;
  soldByUserName?: string;
  validityLabel: string;
  rateLimit: string;
}

export interface TicketPage {
  tickets: TicketWithRelations[];
  total: number;
  hasMore: boolean;
  page: number;
  pageSize: number;
  totalPages: number;
  nextCursor?: string;
}

export async function getTicketsPage(options: {
  page?: number;
  pageSize?: number;
  cursor?: string;
  search?: string;
  status?: string;
  routerId?: string;
  profileId?: string;
  isClosed?: boolean;
  startDate?: string;
  endDate?: string;
}): Promise<TicketPage> {
  const {
    page = 1,
    pageSize = 50,
    cursor,
    search,
    status,
    routerId,
    profileId,
    isClosed,
    startDate,
    endDate,
  } = options;

  const conditions = [];
  if (status && status !== 'all') {
    conditions.push(eq(hotspotTickets.status, status as HotspotTicket['status']));
  }
  if (routerId && routerId !== 'all') {
    conditions.push(eq(hotspotTickets.routerId, routerId));
  }
  if (profileId && profileId !== 'all') {
    conditions.push(eq(hotspotTickets.profileId, profileId));
  }
  if (isClosed !== undefined) {
    conditions.push(eq(hotspotTickets.isClosed, isClosed));
  }
  if (startDate) {
    conditions.push(gte(hotspotTickets.createdAt, new Date(startDate)));
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(hotspotTickets.createdAt, end));
  }
  if (cursor) {
    conditions.push(lt(hotspotTickets.createdAt, new Date(cursor)));
  }
  if (search) {
    conditions.push(
      sql`(${hotspotTickets.code} ILIKE ${'%' + search + '%'} OR ${hotspotProfiles.name} ILIKE ${'%' + search + '%'} OR ${routers.name} ILIKE ${'%' + search + '%'})`
    );
  }

  const offset = (page - 1) * pageSize;

  const [rows, [{ count }]] = await Promise.all([
    db
      .select({
        ticket: hotspotTickets,
        profileName: hotspotProfiles.name,
        validityLabel: hotspotProfiles.validityLabel,
        rateLimit: hotspotProfiles.rateLimit,
        routerName: routers.name,
        soldByUserName: users.name,
      })
      .from(hotspotTickets)
      .leftJoin(hotspotProfiles, eq(hotspotTickets.profileId, hotspotProfiles.id))
      .leftJoin(routers, eq(hotspotTickets.routerId, routers.id))
      .leftJoin(users, eq(hotspotTickets.soldByUserId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(hotspotTickets.createdAt))
      .offset(offset)
      .limit(pageSize),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(hotspotTickets)
      .leftJoin(hotspotProfiles, eq(hotspotTickets.profileId, hotspotProfiles.id))
      .leftJoin(routers, eq(hotspotTickets.routerId, routers.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined),
  ]);

  const totalPages = Math.ceil(count / pageSize) || 1;
  const hasMore = page < totalPages;

  return {
    tickets: rows.map((r) => ({
      ...r.ticket,
      profileName: r.profileName ?? 'Profil supprimé',
      routerName: r.routerName ?? 'Routeur supprimé',
      soldByUserName: r.soldByUserName ?? undefined,
      validityLabel: r.validityLabel ?? '',
      rateLimit: r.rateLimit ?? '',
    })),
    total: count,
    page,
    pageSize,
    totalPages,
    hasMore,
    nextCursor: rows.length > 0 ? rows[rows.length - 1].ticket.createdAt.toISOString() : undefined,
  };
}

export async function getTicketById(id: string): Promise<TicketWithRelations | undefined> {
  const [row] = await db
    .select({
      ticket: hotspotTickets,
      profileName: hotspotProfiles.name,
      validityLabel: hotspotProfiles.validityLabel,
      rateLimit: hotspotProfiles.rateLimit,
      routerName: routers.name,
      soldByUserName: users.name,
    })
    .from(hotspotTickets)
    .leftJoin(hotspotProfiles, eq(hotspotTickets.profileId, hotspotProfiles.id))
    .leftJoin(routers, eq(hotspotTickets.routerId, routers.id))
    .leftJoin(users, eq(hotspotTickets.soldByUserId, users.id))
    .where(eq(hotspotTickets.id, id))
    .limit(1);

  if (!row) return undefined;

  return {
    ...row.ticket,
    profileName: row.profileName ?? 'Profil supprimé',
    routerName: row.routerName ?? 'Routeur supprimé',
    soldByUserName: row.soldByUserName ?? undefined,
    validityLabel: row.validityLabel ?? '',
    rateLimit: row.rateLimit ?? '',
  };
}

export async function createTicketsBatch(
  tickets: Array<{
    profileId: string;
    routerId: string;
    code: string;
    password: string;
    price: string;
    currency: string;
    batchId: string;
  }>
): Promise<HotspotTicket[]> {
  if (tickets.length === 0) return [];

  const values: NewHotspotTicket[] = tickets.map((t) => ({
    id: `tkt_${nanoid()}`,
    code: t.code,
    password: t.password,
    profileId: t.profileId,
    routerId: t.routerId,
    price: t.price,
    currency: t.currency,
    status: 'available',
    batchId: t.batchId,
    isClosed: false,
    createdAt: new Date(),
  }));

  return db.insert(hotspotTickets).values(values).returning();
}

export async function sellTicket(
  ticketId: string,
  soldByUserId: string
): Promise<HotspotTicket | undefined> {
  const [updated] = await db
    .update(hotspotTickets)
    .set({
      status: 'active',
      soldAt: new Date(),
      soldByUserId,
      activatedAt: new Date(),
    })
    .where(and(eq(hotspotTickets.id, ticketId), eq(hotspotTickets.status, 'available')))
    .returning();
  return updated;
}

export async function getUnclosedSoldTickets(routerId?: string): Promise<TicketWithRelations[]> {
  const conditions = [
    inArray(hotspotTickets.status, ['active', 'used', 'expired']),
    eq(hotspotTickets.isClosed, false),
  ];
  if (routerId && routerId !== 'all') conditions.push(eq(hotspotTickets.routerId, routerId));

  const rows = await db
    .select({
      ticket: hotspotTickets,
      profileName: hotspotProfiles.name,
      validityLabel: hotspotProfiles.validityLabel,
      rateLimit: hotspotProfiles.rateLimit,
      routerName: routers.name,
      soldByUserName: users.name,
    })
    .from(hotspotTickets)
    .leftJoin(hotspotProfiles, eq(hotspotTickets.profileId, hotspotProfiles.id))
    .leftJoin(routers, eq(hotspotTickets.routerId, routers.id))
    .leftJoin(users, eq(hotspotTickets.soldByUserId, users.id))
    .where(and(...conditions));

  return rows.map((r) => ({
    ...r.ticket,
    profileName: r.profileName ?? 'Profil supprimé',
    routerName: r.routerName ?? 'Routeur supprimé',
    soldByUserName: r.soldByUserName ?? undefined,
    validityLabel: r.validityLabel ?? '',
    rateLimit: r.rateLimit ?? '',
  }));
}

export async function markTicketsClosed(ticketIds: string[], closureId: string): Promise<void> {
  if (ticketIds.length === 0) return;
  await db
    .update(hotspotTickets)
    .set({ isClosed: true, closureId })
    .where(inArray(hotspotTickets.id, ticketIds));
}

export async function deleteTicket(id: string): Promise<boolean> {
  const result = await db
    .delete(hotspotTickets)
    .where(and(eq(hotspotTickets.id, id), eq(hotspotTickets.status, 'available')))
    .returning({ id: hotspotTickets.id });
  return result.length > 0;
}
