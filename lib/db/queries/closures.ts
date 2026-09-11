// Drizzle queries — Closures domain

import { eq, desc, and, sql, inArray } from 'drizzle-orm';
import { db } from '../index';
import {
    dailyClosures,
    hotspotTickets,
    hotspotProfiles,
    type NewDailyClosure,
    type DailyClosure,
    type ClosureBreakdown,
} from '../schema';
import { nanoid } from '../utils';

export interface ClosureWithStats extends DailyClosure {
  breakdownByProfile: ClosureBreakdown[];
}

export async function getAllClosures(): Promise<ClosureWithStats[]> {
  const closures = await db
    .select()
    .from(dailyClosures)
    .orderBy(desc(dailyClosures.closedAt));

  return closures.map((c) => ({
    ...c,
    breakdownByProfile: (c.breakdownJson as ClosureBreakdown[]) ?? [],
  }));
}

export async function getClosureById(id: string): Promise<ClosureWithStats | undefined> {
  const [closure] = await db
    .select()
    .from(dailyClosures)
    .where(eq(dailyClosures.id, id))
    .limit(1);

  if (!closure) return undefined;
  return { ...closure, breakdownByProfile: (closure.breakdownJson as ClosureBreakdown[]) ?? [] };
}

export async function getUnclosedStats(routerId?: string): Promise<{
  totalRevenue: number;
  ticketsCount: number;
  currency: string;
  breakdown: ClosureBreakdown[];
  lastClosureTime: string | null;
}> {
  const conditions = [
    sql`${hotspotTickets.status} IN ('active', 'used', 'expired')`,
    eq(hotspotTickets.isClosed, false),
  ];
  if (routerId && routerId !== 'all') {
    conditions.push(eq(hotspotTickets.routerId, routerId));
  }

  const [unclosedRows, [lastClosure]] = await Promise.all([
    db
      .select({
        profileId: hotspotTickets.profileId,
        profileName: hotspotProfiles.name,
        price: hotspotTickets.price,
        currency: hotspotTickets.currency,
      })
      .from(hotspotTickets)
      .leftJoin(hotspotProfiles, eq(hotspotTickets.profileId, hotspotProfiles.id))
      .where(and(...conditions)),
    db
      .select({ closedAt: dailyClosures.closedAt })
      .from(dailyClosures)
      .orderBy(desc(dailyClosures.closedAt))
      .limit(1),
  ]);

  let totalRevenue = 0;
  const breakdownMap = new Map<string, ClosureBreakdown>();

  for (const row of unclosedRows) {
    const p = parseFloat(row.price);
    totalRevenue += p;
    const existing = breakdownMap.get(row.profileId) || {
      profileId: row.profileId,
      profileName: row.profileName ?? 'Inconnu',
      count: 0,
      revenue: 0,
    };
    existing.count += 1;
    existing.revenue += p;
    breakdownMap.set(row.profileId, existing);
  }

  return {
    totalRevenue,
    ticketsCount: unclosedRows.length,
    currency: unclosedRows[0]?.currency ?? 'FCFA',
    breakdown: Array.from(breakdownMap.values()),
    lastClosureTime: lastClosure?.closedAt?.toISOString() ?? null,
  };
}

export async function createClosure(data: Omit<NewDailyClosure, 'id'>): Promise<DailyClosure> {
  const [closure] = await db
    .insert(dailyClosures)
    .values({ id: `clot_${nanoid()}`, ...data })
    .returning();
  return closure;
}

export async function createClosureAndCloseTickets(
  data: Omit<NewDailyClosure, 'id'>,
  ticketIds: string[]
): Promise<DailyClosure> {
  if (ticketIds.length === 0) {
    throw new Error('Aucun ticket à clôturer');
  }

  return db.transaction(async (tx) => {
    const [closure] = await tx
      .insert(dailyClosures)
      .values({ id: `clot_${nanoid()}`, ...data })
      .returning();

    const closedTickets = await tx
      .update(hotspotTickets)
      .set({ isClosed: true, closureId: closure.id })
      .where(and(inArray(hotspotTickets.id, ticketIds), eq(hotspotTickets.isClosed, false)))
      .returning({ id: hotspotTickets.id });

    if (closedTickets.length !== ticketIds.length) {
      throw new Error('Certains tickets ont déjà été clôturés');
    }

    return closure;
  });
}

export async function markClosureNotified(
  id: string,
  channel: 'email' | 'telegram'
): Promise<void> {
  await db
    .update(dailyClosures)
    .set(channel === 'email' ? { emailSent: true } : { telegramSent: true })
    .where(eq(dailyClosures.id, id));
}
