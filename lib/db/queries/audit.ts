// lib/db/queries/audit.ts
// Audit logs database queries for tracking administrative and financial actions

import { db } from '../index';
import { auditLogs, users } from '../schema';
import { desc, eq, and, sql } from 'drizzle-orm';
import { nanoid } from '../utils';

export interface CreateAuditLogParams {
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

export interface AuditLogWithUser {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: any;
  createdAt: Date;
}

export async function createAuditLog(params: CreateAuditLogParams) {
  try {
    const [created] = await db
      .insert(auditLogs)
      .values({
        id: `audit_${nanoid()}`,
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        metadata: params.metadata ?? null,
        createdAt: new Date(),
      })
      .returning();
    return created;
  } catch (error) {
    // Non-blocking error logging for audit
    console.error('❌ [Audit] Impossible d\'enregistrer le journal d\'audit:', error);
    return null;
  }
}

export async function getAuditLogs(options?: {
  limit?: number;
  offset?: number;
  action?: string;
  userId?: string;
}): Promise<AuditLogWithUser[]> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const conditions = [];
  if (options?.action) {
    conditions.push(eq(auditLogs.action, options.action));
  }
  if (options?.userId) {
    conditions.push(eq(auditLogs.userId, options.userId));
  }

  const query = db
    .select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      userName: users.name,
      userEmail: users.email,
      userRole: users.role,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return query;
}

export async function countAuditLogs(): Promise<number> {
  const [result] = await db.select({ count: sql<number>`count(*)::int` }).from(auditLogs);
  return result?.count ?? 0;
}
