'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
    Copy, Check, Download, Wifi, Globe, UserCog, Cable, ArrowLeftRight,
    ShieldCheck, Radio, Settings2, Gauge, Clock, Mail, Save, RefreshCw,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type TabId = 'net' | 'access' | 'vpn' | 'nat' | 'qos' | 'sec' | 'mon' | 'auto';

interface PortForward { name: string; proto: 'tcp' | 'udp'; wanPort: string; toIp: string; toPort: string; }
interface WatchHost { name: string; ip: string; }

interface Config {
  identity: string; timezone: string; ntp: string; wanInterface: string;
  dnsServers: string; dohServer: string;
  username: string; password: string; group: string; idleTimeout: string; sshPubKey: string;
  portWinbox: number; portApi: number; portSsh: number;
  wgPort: number; wgSubnet: string;
  lanSubnet: string; portForwards: PortForward[]; dmzIp: string;
  maxAttempts: number; banDuration: string; allowlistIps: string;
  threatFeedUrl: string; threatFeedInterval: string;
  watchHosts: WatchHost[]; pingTarget: string; pingInterval: string;
  watchdogTarget: string; watchdogFails: string; bandwidthThreshold: number;
  cleanTime: string; backupFreq: string; backupPassword: string; backupKeep: number;
  tgToken: string; tgChatId: string;
  qosTarget: string; qosUpload: number; qosDownload: number;
  rebootDay: string; rebootTime: string;
  smtpServer: string; smtpPort: number; smtpFrom: string; smtpTo: string; smtpUser: string; smtpPassword: string;
  healthCpuThreshold: number; healthMemThreshold: number;
}

interface Flags {
  ddns: boolean; dnsAllowRemote: boolean; doh: boolean;
  disableAdmin: boolean; sshKey: boolean;
  wireguard: boolean;
  natMasquerade: boolean; dmz: boolean;
  bruteforce: boolean; allowlist: boolean; dos: boolean; ipv6: boolean;
  discovery: boolean; romon: boolean; macserver: boolean; disableInsecure: boolean;
  threatFeed: boolean;
  netwatch: boolean; pingTest: boolean; watchdog: boolean; bandwidthAlert: boolean;
  cleaner: boolean; backup: boolean; backupRetention: boolean; telegram: boolean; updateCheck: boolean;
  qos: boolean; weeklyReboot: boolean; emailAlert: boolean;
  dhcpCleanup: boolean; connTrackFlush: boolean; healthCheck: boolean;
}

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'net', label: 'Réseau', icon: Globe },
  { id: 'access', label: 'Comptes', icon: UserCog },
  { id: 'vpn', label: 'Ports & VPN', icon: Cable },
  { id: 'nat', label: 'NAT & DMZ', icon: ArrowLeftRight },
  { id: 'qos', label: 'QoS', icon: Gauge },
  { id: 'sec', label: 'Sécurité', icon: ShieldCheck },
  { id: 'mon', label: 'Supervision', icon: Radio },
  { id: 'auto', label: 'Automatisation', icon: Settings2 },
];

const DEFAULT_C: Config = {
  identity: 'NetPulse-GW-01', timezone: 'Africa/Lome', ntp: 'pool.ntp.org,time.google.com', wanInterface: '',
  dnsServers: '1.1.1.1,8.8.8.8', dohServer: 'https://cloudflare-dns.com/dns-query',
  username: 'api-distant', password: '', group: 'full', idleTimeout: '15m', sshPubKey: '',
  portWinbox: 58291, portApi: 58728, portSsh: 58722,
  wgPort: 51820, wgSubnet: '10.20.30.1/24',
  lanSubnet: '192.168.88.0/24',
  portForwards: [{ name: 'Mikhmon-Web', proto: 'tcp', wanPort: '8080', toIp: '192.168.88.2', toPort: '80' }],
  dmzIp: '', maxAttempts: 4, banDuration: '1d', allowlistIps: '',
  threatFeedUrl: '', threatFeedInterval: '1d',
  watchHosts: [{ name: 'Passerelle FAI', ip: '1.1.1.1' }],
  pingTarget: '1.1.1.1', pingInterval: '5m',
  watchdogTarget: '1.1.1.1', watchdogFails: '10', bandwidthThreshold: 80,
  cleanTime: '03:00', backupFreq: '1d', backupPassword: '', backupKeep: 5, tgToken: '', tgChatId: '',
  qosTarget: '192.168.88.0/24', qosUpload: 50, qosDownload: 100,
  rebootDay: 'sun', rebootTime: '04:30',
  smtpServer: '', smtpPort: 587, smtpFrom: '', smtpTo: '', smtpUser: '', smtpPassword: '',
  healthCpuThreshold: 90, healthMemThreshold: 32,
};

const DEFAULT_F: Flags = {
  ddns: true, dnsAllowRemote: true, doh: false,
  disableAdmin: true, sshKey: false,
  wireguard: true,
  natMasquerade: true, dmz: false,
  bruteforce: true, allowlist: false, dos: true, ipv6: true,
  discovery: true, romon: true, macserver: true, disableInsecure: true,
  threatFeed: false,
  netwatch: true, pingTest: true, watchdog: false, bandwidthAlert: false,
  cleaner: true, backup: true, backupRetention: true, telegram: false, updateCheck: true,
  qos: false, weeklyReboot: false, emailAlert: false,
  dhcpCleanup: true, connTrackFlush: false, healthCheck: false,
};

// ─── Script generator (pure function) ─────────────────────────────────────────
function generateScript(c: Config, f: Flags): string {
  const L: string[] = [];
  const push = (s = '') => L.push(s);
  const mgmtPorts = [c.portWinbox, c.portApi, c.portSsh].filter(Boolean).join(',');

  push('# =====================================================================');
  push('# NETPULSE — REMOTE ACCESS, HARDENING & AUTOMATION FOR ROUTEROS v7 (2026)');
  push('# Cible : MikroTik RouterOS v7.24+  |  Généré pour : ' + (c.identity || 'router'));
  push('# =====================================================================');
  push();
  push('{');
  push('  :log warning "--- NetPulse : debut du deploiement ---";');
  push();

  push('  # --- IDENTITE & HORLOGE');
  push(`  /system/identity/set name="${c.identity}";`);
  push(`  /system/clock/set time-zone-name=${c.timezone};`);
  push(`  /system/ntp/client/set enabled=yes servers="${c.ntp}";`);
  push();

  push('  # --- DNS');
  push(`  /ip/dns/set servers="${c.dnsServers}" allow-remote-requests=${f.dnsAllowRemote ? 'yes' : 'no'} cache-size=4096KiB;`);
  if (f.doh) push(`  /ip/dns/set use-doh-server="${c.dohServer}" verify-doh-cert=yes;`);
  push();

  if (f.ddns) {
    push("  # --- DDNS CLOUD MIKROTIK (nom de domaine fixe malgre une IP dynamique)");
    push('  /ip/cloud/set ddns-enabled=yes update-time=yes;');
    push('  /ip/cloud/force-update;');
    push('  :delay 2s;');
    push(`  :log info ("[NetPulse] Nom DDNS Cloud (a utiliser dans WinBox / l'appli mobile) : " . [/ip/cloud/get dns-name]);`);
    push();
  }

  push("  # --- DETECTION DE L'INTERFACE WAN");
  if (c.wanInterface.trim() !== '') {
    push(`  :local wanName "${c.wanInterface.trim()}";`);
  } else {
    push('  :local wanName "";');
    push('  :local gwRoute [/ip/route/find where dst-address=0.0.0.0/0 and active=yes];');
    push('  :if ($gwRoute != "") do={');
    push('    :local gw [/ip/route/get $gwRoute gateway];');
    push('    :if ([:typeof $gw] != "ip") do={ :set wanName [:tostr $gw]; } else={');
    push('      :set wanName [/ip/address/get [/ip/address/find where network=($gw & 255.255.255.255)] interface];');
    push('    }');
    push('  }');
    push('  :if ($wanName = "") do={ :set wanName "ether1"; }');
  }
  push('  :log info "Interface WAN : $wanName";');
  push();

  push('  # --- COMPTE DISTANT DEDIE');
  push(`  /user/remove [find where name="${c.username}"];`);
  push(`  /user/add name="${c.username}" group=${c.group} password="${c.password}" comment="Compte reserve a l'acces distant";`);
  if (f.sshKey && c.sshPubKey.trim() !== '') {
    push(`  /user/ssh-keys/remove [find where user="${c.username}"];`);
    push(`  # Importer la cle manuellement : /user/ssh-keys/import public-key-file=... user=${c.username}`);
    push(`  # Cle fournie : ${c.sshPubKey.trim()}`);
  }
  if (f.disableAdmin) push('  /user/disable [find where name="admin"];');
  push(`  /ip/service/set winbox port=${c.portWinbox} disabled=no;`);
  push(`  /ip/service/set api port=${c.portApi} disabled=no;`);
  push(`  /ip/service/set ssh port=${c.portSsh} disabled=no;`);
  if (f.disableInsecure) push('  /ip/service/disable [find where name~"www|api-ssl|telnet|ftp"];');
  push();

  if (f.wireguard) {
    push('  # --- TUNNEL VPN WIREGUARD');
    push('  /interface/wireguard/remove [find where name="wg-remote"];');
    push(`  /interface/wireguard/add name=wg-remote listen-port=${c.wgPort} comment="NetPulse VPN";`);
    push('  /ip/address/remove [find where interface="wg-remote"];');
    push(`  /ip/address/add address=${c.wgSubnet} interface=wg-remote;`);
    push(`  /ip/firewall/filter/add chain=input action=accept protocol=udp dst-port=${c.wgPort} in-interface=$wanName comment="NetPulse : autoriser WireGuard" place-before=0;`);
    push('  :log info ("Cle publique WireGuard : " . [/interface/wireguard/get [find name="wg-remote"] public-key]);');
    push('  # Ajouter un pair : /interface/wireguard/peers/add interface=wg-remote public-key="<cle-client>" allowed-address=<ip-client>/32');
    push();
  }

  if (f.natMasquerade) {
    push('  # --- NAT : PARTAGE DE CONNEXION');
    push('  /ip/firewall/nat/remove [find where comment="NetPulse : NAT LAN"];');
    push(`  /ip/firewall/nat/add chain=srcnat action=masquerade src-address=${c.lanSubnet} out-interface=$wanName comment="NetPulse : NAT LAN";`);
    push();
  }

  if (c.portForwards.length > 0) {
    push('  # --- REDIRECTIONS DE PORTS (PORT FORWARDING)');
    push('  /ip/firewall/nat/remove [find where comment~"NetPulse-FWD"];');
    push('  /ip/firewall/filter/remove [find where comment~"NetPulse-FWD"];');
    c.portForwards.forEach(pf => {
      if (!pf.wanPort || !pf.toIp) return;
      const name = pf.name || `${pf.toIp}:${pf.toPort}`;
      push(`  /ip/firewall/nat/add chain=dstnat action=dst-nat protocol=${pf.proto} dst-port=${pf.wanPort} in-interface=$wanName to-addresses=${pf.toIp} to-ports=${pf.toPort} comment="NetPulse-FWD:${name}";`);
      push(`  /ip/firewall/filter/add chain=forward action=accept protocol=${pf.proto} dst-address=${pf.toIp} dst-port=${pf.toPort} comment="NetPulse-FWD:${name}";`);
    });
    push();
  }

  if (f.dmz && c.dmzIp.trim() !== '') {
    push('  # --- DMZ');
    push('  /ip/firewall/nat/remove [find where comment="NetPulse : DMZ"];');
    push(`  /ip/firewall/nat/add chain=dstnat action=dst-nat to-addresses=${c.dmzIp.trim()} in-interface=$wanName comment="NetPulse : DMZ" place-before=[:len [/ip/firewall/nat/find]];`);
    push(`  /ip/firewall/filter/add chain=forward action=accept dst-address=${c.dmzIp.trim()} comment="NetPulse : DMZ - forward";`);
    push(`  :log warning "DMZ active vers ${c.dmzIp.trim()} — hote entierement expose.";`);
    push();
  }

  if (f.qos && c.qosTarget.trim() !== '') {
    push('  # --- LIMITATION DE BANDE PASSANTE (QUEUE SIMPLE)');
    push('  /queue/simple/remove [find where comment="NetPulse : QoS LAN"];');
    push(`  /queue/simple/add name=NetPulse-QoS-LAN target=${c.qosTarget.trim()} max-limit=${c.qosUpload}M/${c.qosDownload}M comment="NetPulse : QoS LAN";`);
    push();
  }

  push('  # --- PARE-FEU : NETTOYAGE DES ANCIENNES REGLES NETPULSE');
  push('  /ip/firewall/filter/remove [find where comment~"NetPulse :"];');
  push();

  if (f.allowlist && c.allowlistIps.trim() !== '') {
    push('  # --- LISTE BLANCHE DE GESTION');
    push('  /ip/firewall/address-list/remove [find where list="NetPulse_Allowlist"];');
    c.allowlistIps.split('\n').map(s => s.trim()).filter(Boolean).forEach(ip => {
      push(`  /ip/firewall/address-list/add list=NetPulse_Allowlist address=${ip};`);
    });
    push(`  /ip/firewall/filter/add chain=input action=accept protocol=tcp dst-port=${mgmtPorts} src-address-list=NetPulse_Allowlist in-interface=$wanName comment="NetPulse : autoriser liste blanche" place-before=0;`);
    push(`  /ip/firewall/filter/add chain=input action=drop protocol=tcp dst-port=${mgmtPorts} in-interface=$wanName comment="NetPulse : bloquer hors liste blanche" place-before=1;`);
    push();
  } else if (f.bruteforce) {
    push(`  # --- ANTI-BRUTE-FORCE PROGRESSIF (quarantaine ${c.banDuration})`);
    push(`  /ip/firewall/filter/add chain=input action=drop protocol=tcp dst-port=${mgmtPorts} src-address-list=NetPulse_Blacklist in-interface=$wanName comment="NetPulse : IP en quarantaine" place-before=0;`);
    push(`  /ip/firewall/filter/add chain=input action=add-src-to-address-list protocol=tcp dst-port=${mgmtPorts} connection-state=new src-address-list=NetPulse_Stage${c.maxAttempts - 1} address-list=NetPulse_Blacklist address-list-timeout=${c.banDuration} comment="NetPulse : mise en quarantaine" place-before=1;`);
    for (let i = c.maxAttempts - 1; i >= 2; i--) {
      push(`  /ip/firewall/filter/add chain=input action=add-src-to-address-list protocol=tcp dst-port=${mgmtPorts} connection-state=new src-address-list=NetPulse_Stage${i - 1} address-list=NetPulse_Stage${i} address-list-timeout=1m comment="NetPulse : etape ${i}" place-before=${c.maxAttempts - i + 1};`);
    }
    push(`  /ip/firewall/filter/add chain=input action=add-src-to-address-list protocol=tcp dst-port=${mgmtPorts} connection-state=new address-list=NetPulse_Stage1 address-list-timeout=1m comment="NetPulse : premier contact" place-before=${c.maxAttempts};`);
    push(`  /ip/firewall/filter/add chain=input action=accept protocol=tcp dst-port=${mgmtPorts} in-interface=$wanName comment="NetPulse : autoriser gestion distante" place-before=${c.maxAttempts + 1};`);
    push();
  }

  if (f.threatFeed && c.threatFeedUrl.trim() !== '') {
    push("  # --- FLUX DE MENACE DYNAMIQUE (starter template — à valider avant prod)");
    push('  /ip/firewall/filter/remove [find where comment="NetPulse : bloquer flux de menace"];');
    push('  /ip/firewall/filter/add chain=input action=drop src-address-list=NetPulse_ThreatFeed in-interface=$wanName comment="NetPulse : bloquer flux de menace" place-before=0;');
    push('  /system/script/remove [find name="NetPulse-Threat-Update"];');
    push('  /system/scheduler/remove [find name="NetPulse-Run-Threat"];');
    push(`  /system/script/add name=NetPulse-Threat-Update owner=${c.username} policy=read,write,policy,test source="\\`);
    push(`    /ip/firewall/address-list/remove [find where list=\\"NetPulse_ThreatFeed\\"];\\`);
    push(`    :local raw [/tool/fetch url=\\"${c.threatFeedUrl.trim()}\\" as-value output=user]->\\"data\\";\\`);
    push(`    :local start 0; :local pos 0;\\`);
    push(`    :while ($start < [:len $raw]) do={\\`);
    push(`      :set pos [:find $raw \\"\\\\n\\" $start];\\`);
    push(`      :if ([:typeof $pos] = \\"nothing\\") do={ :set pos [:len $raw]; }\\`);
    push(`      :local ip [:pick $raw $start $pos];\\`);
    push(`      :if ([:len $ip] > 0) do={ :do { /ip/firewall/address-list/add list=NetPulse_ThreatFeed address=$ip timeout=${c.threatFeedInterval}; } on-error={}; }\\`);
    push(`      :set start ($pos + 1);\\`);
    push(`    }\\`);
    push(`    :log info \\"[NetPulse] Flux de menace mis a jour.\\";\\`);
    push('  "');
    push(`  /system/scheduler/add name=NetPulse-Run-Threat start-time=startup interval=${c.threatFeedInterval} on-event=NetPulse-Threat-Update policy=read,write,policy,test;`);
    push();
  }

  if (f.dos) {
    push('  # --- PROTECTION DoS / SYN FLOOD');
    push('  /ip/firewall/filter/add chain=input protocol=tcp tcp-flags=syn connection-state=new action=jump jump-target=syn-protect comment="NetPulse : DoS - jump" place-before=0;');
    push('  /ip/firewall/filter/add chain=syn-protect action=accept limit=400,5:packet comment="NetPulse : DoS - limite acceptee";');
    push('  /ip/firewall/filter/add chain=syn-protect action=drop comment="NetPulse : DoS - au-dela de la limite";');
    push('  /ip/firewall/filter/add chain=input protocol=icmp limit=50,5:packet action=accept comment="NetPulse : ICMP limite";');
    push('  /ip/firewall/filter/add chain=input protocol=icmp action=drop comment="NetPulse : ICMP au-dela";');
    push();
  }
  if (f.ipv6) {
    push('  # --- IPv6 : BLOCAGE PAR DEFAUT');
    push('  /ipv6/firewall/filter/add chain=input action=drop in-interface=$wanName comment="NetPulse : bloquer IPv6 entrant";');
    push();
  }
  if (f.discovery) push('  /ip/neighbor/discovery-settings/set discover-interface-list=!$wanName;');
  if (f.romon) push('  /tool/romon/set enabled=no;');
  if (f.macserver) {
    push('  /tool/mac-server/set allowed-interface-list=none;');
    push('  /tool/mac-server/mac-winbox/set allowed-interface-list=none;');
    push('  /tool/mac-server/ping/set enabled=no;');
  }
  if (f.discovery || f.romon || f.macserver) push();

  if (f.netwatch && c.watchHosts.length > 0) {
    push("  # --- SURVEILLANCE D'HOTES (NETWATCH)");
    push('  /tool/netwatch/remove [find where comment~"NetPulse"];');
    c.watchHosts.forEach(h => {
      if (!h.ip) return;
      const name = h.name || h.ip;
      push(`  /tool/netwatch/add host=${h.ip} interval=30s comment="NetPulse:${name}" up-script=":log info \\"[NetPulse] ${name} (${h.ip}) : de nouveau joignable.\\"" down-script=":log warning \\"[NetPulse] ${name} (${h.ip}) : injoignable.\\"";`);
    });
    push();
  }

  if (f.pingTest) {
    push('  # --- TEST DE LATENCE PLANIFIE');
    push('  /system/script/remove [find name="NetPulse-Ping-Test"];');
    push('  /system/scheduler/remove [find name="NetPulse-Run-Ping"];');
    push(`  /system/script/add name=NetPulse-Ping-Test owner=${c.username} policy=read,test source="\\`);
    push(`    :local result [/ping ${c.pingTarget} count=5 as-value];\\`);
    push(`    :local sent 5; :local received 0; :local totalTime 0;\\`);
    push(`    :foreach r in=$result do={ :if ($r->\\"status\\" = \\"\\") do={ :set received ($received + 1); :set totalTime ($totalTime + ($r->\\"time\\")); } }\\`);
    push(`    :local avg 0; :if ($received > 0) do={ :set avg ($totalTime / $received); }\\`);
    push(`    :local loss ((($sent - $received) * 100) / $sent);\\`);
    push(`    :log info (\\"[NetPulse] Ping ${c.pingTarget} — perte: \\" . $loss . \\"% latence moy: \\" . $avg);\\`);
    push('  "');
    push(`  /system/scheduler/add name=NetPulse-Run-Ping start-time=startup interval=${c.pingInterval} on-event=NetPulse-Ping-Test policy=read,test;`);
    push();
  }

  if (f.watchdog && c.watchdogTarget.trim() !== '') {
    push('  # --- WATCHDOG : REDEMARRAGE AUTOMATIQUE SI WAN INJOIGNABLE');
    push('  /system/script/remove [find name="NetPulse-Watchdog"];');
    push('  /tool/netwatch/remove [find where comment="NetPulse : watchdog"];');
    push(`  /system/script/add name=NetPulse-Watchdog owner=${c.username} policy=read,write,test,reboot source="\\`);
    push(`    :global npWatchdogFails;\\`);
    push(`    :if ([:typeof $npWatchdogFails] = \\"nothing\\") do={ :set npWatchdogFails 0; }\\`);
    push(`    :set npWatchdogFails ($npWatchdogFails + 1);\\`);
    push(`    :log warning (\\"[NetPulse] Echec watchdog #\\" . $npWatchdogFails);\\`);
    push(`    :if ($npWatchdogFails >= ${c.watchdogFails}) do={\\`);
    push(`      :log warning \\"[NetPulse] Seuil atteint — redemarrage du routeur.\\";\\`);
    push(`      /system/reboot;\\`);
    push(`    }\\`);
    push('  "');
    push(`  /system/script/add name=NetPulse-Watchdog-Reset owner=${c.username} policy=read,write,test source="\\`);
    push(`    :global npWatchdogFails; :set npWatchdogFails 0;\\`);
    push('  "');
    push(`  /tool/netwatch/add host=${c.watchdogTarget.trim()} interval=30s comment="NetPulse : watchdog" down-script="/system/script/run NetPulse-Watchdog" up-script="/system/script/run NetPulse-Watchdog-Reset";`);
    push();
  }

  if (f.bandwidthAlert) {
    push('  # --- ALERTE DE SATURATION DE BANDE PASSANTE');
    push('  /system/script/remove [find name="NetPulse-Bandwidth-Check"];');
    push('  /system/scheduler/remove [find name="NetPulse-Run-Bandwidth"];');
    push(`  /system/script/add name=NetPulse-Bandwidth-Check owner=${c.username} policy=read,test source="\\`);
    push(`    :local t [/interface/monitor-traffic $wanName once as-value];\\`);
    push(`    :local rxMbps (($t->\\"rx-bits-per-second\\") / 1000000);\\`);
    push(`    :local txMbps (($t->\\"tx-bits-per-second\\") / 1000000);\\`);
    push(`    :if ($rxMbps > ${c.bandwidthThreshold} or $txMbps > ${c.bandwidthThreshold}) do={\\`);
    push(`      :log warning (\\"[NetPulse] Bande passante elevee — RX: \\" . $rxMbps . \\"Mbps TX: \\" . $txMbps . \\"Mbps\\");\\`);
    push(`    }\\`);
    push('  "');
    push(`  /system/scheduler/add name=NetPulse-Run-Bandwidth start-time=startup interval=5m on-event=NetPulse-Bandwidth-Check policy=read,test;`);
    push();
  }

  if (f.healthCheck) {
    push('  # --- SURVEILLANCE SANTE DU ROUTEUR (CPU / MEMOIRE LIBRE)');
    push('  /system/script/remove [find name="NetPulse-Health-Check"];');
    push('  /system/scheduler/remove [find name="NetPulse-Run-Health"];');
    push(`  /system/script/add name=NetPulse-Health-Check owner=${c.username} policy=read,test source="\\`);
    push(`    :local res [/system/resource/get];\\`);
    push(`    :local cpuLoad ($res->\\"cpu-load\\");\\`);
    push(`    :local freeMemMB (($res->\\"free-memory\\") / 1048576);\\`);
    push(`    :if ($cpuLoad > ${c.healthCpuThreshold}) do={\\`);
    push(`      :log warning (\\"[NetPulse] Charge CPU elevee : \\" . $cpuLoad . \\"%\\");\\`);
    push(`    }\\`);
    push(`    :if ($freeMemMB < ${c.healthMemThreshold}) do={\\`);
    push(`      :log warning (\\"[NetPulse] Memoire libre faible : \\" . $freeMemMB . \\"MB\\");\\`);
    push(`    }\\`);
    push('  "');
    push(`  /system/scheduler/add name=NetPulse-Run-Health start-time=startup interval=5m on-event=NetPulse-Health-Check policy=read,test;`);
    push();
  }

  if (f.cleaner) {
    push('  # --- NETTOYAGE PROFOND PLANIFIE (hotspot / Mikhmon / optimisations)');
    push('  /system/script/remove [find name="NetPulse-Deep-Clean"];');
    push('  /system/scheduler/remove [find name="NetPulse-Run-Clean"];');
    push(`  /system/script/add name=NetPulse-Deep-Clean owner=${c.username} policy=read,write,policy,test source="\\`);
    push(`    :log warning \\"[NetPulse] Nettoyage en cours...\\";\\`);
    push(`    :local count 0;\\`);
    push(`    /ip/hotspot/active/remove [find where idle-time>30m];\\`);
    push(`    :foreach u in=[/ip/hotspot/user/find where comment~\\"expired\\"] do={\\`);
    push(`      /ip/hotspot/user/remove $u; :set count ($count + 1);\\`);
    push(`      :if (($count % 20) = 0) do={ :delay 50ms; }\\`);
    push(`    }\\`);
    push(`    /ip/hotspot/host/remove [find where !authorized and !bypassed];\\`);
    if (f.dhcpCleanup) {
      push(`    :local dhcpStuck [:len [/ip/dhcp-server/lease/find where status=\\"waiting\\"]];\\`);
      push(`    /ip/dhcp-server/lease/remove [find where status=\\"waiting\\"];\\`);
      push(`    :log warning (\\"[NetPulse] Baux DHCP bloques purges : \\" . $dhcpStuck);\\`);
    }
    if (f.connTrackFlush) {
      push(`    /ip/firewall/connection/remove [find];\\`);
      push(`    :log warning \\"[NetPulse] Table de suivi de connexions videe.\\";\\`);
    }
    push(`    /ip/dns/cache/flush;\\`);
    push(`    :log warning (\\"[NetPulse] Nettoyage termine. Fiches purgees: \\" . $count);\\`);
    push('  "');
    push(`  /system/scheduler/add name=NetPulse-Run-Clean start-time=${c.cleanTime}:00 interval=1d on-event=NetPulse-Deep-Clean policy=read,write,policy,test;`);
    push();
  }

  if (f.backup) {
    push('  # --- SAUVEGARDE PLANIFIEE DE LA CONFIGURATION');
    push('  /system/script/remove [find name="NetPulse-Backup"];');
    push('  /system/scheduler/remove [find name="NetPulse-Run-Backup"];');
    push(`  /system/script/add name=NetPulse-Backup owner=${c.username} policy=read,write,policy,test source="\\`);
    push(`    :local fname (\\"${c.identity}-backup-\\" . [/system/clock/get date]);\\`);
    push(`    /system/backup/save name=$fname password=\\"${c.backupPassword}\\" dont-encrypt=no;\\`);
    push(`    :log info (\\"[NetPulse] Sauvegarde creee : \\" . $fname);\\`);
    if (f.backupRetention) {
      push(`    :local oldFiles [/file/find where name~\\"${c.identity}-backup-\\" and type=\\"backup\\"];\\`);
      push(`    :local total [:len $oldFiles];\\`);
      push(`    :if ($total > ${c.backupKeep}) do={\\`);
      push(`      :local excess ($total - ${c.backupKeep});\\`);
      push(`      :for i from=0 to=($excess - 1) do={\\`);
      push(`        /file/remove [:pick $oldFiles $i];\\`);
      push(`      }\\`);
      push(`      :log info (\\"[NetPulse] Anciennes sauvegardes supprimees : \\" . $excess);\\`);
      push(`    }\\`);
    }
    push('  "');
    push(`  /system/scheduler/add name=NetPulse-Run-Backup start-time=04:00:00 interval=${c.backupFreq} on-event=NetPulse-Backup policy=read,write,policy,test;`);
    push();
  }

  if (f.telegram && c.tgToken.trim() !== '') {
    push('  # --- ALERTE TELEGRAM A LA CONNEXION (modele de depart)');
    push('  /system/script/remove [find name="NetPulse-Telegram-Alert"];');
    push('  /system/scheduler/remove [find name="NetPulse-Run-Telegram"];');
    push(`  /system/script/add name=NetPulse-Telegram-Alert owner=${c.username} policy=read,write,policy,test,api source="\\`);
    push(`    :global npLastCheck;\\`);
    push(`    :if ([:typeof $npLastCheck] = \\"nothing\\") do={ :set npLastCheck [/system/clock/get time]; }\\`);
    push(`    :foreach e in=[/log/find where message~\\"logged in\\" and time>$npLastCheck] do={\\`);
    push(`      :local msg [/log/get $e message];\\`);
    push(`      :local url (\\"https://api.telegram.org/bot${c.tgToken.trim()}/sendMessage?chat_id=${c.tgChatId.trim()}&text=\\" . [:tostr $msg]);\\`);
    push(`      /tool/fetch url=$url keep-result=no;\\`);
    push(`    }\\`);
    push(`    :set npLastCheck [/system/clock/get time];\\`);
    push('  "');
    push(`  /system/scheduler/add name=NetPulse-Run-Telegram start-time=00:00:00 interval=1m on-event=NetPulse-Telegram-Alert policy=read,write,policy,test,api;`);
    push();
  }

  if (f.updateCheck) {
    push('  # --- VERIFICATION HEBDOMADAIRE DES MISES A JOUR (sans installation)');
    push('  /system/script/remove [find name="NetPulse-Update-Check"];');
    push('  /system/scheduler/remove [find name="NetPulse-Run-Update-Check"];');
    push(`  /system/script/add name=NetPulse-Update-Check owner=${c.username} policy=read,write,test source="\\`);
    push(`    /system/package/update/check-for-updates;\\`);
    push(`    :delay 3s;\\`);
    push(`    :log info (\\"[NetPulse] Version disponible : \\" . [/system/package/update/get latest-version]);\\`);
    push('  "');
    push(`  /system/scheduler/add name=NetPulse-Run-Update-Check start-time=05:00:00 interval=7d on-event=NetPulse-Update-Check policy=read,write,test;`);
    push();
  }

  if (f.weeklyReboot) {
    push('  # --- REDEMARRAGE HEBDOMADAIRE DE MAINTENANCE');
    push('  /system/scheduler/remove [find name="NetPulse-Weekly-Reboot"];');
    push(`  /system/scheduler/add name=NetPulse-Weekly-Reboot start-time=${c.rebootTime}:00 interval=7d on-event="/system reboot" policy=reboot,test comment="NetPulse : reboot hebdo (${c.rebootDay})";`);
    push('  # Ajustez si besoin le jour exact : /system/scheduler/set NetPulse-Weekly-Reboot start-date=jj/mmm/aaaa');
    push();
  }

  if (f.emailAlert && c.smtpServer.trim() !== '') {
    push('  # --- ALERTE EMAIL A LA CONNEXION (SMTP)');
    push(`  /tool/e-mail/set address="${c.smtpServer.trim()}" port=${c.smtpPort} from="${c.smtpFrom.trim()}" user="${c.smtpUser.trim()}" password="${c.smtpPassword}" tls=yes;`);
    push('  /system/script/remove [find name="NetPulse-Email-Alert"];');
    push('  /system/scheduler/remove [find name="NetPulse-Run-Email"];');
    push(`  /system/script/add name=NetPulse-Email-Alert owner=${c.username} policy=read,write,policy,test source="\\`);
    push(`    :global npLastEmailCheck;\\`);
    push(`    :if ([:typeof $npLastEmailCheck] = \\"nothing\\") do={ :set npLastEmailCheck [/system/clock/get time]; }\\`);
    push(`    :local hits 0;\\`);
    push(`    :foreach e in=[/log/find where message~\\"logged in\\" and time>$npLastEmailCheck] do={ :set hits ($hits + 1); }\\`);
    push(`    :if ($hits > 0) do={\\`);
    push(`      /tool/e-mail/send to=\\"${c.smtpTo.trim()}\\" subject=\\"[NetPulse] Connexions detectees\\" body=(\\"Nombre de nouvelles connexions : \\" . $hits);\\`);
    push(`    }\\`);
    push(`    :set npLastEmailCheck [/system/clock/get time];\\`);
    push('  "');
    push(`  /system/scheduler/add name=NetPulse-Run-Email start-time=00:00:00 interval=2m on-event=NetPulse-Email-Alert policy=read,write,policy,test;`);
    push();
  }

  push('  :log warning "--- NetPulse : deploiement termine avec succes ---";');
  push('}');
  return L.join('\n');
}

// ─── Password strength ─────────────────────────────────────────────────────────
function pwStrength(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 14) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  const levels = [
    { pct: 10, color: '#F0655A', label: 'Trop court — 12 caractères minimum recommandés' },
    { pct: 35, color: '#F0655A', label: 'Faible' },
    { pct: 55, color: '#F5A623', label: 'Moyen' },
    { pct: 75, color: '#F5A623', label: 'Bon' },
    { pct: 100, color: '#22D3AA', label: 'Fort' },
  ];
  if (!p) return levels[0];
  return levels[Math.min(s, 4)];
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="relative flex-none w-[38px] h-[22px] rounded-full border transition-all duration-150"
      style={{
        background: checked ? '#0E4E42' : '#1D2733',
        borderColor: checked ? '#22D3AA' : '#2A3542',
      }}
    >
      <span
        className="absolute top-[3px] w-4 h-4 rounded-full transition-all duration-150"
        style={{
          left: checked ? '19px' : '3px',
          background: checked ? '#22D3AA' : '#7E8CA0',
        }}
      />
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] mb-1" style={{ color: '#7E8CA0' }}>{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all font-['IBM_Plex_Mono',monospace]";
const inputStyle = {
  background: '#131B27',
  border: '1px solid #1D2733',
  color: '#E6EDF3',
};

function NpInput({ value, onChange, placeholder, type = 'text', className = '' }: {
  value: string | number; onChange: (v: string) => void;
  placeholder?: string; type?: string; className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${inputCls} ${className}`}
      style={inputStyle}
    />
  );
}

function NpSelect({ value, onChange, children, className = '' }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; className?: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`w-full px-3 py-2 text-sm rounded-lg border outline-none ${className}`}
      style={inputStyle}
    >
      {children}
    </select>
  );
}

function NpTextarea({ value, onChange, rows = 2, placeholder }: {
  value: string; onChange: (v: string) => void; rows?: number; placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-xs rounded-lg border outline-none font-['IBM_Plex_Mono',monospace]"
      style={inputStyle}
    />
  );
}

const cardStyle: React.CSSProperties = {
  background: '#0F151F', border: '1px solid #1D2733', borderRadius: 10,
};
const dividerStyle: React.CSSProperties = { borderTop: '1px solid #1D2733' };
const ghostBtn = "text-[11px] px-2.5 py-1 rounded-md border font-medium transition-colors";
const ghostBtnStyle = { background: '#131B27', border: '1px solid #1D2733', color: '#CBD5E1' };

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function RouterOsConsolePage() {
  const [tab, setTab] = useState<TabId>('net');
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [c, setC] = useState<Config>(DEFAULT_C);
  const [f, setF] = useState<Flags>(DEFAULT_F);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadSettings() {
      try {
        const response = await fetch('/api/settings?key=routerosConsole', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled || !data.value) return;
        setC(prev => ({ ...prev, ...(data.value.config || {}) }));
        setF(prev => ({ ...prev, ...(data.value.flags || {}) }));
      } catch {
        // Local defaults remain usable when no persisted console profile exists.
      } finally {
        if (!cancelled) setIsLoadingSettings(false);
      }
    }
    void loadSettings();
    return () => { cancelled = true; };
  }, []);

  const setField = useCallback(<K extends keyof Config>(k: K, v: Config[K]) => {
    setC(prev => ({ ...prev, [k]: v }));
  }, []);

  const setFlag = useCallback(<K extends keyof Flags>(k: K) => {
    setF(prev => ({ ...prev, [k]: !prev[k] }));
  }, []);

  const script = generateScript(c, f);
  const lineCount = script.split('\n').length;
  const score = Math.round((Object.values(f).filter(Boolean).length / Object.keys(f).length) * 100);
  const scoreColor = score >= 70 ? '#22D3AA' : score >= 40 ? '#F5A623' : '#F0655A';
  const pw = pwStrength(c.password);
  const validationErrors = [
    c.password.length < 12 ? 'Le mot de passe du compte distant doit contenir au moins 12 caractères.' : null,
    f.backup && c.backupPassword.length < 12 ? 'La sauvegarde chiffrée nécessite un mot de passe de 12 caractères.' : null,
    f.telegram && (!c.tgToken.trim() || !c.tgChatId.trim()) ? 'Telegram nécessite un token et un Chat ID.' : null,
    f.emailAlert && (!c.smtpServer.trim() || !c.smtpFrom.trim() || !c.smtpTo.trim()) ? 'Les paramètres e-mail sont incomplets.' : null,
    f.dmz && !c.dmzIp.trim() ? 'La DMZ nécessite une adresse IP cible.' : null,
    f.sshKey && !c.sshPubKey.trim() ? 'Le mode SSH par clé nécessite une clé publique.' : null,
  ].filter((error): error is string => Boolean(error));

  const saveSettings = async () => {
    setIsSavingSettings(true);
    setSettingsMessage(null);
    const {
      password: _password,
      backupPassword: _backupPassword,
      tgToken: _tgToken,
      smtpPassword: _smtpPassword,
      sshPubKey: _sshPubKey,
      ...safeConfig
    } = c;
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'routerosConsole', value: { config: safeConfig, flags: f } }),
      });
      const data = await response.json();
      setSettingsMessage(response.ok ? 'Réglages enregistrés. Les secrets restent dans cette session.' : (data.error || 'Échec de l’enregistrement.'));
    } catch {
      setSettingsMessage('Erreur réseau lors de l’enregistrement.');
    } finally {
      setIsSavingSettings(false);
      setTimeout(() => setSettingsMessage(null), 4000);
    }
  };

  const copyScript = () => {
    if (validationErrors.length > 0) return;
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const exportScript = () => {
    if (validationErrors.length > 0) return;
    const blob = new Blob([script], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${c.identity || 'netpulse'}_setup_2026.rsc`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const updatePF = (i: number, field: keyof PortForward, val: string) => {
    setC(prev => {
      const pf = [...prev.portForwards];
      pf[i] = { ...pf[i], [field]: val };
      return { ...prev, portForwards: pf };
    });
  };

  const updateWH = (i: number, field: keyof WatchHost, val: string) => {
    setC(prev => {
      const wh = [...prev.watchHosts];
      wh[i] = { ...wh[i], [field]: val };
      return { ...prev, watchHosts: wh };
    });
  };

  return (
    <div className="router-console app-shell min-h-screen antialiased" style={{ background: 'var(--background)', color: 'var(--foreground)', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap');
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input:focus, select:focus, textarea:focus { outline: none; border-color: #22D3AA !important; box-shadow: 0 0 0 3px rgba(34,211,170,.12); }
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-thumb { background: #1D2733; border-radius: 8px; }
      `}</style>

      {/* HEADER */}
      <header className="sticky top-0 z-40 backdrop-blur" style={{ borderBottom: '1px solid #1D2733', background: 'rgba(15,21,31,0.85)' }}>
        <div className="max-w-[1440px] mx-auto px-3 sm:px-5 min-h-16 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" title="Retour au Dashboard"
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:opacity-80 transition"
              style={{ background: '#0E4E42', border: '1px solid #22D3AA' }}>
              <Wifi className="w-5 h-5" style={{ color: '#22D3AA' }} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-[15px] font-semibold text-white leading-tight truncate">NetPulse Remote &amp; Security Console</h1>
              <p className="text-[11px] font-['IBM_Plex_Mono',monospace]" style={{ color: '#7E8CA0' }}>RouterOS v7.24+ · build 2026.09</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={saveSettings} disabled={isSavingSettings || isLoadingSettings}
              aria-label="Enregistrer la configuration"
              title="Enregistrer la configuration"
              className="flex items-center gap-1.5 text-xs px-2 sm:px-3 py-1.5 rounded-md border transition-colors hover:text-white disabled:opacity-50"
              style={{ border: '1px solid #1D2733', color: '#7E8CA0' }}>
              {isSavingSettings ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Enregistrer</span>
            </button>
            {settingsMessage && <span className="hidden lg:inline text-[11px]" style={{ color: '#22D3AA' }}>{settingsMessage}</span>}
            <div className="hidden sm:flex items-center gap-2 font-['IBM_Plex_Mono',monospace] text-[11px] px-3 py-1.5 rounded-md"
              style={{ background: '#131B27', border: '1px solid #1D2733', color: '#7E8CA0' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#22D3AA' }} />
              Durcissement&nbsp;
              <span className="font-semibold" style={{ color: scoreColor }}>{score}%</span>
            </div>
            <Link href="/" className="text-xs px-3 py-1.5 rounded-md border transition-colors hover:text-white"
              style={{ border: '1px solid #1D2733', color: '#7E8CA0' }}>
              ← Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-3 sm:px-5 py-5 sm:py-8 grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">

        {/* ── LEFT: CONFIG ── */}
        <section className="xl:col-span-6 space-y-4">
          {/* Tabs */}
          <div className="flex flex-wrap gap-1 pb-0" style={{ borderBottom: '1px solid #1D2733' }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-3 py-2.5 text-[12.5px] font-medium border-b-2 -mb-px transition-colors"
                style={tab === t.id
                  ? { color: '#22D3AA', borderColor: '#22D3AA', background: 'rgba(34,211,170,.06)' }
                  : { color: '#7E8CA0', borderColor: 'transparent' }}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          {/* ── TAB: Réseau ── */}
          {tab === 'net' && (
            <div className="p-5 space-y-4" style={cardStyle}>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Globe className="w-4 h-4" style={{ color: '#22D3AA' }} />Identité, horloge &amp; WAN</h2>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nom d'identité">
                  <NpInput value={c.identity} onChange={v => setField('identity', v)} />
                </Field>
                <Field label="Fuseau horaire">
                  <NpSelect value={c.timezone} onChange={v => setField('timezone', v)}>
                    {['Africa/Lome', 'Africa/Abidjan', 'Africa/Lagos', 'Europe/Paris', 'UTC'].map(z => (
                      <option key={z}>{z}</option>
                    ))}
                  </NpSelect>
                </Field>
              </div>
              <Field label="Serveurs NTP">
                <NpInput value={c.ntp} onChange={v => setField('ntp', v)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Interface WAN">
                  <NpInput value={c.wanInterface} onChange={v => setField('wanInterface', v)} placeholder="vide = auto-détection" />
                </Field>
                <label className="flex items-end gap-2 pb-2 cursor-pointer">
                  <Toggle checked={f.ddns} onChange={() => setFlag('ddns')} />
                  <span className="text-sm" style={{ color: '#CBD5E1' }}>DDNS Cloud MikroTik</span>
                </label>
              </div>
              {f.ddns && (
                <p className="text-[11px]" style={{ color: '#7E8CA0' }}>
                  Le service gratuit MikroTik IP Cloud attribue un nom de domaine fixe (ex. <span className="font-['IBM_Plex_Mono',monospace]">1a2b3c4d5e6f.sn.mynetname.net</span>) même si votre FAI change votre IP publique. Le script force une mise à jour immédiate et affiche le nom obtenu dans les logs (<span className="font-['IBM_Plex_Mono',monospace]">/ip/cloud/print</span> pour le revoir plus tard).
                </p>
              )}
              <div className="pt-4 space-y-3" style={dividerStyle}>
                <h3 className="text-[13px] font-medium" style={{ color: '#E2E8F0' }}>Résolution DNS</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Serveurs DNS">
                    <NpInput value={c.dnsServers} onChange={v => setField('dnsServers', v)} />
                  </Field>
                  <label className="flex items-end gap-2 pb-2 cursor-pointer">
                    <Toggle checked={f.dnsAllowRemote} onChange={() => setFlag('dnsAllowRemote')} />
                    <span className="text-sm" style={{ color: '#CBD5E1' }}>Servir le DNS au LAN</span>
                  </label>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Toggle checked={f.doh} onChange={() => setFlag('doh')} />
                  <span className="text-sm" style={{ color: '#CBD5E1' }}>DNS chiffré (DoH)</span>
                </label>
                {f.doh && (
                  <NpInput value={c.dohServer} onChange={v => setField('dohServer', v)} placeholder="https://cloudflare-dns.com/dns-query" />
                )}
              </div>
            </div>
          )}

          {/* ── TAB: Comptes ── */}
          {tab === 'access' && (
            <div className="p-5 space-y-4" style={cardStyle}>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><UserCog className="w-4 h-4" style={{ color: '#22D3AA' }} />Compte distant dédié</h2>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nom d'utilisateur">
                  <NpInput value={c.username} onChange={v => setField('username', v)} />
                </Field>
                <Field label="Groupe de permissions">
                  <NpSelect value={c.group} onChange={v => setField('group', v)}>
                    <option value="full">full</option>
                    <option value="write">write</option>
                    <option value="read">read</option>
                  </NpSelect>
                </Field>
              </div>
              <Field label="Mot de passe">
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={c.password}
                    onChange={e => setField('password', e.target.value)}
                    className={`${inputCls} pr-16`}
                    style={inputStyle}
                  />
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    className="absolute right-2.5 top-2 text-xs" style={{ color: '#7E8CA0' }}>
                    {showPw ? 'masquer' : 'voir'}
                  </button>
                </div>
                <div className="h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ background: '#131B27' }}>
                  <div className="h-full transition-all" style={{ width: `${pw.pct}%`, background: pw.color }} />
                </div>
                <p className="text-[11px] mt-1" style={{ color: pw.color }}>{pw.label}</p>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Toggle checked={f.disableAdmin} onChange={() => setFlag('disableAdmin')} />
                  <span className="text-sm" style={{ color: '#CBD5E1' }}>Désactiver &quot;admin&quot; par défaut</span>
                </label>
                <Field label="Timeout de session">
                  <NpSelect value={c.idleTimeout} onChange={v => setField('idleTimeout', v)}>
                    <option value="5m">5 min</option>
                    <option value="15m">15 min</option>
                    <option value="30m">30 min</option>
                  </NpSelect>
                </Field>
              </div>
              <div className="pt-3 space-y-2" style={dividerStyle}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Toggle checked={f.sshKey} onChange={() => setFlag('sshKey')} />
                  <span className="text-sm" style={{ color: '#CBD5E1' }}>SSH par clé publique uniquement</span>
                </label>
                {f.sshKey && (
                  <NpTextarea value={c.sshPubKey} onChange={v => setField('sshPubKey', v)}
                    placeholder="ssh-ed25519 AAAA... commentaire" />
                )}
              </div>
            </div>
          )}

          {/* ── TAB: Ports & VPN ── */}
          {tab === 'vpn' && (
            <div className="p-5 space-y-4" style={cardStyle}>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Cable className="w-4 h-4" style={{ color: '#22D3AA' }} />Ports de gestion</h2>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Winbox">
                  <NpInput type="number" value={c.portWinbox} onChange={v => setField('portWinbox', Number(v))} />
                </Field>
                <Field label="API">
                  <NpInput type="number" value={c.portApi} onChange={v => setField('portApi', Number(v))} />
                </Field>
                <Field label="SSH">
                  <NpInput type="number" value={c.portSsh} onChange={v => setField('portSsh', Number(v))} />
                </Field>
              </div>
              <div className="pt-4 space-y-3" style={dividerStyle}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Toggle checked={f.wireguard} onChange={() => setFlag('wireguard')} />
                  <span className="text-sm font-medium" style={{ color: '#E2E8F0' }}>Tunnel VPN WireGuard</span>
                </label>
                {f.wireguard && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Port d'écoute">
                      <NpInput type="number" value={c.wgPort} onChange={v => setField('wgPort', Number(v))} />
                    </Field>
                    <Field label="Sous-réseau du tunnel">
                      <NpInput value={c.wgSubnet} onChange={v => setField('wgSubnet', v)} />
                    </Field>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: NAT & DMZ ── */}
          {tab === 'nat' && (
            <div className="p-5 space-y-4" style={cardStyle}>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><ArrowLeftRight className="w-4 h-4" style={{ color: '#22D3AA' }} />NAT, redirection de ports &amp; DMZ</h2>
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <Toggle checked={f.natMasquerade} onChange={() => setFlag('natMasquerade')} />
                  <span className="text-sm" style={{ color: '#CBD5E1' }}>Masquerade (partage de connexion LAN → WAN)</span>
                </label>
                {f.natMasquerade && (
                  <NpInput value={c.lanSubnet} onChange={v => setField('lanSubnet', v)} placeholder="192.168.88.0/24" />
                )}
              </div>
              <div className="pt-4" style={dividerStyle}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: '#E2E8F0' }}>Redirections de ports</span>
                  <button onClick={() => setField('portForwards', [...c.portForwards, { name: '', proto: 'tcp', wanPort: '', toIp: '', toPort: '' }])}
                    className={ghostBtn} style={ghostBtnStyle}>+ Ajouter</button>
                </div>
                <div className="space-y-2">
                  {c.portForwards.length === 0 && (
                    <p className="text-[11px]" style={{ color: '#7E8CA0' }}>Aucune redirection définie.</p>
                  )}
                  {c.portForwards.map((pf, i) => (
                    <div key={i} className="grid grid-cols-12 gap-1.5 items-center rounded-lg p-2"
                      style={{ background: '#131B27', border: '1px solid #1D2733' }}>
                      <input value={pf.name} onChange={e => updatePF(i, 'name', e.target.value)} placeholder="nom"
                        className="col-span-3 px-2 py-1.5 text-xs rounded-md border font-['IBM_Plex_Mono',monospace] outline-none"
                        style={inputStyle} />
                      <select value={pf.proto} onChange={e => updatePF(i, 'proto', e.target.value)}
                        className="col-span-2 px-2 py-1.5 text-xs rounded-md border outline-none" style={inputStyle}>
                        <option value="tcp">tcp</option><option value="udp">udp</option>
                      </select>
                      <input value={pf.wanPort} onChange={e => updatePF(i, 'wanPort', e.target.value)} placeholder="port WAN"
                        className="col-span-2 px-2 py-1.5 text-xs rounded-md border font-['IBM_Plex_Mono',monospace] outline-none"
                        style={inputStyle} />
                      <input value={pf.toIp} onChange={e => updatePF(i, 'toIp', e.target.value)} placeholder="IP LAN"
                        className="col-span-3 px-2 py-1.5 text-xs rounded-md border font-['IBM_Plex_Mono',monospace] outline-none"
                        style={inputStyle} />
                      <input value={pf.toPort} onChange={e => updatePF(i, 'toPort', e.target.value)} placeholder="port"
                        className="col-span-1 px-2 py-1.5 text-xs rounded-md border font-['IBM_Plex_Mono',monospace] outline-none"
                        style={inputStyle} />
                      <button onClick={() => setField('portForwards', c.portForwards.filter((_, j) => j !== i))}
                        className="col-span-1 text-xs" style={{ color: '#F0655A' }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-4 space-y-2" style={dividerStyle}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Toggle checked={f.dmz} onChange={() => setFlag('dmz')} />
                  <span className="text-sm" style={{ color: '#CBD5E1' }}>Hôte DMZ (transfert de tout trafic non filtré)</span>
                </label>
                {f.dmz && (
                  <>
                    <NpInput value={c.dmzIp} onChange={v => setField('dmzIp', v)} placeholder="192.168.88.100" />
                    <p className="text-[11px]" style={{ color: '#F5A623' }}>⚠️ Un hôte en DMZ est directement exposé à Internet. À réserver à un usage temporaire et isolé du reste du LAN.</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: QoS ── */}
          {tab === 'qos' && (
            <div className="p-5 space-y-4" style={cardStyle}>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Gauge className="w-4 h-4" style={{ color: '#22D3AA' }} />Limitation de bande passante (Queue simple)</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <Toggle checked={f.qos} onChange={() => setFlag('qos')} />
                <span className="text-sm" style={{ color: '#CBD5E1' }}>Activer une limite de débit pour le LAN</span>
              </label>
              {f.qos && (
                <>
                  <Field label="Cible (sous-réseau ou IP)">
                    <NpInput value={c.qosTarget} onChange={v => setField('qosTarget', v)} placeholder="192.168.88.0/24" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Débit montant max (Mbps)">
                      <NpInput type="number" value={c.qosUpload} onChange={v => setField('qosUpload', Number(v))} />
                    </Field>
                    <Field label="Débit descendant max (Mbps)">
                      <NpInput type="number" value={c.qosDownload} onChange={v => setField('qosDownload', Number(v))} />
                    </Field>
                  </div>
                  <p className="text-[11px]" style={{ color: '#7E8CA0' }}>
                    Crée une file d&apos;attente simple (<span className="font-['IBM_Plex_Mono',monospace]">/queue/simple</span>) qui plafonne le débit total de la cible — utile pour éviter qu&apos;un usage massif ne sature le lien WAN.
                  </p>
                </>
              )}
            </div>
          )}

          {/* ── TAB: Sécurité ── */}
          {tab === 'sec' && (
            <div className="p-5 space-y-4" style={cardStyle}>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><ShieldCheck className="w-4 h-4" style={{ color: '#22D3AA' }} />Durcissement &amp; pare-feu</h2>
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <Toggle checked={f.bruteforce} onChange={() => setFlag('bruteforce')} />
                  <span className="text-sm" style={{ color: '#CBD5E1' }}>Anti-brute-force progressif</span>
                </label>
                {f.bruteforce && (
                  <div className="grid grid-cols-2 gap-3 pl-1">
                    <Field label="Essais avant bannissement">
                      <NpInput type="number" value={c.maxAttempts} onChange={v => setField('maxAttempts', Number(v))} />
                    </Field>
                    <Field label="Durée du bannissement">
                      <NpSelect value={c.banDuration} onChange={v => setField('banDuration', v)}>
                        <option value="1h">1 heure</option>
                        <option value="1d">24 heures</option>
                        <option value="7d">7 jours</option>
                        <option value="30d">30 jours</option>
                      </NpSelect>
                    </Field>
                  </div>
                )}
              </div>
              <div className="pt-3 space-y-2" style={dividerStyle}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Toggle checked={f.allowlist} onChange={() => setFlag('allowlist')} />
                  <span className="text-sm" style={{ color: '#CBD5E1' }}>Liste blanche d&apos;IP/CIDR pour la gestion</span>
                </label>
                {f.allowlist && (
                  <NpTextarea value={c.allowlistIps} onChange={v => setField('allowlistIps', v)}
                    placeholder={'203.0.113.10\n198.51.100.0/24'} />
                )}
              </div>
              <div className="pt-3 grid grid-cols-2 gap-y-2 gap-x-3" style={dividerStyle}>
                {([
                  ['dos', 'Protection DoS / SYN flood'],
                  ['ipv6', 'Bloquer IPv6 entrant'],
                  ['discovery', 'Désactiver MNDP sur WAN'],
                  ['romon', 'Désactiver RoMON'],
                  ['macserver', 'Désactiver MAC-Telnet/Winbox'],
                  ['disableInsecure', 'Désactiver www/api-ssl/telnet/ftp'],
                ] as [keyof Flags, string][]).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <Toggle checked={f[key]} onChange={() => setFlag(key)} />
                    <span className="text-sm" style={{ color: '#CBD5E1' }}>{label}</span>
                  </label>
                ))}
              </div>
              <div className="pt-3 space-y-2" style={dividerStyle}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Toggle checked={f.threatFeed} onChange={() => setFlag('threatFeed')} />
                  <span className="text-sm" style={{ color: '#CBD5E1' }}>Flux de menace dynamique (liste noire IP externe)</span>
                </label>
                {f.threatFeed && (
                  <>
                    <NpInput value={c.threatFeedUrl} onChange={v => setField('threatFeedUrl', v)}
                      placeholder="https://votre-fournisseur/liste-ip.txt" />
                    <NpSelect value={c.threatFeedInterval} onChange={v => setField('threatFeedInterval', v)}>
                      <option value="12h">Toutes les 12h</option>
                      <option value="1d">Chaque jour</option>
                    </NpSelect>
                    <p className="text-[11px]" style={{ color: '#7E8CA0' }}>
                      Fournissez l&apos;URL d&apos;un flux que vous êtes autorisé à utiliser (texte brut, une IP/CIDR par ligne).
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: Supervision ── */}
          {tab === 'mon' && (
            <div className="p-5 space-y-4" style={cardStyle}>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Radio className="w-4 h-4" style={{ color: '#22D3AA' }} />Supervision &amp; diagnostics</h2>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Toggle checked={f.netwatch} onChange={() => setFlag('netwatch')} />
                    <span className="text-sm" style={{ color: '#CBD5E1' }}>Surveillance d&apos;hôtes (Netwatch)</span>
                  </label>
                  {f.netwatch && (
                    <button onClick={() => setField('watchHosts', [...c.watchHosts, { name: '', ip: '' }])}
                      className={ghostBtn} style={ghostBtnStyle}>+ Ajouter</button>
                  )}
                </div>
                {f.netwatch && (
                  <div className="space-y-2">
                    {c.watchHosts.map((h, i) => (
                      <div key={i} className="grid grid-cols-12 gap-1.5 items-center rounded-lg p-2"
                        style={{ background: '#131B27', border: '1px solid #1D2733' }}>
                        <input value={h.name} onChange={e => updateWH(i, 'name', e.target.value)}
                          placeholder="nom (ex: Lien FAI)"
                          className="col-span-6 px-2 py-1.5 text-xs rounded-md border font-['IBM_Plex_Mono',monospace] outline-none"
                          style={inputStyle} />
                        <input value={h.ip} onChange={e => updateWH(i, 'ip', e.target.value)}
                          placeholder="1.1.1.1"
                          className="col-span-5 px-2 py-1.5 text-xs rounded-md border font-['IBM_Plex_Mono',monospace] outline-none"
                          style={inputStyle} />
                        <button onClick={() => setField('watchHosts', c.watchHosts.filter((_, j) => j !== i))}
                          className="col-span-1 text-xs" style={{ color: '#F0655A' }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="pt-3 space-y-2" style={dividerStyle}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Toggle checked={f.pingTest} onChange={() => setFlag('pingTest')} />
                  <span className="text-sm" style={{ color: '#CBD5E1' }}>Test de latence planifié</span>
                </label>
                {f.pingTest && (
                  <div className="grid grid-cols-2 gap-3">
                    <NpInput value={c.pingTarget} onChange={v => setField('pingTarget', v)} placeholder="1.1.1.1" />
                    <NpSelect value={c.pingInterval} onChange={v => setField('pingInterval', v)}>
                      <option value="1m">Toutes les minutes</option>
                      <option value="5m">Toutes les 5 min</option>
                      <option value="15m">Toutes les 15 min</option>
                    </NpSelect>
                  </div>
                )}
              </div>
              <div className="pt-3 space-y-2" style={dividerStyle}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Toggle checked={f.watchdog} onChange={() => setFlag('watchdog')} />
                  <span className="text-sm" style={{ color: '#CBD5E1' }}>Watchdog : redémarrage auto si WAN injoignable</span>
                </label>
                {f.watchdog && (
                  <div className="grid grid-cols-2 gap-3">
                    <NpInput value={c.watchdogTarget} onChange={v => setField('watchdogTarget', v)} placeholder="1.1.1.1" />
                    <NpSelect value={c.watchdogFails} onChange={v => setField('watchdogFails', v)}>
                      <option value="5">5 échecs consécutifs</option>
                      <option value="10">10 échecs consécutifs</option>
                      <option value="20">20 échecs consécutifs</option>
                    </NpSelect>
                  </div>
                )}
              </div>
              <div className="pt-3 space-y-2" style={dividerStyle}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Toggle checked={f.bandwidthAlert} onChange={() => setFlag('bandwidthAlert')} />
                  <span className="text-sm" style={{ color: '#CBD5E1' }}>Alerte de saturation de bande passante WAN</span>
                </label>
                {f.bandwidthAlert && (
                  <NpInput type="number" value={c.bandwidthThreshold}
                    onChange={v => setField('bandwidthThreshold', Number(v))} placeholder="Seuil en Mbps" />
                )}
              </div>
              <div className="pt-3 space-y-2" style={dividerStyle}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Toggle checked={f.healthCheck} onChange={() => setFlag('healthCheck')} />
                  <span className="text-sm" style={{ color: '#CBD5E1' }}>Surveillance santé du routeur (CPU / mémoire)</span>
                </label>
                {f.healthCheck && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Seuil CPU (%)">
                      <NpInput type="number" value={c.healthCpuThreshold} onChange={v => setField('healthCpuThreshold', Number(v))} />
                    </Field>
                    <Field label="Mémoire libre min. (MB)">
                      <NpInput type="number" value={c.healthMemThreshold} onChange={v => setField('healthMemThreshold', Number(v))} />
                    </Field>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: Automatisation ── */}
          {tab === 'auto' && (
            <div className="p-5 space-y-4" style={cardStyle}>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Settings2 className="w-4 h-4" style={{ color: '#22D3AA' }} />Automatisation</h2>
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <Toggle checked={f.cleaner} onChange={() => setFlag('cleaner')} />
                  <span className="text-sm" style={{ color: '#CBD5E1' }}>Nettoyage profond planifié (hotspot / Mikhmon)</span>
                </label>
                {f.cleaner && (
                  <div className="space-y-2 pl-1">
                    <input type="time" value={c.cleanTime} onChange={e => setField('cleanTime', e.target.value)}
                      className="px-3 py-2 text-sm rounded-lg border font-['IBM_Plex_Mono',monospace] outline-none"
                      style={inputStyle} />
                    <p className="text-[11px]" style={{ color: '#7E8CA0' }}>
                      Purge chaque jour : sessions hotspot inactives, tickets/utilisateurs expirés, hôtes non autorisés, et cache DNS.
                    </p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Toggle checked={f.dhcpCleanup} onChange={() => setFlag('dhcpCleanup')} />
                      <span className="text-sm" style={{ color: '#CBD5E1' }}>Purger les baux DHCP bloqués (status &quot;waiting&quot;)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Toggle checked={f.connTrackFlush} onChange={() => setFlag('connTrackFlush')} />
                      <span className="text-sm" style={{ color: '#CBD5E1' }}>Vider la table de suivi de connexions (agressif)</span>
                    </label>
                    {f.connTrackFlush && (
                      <p className="text-[11px]" style={{ color: '#F5A623' }}>⚠️ Coupe brièvement toutes les connexions actives (NAT, VPN...). À planifier hors heures d&apos;usage.</p>
                    )}
                  </div>
                )}
              </div>
              <div className="pt-3 space-y-2" style={dividerStyle}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Toggle checked={f.backup} onChange={() => setFlag('backup')} />
                  <span className="text-sm" style={{ color: '#CBD5E1' }}>Sauvegarde planifiée chiffrée</span>
                </label>
                {f.backup && (
                  <div className="space-y-2 pl-1">
                    <div className="grid grid-cols-2 gap-3">
                      <NpSelect value={c.backupFreq} onChange={v => setField('backupFreq', v)}>
                        <option value="1d">Quotidienne</option>
                        <option value="7d">Hebdomadaire</option>
                      </NpSelect>
                      <NpInput value={c.backupPassword} onChange={v => setField('backupPassword', v)} placeholder="Mot de passe" />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Toggle checked={f.backupRetention} onChange={() => setFlag('backupRetention')} />
                      <span className="text-sm" style={{ color: '#CBD5E1' }}>Limiter le nombre de sauvegardes conservées</span>
                    </label>
                    {f.backupRetention && (
                      <Field label="Nombre de sauvegardes à conserver">
                        <NpInput type="number" value={c.backupKeep} onChange={v => setField('backupKeep', Number(v))} />
                      </Field>
                    )}
                  </div>
                )}
              </div>
              <div className="pt-3 space-y-2" style={dividerStyle}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Toggle checked={f.telegram} onChange={() => setFlag('telegram')} />
                  <span className="text-sm" style={{ color: '#CBD5E1' }}>Alertes Telegram (connexion, WAN down, watchdog)</span>
                </label>
                {f.telegram && (
                  <div className="grid grid-cols-2 gap-3 pl-1">
                    <NpInput value={c.tgToken} onChange={v => setField('tgToken', v)} placeholder="Token du bot" />
                    <NpInput value={c.tgChatId} onChange={v => setField('tgChatId', v)} placeholder="Chat ID" />
                  </div>
                )}
              </div>
              <div className="pt-3" style={dividerStyle}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Toggle checked={f.updateCheck} onChange={() => setFlag('updateCheck')} />
                  <span className="text-sm" style={{ color: '#CBD5E1' }}>Vérification hebdo des mises à jour RouterOS</span>
                </label>
              </div>
              <div className="pt-3 space-y-2" style={dividerStyle}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Toggle checked={f.weeklyReboot} onChange={() => setFlag('weeklyReboot')} />
                  <span className="text-sm flex items-center gap-1.5" style={{ color: '#CBD5E1' }}>
                    <Clock className="w-3.5 h-3.5" style={{ color: '#7E8CA0' }} />
                    Redémarrage hebdomadaire de maintenance
                  </span>
                </label>
                {f.weeklyReboot && (
                  <div className="grid grid-cols-2 gap-3 pl-1">
                    <Field label="Jour indicatif">
                      <NpSelect value={c.rebootDay} onChange={v => setField('rebootDay', v)}>
                        <option value="sun">Dimanche</option>
                        <option value="mon">Lundi</option>
                        <option value="tue">Mardi</option>
                        <option value="wed">Mercredi</option>
                        <option value="thu">Jeudi</option>
                        <option value="fri">Vendredi</option>
                        <option value="sat">Samedi</option>
                      </NpSelect>
                    </Field>
                    <Field label="Heure">
                      <input type="time" value={c.rebootTime} onChange={e => setField('rebootTime', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border font-['IBM_Plex_Mono',monospace] outline-none"
                        style={inputStyle} />
                    </Field>
                  </div>
                )}
                {f.weeklyReboot && (
                  <p className="text-[11px]" style={{ color: '#7E8CA0' }}>
                    Le script planifie un redémarrage toutes les 7 jours à l&apos;heure choisie. Ajustez la date de départ dans RouterOS si vous voulez caler précisément le jour de la semaine.
                  </p>
                )}
              </div>
              <div className="pt-3 space-y-2" style={dividerStyle}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Toggle checked={f.emailAlert} onChange={() => setFlag('emailAlert')} />
                  <span className="text-sm flex items-center gap-1.5" style={{ color: '#CBD5E1' }}>
                    <Mail className="w-3.5 h-3.5" style={{ color: '#7E8CA0' }} />
                    Alertes par e-mail (SMTP) à la connexion
                  </span>
                </label>
                {f.emailAlert && (
                  <div className="grid grid-cols-2 gap-3 pl-1">
                    <NpInput value={c.smtpServer} onChange={v => setField('smtpServer', v)} placeholder="smtp.exemple.com" />
                    <NpInput type="number" value={c.smtpPort} onChange={v => setField('smtpPort', Number(v))} placeholder="587" />
                    <NpInput value={c.smtpUser} onChange={v => setField('smtpUser', v)} placeholder="Utilisateur SMTP" />
                    <NpInput value={c.smtpPassword} onChange={v => setField('smtpPassword', v)} placeholder="Mot de passe SMTP" />
                    <NpInput value={c.smtpFrom} onChange={v => setField('smtpFrom', v)} placeholder="Adresse expéditeur" />
                    <NpInput value={c.smtpTo} onChange={v => setField('smtpTo', v)} placeholder="Adresse destinataire" />
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ── RIGHT: OUTPUT ── */}
        <section className="xl:col-span-6 flex flex-col gap-3">
          {/* Script header */}
          <div className="px-4 py-3 flex items-center justify-between" style={cardStyle}>
            <div className="flex items-center gap-2 text-sm" style={{ color: '#CBD5E1' }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#22D3AA' }} />
              Script généré
              <span className="font-['IBM_Plex_Mono',monospace] text-[11px]" style={{ color: '#7E8CA0' }}>
                · {lineCount} lignes
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={copyScript} disabled={validationErrors.length > 0}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border transition-colors"
                style={{ border: '1px solid #1D2733', background: '#131B27', color: '#E2E8F0' }}>
                {copied ? <Check className="h-3.5 w-3.5 text-[#22D3AA]" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copié ✓' : 'Copier'}
              </button>
              <button onClick={exportScript} disabled={validationErrors.length > 0}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
                style={{ background: '#22D3AA', color: '#04231C' }}>
                <Download className="h-3.5 w-3.5" />
                Exporter .rsc
              </button>
            </div>
          </div>

          {validationErrors.length > 0 && (
            <div className="p-4 text-[11px] leading-relaxed rounded-lg" style={{ background: 'rgba(240,101,90,.10)', border: '1px solid rgba(240,101,90,.35)', color: '#FCA5A5' }}>
              <strong className="block mb-1" style={{ color: '#F0655A' }}>Script non exportable</strong>
              <ul className="list-disc pl-4 space-y-0.5">
                {validationErrors.map(error => <li key={error}>{error}</li>)}
              </ul>
            </div>
          )}

          {/* Terminal */}
          <div className="flex-1 overflow-hidden flex flex-col" style={{ ...cardStyle, minHeight: 680 }}>
            <div className="px-4 py-2 flex justify-between font-['IBM_Plex_Mono',monospace] text-[11px]"
              style={{ borderBottom: '1px solid #1D2733', color: '#7E8CA0' }}>
              <span>{(c.identity || 'netpulse')}_setup_2026.rsc</span>
              <span>RouterOS v7 terminal</span>
            </div>
            <pre className="flex-1 overflow-y-auto p-5 font-['IBM_Plex_Mono',monospace] text-[12px] leading-relaxed whitespace-pre-wrap"
              style={{ color: '#8FE8CF' }}>
              {script}
            </pre>
          </div>

          {/* Warning */}
          <div className="p-4 text-[11px] leading-relaxed" style={{ ...cardStyle, color: '#7E8CA0' }}>
            ⚠️ Testez toujours un nouveau script sur une session Winbox/console{' '}
            <strong style={{ color: '#CBD5E1' }}>distincte</strong>{' '}
            avant de fermer votre session actuelle, afin de ne pas vous verrouiller hors du routeur.
            Le watchdog et les redirections de port modifient l&apos;accès réseau : vérifiez chaque règle avant déploiement en production.
          </div>
        </section>
      </main>
    </div>
  );
}