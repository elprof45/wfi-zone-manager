// Drizzle queries — Routers domain

import { eq, desc, and } from 'drizzle-orm';
import { db } from '../index';
import { routers, type NewRouter, type Router, type RouterHardwareMetrics } from '../schema';
import { nanoid } from '../utils';

export async function getAllRouters(): Promise<Router[]> {
  return db.select().from(routers).orderBy(desc(routers.createdAt));
}

export async function getRouterById(id: string): Promise<Router | undefined> {
  const [router] = await db.select().from(routers).where(eq(routers.id, id)).limit(1);
  return router;
}

export async function createRouter(
  data: Omit<NewRouter, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Router> {
  const [router] = await db
    .insert(routers)
    .values({
      id: `rtr_${nanoid()}`,
      ...data,
      status: 'offline',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return router;
}

export async function updateRouter(
  id: string,
  data: Partial<Omit<NewRouter, 'id' | 'createdAt'>>
): Promise<Router | undefined> {
  const [updated] = await db
    .update(routers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(routers.id, id))
    .returning();
  return updated;
}

export async function updateRouterStatus(
  id: string,
  status: 'online' | 'offline' | 'warning',
  hardware?: RouterHardwareMetrics
): Promise<void> {
  await db
    .update(routers)
    .set({
      status,
      lastSeenAt: new Date(),
      hardwareJson: hardware ? (hardware as object) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(routers.id, id));
}

export async function deleteRouter(id: string): Promise<boolean> {
  const result = await db.delete(routers).where(eq(routers.id, id)).returning({ id: routers.id });
  return result.length > 0;
}
