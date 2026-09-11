// app/api/mikrotik/logs/route.ts
// Returns recent MikroTik heartbeat telemetry logs and cron worker status

import { NextRequest, NextResponse } from 'next/server';
import { getAllRouters } from '@/lib/db/queries/routers';
import { getCronStats } from '@/lib/cron/scheduler';
import { isDatabaseReady } from '@/lib/db';
import { requireSession } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  try {
    const guard = await requireSession();
    if ('response' in guard) return guard.response;

    const dbReady = await isDatabaseReady(2000);
    if (!dbReady) {
      return NextResponse.json({
        success: false,
        error: 'Base de données temporairement indisponible',
        dbConnected: false,
      }, { status: 503 });
    }

    const url = new URL(req.url);
    const routerId = url.searchParams.get('routerId');

    const allRouters = await getAllRouters();
    const targetRouters = routerId && routerId !== 'all'
      ? allRouters.filter((r) => r.id === routerId)
      : allRouters;

    // Build enriched router telemetry from hardware_json
    const telemetryLogs = targetRouters.map((r) => {
      const hw = (r.hardwareJson as any) || {};
      const isHeartbeatPushed = hw.source === 'mikrotik_tool_fetch';

      // Support both canonical RouterHardwareMetrics fields and extended heartbeat fields
      const cpuLoad = hw.cpuLoad ?? hw.cpuPercent ?? null;
      const memoryPercent = hw.memoryPercent
        ?? (hw.ramTotalMb && hw.ramFreeMb
          ? Math.round(((hw.ramTotalMb - hw.ramFreeMb) / hw.ramTotalMb) * 100)
          : null);

      return {
        routerId: r.id,
        routerName: r.name,
        host: r.host,
        location: r.location,
        status: r.status,
        lastSeenAt: r.lastSeenAt,
        connectionType: r.connectionType,
        telemetry: {
          // Normalized CPU (both sources)
          cpuLoad,
          // Canonical DB fields from RouterHardwareMetrics
          cpuPercent: hw.cpuPercent ?? null,
          ramTotalMb: hw.ramTotalMb ?? null,
          ramFreeMb: hw.ramFreeMb ?? null,
          model: hw.model ?? null,
          // Extended heartbeat fields
          freeMemory: hw.freeMemory ?? null,
          totalMemory: hw.totalMemory ?? null,
          memoryPercent,
          uptime: hw.uptime ?? null,
          version: hw.version ?? null,
          boardName: hw.boardName ?? hw.model ?? null,
          voltage: hw.voltage ?? null,
          temperature: hw.temperature ?? hw.temperatureC ?? null,
          activeUsers: hw.activeUsers ?? hw.activeUsersCount ?? null,
          activeUsersCount: hw.activeUsersCount ?? hw.activeUsers ?? null,
          lastHeartbeatPush: hw.lastHeartbeatPush ?? null,
          source: hw.source ?? 'api_poll',
        },
        isHeartbeatPushed,
        healthScore: computeHealthScore(r.status, hw.lastHeartbeatPush, cpuLoad, memoryPercent),
      };
    });

    const cronStats = getCronStats();

    return NextResponse.json({
      success: true,
      dbConnected: true,
      timestamp: new Date().toISOString(),
      routers: telemetryLogs,
      cron: cronStats,
      summary: {
        total: telemetryLogs.length,
        online: telemetryLogs.filter((r) => r.status === 'online').length,
        offline: telemetryLogs.filter((r) => r.status === 'offline').length,
        heartbeatPushed: telemetryLogs.filter((r) => r.isHeartbeatPushed).length,
        criticalCpu: telemetryLogs.filter((r) => (r.telemetry.cpuLoad ?? 0) >= 85).length,
        criticalMemory: telemetryLogs.filter((r) => (r.telemetry.memoryPercent ?? 0) >= 90).length,
      },
    });
  } catch (error: any) {
    console.error('💥 [MikroTik Logs] Erreur:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function computeHealthScore(
  status: string,
  lastHeartbeat: string | null | undefined,
  cpuLoad: number | null | undefined,
  memoryPercent: number | null | undefined
): number {
  if (status !== 'online') return 0;
  let score = 60; // Base score for being online

  // +20 if heartbeat within last 10 minutes
  if (lastHeartbeat) {
    const diff = Date.now() - new Date(lastHeartbeat).getTime();
    if (diff < 10 * 60 * 1000) score += 20;
    else if (diff < 30 * 60 * 1000) score += 10;
  }

  // +20 based on CPU usage
  if (cpuLoad !== null && cpuLoad !== undefined) {
    if (cpuLoad < 50) score += 20;
    else if (cpuLoad < 80) score += 10;
    else score -= 10;
  }

  // -10 if memory is critical
  if (memoryPercent !== null && memoryPercent !== undefined && memoryPercent >= 90) {
    score -= 10;
  }

  return Math.min(100, Math.max(0, score));
}
