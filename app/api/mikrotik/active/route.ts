// app/api/mikrotik/active/route.ts
// Gestion en temps réel des sessions actives MikroTik (Lecture & Kick session)

import { NextRequest, NextResponse } from 'next/server';
import { getAllRouters } from '@/lib/db/queries/routers';
import { MikroTikClient } from '@/lib/mikrotik/client';
import { createAuditLog } from '@/lib/db/queries/audit';
import { decryptRouterPassword } from '@/lib/secret-crypto';
import { requireRole, requireSession } from '@/lib/api-auth';

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export async function GET(req: NextRequest) {
  try {
    const guard = await requireSession();
    if ('response' in guard) return guard.response;

    const { searchParams } = new URL(req.url);
    const routerId = searchParams.get('routerId');

    const allRtrs = await getAllRouters();
    if (!allRtrs.length) {
      return NextResponse.json({ success: false, sessions: [], error: 'Aucun routeur configuré.' });
    }

    const targetRouter = routerId
      ? allRtrs.find((r) => r.id === routerId)
      : allRtrs[0];

    if (!targetRouter) {
      return NextResponse.json({ success: false, sessions: [], error: 'Routeur introuvable.' }, { status: 404 });
    }

    const client = new MikroTikClient({
      host: targetRouter.host,
      port: targetRouter.apiPort,
      user: targetRouter.username,
      password: decryptRouterPassword(targetRouter.passwordEncrypted),
      connectionType: targetRouter.connectionType as 'socket' | 'rest',
      timeout: 5,
    });

    const activeList = await client.getActiveSessions();

    return NextResponse.json({
      success: true,
      routerId: targetRouter.id,
      routerName: targetRouter.name,
      count: activeList.length,
      sessions: activeList.map((s) => ({
        ...s,
        bytesInFormatted: formatBytes(s.bytesIn),
        bytesOutFormatted: formatBytes(s.bytesOut),
        totalBytesFormatted: formatBytes(s.bytesIn + s.bytesOut),
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, sessions: [], error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireRole(['super_admin', 'admin']);
    if ('response' in guard) return guard.response;

    const body = await req.json().catch(() => ({}));
    const { routerId, target } = body; // target can be sessionId, macAddress, or username

    if (!target) {
      return NextResponse.json({ success: false, error: 'Identifiant, adresse MAC ou nom d\'utilisateur requis pour le kick.' }, { status: 400 });
    }

    const allRtrs = await getAllRouters();
    const targetRouter = routerId
      ? allRtrs.find((r) => r.id === routerId)
      : allRtrs[0];

    if (!targetRouter) {
      return NextResponse.json({ success: false, error: 'Routeur introuvable.' }, { status: 404 });
    }

    const client = new MikroTikClient({
      host: targetRouter.host,
      port: targetRouter.apiPort,
      user: targetRouter.username,
      password: decryptRouterPassword(targetRouter.passwordEncrypted),
      connectionType: targetRouter.connectionType as 'socket' | 'rest',
      timeout: 5,
    });

    const kicked = await client.kickSession(target);

    await createAuditLog({
      userId: guard.session.user.id,
      action: 'session.kick',
      entityType: 'hotspot_session',
      entityId: target,
      metadata: {
        routerId: targetRouter.id,
        routerName: targetRouter.name,
        target,
        success: kicked,
      },
    });

    if (!kicked) {
      return NextResponse.json({ success: false, error: `La session "${target}" n'a pas pu être déconnectée (session introuvable ou déjà fermée).` }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Session "${target}" déconnectée avec succès du routeur ${targetRouter.name}.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
