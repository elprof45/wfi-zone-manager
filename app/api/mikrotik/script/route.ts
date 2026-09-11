// app/api/mikrotik/script/route.ts
// Generates custom MikroTik RouterOS scripts (.rsc) for automated heartbeat, telemetry & alerts

import { NextRequest, NextResponse } from 'next/server';
import { getRouterById, getAllRouters } from '@/lib/db/queries/routers';
import { requireRole } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const guard = await requireRole(['super_admin', 'admin']);
  if ('response' in guard) return guard.response;

  const url = new URL(req.url);
  const routerId = url.searchParams.get('routerId');
  const serverUrlParam = url.searchParams.get('serverUrl');
  const interval = url.searchParams.get('interval') || '5m';
  const heartbeatToken = process.env.MIKROTIK_HEARTBEAT_TOKEN;
  if (!heartbeatToken) {
    return NextResponse.json(
      { success: false, error: 'MIKROTIK_HEARTBEAT_TOKEN non configuré.' },
      { status: 503 }
    );
  }

  // Determine base server URL
  const origin = serverUrlParam || process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://192.168.88.1:3000';
  const cleanServerUrl = origin.replace(/\/+$/, '');

  let targetRouter = null;
  if (routerId) {
    targetRouter = await getRouterById(routerId);
  }
  if (!targetRouter) {
    const all = await getAllRouters();
    targetRouter = all[0] || null;
  }

  const routerName = targetRouter?.name || 'NetPulse-Router';
  const effectiveId = targetRouter?.id || 'primary-router';

  // Generate RouterOS Script (v6 and v7 compatible)
  const scriptContent = `# ==============================================================================
# NetPulse Hotspot Manager — Script de Télémétrie & Heartbeat RouterOS
# Routeur : ${routerName} (ID: ${effectiveId})
# Serveur NetPulse : ${cleanServerUrl}
# Fréquence : ${interval}
# ==============================================================================

# 1. Nettoyer les anciens scripts NetPulse s'ils existent
/system scheduler remove [find name="netpulse-heartbeat-scheduler"]
/system script remove [find name="netpulse-heartbeat"]
/system script remove [find name="netpulse-alert"]

# 2. Créer le script de collecte et d'envoi des métriques
/system script add name="netpulse-heartbeat" policy=read,write,test,policy source={
    :local srvUrl "${cleanServerUrl}/api/mikrotik/heartbeat"
    :local rId "${effectiveId}"
    
    # Collecte des métriques système RouterOS
    :local cpuLoad [/system resource get cpu-load]
    :local freeMem [/system resource get free-memory]
    :local totalMem [/system resource get total-memory]
    :local sysUptime [/system resource get uptime]
    :local rosVer [/system resource get version]
    :local board [/system resource get board-name]

    # Nombre d'utilisateurs Hotspot connectés
    :local activeUsers 0
    :do {
        :set activeUsers [:len [/ip hotspot active find]]
    } on-error={}

    # Construction de l'URL avec paramètres GET pour compatibilité RouterOS v6 et v7
    :local fullUrl ("$srvUrl?token=${heartbeatToken}&routerId=" . $rId . "&cpu=" . $cpuLoad . "&freeMemory=" . $freeMem . "&totalMemory=" . $totalMem . "&uptime=" . $sysUptime . "&version=" . $rosVer . "&boardName=" . $board . "&activeUsers=" . $activeUsers)

    # Envoi HTTP vers NetPulse
    :do {
        /tool fetch url=$fullUrl keep-result=no
        :log info ("[NetPulse] Heartbeat transmis avec succes (CPU: " . $cpuLoad . "%, Actifs: " . $activeUsers . ")")
    } on-error={
        :log warning "[NetPulse] Echec transmission heartbeat vers $srvUrl"
    }
}

# 3. Créer le script d'alerte immédiate (en cas de panne WAN ou surcharge)
/system script add name="netpulse-alert" policy=read,write,test,policy source={
    :local srvUrl "${cleanServerUrl}/api/mikrotik/heartbeat"
    :local rId "${effectiveId}"
    :local alertMsg "Alerte declenchee depuis RouterOS"
    :local cpuLoad [/system resource get cpu-load]
    
    :local fullUrl ("$srvUrl?token=${heartbeatToken}&routerId=" . $rId . "&alert=" . $alertMsg . "&cpu=" . $cpuLoad)
    /tool fetch url=$fullUrl keep-result=no
}

# 4. Planifier l'exécution automatique toutes les ${interval}
/system scheduler add name="netpulse-heartbeat-scheduler" start-time=startup interval=${interval} on-event="netpulse-heartbeat"

:log info "[NetPulse] Script de télémétrie et Heartbeat installe avec succes !"
# ==============================================================================
`;

  // Return as text file or raw script depending on query
  if (url.searchParams.get('download') === '1') {
    return new NextResponse(scriptContent, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="netpulse-heartbeat-${effectiveId}.rsc"`,
      },
    });
  }

  return NextResponse.json({
    success: true,
    routerId: effectiveId,
    routerName,
    serverUrl: cleanServerUrl,
    interval,
    script: scriptContent,
  });
}
