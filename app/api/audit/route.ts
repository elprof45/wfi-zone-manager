// app/api/audit/route.ts
// Audit log retrieval API route for system administrators

import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs, countAuditLogs } from '@/lib/db/queries/audit';
import { getServerSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    const userRole = (session?.user as any)?.role;

    // Optional admin check (in dev if no session, allow read)
    if (session && userRole !== 'super_admin' && userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Accès interdit. Rôle administrateur requis pour consulter le journal d\'audit.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const action = searchParams.get('action') || undefined;
    const userId = searchParams.get('userId') || undefined;

    const [logs, total] = await Promise.all([
      getAuditLogs({ limit, offset, action, userId }),
      countAuditLogs(),
    ]);

    return NextResponse.json({
      success: true,
      logs: logs.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
