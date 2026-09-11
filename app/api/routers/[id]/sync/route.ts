import { NextRequest, NextResponse } from 'next/server';
import { getRouterById, updateRouterStatus } from '@/lib/db/queries/routers';
import { MikroTikClient } from '@/lib/mikrotik/client';
import { decryptRouterPassword } from '@/lib/secret-crypto';
import { requireRole } from '@/lib/api-auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireRole(['super_admin', 'admin']);
    if ('response' in guard) return guard.response;

    const { id } = await params;
    const router = await getRouterById(id);

    if (!router) {
      return NextResponse.json({ error: 'Routeur introuvable' }, { status: 404 });
    }

    const client = new MikroTikClient({
      host: router.host,
      port: router.apiPort,
      user: router.username,
      password: decryptRouterPassword(router.passwordEncrypted),
      connectionType: router.connectionType as 'socket' | 'rest',
      timeout: 8,
    });

    const conn = await client.testConnection();
    const currentHw = (router.hardwareJson as any) || {};

    if (!conn.connected) {
      const errorMsg = conn.error || 'Connexion au routeur MikroTik impossible (Délai dépassé ou service API désactivé)';
      await updateRouterStatus(id, 'offline', {
        ...currentHw,
        lastError: errorMsg,
      });

      return NextResponse.json({
        success: false,
        routerId: id,
        status: 'offline',
        latencyMs: conn.latencyMs,
        error: errorMsg,
      }, { status: 200 });
    }

    // Connected — retrieve real hardware metrics
    const metrics = await client.getHardwareMetrics(false);
    await updateRouterStatus(id, 'online', {
      ...metrics,
      lastError: undefined,
    });

    return NextResponse.json({
      success: true,
      routerId: id,
      status: 'online',
      latencyMs: conn.latencyMs,
      hardware: metrics,
    });
  } catch (error) {
    const errorMsg = (error as Error).message;
    return NextResponse.json({
      success: false,
      error: `Erreur MikroTik : ${errorMsg}`,
      status: 'offline',
    }, { status: 500 });
  }
}
