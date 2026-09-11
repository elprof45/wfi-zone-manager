/**
 * Script de test complet de l'API MikroTik RouterOS (REST & Socket API)
 * NetPulse Hotspot Manager
 * 
 * Usage:
 *   bun run scripts/test-mikrotik-full.ts
 *   ou avec arguments:
 *   bun run scripts/test-mikrotik-full.ts [HOST] [USER] [PASSWORD]
 */

import { MikrotikAPI } from '@fibercom/routeros-api';

const HOST = process.argv[2] || process.env.MIKROTIK_HOST || '192.168.1.64';
const USER = process.argv[3] || process.env.MIKROTIK_USER || 'admin';
const PASSWORD = process.argv[4] || process.env.MIKROTIK_PASSWORD || 'je suis alle en 203@';
const HTTP_PORT = 80;
const SOCKET_PORT = 8728;

// Couleurs ANSI pour terminal
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
};

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// ─── Client REST Helper ───────────────────────────────────────────────────────
async function restFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const auth = Buffer.from(`${USER}:${PASSWORD}`).toString('base64');
  const url = `http://${HOST}:${HTTP_PORT}/rest${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${txt}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}

// ─── Tests Spécifiques ────────────────────────────────────────────────────────

async function testSystemInfo() {
  console.log(`\n${c.bright}${c.cyan}================================================================${c.reset}`);
  console.log(`${c.bright}${c.cyan} 1. SYSTEM INFO & HARDWARE METRICS (${HOST})${c.reset}`);
  console.log(`${c.bright}${c.cyan}================================================================${c.reset}`);

  const [resource, identity, routerboard] = await Promise.all([
    restFetch('/system/resource'),
    restFetch('/system/identity').catch(() => ({ name: 'N/A' })),
    restFetch('/system/routerboard').catch(() => ({})),
  ]);

  const totalMem = Number(resource['total-memory'] || 0);
  const freeMem = Number(resource['free-memory'] || 0);
  const usedMem = totalMem - freeMem;
  const totalHdd = Number(resource['total-hdd-space'] || 0);
  const freeHdd = Number(resource['free-hdd-space'] || 0);

  console.log(`  Identité RouterOS : ${c.green}${identity.name}${c.reset}`);
  console.log(`  Modèle / Carte    : ${c.yellow}${resource['board-name'] || 'Inconnu'}${c.reset} (Plateforme: ${resource.platform || 'MikroTik'})`);
  console.log(`  Version RouterOS  : ${c.bright}${resource.version}${c.reset} (${resource['architecture-name']})`);
  console.log(`  Uptime            : ${resource.uptime}`);
  console.log(`  CPU               : ${resource.cpu} (${resource['cpu-count']} core @ ${resource['cpu-frequency']}MHz) - Charge: ${c.yellow}${resource['cpu-load']}%${c.reset}`);
  console.log(`  Mémoire RAM       : ${formatBytes(freeMem)} libre / ${formatBytes(totalMem)} (${Math.round((usedMem / totalMem) * 100)}% utilisé)`);
  console.log(`  Espace Stockage   : ${formatBytes(freeHdd)} libre / ${formatBytes(totalHdd)}`);
  if (routerboard?.model) {
    console.log(`  Numéro de série   : ${routerboard['serial-number'] || 'N/A'}`);
    console.log(`  Firmware actuel   : ${routerboard['current-firmware'] || 'N/A'}`);
  }

  return { identity: identity.name, model: resource['board-name'], version: resource.version };
}

async function testUserProfiles() {
  console.log(`\n${c.bright}${c.cyan}================================================================${c.reset}`);
  console.log(`${c.bright}${c.cyan} 2. HOTSPOT USER PROFILES (/ip/hotspot/user/profile)${c.reset}`);
  console.log(`${c.bright}${c.cyan}================================================================${c.reset}`);

  const profiles: any[] = await restFetch('/ip/hotspot/user/profile');
  console.log(`  Profils trouvés : ${c.green}${profiles.length}${c.reset}\n`);

  console.log(`  ${'NOM'.padEnd(14)} | ${'UTILISATEURS'.padEnd(14)} | ${'RATE-LIMIT'.padEnd(16)} | ${'SCRIPT ON-LOGIN'}`);
  console.log(`  ${'-'.repeat(14)}-+-${'-'.repeat(14)}-+-${'-'.repeat(16)}-+-${'-'.repeat(25)}`);

  for (const p of profiles) {
    const hasOnLogin = p['on-login'] ? `${c.green}Oui (Mikhmon/NetPulse)${c.reset}` : `${c.dim}Aucun${c.reset}`;
    console.log(`  ${c.bright}${p.name.padEnd(14)}${c.reset} | ${(p['shared-users'] || '1').padEnd(14)} | ${(p['rate-limit'] || 'Illimité').padEnd(16)} | ${hasOnLogin}`);
  }

  return profiles;
}

async function testHotspotUsers() {
  console.log(`\n${c.bright}${c.cyan}================================================================${c.reset}`);
  console.log(`${c.bright}${c.cyan} 3. HOTSPOT USERS / VOUCHERS (/ip/hotspot/user)${c.reset}`);
  console.log(`${c.bright}${c.cyan}================================================================${c.reset}`);

  const users: any[] = await restFetch('/ip/hotspot/user');
  console.log(`  Total tickets en base : ${c.green}${users.length}${c.reset}`);

  // Statistiques par profil
  const profileCounts: Record<string, number> = {};
  let consumedCount = 0;
  let virginCount = 0;

  for (const u of users) {
    const prof = u.profile || 'sans-profil';
    profileCounts[prof] = (profileCounts[prof] || 0) + 1;

    // Détection d'utilisation : uptime > 0 ou commentaire contenant une date d'expiration 'X'
    const uptime = u.uptime || '0s';
    const isUsed = uptime !== '0s' || (u.comment && u.comment.includes(' X'));
    if (isUsed) {
      consumedCount++;
    } else {
      virginCount++;
    }
  }

  console.log(`  - Tickets non utilisés (vierges) : ${c.yellow}${virginCount}${c.reset}`);
  console.log(`  - Tickets utilisés / entamés     : ${c.magenta}${consumedCount}${c.reset}`);
  console.log(`\n  Répartition par profil :`);
  for (const [prof, count] of Object.entries(profileCounts)) {
    console.log(`    • Profil ${c.bright}${prof.padEnd(10)}${c.reset} : ${count} tickets`);
  }

  console.log(`\n  Échantillon de 5 tickets récents :`);
  const sample = users.slice(0, 5);
  for (const u of sample) {
    console.log(`    - Code: ${c.bright}${u.name}${c.reset} | Pass: ${u.password} | Profil: ${u.profile} | Limite: ${u['limit-uptime'] || 'none'} | Uptime: ${u.uptime || '0s'} | Comment: "${u.comment || ''}"`);
  }

  return { total: users.length, virginCount, consumedCount, users };
}

async function testActiveSessions() {
  console.log(`\n${c.bright}${c.cyan}================================================================${c.reset}`);
  console.log(`${c.bright}${c.cyan} 4. SESSIONS ACTIVES (/ip/hotspot/active)${c.reset}`);
  console.log(`${c.bright}${c.cyan}================================================================${c.reset}`);

  const active: any[] = await restFetch('/ip/hotspot/active');
  console.log(`  Clients actuellement connectés : ${c.green}${active.length}${c.reset}\n`);

  if (active.length === 0) {
    console.log(`  ${c.dim}Aucune session active en ce moment.${c.reset}`);
  } else {
    for (const a of active) {
      const bytesIn = Number(a['bytes-in'] || 0);
      const bytesOut = Number(a['bytes-out'] || 0);
      console.log(`  Utilisateur : ${c.bright}${a.user}${c.reset}`);
      console.log(`    • IP          : ${a.address}`);
      console.log(`    • Adresse MAC : ${a['mac-address']}`);
      console.log(`    • Serveur     : ${a.server}`);
      console.log(`    • Connecté il y a : ${a.uptime} (Temps restant: ${a['session-time-left'] || 'Illimité'})`);
      console.log(`    • Données     : ↓ ${formatBytes(bytesIn)} (In) / ↑ ${formatBytes(bytesOut)} (Out)`);
      if (a.comment) console.log(`    • Commentaire : ${a.comment}`);
    }
  }

  return active;
}

interface ParsedSale {
  id: string;
  date: string;
  time: string;
  username: string;
  price: number;
  ip: string;
  mac: string;
  validity: string;
  profile: string;
  comment: string;
}

async function testVentes() {
  console.log(`\n${c.bright}${c.cyan}================================================================${c.reset}`);
  console.log(`${c.bright}${c.cyan} 5. VENTES HOTSPOT & STATISTIQUES FINANCIÈRES (/system/script)${c.reset}`);
  console.log(`${c.bright}${c.cyan}================================================================${c.reset}`);

  // Dans MikroTik / Mikhmon, les ventes déclenchées lors de la première connexion sont enregistrées
  // sous forme de scripts système avec le commentaire "mikhmon".
  const scripts: any[] = await restFetch('/system/script');
  const salesScripts = scripts.filter((s) => s.comment === 'mikhmon' || (s.name && s.name.includes('-|-')));

  console.log(`  Enregistrements de ventes trouvés : ${c.green}${salesScripts.length}${c.reset}`);

  const parsedSales: ParsedSale[] = [];
  let totalRevenue = 0;
  const revenueByProfile: Record<string, { count: number; total: number }> = {};
  const revenueByDate: Record<string, { count: number; total: number }> = {};

  for (const s of salesScripts) {
    // Format Mikhmon standard: date-|-time-|-user-|-price-|-address-|-mac-|-validity-|-profile-|-comment
    const parts = (s.name || '').split('-|-');
    if (parts.length >= 4) {
      const date = parts[0] || s.source || 'Inconnu';
      const time = parts[1] || '';
      const username = parts[2] || '';
      const price = Number(parts[3]) || 0;
      const ip = parts[4] || '';
      const mac = parts[5] || '';
      const validity = parts[6] || '';
      const profile = parts[7] || parts[3] || 'Standard';
      const comment = parts[8] || '';

      parsedSales.push({
        id: s['.id'],
        date,
        time,
        username,
        price,
        ip,
        mac,
        validity,
        profile,
        comment,
      });

      totalRevenue += price;

      // Par profil
      if (!revenueByProfile[profile]) revenueByProfile[profile] = { count: 0, total: 0 };
      revenueByProfile[profile].count++;
      revenueByProfile[profile].total += price;

      // Par date
      if (!revenueByDate[date]) revenueByDate[date] = { count: 0, total: 0 };
      revenueByDate[date].count++;
      revenueByDate[date].total += price;
    }
  }

  console.log(`  Chiffre d'Affaires Total : ${c.bright}${c.green}${totalRevenue.toLocaleString()} FCFA/Unités${c.reset}`);

  console.log(`\n  Détail des ventes par Profil :`);
  for (const [prof, data] of Object.entries(revenueByProfile)) {
    console.log(`    • Profil ${c.yellow}${prof.padEnd(8)}${c.reset} : ${data.count} ventes -> ${c.green}${data.total.toLocaleString()} FCFA${c.reset}`);
  }

  console.log(`\n  Détail des ventes par Date :`);
  for (const [d, data] of Object.entries(revenueByDate)) {
    console.log(`    • Date ${d} : ${data.count} ventes -> ${c.green}${data.total.toLocaleString()} FCFA${c.reset}`);
  }

  console.log(`\n  Les 5 dernières ventes :`);
  const recent = parsedSales.slice(-5).reverse();
  for (const v of recent) {
    console.log(`    - [${v.date} ${v.time}] Ticket ${c.bright}${v.username}${c.reset} (${v.profile}) : ${c.green}${v.price} FCFA${c.reset} | MAC: ${v.mac}`);
  }

  return { totalRevenue, totalSales: parsedSales.length, revenueByProfile, parsedSales };
}

async function testHotspotServersAndInterfaces() {
  console.log(`\n${c.bright}${c.cyan}================================================================${c.reset}`);
  console.log(`${c.bright}${c.cyan} 6. SERVEURS HOTSPOT & INTERFACES RÉSEAU${c.reset}`);
  console.log(`${c.bright}${c.cyan}================================================================${c.reset}`);

  const [servers, interfaces] = await Promise.all([
    restFetch('/ip/hotspot'),
    restFetch('/interface'),
  ]);

  console.log(`  Serveurs Hotspot configurés (${servers.length}) :`);
  for (const s of servers) {
    console.log(`    • Nom: ${c.bright}${s.name}${c.reset} | Interface: ${s.interface} | IP DNS: ${s['ip-of-dns-name'] || 'non défini'} | Pool: ${s['address-pool']}`);
  }

  console.log(`\n  Interfaces Réseau (${interfaces.length}) :`);
  for (const iface of interfaces) {
    const isRunning = iface.running === 'true' ? `${c.green}ACTIF${c.reset}` : `${c.dim}INACTIF${c.reset}`;
    const rx = formatBytes(Number(iface['rx-byte'] || 0));
    const tx = formatBytes(Number(iface['tx-byte'] || 0));
    console.log(`    • ${c.bright}${iface.name.padEnd(10)}${c.reset} (${iface.type.padEnd(8)}) [${isRunning}] : RX ${rx} / TX ${tx}`);
  }
}

async function testCrudOperationsSocket() {
  console.log(`\n${c.bright}${c.cyan}================================================================${c.reset}`);
  console.log(`${c.bright}${c.cyan} 7. TEST OPÉRATIONNEL CRUD (Socket API :8728)${c.reset}`);
  console.log(`${c.bright}${c.cyan}================================================================${c.reset}`);

  const testUsername = `netpulse-test-${Math.floor(1000 + Math.random() * 9000)}`;
  const testPassword = `${Math.floor(1000 + Math.random() * 9000)}`;

  console.log(`  1. Connexion au Socket API RouterOS (port ${SOCKET_PORT})...`);
  const api = new MikrotikAPI({
    host: HOST,
    port: SOCKET_PORT,
    user: USER,
    password: PASSWORD,
    timeout: 5,
  });

  try {
    await api.connect();
    console.log(`     ${c.green}✓ Connecté avec succès au port 8728!${c.reset}`);

    // Étape A: Créer un utilisateur test
    console.log(`  2. Création d'un ticket de test: ${c.bright}${testUsername}${c.reset} (Profil '200')...`);
    await api.write(
      '/ip/hotspot/user/add',
      `=name=${testUsername}`,
      `=password=${testPassword}`,
      `=profile=200`,
      `=comment=NETPULSE_API_TEST_TEMP`
    );
    console.log(`     ${c.green}✓ Ticket créé sur le routeur!${c.reset}`);

    // Étape B: Vérifier la présence
    console.log(`  3. Vérification de la présence du ticket en base...`);
    const found = await api.write(['/ip/hotspot/user/print', `?name=${testUsername}`]);
    if (!found || found.length === 0) {
      throw new Error(`Le ticket ${testUsername} n'a pas été retrouvé après création!`);
    }
    const createdId = found[0]['.id'];
    console.log(`     ${c.green}✓ Ticket confirmé présent (ID RouterOS: ${createdId})${c.reset}`);

    // Étape C: Suppression immédiate pour laisser le routeur propre
    console.log(`  4. Nettoyage : Suppression du ticket de test...`);
    await api.write('/ip/hotspot/user/remove', `=.id=${createdId}`);
    console.log(`     ${c.green}✓ Ticket de test supprimé sans laisser de trace.${c.reset}`);

    await api.close();
    console.log(`  ${c.bright}${c.green}CRUD MikroTik entièrement validé et fonctionnel!${c.reset}`);
  } catch (err: any) {
    try { await api.close(); } catch {}
    console.error(`  ${c.red}Erreur lors du test CRUD Socket:${c.reset}`, err.message);
    throw err;
  }
}

// ─── Main Execution ───────────────────────────────────────────────────────────
async function runAllTests() {
  console.log(`${c.bright}${c.magenta}`);
  console.log(`╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║     NETPULSE HOTSPOT MANAGER - MIKROTIK FULL API TEST        ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝${c.reset}`);
  console.log(`Cible : ${c.bright}${HOST}${c.reset} | Utilisateur : ${c.bright}${USER}${c.reset}`);
  const startTime = Date.now();

  try {
    await testSystemInfo();
    await testUserProfiles();
    await testHotspotUsers();
    await testActiveSessions();
    await testVentes();
    await testHotspotServersAndInterfaces();
    await testCrudOperationsSocket();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n${c.bright}${c.green}================================================================${c.reset}`);
    console.log(`${c.bright}${c.green} ✓ TOUS LES TESTS API MIKROTIK ONT RÉUSSI AVEC SUCCÈS (${elapsed}s) !${c.reset}`);
    console.log(`${c.bright}${c.green}================================================================${c.reset}\n`);
  } catch (err: any) {
    console.error(`\n${c.red}💥 ÉCHEC DU TEST API MIKROTIK :${c.reset}`, err.message);
    process.exit(1);
  }
}

runAllTests();
