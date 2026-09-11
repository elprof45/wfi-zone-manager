import { NextRequest, NextResponse } from 'next/server';
import {
  getAllRouters,
  getRouterById,
  createRouter,
  updateRouter,
  deleteRouter,
  updateRouterStatus,
} from '@/lib/db/queries/routers';
import { Router } from '@/lib/db/schema';
import { MikroTikRouter } from '@/lib/types';
import { createAuditLog } from '@/lib/db/queries/audit';
import { MikroTikClient } from '@/lib/mikrotik/client';

import { z } from 'zod';

const RouterCreateSchema = z.object({
  name: z.string().min(1, 'Le nom du routeur est obligatoire'),
  host: z.string().min(1, "L'hôte IP/DNS est obligatoire"),
  username: z.string().min(1, "Le nom d'utilisateur est obligatoire"),
  password: z.string().optional().nullable(),
  location: z.string().optional().default('Site Non Défini'),
  apiPort: z.coerce.number().int().min(1).max(65535).optional().default(8728),
  connectionType: z.enum(['socket', 'rest']).optional().default('socket'),
  hotspotDnsName: z.string().optional().default('hotspot.local'),
});

const RouterUpdateSchema = z.object({
  id: z.string().min(1, "L'identifiant du routeur est obligatoire"),
  action: z.enum(['purge_expired', 'ping']).optional(),
  name: z.string().min(1).optional(),
  host: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
  password: z.string().optional().nullable(),
  location: z.string().optional(),
  apiPort: z.coerce.number().int().min(1).max(65535).optional(),
  connectionType: z.enum(['socket', 'rest']).optional(),
  hotspotDnsName: z.string().optional(),
  status: z.enum(['online', 'offline', 'warning']).optional(),
});

function formatRouter(r: Router): MikroTikRouter {
  const hw = (r.hardwareJson as any) || {};
  return {
    id: r.id,
    name: r.name,
    location: r.location,
    host: r.host,
    apiPort: r.apiPort,
    connectionType: r.connectionType as 'socket' | 'rest',
    username: r.username,
    hotspotDnsName: r.hotspotDnsName,
    status: r.status as 'online' | 'offline' | 'warning',
    isOnline: r.status === 'online',
    lastPing: hw.lastPingMs ?? undefined,
    lastSeen: r.lastSeenAt ? r.lastSeenAt.toISOString() : new Date().toISOString(),
    hardware: hw.model ? hw : {
      model: 'MikroTik RouterOS',
      cpuPercent: 10,
      ramTotalMb: 128,
      ramFreeMb: 80,
      flashTotalMb: 128,
      flashFreeMb: 90,
      uptime: '1d 00h',
      activeUsersCount: 0,
    },
  };
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const routerId = searchParams.get('id');

    if (routerId) {
      const rtr = await getRouterById(routerId);
      if (!rtr) return NextResponse.json({ error: 'Routeur introuvable' }, { status: 404 });
      return NextResponse.json(formatRouter(rtr));
    }

    const all = await getAllRouters();
    return NextResponse.json(all.map(formatRouter));
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parseResult = RouterCreateSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parseResult.data;

    // Real connection test to MikroTik
    const client = new MikroTikClient({
      host: body.host,
      port: body.apiPort,
      user: body.username,
      password: body.password || undefined,
      connectionType: body.connectionType,
      timeout: 5,
    });
    const conn = await client.testConnection();

    let initialHw: any = {
      model: conn.model || 'MikroTik RouterBOARD',
      cpuPercent: 0,
      ramTotalMb: 128,
      ramFreeMb: 64,
      flashTotalMb: 128,
      flashFreeMb: 64,
      uptime: conn.uptime || '0d',
      activeUsersCount: 0,
      lastError: conn.connected ? undefined : conn.error,
    };

    if (conn.connected) {
      try {
        const realHw = await client.getHardwareMetrics(false);
        initialHw = { ...realHw, lastError: undefined };
      } catch {}
    }

    const created = await createRouter({
      name: body.name,
      location: body.location || 'Site Non Défini',
      host: body.host,
      apiPort: body.apiPort,
      connectionType: body.connectionType,
      username: body.username,
      passwordEncrypted: body.password || null,
      hotspotDnsName: body.hotspotDnsName || 'hotspot.local',
      status: conn.connected ? 'online' : 'offline',
      lastSeenAt: conn.connected ? new Date() : null,
      hardwareJson: initialHw,
    });

    return NextResponse.json({
      success: true,
      router: formatRouter(created),
      connected: conn.connected,
      connectionError: conn.error,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parseResult = RouterUpdateSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { id, action, ...updates } = parseResult.data;

    // Special action: purge expired users from real MikroTik
    if (action === 'purge_expired') {
      const rtr = await getRouterById(id);
      if (!rtr) return NextResponse.json({ error: 'Routeur introuvable' }, { status: 404 });

      const client = new MikroTikClient({
        host: rtr.host,
        port: rtr.apiPort,
        user: rtr.username,
        password: rtr.passwordEncrypted ?? undefined,
        connectionType: rtr.connectionType as 'socket' | 'rest',
        timeout: 8,
      });

      try {
        const purgeResult = await client.purgeExpiredSessions();
        const currentHw = (rtr.hardwareJson as any) || {};

        await updateRouter(id, {
          lastSeenAt: new Date(),
          hardwareJson: {
            ...currentHw,
            ramFreeMb: (currentHw.ramFreeMb || 50) + purgeResult.freedRamMb,
            activeUsersCount: Math.max(0, (currentHw.activeUsersCount || 0) - purgeResult.purgedCount),
            lastError: undefined,
          },
        });

        await createAuditLog({
          action: 'router.purge_expired',
          entityType: 'router',
          entityId: id,
          metadata: {
            routerName: rtr.name,
            purgedCount: purgeResult.purgedCount,
            freedRamMb: purgeResult.freedRamMb,
          },
        });

        return NextResponse.json({
          success: true,
          message: `Purge réelle exécutée sur ${rtr.name} (${rtr.host}) : ${purgeResult.purgedCount} sessions supprimées, ${purgeResult.freedRamMb} MB libérés.`,
          purgedCount: purgeResult.purgedCount,
          freedRamMb: purgeResult.freedRamMb,
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({
          success: false,
          error: `Erreur MikroTik : ${errorMsg}`,
        }, { status: 502 });
      }
    }

    // Ping check action — real RouterOS ping
    if (action === 'ping') {
      const rtr = await getRouterById(id);
      if (!rtr) return NextResponse.json({ error: 'Routeur introuvable' }, { status: 404 });

      const client = new MikroTikClient({
        host: rtr.host,
        port: rtr.apiPort,
        user: rtr.username,
        password: rtr.passwordEncrypted ?? undefined,
        connectionType: rtr.connectionType as 'socket' | 'rest',
        timeout: 5,
      });

      const conn = await client.testConnection();
      const currentHw = (rtr.hardwareJson as any) || {};

      if (conn.connected) {
        await updateRouter(id, {
          status: 'online',
          lastSeenAt: new Date(),
          hardwareJson: {
            ...currentHw,
            model: conn.model || currentHw.model || 'MikroTik RouterBOARD',
            uptime: conn.uptime || currentHw.uptime,
            lastError: undefined,
          },
        });

        return NextResponse.json({
          success: true,
          alive: true,
          latencyMs: conn.latencyMs,
          lastSeen: new Date().toISOString(),
          version: conn.version,
          model: conn.model,
        });
      } else {
        await updateRouter(id, {
          status: 'offline',
          hardwareJson: {
            ...currentHw,
            lastError: conn.error || 'Délai de connexion dépassé',
          },
        });

        return NextResponse.json({
          success: false,
          alive: false,
          latencyMs: conn.latencyMs,
          error: conn.error || 'Routeur MikroTik injoignable',
        }, { status: 200 });
      }
    }

    const { password, ...restUpdates } = updates;
    const updated = await updateRouter(id, {
      ...restUpdates,
      ...(password !== undefined ? { passwordEncrypted: password } : {}),
    });
    if (!updated) return NextResponse.json({ error: 'Routeur non trouvé' }, { status: 404 });

    return NextResponse.json({ success: true, router: formatRouter(updated) });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

    const deleted = await deleteRouter(id);
    if (!deleted) return NextResponse.json({ error: 'Routeur non trouvé' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
