// app/api/mikrotik/diagnostics/route.ts
// Endpoint API de diagnostic complet et en temps réel pour le routeur MikroTik RouterOS

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { MikrotikAPI } from '@fibercom/routeros-api';

interface DiagnosticParams {
  host: string;
  user: string;
  password?: string;
  httpPort?: number;
  socketPort?: number;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

async function runRouterDiagnostics(params: DiagnosticParams) {
  const { host, user, password = '', httpPort = 80, socketPort = 8728 } = params;
  const auth = Buffer.from(`${user}:${password}`).toString('base64');
  const restBase = `http://${host}:${httpPort}/rest`;

  const fetchRest = async <T = any>(path: string): Promise<T> => {
    const res = await fetch(`${restBase}${path.startsWith('/') ? path : '/' + path}`, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`REST ${path} [${res.status}]: ${txt}`);
    }
    return res.json();
  };

  const startTime = Date.now();

  // 1. Récupération parallèle des données REST
  const [
    resource,
    identity,
    routerboard,
    profilesRaw,
    usersRaw,
    activeRaw,
    scriptsRaw,
    serversRaw,
    interfacesRaw,
  ] = await Promise.all([
    fetchRest('/system/resource'),
    fetchRest('/system/identity').catch(() => ({ name: 'Inconnu' })),
    fetchRest('/system/routerboard').catch(() => ({})),
    fetchRest('/ip/hotspot/user/profile').catch(() => []),
    fetchRest('/ip/hotspot/user').catch(() => []),
    fetchRest('/ip/hotspot/active').catch(() => []),
    fetchRest('/system/script').catch(() => []),
    fetchRest('/ip/hotspot').catch(() => []),
    fetchRest('/interface').catch(() => []),
  ]);

  // Calculs Mémoire et Stockage
  const totalMem = Number(resource['total-memory'] || 0);
  const freeMem = Number(resource['free-memory'] || 0);
  const totalHdd = Number(resource['total-hdd-space'] || 0);
  const freeHdd = Number(resource['free-hdd-space'] || 0);

  // Analyse des Tickets
  const profileDistribution: Record<string, number> = {};
  let virginTickets = 0;
  let usedTickets = 0;

  for (const u of usersRaw) {
    const prof = u.profile || 'default';
    profileDistribution[prof] = (profileDistribution[prof] || 0) + 1;
    const uptime = u.uptime || '0s';
    const isUsed = uptime !== '0s' || (u.comment && u.comment.includes(' X'));
    if (isUsed) usedTickets++;
    else virginTickets++;
  }

  // Analyse des Ventes (Scripts mikhmon)
  const salesScripts = scriptsRaw.filter(
    (s: any) => s.comment === 'mikhmon' || (s.name && s.name.includes('-|-'))
  );
  let totalRevenue = 0;
  const salesByProfile: Record<string, { count: number; total: number }> = {};
  const recentSales: any[] = [];

  for (const s of salesScripts) {
    const parts = (s.name || '').split('-|-');
    if (parts.length >= 4) {
      const date = parts[0] || s.source || '';
      const time = parts[1] || '';
      const username = parts[2] || '';
      const price = Number(parts[3]) || 0;
      const ip = parts[4] || '';
      const mac = parts[5] || '';
      const validity = parts[6] || '';
      const profile = parts[7] || parts[3] || 'Standard';

      totalRevenue += price;
      if (!salesByProfile[profile]) salesByProfile[profile] = { count: 0, total: 0 };
      salesByProfile[profile].count++;
      salesByProfile[profile].total += price;

      recentSales.push({ date, time, username, price, ip, mac, validity, profile });
    }
  }

  // Test Socket API (Port 8728)
  let socketApiOk = false;
  let socketLatencyMs = 0;
  try {
    const socketStart = Date.now();
    const socketApi = new MikrotikAPI({
      host,
      port: socketPort,
      user,
      password,
      timeout: 3,
    });
    await socketApi.connect();
    socketLatencyMs = Date.now() - socketStart;
    socketApiOk = true;
    await socketApi.close();
  } catch {
    socketApiOk = false;
  }

  const durationMs = Date.now() - startTime;

  return {
    success: true,
    target: { host, user, httpPort, socketPort },
    responseTimeMs: durationMs,
    protocols: {
      restApi: { status: 'OK', port: httpPort },
      socketApi: { status: socketApiOk ? 'OK' : 'FAIL', port: socketPort, latencyMs: socketLatencyMs },
    },
    system: {
      identity: identity.name,
      model: resource['board-name'],
      version: resource.version,
      architecture: resource['architecture-name'],
      uptime: resource.uptime,
      cpu: {
        model: resource.cpu,
        cores: Number(resource['cpu-count'] || 1),
        frequencyMhz: Number(resource['cpu-frequency'] || 0),
        loadPercent: Number(resource['cpu-load'] || 0),
      },
      ram: {
        totalBytes: totalMem,
        freeBytes: freeMem,
        totalFormatted: formatBytes(totalMem),
        freeFormatted: formatBytes(freeMem),
        usedPercent: Math.round(((totalMem - freeMem) / totalMem) * 100),
      },
      storage: {
        totalBytes: totalHdd,
        freeBytes: freeHdd,
        totalFormatted: formatBytes(totalHdd),
        freeFormatted: formatBytes(freeHdd),
      },
      serialNumber: routerboard?.['serial-number'],
      firmware: routerboard?.['current-firmware'],
    },
    profiles: profilesRaw.map((p: any) => ({
      name: p.name,
      sharedUsers: p['shared-users'] || '1',
      rateLimit: p['rate-limit'] || 'Illimité',
      hasOnLoginScript: Boolean(p['on-login']),
    })),
    users: {
      totalCount: usersRaw.length,
      virginTickets,
      usedTickets,
      distributionByProfile: profileDistribution,
      sample: usersRaw.slice(0, 5).map((u: any) => ({
        name: u.name,
        profile: u.profile,
        uptime: u.uptime || '0s',
        limitUptime: u['limit-uptime'] || 'none',
        comment: u.comment || '',
      })),
    },
    activeSessions: {
      count: activeRaw.length,
      sessions: activeRaw.map((a: any) => ({
        user: a.user,
        address: a.address,
        macAddress: a['mac-address'],
        server: a.server,
        uptime: a.uptime,
        sessionTimeLeft: a['session-time-left'] || 'Illimité',
        bytesInFormatted: formatBytes(Number(a['bytes-in'] || 0)),
        bytesOutFormatted: formatBytes(Number(a['bytes-out'] || 0)),
        comment: a.comment || '',
      })),
    },
    sales: {
      totalRevenue,
      currency: 'FCFA',
      totalSalesCount: recentSales.length,
      breakdownByProfile: salesByProfile,
      recent: recentSales.slice(-10).reverse(),
    },
    servers: serversRaw.map((s: any) => ({
      name: s.name,
      interface: s.interface,
      dnsNameIp: s['ip-of-dns-name'],
      pool: s['address-pool'],
    })),
    interfaces: interfacesRaw.map((i: any) => ({
      name: i.name,
      type: i.type,
      running: i.running === 'true',
      rxBytes: Number(i['rx-byte'] || 0),
      txBytes: Number(i['tx-byte'] || 0),
      rxFormatted: formatBytes(Number(i['rx-byte'] || 0)),
      txFormatted: formatBytes(Number(i['tx-byte'] || 0)),
    })),
  };
}

export async function GET() {
  try {
    const guard = await requireRole(['super_admin', 'admin']);
    if ('response' in guard) return guard.response;

    const host = process.env.MIKROTIK_HOST;
    const user = process.env.MIKROTIK_USER;
    const password = process.env.MIKROTIK_PASSWORD;
    if (!host || !user || !password) {
      return NextResponse.json(
        { success: false, error: 'Configuration MikroTik manquante.' },
        { status: 503 }
      );
    }

    const data = await runRouterDiagnostics({
      host,
      user,
      password,
      httpPort: 80,
      socketPort: 8728,
    });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireRole(['super_admin', 'admin']);
    if ('response' in guard) return guard.response;

    const body = await req.json().catch(() => ({}));
    const host = body.host || process.env.MIKROTIK_HOST;
    const user = body.user || process.env.MIKROTIK_USER;
    const password = body.password || process.env.MIKROTIK_PASSWORD;
    if (!host || !user || !password) {
      return NextResponse.json(
        { success: false, error: 'Configuration MikroTik manquante.' },
        { status: 400 }
      );
    }

    const data = await runRouterDiagnostics({
      host,
      user,
      password,
      httpPort: Number(body.httpPort) || 80,
      socketPort: Number(body.socketPort) || 8728,
    });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
