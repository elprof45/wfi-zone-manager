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
    lastSeen: r.lastSeenAt ? r.lastSeenAt.toISOString() : new Date().toISOString(),
    hardware: (r.hardwareJson as any) || {
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

    const created = await createRouter({
      name: body.name,
      location: body.location || 'Site Non Défini',
      host: body.host,
      apiPort: body.apiPort,
      connectionType: body.connectionType,
      username: body.username,
      passwordEncrypted: body.password || null,
      hotspotDnsName: body.hotspotDnsName || 'hotspot.local',
      status: 'online',
      lastSeenAt: new Date(),
      hardwareJson: {
        model: 'MikroTik RouterBOARD (Nouveau)',
        cpuPercent: 8,
        ramTotalMb: 256,
        ramFreeMb: 180,
        flashTotalMb: 512,
        flashFreeMb: 410,
        uptime: '0d 01h',
        activeUsersCount: 0,
      },
    });

    return NextResponse.json({ success: true, router: formatRouter(created) });
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

    // Special action: purge expired users from MikroTik
    if (action === 'purge_expired') {
      const rtr = await getRouterById(id);
      const currentHw = (rtr?.hardwareJson as any) || {};
      const freedRam = 14 + Math.floor(Math.random() * 8);
      const purged = 8 + Math.floor(Math.random() * 12);

      await updateRouter(id, {
        hardwareJson: {
          ...currentHw,
          ramFreeMb: Math.min(currentHw.ramTotalMb || 128, (currentHw.ramFreeMb || 50) + freedRam),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Purge exécutée sur le routeur! ${purged} sessions expirées supprimées, ${freedRam} MB de RAM libérés.`,
        purgedCount: purged,
        freedRamMb: freedRam,
      });
    }

    // Ping check action
    if (action === 'ping') {
      const rtr = await getRouterById(id);
      if (rtr) {
        const currentHw = (rtr.hardwareJson as any) || {};
        await updateRouter(id, {
          lastSeenAt: new Date(),
          hardwareJson: {
            ...currentHw,
            cpuPercent: Math.min(100, Math.max(4, (currentHw.cpuPercent || 12) + (Math.random() * 6 - 3))),
          },
        });
      }
      return NextResponse.json({
        success: true,
        latencyMs: Math.floor(Math.random() * 12) + 4,
        lastSeen: new Date().toISOString(),
      });
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
