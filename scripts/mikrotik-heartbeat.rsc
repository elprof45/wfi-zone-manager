# ==============================================================================
# NetPulse Hotspot Manager — Script RouterOS Universel Heartbeat & Alerte
# Compatible : RouterOS v6.x et v7.x (Cloud Hosted Router, hEX, RB, CCR, CRS)
# Utilisation : Coller dans le terminal RouterOS ou importer via Files
# ==============================================================================

# Remplacer par l'IP ou le nom de domaine de votre serveur NetPulse :
:global NetPulseServerUrl "http://192.168.88.1:3000"
:global NetPulseRouterId "primary-router"

# Nettoyage des anciennes configurations NetPulse
/system scheduler remove [find name="netpulse-heartbeat-scheduler"]
/system script remove [find name="netpulse-heartbeat"]
/system script remove [find name="netpulse-alert"]

# Création du script de collecte de télémétrie
/system script add name="netpulse-heartbeat" policy=read,write,test,policy source={
    :global NetPulseServerUrl
    :global NetPulseRouterId
    
    :local srvUrl ($NetPulseServerUrl . "/api/mikrotik/heartbeat")
    :local rId $NetPulseRouterId
    
    :local cpuLoad [/system resource get cpu-load]
    :local freeMem [/system resource get free-memory]
    :local totalMem [/system resource get total-memory]
    :local sysUptime [/system resource get uptime]
    :local rosVer [/system resource get version]
    :local board [/system resource get board-name]

    :local activeUsers 0
    :do {
        :set activeUsers [:len [/ip hotspot active find]]
    } on-error={}

    :local fullUrl ("$srvUrl?routerId=" . $rId . "&cpu=" . $cpuLoad . "&freeMemory=" . $freeMem . "&totalMemory=" . $totalMem . "&uptime=" . $sysUptime . "&version=" . $rosVer . "&boardName=" . $board . "&activeUsers=" . $activeUsers)

    :do {
        /tool fetch url=$fullUrl keep-result=no
        :log info ("[NetPulse] Heartbeat envoye avec succes (CPU: " . $cpuLoad . "%, Actifs: " . $activeUsers . ")")
    } on-error={
        :log warning ("[NetPulse] Erreur: impossible de joindre " . $srvUrl)
    }
}

# Création du script d'alerte instantanée (à déclencher sur Netwatch ou interface down)
/system script add name="netpulse-alert" policy=read,write,test,policy source={
    :global NetPulseServerUrl
    :global NetPulseRouterId
    
    :local srvUrl ($NetPulseServerUrl . "/api/mikrotik/heartbeat")
    :local cpuLoad [/system resource get cpu-load]
    :local fullUrl ("$srvUrl?routerId=" . $NetPulseRouterId . "&alert=Alerte%20declenchee%20sur%20MikroTik&cpu=" . $cpuLoad)
    /tool fetch url=$fullUrl keep-result=no
}

# Planification du Heartbeat toutes les 5 minutes
/system scheduler add name="netpulse-heartbeat-scheduler" start-time=startup interval=5m on-event="netpulse-heartbeat"

:log info "[NetPulse] Heartbeat et Télémétrie installés avec succès."
