// app/api/mikrotik/test/route.ts
// Test endpoint to simulate a MikroTik heartbeat push (for debugging flow without real router)

import { NextRequest, NextResponse } from 'next/server';
import { getAllRouters } from '@/lib/db/queries/routers';
import { isDatabaseReady } from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  try {
    const guard = await requireRole(['super_admin', 'admin']);
    if ('response' in guard) return guard.response;

    const dbReady = await isDatabaseReady(2000);
    if (!dbReady) {
      return NextResponse.json({ success: false, error: 'DB non disponible' }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const { routerId, cpu, freeMemory, totalMemory, uptime, activeUsers, alert } = body;

    const allRouters = await getAllRouters();
    if (allRouters.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Aucun routeur configuré. Ajoutez un routeur dans NetPulse pour tester le heartbeat.',
      }, { status: 404 });
    }

    const targetRouter = routerId
      ? allRouters.find((r) => r.id === routerId)
      : allRouters[0];

    if (!targetRouter) {
      return NextResponse.json({ success: false, error: `Routeur ${routerId} introuvable.` }, { status: 404 });
    }

    // Determine base URL for internal call
    const origin = process.env.APP_URL || process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3000}`;
    const heartbeatUrl = `${origin.replace(/\/+$/, '')}/api/mikrotik/heartbeat`;

    // Build test payload
    const testPayload = {
      routerId: targetRouter.id,
      host: targetRouter.host,
      cpu: cpu ?? Math.floor(Math.random() * 70) + 10, // random 10-80%
      freeMemory: freeMemory ?? Math.floor(Math.random() * 50_000_000) + 10_000_000,
      totalMemory: totalMemory ?? 128_000_000,
      uptime: uptime ?? '3d2h14m33s',
      version: '7.15.2',
      boardName: 'hAP ac³',
      activeUsers: activeUsers ?? Math.floor(Math.random() * 25),
      voltage: 24.1,
      temperature: 42,
      ...(alert ? { alert } : {}),
    };

    // Call the actual heartbeat endpoint internally
    const heartbeatRes = await fetch(heartbeatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-netpulse-heartbeat-token': process.env.MIKROTIK_HEARTBEAT_TOKEN || '',
      },
      body: JSON.stringify(testPayload),
    });

    const heartbeatData = await heartbeatRes.json();

    return NextResponse.json({
      success: heartbeatData.success,
      message: heartbeatData.success
        ? `✅ Heartbeat de test envoyé avec succès pour "${targetRouter.name}"`
        : `❌ Échec: ${heartbeatData.error}`,
      routerName: targetRouter.name,
      routerId: targetRouter.id,
      payload: testPayload,
      heartbeatResponse: heartbeatData,
      heartbeatUrl,
    });
  } catch (error: any) {
    console.error('💥 [MikroTik Test] Erreur:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET: return info about the test endpoint
export async function GET() {
  const guard = await requireRole(['super_admin', 'admin']);
  if ('response' in guard) return guard.response;

  const allRouters = await getAllRouters().catch(() => []);
  return NextResponse.json({
    info: 'Endpoint de test de heartbeat MikroTik (simulation sans vrai routeur)',
    usage: 'POST /api/mikrotik/test avec body JSON optionnel: { routerId, cpu, freeMemory, activeUsers, alert }',
    availableRouters: allRouters.map((r) => ({ id: r.id, name: r.name, host: r.host })),
  });
}
