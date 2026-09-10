// Drizzle queries — System Settings domain

import { eq } from 'drizzle-orm';
import { db } from '../index';
import { systemSettings } from '../schema';

export type SettingKey =
  | 'general'
  | 'smtp'
  | 'telegram'
  | 'reportsAutomation'
  | 'isSetupCompleted'
  | 'database';

export async function getSetting<T = unknown>(key: SettingKey): Promise<T | null> {
  const [row] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1);
  return row ? (row.value as T) : null;
}

export async function getAllSettings(): Promise<Record<string, unknown>> {
  const rows = await db.select().from(systemSettings);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function setSetting(key: SettingKey, value: unknown): Promise<void> {
  await db
    .insert(systemSettings)
    .values({ key, value: value as object, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: { value: value as object, updatedAt: new Date() },
    });
}

export async function isSetupCompleted(): Promise<boolean> {
  const val = await getSetting<boolean>('isSetupCompleted');
  return val === true;
}
