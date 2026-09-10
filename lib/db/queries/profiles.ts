// Drizzle queries — Profiles domain

import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../index';
import { hotspotProfiles, hotspotTickets, type NewHotspotProfile, type HotspotProfile } from '../schema';
import { nanoid } from '../utils';

export async function getAllProfiles(): Promise<(HotspotProfile & { availableCount: number })[]> {
  const profiles = await db.select().from(hotspotProfiles).orderBy(desc(hotspotProfiles.createdAt));

  // Count available tickets per profile
  const counts = await db
    .select({
      profileId: hotspotTickets.profileId,
      count: sql<number>`count(*)::int`,
    })
    .from(hotspotTickets)
    .where(eq(hotspotTickets.status, 'available'))
    .groupBy(hotspotTickets.profileId);

  const countMap = new Map(counts.map((c) => [c.profileId, c.count]));

  return profiles.map((p) => ({
    ...p,
    availableCount: countMap.get(p.id) ?? 0,
  }));
}

export async function getProfileById(id: string): Promise<HotspotProfile | undefined> {
  const [profile] = await db
    .select()
    .from(hotspotProfiles)
    .where(eq(hotspotProfiles.id, id))
    .limit(1);
  return profile;
}

export async function createProfile(
  data: Omit<NewHotspotProfile, 'id' | 'createdAt' | 'updatedAt'>
): Promise<HotspotProfile> {
  const [profile] = await db
    .insert(hotspotProfiles)
    .values({
      id: `prof_${nanoid()}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return profile;
}

export async function updateProfile(
  id: string,
  data: Partial<Omit<NewHotspotProfile, 'id' | 'createdAt'>>
): Promise<HotspotProfile | undefined> {
  const [updated] = await db
    .update(hotspotProfiles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(hotspotProfiles.id, id))
    .returning();
  return updated;
}

export async function deleteProfile(id: string): Promise<boolean> {
  const result = await db
    .delete(hotspotProfiles)
    .where(eq(hotspotProfiles.id, id))
    .returning({ id: hotspotProfiles.id });
  return result.length > 0;
}
