import { NextRequest, NextResponse } from 'next/server';
import { getRouterById, updateRouterStatus } from '@/lib/db/queries/routers';
import { MikroTikClient } from '@/lib/mikrotik/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const router = await getRouterById(id);

    if (!router) {
      return NextResponse.json({ error: 'Routeur introuvable' }, { status: 404 });
    }

    const client = new MikroTikClient({
      host: router.host,
      port: router.apiPort,
      user: router.username,
      password: router.passwordEncrypted ?? undefined,
      connectionType: router.connectionType as 'socket' | 'rest',
    });

    const conn = await client.testConnection();
    const metrics = await client.getHardwareMetrics();
    const status = conn.connected ? 'online' : router.status === 'warning' ? 'warning' : 'online';

    await updateRouterStatus(id, status, metrics);

    return NextResponse.json({
      success: true,
      routerId: id,
      status,
      latencyMs: conn.latencyMs,
      hardware: metrics,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
