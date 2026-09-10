import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { parseDatabaseUrl } from '@/lib/config';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsedDefault = parseDatabaseUrl();

    const host = body?.host || parsedDefault.host;
    const databaseName = body?.databaseName || parsedDefault.databaseName;
    const username = body?.username || parsedDefault.username;

    const startTime = Date.now();

    // Real PostgreSQL execution query
    const [versionRes, tablesRes] = await Promise.all([
      db.execute(sql`SELECT version() as ver, current_database() as db_name, current_user as usr`),
      db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name ASC
      `),
    ]);

    const latencyMs = Date.now() - startTime;
    const firstRow = (versionRes as any).rows?.[0] || (versionRes as any)?.[0] || {};
    const serverVersion = firstRow.ver || 'PostgreSQL 16 (Docker Compose)';
    const activeDbName = firstRow.db_name || databaseName;
    const activeUser = firstRow.usr || username;

    const rows = (tablesRes as any).rows || (tablesRes as any) || [];
    const tablesFound = rows.map((r: any) => r.table_name || r).filter(Boolean);

    return NextResponse.json({
      success: true,
      latencyMs,
      serverVersion,
      database: activeDbName,
      user: activeUser,
      tablesCount: tablesFound.length,
      tablesFound,
      message: `Connexion PostgreSQL active vérifiée (${latencyMs}ms). ${tablesFound.length} tables synchronisées pour Drizzle ORM.`,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `Erreur de connexion PostgreSQL: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
