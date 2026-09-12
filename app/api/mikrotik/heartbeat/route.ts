// app/api/mikrotik/heartbeat/route.ts
// Inbound Heartbeat & Telemetry Endpoint for MikroTik RouterOS
// Allows MikroTik routers to push health status & trigger alerts via /tool fetch

import { NextRequest, NextResponse } from 'next/server';
import { getRouterById, updateRouterStatus, getAllRouters } from '@/lib/db/queries/routers';
import type { RouterHardwareMetrics } from '@/lib/db/schema';
import { dispatchToAllChannels } from '@/lib/notifications';

export async function GET(req: NextRequest) {
  return handleHeartbeat(req);
}

export async function POST(req: NextRequest) {
  return handleHeartbeat(req);
}

async function handleHeartbeat(req: NextRequest) {
  try {
    const expectedToken = process.env.MIKROTIK_HEARTBEAT_TOKEN;
    const suppliedToken =
      req.headers.get('x-netpulse-heartbeat-token') ||
      new URL(req.url).searchParams.get('token');

    if (!expectedToken || !suppliedToken || suppliedToken !== expectedToken) {
      return NextResponse.json(
        { success: false, error: 'Heartbeat authentication failed' },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    let routerId = url.searchParams.get('routerId') || url.searchParams.get('id');
    let host = url.searchParams.get('host');
    let cpu = url.searchParams.get('cpu') ? Number(url.searchParams.get('cpu')) : undefined;
    let freeMemory = url.searchParams.get('freeMemory') ? Number(url.searchParams.get('freeMemory')) : undefined;
    let totalMemory = url.searchParams.get('totalMemory') ? Number(url.searchParams.get('totalMemory')) : undefined;
    let uptime = url.searchParams.get('uptime') || undefined;
    let version = url.searchParams.get('version') || undefined;
    let boardName = url.searchParams.get('boardName') || url.searchParams.get('model') || undefined;
    let voltage = url.searchParams.get('voltage') ? Number(url.searchParams.get('voltage')) : undefined;
    let temperature = url.searchParams.get('temperature') ? Number(url.searchParams.get('temperature')) : undefined;
    let activeUsers = url.searchParams.get('activeUsers') ? Number(url.searchParams.get('activeUsers')) : undefined;
    let alert = url.searchParams.get('alert');

    // Parse JSON body if POST and content-type is json
    if (req.method === 'POST') {
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = await req.json().catch(() => ({}));
        if (body.routerId) routerId = body.routerId;
        if (body.host) host = body.host;
        if (body.cpu !== undefined) cpu = Number(body.cpu);
        if (body.freeMemory !== undefined) freeMemory = Number(body.freeMemory);
        if (body.totalMemory !== undefined) totalMemory = Number(body.totalMemory);
        if (body.uptime) uptime = body.uptime;
        if (body.version) version = body.version;
        if (body.boardName) boardName = body.boardName;
        if (body.voltage !== undefined) voltage = Number(body.voltage);
        if (body.temperature !== undefined) temperature = Number(body.temperature);
        if (body.activeUsers !== undefined) activeUsers = Number(body.activeUsers);
        if (body.alert) alert = body.alert;
      }
    }

    // Try to identify the router: by routerId or by host IP or first available router
    let targetRouter = null;
    if (routerId) {
      targetRouter = await getRouterById(routerId);
    }

    if (!targetRouter && host) {
      const all = await getAllRouters();
      targetRouter = all.find((r) => r.host === host) || null;
    }

    if (!targetRouter) {
      const all = await getAllRouters();
      if (all.length > 0) {
        targetRouter = all[0];
      }
    }

    if (!targetRouter) {
      return NextResponse.json(
        { success: false, error: 'Aucun routeur configuré dans NetPulse' },
        { status: 404 }
      );
    }

    // Calculate memory percentage if available
    let memoryPercent: number | undefined;
    if (freeMemory !== undefined && totalMemory && totalMemory > 0) {
      memoryPercent = Math.round(((totalMemory - freeMemory) / totalMemory) * 100);
    }

    const prevHw = (targetRouter.hardwareJson as any) || {};

    // Map incoming telemetry to the RouterHardwareMetrics schema shape
    const hardware: RouterHardwareMetrics & Record<string, unknown> = {
      // Required RouterHardwareMetrics fields
      model: boardName ?? prevHw.boardName ?? prevHw.model ?? 'MikroTik',
      cpuPercent: cpu ?? prevHw.cpuPercent ?? prevHw.cpuLoad ?? 0,
      ramTotalMb: totalMemory !== undefined ? Math.round(totalMemory / (1024 * 1024)) : (prevHw.ramTotalMb ?? 0),
      ramFreeMb: freeMemory !== undefined ? Math.round(freeMemory / (1024 * 1024)) : (prevHw.ramFreeMb ?? 0),
      flashTotalMb: prevHw.flashTotalMb ?? 0,
      flashFreeMb: prevHw.flashFreeMb ?? 0,
      uptime: uptime ?? prevHw.uptime ?? '',
      temperatureC: temperature ?? prevHw.temperatureC ?? prevHw.temperature,
      activeUsersCount: activeUsers ?? prevHw.activeUsersCount ?? prevHw.activeUsers ?? 0,
      // Extended fields stored alongside (JSONB allows extra keys)
      cpuLoad: cpu ?? prevHw.cpuLoad,
      freeMemory: freeMemory ?? prevHw.freeMemory,
      totalMemory: totalMemory ?? prevHw.totalMemory,
      memoryPercent: memoryPercent ?? prevHw.memoryPercent,
      version: version ?? prevHw.version,
      boardName: boardName ?? prevHw.boardName,
      voltage: voltage ?? prevHw.voltage,
      temperature: temperature ?? prevHw.temperature,
      activeUsers: activeUsers ?? prevHw.activeUsers,
      lastHeartbeatPush: new Date().toISOString(),
      source: 'mikrotik_tool_fetch',
    };

    // Update router status in database
    await updateRouterStatus(targetRouter.id, 'online', hardware);

    // ── Dispatch Alert if Critical Thresholds Exceeded ─────────────────────────
    const isCriticalCpu = cpu !== undefined && cpu >= 90;
    const isCriticalMemory = memoryPercent !== undefined && memoryPercent >= 95;
    const isExplicitAlert = Boolean(alert && alert.trim() !== '');

    if (isCriticalCpu || isCriticalMemory || isExplicitAlert) {
      const alertTitle = isExplicitAlert
        ? `⚠️ [Alerte MikroTik] ${targetRouter.name} : ${alert}`
        : isCriticalCpu
        ? `🔥 [Surcharge CPU] ${targetRouter.name} à ${cpu}% !`
        : `💾 [Saturation Mémoire] ${targetRouter.name} (${memoryPercent}% utilisé) !`;

      const alertText = `🚨 *Alerte Infrastructure NetPulse*\n` +
        `• Routeur : *${targetRouter.name}* (${targetRouter.host})\n` +
        `• Emplacement : ${targetRouter.location}\n` +
        `• CPU : ${cpu !== undefined ? `${cpu}%` : 'N/A'}\n` +
        `• Mémoire libre : ${freeMemory ? `${Math.round(freeMemory / (1024 * 1024))} Mo` : 'N/A'}\n` +
        `• Utilisateurs Hotspot actifs : ${activeUsers ?? 'N/A'}\n` +
        `• Message alerte : ${alert || 'Seuil critique franchi'}\n` +
        `• Date : ${new Date().toLocaleString('fr-FR')}`;

      // Dispatch to all active bots (Telegram, Discord and Resend / Mail)
      dispatchToAllChannels({
        text: alertText,
        emailSubject: `[NetPulse Alerte] ${alertTitle}`,
        emailHtml: `
          <div style="font-family: sans-serif; padding: 16px; border: 1px solid #e11d48; border-radius: 8px;">
            <h2 style="color: #e11d48;">${alertTitle}</h2>
            <p><strong>Routeur :</strong> ${targetRouter.name} (${targetRouter.host})</p>
            <p><strong>Emplacement :</strong> ${targetRouter.location}</p>
            <p><strong>Charge CPU :</strong> ${cpu !== undefined ? `${cpu}%` : 'N/A'}</p>
            <p><strong>Message :</strong> ${alert || 'Alerte infrastructure RouterOS'}</p>
            <p style="color: #64748b; font-size: 12px;">Horodatage : ${new Date().toISOString()}</p>
          </div>
        `,
      }).catch((e) => console.warn('⚠️ Échec expédition alerte heartbeat:', e.message));
    }

    return NextResponse.json({
      success: true,
      message: `Heartbeat reçu avec succès pour ${targetRouter.name}`,
      routerId: targetRouter.id,
      routerName: targetRouter.name,
      status: 'online',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('💥 [Heartbeat] Erreur de traitement:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
