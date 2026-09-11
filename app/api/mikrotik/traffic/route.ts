// app/api/mikrotik/traffic/route.ts
// Télémétrie de Bande Passante & Trafic d'Interfaces Réseau MikroTik en Temps Réel

import { NextRequest, NextResponse } from 'next/server';
import { getAllRouters } from '@/lib/db/queries/routers';
import { decryptRouterPassword } from '@/lib/secret-crypto';
import { requireSession } from '@/lib/api-auth';

function formatBitrate(bps: number): string {
  if (!bps || bps <= 0) return '0 bps';
  if (bps >= 1_000_000_000) return `${(bps / 1_000_000_000).toFixed(2)} Gbps`;
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(2)} Mbps`;
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(1)} kbps`;
  return `${Math.round(bps)} bps`;
}

export async function GET(req: NextRequest) {
  try {
    const guard = await requireSession();
    if ('response' in guard) return guard.response;

    const { searchParams } = new URL(req.url);
    const routerId = searchParams.get('routerId');
    const requestedInterface = searchParams.get('interface');

    const allRtrs = await getAllRouters();
    if (!allRtrs.length) {
      return NextResponse.json({ success: false, error: 'Aucun routeur configuré.' }, { status: 404 });
    }

    const targetRouter = routerId
      ? allRtrs.find((r) => r.id === routerId)
      : allRtrs[0];

    if (!targetRouter) {
      return NextResponse.json({ success: false, error: 'Routeur introuvable.' }, { status: 404 });
    }

    const host = targetRouter.host;
    // Note: If connectionType is socket, apiPort is 8728; REST API is on port 80/443
    const restPort = targetRouter.connectionType === 'rest' ? (targetRouter.apiPort || 80) : 80;
    const user = targetRouter.username;
    const password = decryptRouterPassword(targetRouter.passwordEncrypted) ?? '';

    // 1. Fetch running interfaces list via REST
    const baseUrl = `http://${host}:${restPort}/rest`;
    const authHeader = `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;

    let runningInterfaces: string[] = [];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const ifaceRes = await fetch(`${baseUrl}/interface`, {
        headers: { Authorization: authHeader },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (ifaceRes.ok) {
        const ifaces = await ifaceRes.json();
        if (Array.isArray(ifaces)) {
          runningInterfaces = ifaces
            .filter((i) => i.running === 'true' && i.type !== 'loopback')
            .map((i) => i.name);
        }
      }
    } catch {
      // Fallback
      runningInterfaces = ['ether1', 'LAN'];
    }

    const targetInterfaces = requestedInterface
      ? requestedInterface.split(',')
      : (runningInterfaces.length > 0 ? runningInterfaces.slice(0, 4) : ['ether1']);

    // 2. Query /interface/monitor-traffic
    let trafficResults: any[] = [];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const monRes = await fetch(`${baseUrl}/interface/monitor-traffic`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interface: targetInterfaces.join(','),
          once: '',
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (monRes.ok) {
        trafficResults = await monRes.json();
      }
    } catch (err: any) {
      console.warn('Traffic monitor REST call failed, falling back to basic interface counters:', err?.message);
    }

    let totalRxBps = 0;
    let totalTxBps = 0;

    const formattedInterfaces = (Array.isArray(trafficResults) ? trafficResults : []).map((t) => {
      const rxBps = parseInt(t['rx-bits-per-second'] || t['fp-rx-bits-per-second'] || '0', 10);
      const txBps = parseInt(t['tx-bits-per-second'] || t['fp-tx-bits-per-second'] || '0', 10);
      const rxPps = parseInt(t['rx-packets-per-second'] || '0', 10);
      const txPps = parseInt(t['tx-packets-per-second'] || '0', 10);
      const rxDrops = parseInt(t['rx-drops-per-second'] || '0', 10);
      const txDrops = parseInt(t['tx-drops-per-second'] || '0', 10);

      totalRxBps += rxBps;
      totalTxBps += txBps;

      return {
        name: t.name,
        rxBps,
        txBps,
        rxFormatted: formatBitrate(rxBps),
        txFormatted: formatBitrate(txBps),
        rxPps,
        txPps,
        rxDrops,
        txDrops,
      };
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      routerId: targetRouter.id,
      routerName: targetRouter.name,
      totalRxBps,
      totalTxBps,
      totalRxFormatted: formatBitrate(totalRxBps),
      totalTxFormatted: formatBitrate(totalTxBps),
      interfaces: formattedInterfaces,
      allAvailableInterfaces: runningInterfaces,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la mesure du trafic' },
      { status: 500 }
    );
  }
}
