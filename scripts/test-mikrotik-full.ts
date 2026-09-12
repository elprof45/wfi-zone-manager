
import { z } from 'zod';

const HOST = process.argv[2] || process.env.MIKROTIK_HOST || '192.168.1.64';
const USER = process.argv[3] || process.env.MIKROTIK_USER || 'admin';
const PASSWORD = process.argv[4] || process.env.MIKROTIK_PASSWORD || '';
const HTTP_PORT = Number(process.env.MIKROTIK_HTTP_PORT || 80);
const HTTPS = process.env.MIKROTIK_HTTPS === 'true';
const REQUEST_TIMEOUT_MS = Number(process.env.MIKROTIK_TIMEOUT_MS || 10000);

function validateConnectionConfig(): void {
  const missing = [
    !USER && 'MIKROTIK_USER',
    !PASSWORD && 'MIKROTIK_PASSWORD ou le 4e argument',
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new Error(
      `Identifiants REST manquants: ${missing.join(', ')}. ` +
      'Exemple: MIKROTIK_PASSWORD="votre-mot-de-passe" bun run scripts/test-mikrotik-full.ts',
    );
  }
}

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

type RouterRecord = Record<string, string>;
type RouterPayload = Record<string, string | number | boolean | null | undefined>;
type RouterResponse = RouterRecord | RouterRecord[] | string | null;

const RouterIdSchema = z.string().min(1);
const HotspotUserInputSchema = z.object({
  name: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
  profile: z.string().min(1).default('default'),
  comment: z.string().max(255).optional(),
  limitUptime: z.string().min(1).optional(),
});
type HotspotUserInput = z.infer<typeof HotspotUserInputSchema>;

const SchedulerInputSchema = z.object({
  name: z.string().min(1).max(64),
  interval: z.string().min(1),
  onEvent: z.string().min(1),
  comment: z.string().max(255).optional(),
  disabled: z.boolean().default(false),
});
type SchedulerInput = z.infer<typeof SchedulerInputSchema>;

const ScriptInputSchema = z.object({
  name: z.string().min(1).max(64),
  source: z.string().min(1),
  comment: z.string().max(255).optional(),
});
type ScriptInput = z.infer<typeof ScriptInputSchema>;

function getRouterRecordId(record: RouterRecord | undefined): string | undefined {
  if (!record) return undefined;
  const id = record['.id'] || record.ret || record.id;
  return id ? String(id) : undefined;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function maskSecret(value: string | undefined): string {
  if (!value) return 'N/A';
  if (value.length <= 2) return '**';
  return `${value[0]}${'*'.repeat(Math.min(value.length - 2, 8))}${value[value.length - 1]}`;
}

// ─── Typed RouterOS REST client ──────────────────────────────────────────────
class RouterOsRestClient {
  private readonly baseUrl: string;
  private readonly authorization: string;

  constructor(private readonly host: string, private readonly port: number, user: string, password: string) {
    const scheme = HTTPS ? 'https' : 'http';
    this.baseUrl = `${scheme}://${host}:${port}/rest`;
    this.authorization = `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;
  }

  async request<T extends RouterResponse = RouterResponse>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    endpoint: string,
    body?: RouterPayload,
  ): Promise<T> {
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const response = await fetch(`${this.baseUrl}${normalizedEndpoint}`, {
      method,
      headers: { Authorization: this.authorization, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const text = await response.text();
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(
          `REST ${method} ${normalizedEndpoint}: HTTP 401 Unauthorized. ` +
          'Vérifiez MIKROTIK_USER/MIKROTIK_PASSWORD et les droits du service REST RouterOS.',
        );
      }
      throw new Error(`REST ${method} ${normalizedEndpoint}: HTTP ${response.status}: ${text}`);
    }
    if (!text) return null as T;
    try { return JSON.parse(text) as T; } catch { return text as T; }
  }

  list<T extends RouterRecord = RouterRecord>(endpoint: string): Promise<T[]> {
    return this.request<T[]>('GET', endpoint);
  }

  create<T extends RouterRecord = RouterRecord>(endpoint: string, body: RouterPayload): Promise<T> {
    return this.request<T>('POST', endpoint, body);
  }

  update<T extends RouterRecord = RouterRecord>(endpoint: string, id: string, body: RouterPayload): Promise<T> {
    RouterIdSchema.parse(id);
    return this.request<T>('PATCH', `${endpoint}/${encodeURIComponent(id)}`, body);
  }

  remove(endpoint: string, id: string): Promise<RouterResponse> {
    RouterIdSchema.parse(id);
    return this.request('DELETE', `${endpoint}/${encodeURIComponent(id)}`);
  }

  async findOne<T extends RouterRecord = RouterRecord>(endpoint: string, field: string, value: string): Promise<T | undefined> {
    const records = await this.list<T>(`${endpoint}?${encodeURIComponent(field)}=${encodeURIComponent(value)}`);
    return records[0];
  }

  async createHotspotUser(input: HotspotUserInput): Promise<RouterRecord> {
    const data = HotspotUserInputSchema.parse(input);
    return this.create('/ip/hotspot/user/add', {
      name: data.name, password: data.password, profile: data.profile,
      ...(data.comment ? { comment: data.comment } : {}),
      ...(data.limitUptime ? { 'limit-uptime': data.limitUptime } : {}),
    });
  }

  updateHotspotUser(id: string, input: Partial<HotspotUserInput>): Promise<RouterRecord> {
    const data = HotspotUserInputSchema.partial().parse(input);
    return this.update('/ip/hotspot/user', id, {
      ...(data.name ? { name: data.name } : {}), ...(data.password ? { password: data.password } : {}),
      ...(data.profile ? { profile: data.profile } : {}), ...(data.comment !== undefined ? { comment: data.comment } : {}),
      ...(data.limitUptime ? { 'limit-uptime': data.limitUptime } : {}),
    });
  }

  createScript(input: ScriptInput): Promise<RouterRecord> {
    return this.create('/system/script/add', ScriptInputSchema.parse(input) as unknown as RouterPayload);
  }

  createScheduler(input: SchedulerInput): Promise<RouterRecord> {
    const data = SchedulerInputSchema.parse(input);
    return this.create('/system/scheduler/add', {
      name: data.name, interval: data.interval, 'on-event': data.onEvent,
      disabled: data.disabled ? 'yes' : 'no', ...(data.comment ? { comment: data.comment } : {}),
    });
  }

  runScript(id: string): Promise<RouterResponse> {
    RouterIdSchema.parse(id);
    return this.request('POST', '/system/script/run', { '.id': id });
  }
}

const router = new RouterOsRestClient(HOST, HTTP_PORT, USER, PASSWORD);

async function restFetch<T extends RouterResponse = RouterRecord>(endpoint: string): Promise<T> {
  return router.request<T>('GET', endpoint);
}

// ─── Tests Spécifiques ────────────────────────────────────────────────────────

async function testSystemInfo() {
  console.log(`\n${c.bright}${c.cyan}================================================================${c.reset}`);
  console.log(`${c.bright}${c.cyan} 1. SYSTEM INFO & HARDWARE METRICS (${HOST})${c.reset}`);
  console.log(`${c.bright}${c.cyan}================================================================${c.reset}`);

  const [resource, identity, routerboard] = await Promise.all([
    restFetch<RouterRecord>('/system/resource'),
    restFetch<RouterRecord>('/system/identity').catch(() => ({ name: 'N/A' })),
    restFetch<RouterRecord>('/system/routerboard').catch((): RouterRecord => ({})),
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

  const profiles: RouterRecord[] = await restFetch<RouterRecord[]>('/ip/hotspot/user/profile');
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

  const users: RouterRecord[] = await restFetch<RouterRecord[]>('/ip/hotspot/user');
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
    console.log(`    - Code: ${c.bright}${u.name}${c.reset} | Pass: ${maskSecret(u.password)} | Profil: ${u.profile} | Limite: ${u['limit-uptime'] || 'none'} | Uptime: ${u.uptime || '0s'} | Comment: "${u.comment || ''}"`);
  }

  return { total: users.length, virginCount, consumedCount, users };
}

async function testActiveSessions() {
  console.log(`\n${c.bright}${c.cyan}================================================================${c.reset}`);
  console.log(`${c.bright}${c.cyan} 4. SESSIONS ACTIVES (/ip/hotspot/active)${c.reset}`);
  console.log(`${c.bright}${c.cyan}================================================================${c.reset}`);

  const active: RouterRecord[] = await restFetch<RouterRecord[]>('/ip/hotspot/active');
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
  const scripts: RouterRecord[] = await restFetch<RouterRecord[]>('/system/script');
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
    restFetch<RouterRecord[]>('/ip/hotspot'),
    restFetch<RouterRecord[]>('/interface'),
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

async function testCrudOperationsRest() {
  console.log(`\n${c.bright}${c.cyan}================================================================${c.reset}`);
  console.log(`${c.bright}${c.cyan} 7. CRUD AVANCÉ ET AUTOMATISATION (REST :${HTTP_PORT})${c.reset}`);
  console.log(`${c.bright}${c.cyan}================================================================${c.reset}`);

  const testUsername = `netpulse-test-${Math.floor(1000 + Math.random() * 9000)}`;
  const testPassword = `${Math.floor(1000 + Math.random() * 9000)}`;
  const testScriptName = `netpulse-rest-test-${Date.now()}`;
  const testSchedulerName = `${testScriptName}-schedule`;
  let userId: string | undefined;
  let scriptId: string | undefined;
  let schedulerId: string | undefined;

  console.log(`  1. Connexion REST RouterOS (${HTTPS ? 'HTTPS' : 'HTTP'}:${HTTP_PORT})...`);

  try {
    await restFetch('/system/resource');
    console.log(`     ${c.green}✓ API REST accessible.${c.reset}`);

    // Étape A: créer, relire puis modifier un ticket de test.
    console.log(`  2. Création d'un ticket de test: ${c.bright}${testUsername}${c.reset} (Profil '200')...`);
    const createdUser = await router.createHotspotUser({ name: testUsername, password: testPassword, profile: '200', comment: 'NETPULSE_REST_TEST_TEMP' });
    userId = getRouterRecordId(createdUser) || getRouterRecordId(await router.findOne('/ip/hotspot/user', 'name', testUsername));
    if (!userId) throw new Error('RouterOS n’a pas retourné l’identifiant du ticket créé.');
    console.log(`     ${c.green}✓ Ticket créé sur le routeur!${c.reset}`);

    // Étape B: vérifier la présence et mettre à jour le commentaire.
    console.log(`  3. Vérification de la présence du ticket en base...`);
    const found = await router.findOne('/ip/hotspot/user', 'name', testUsername);
    if (!found || String(found['.id']) !== userId) {
      throw new Error(`Le ticket ${testUsername} n'a pas été retrouvé après création!`);
    }
    await router.updateHotspotUser(userId, { comment: 'NETPULSE_REST_TEST_UPDATED' });
    console.log(`     ${c.green}✓ Ticket confirmé puis mis à jour (ID RouterOS: ${userId})${c.reset}`);

    // Étape C: créer un script et un scheduler, puis exécuter le script.
    console.log(`  4. Création d'une automatisation REST...`);
    const createdScript = await router.createScript({ name: testScriptName, source: ':log info "NETPULSE REST automation test";', comment: 'NETPULSE_REST_TEST_TEMP' });
    scriptId = getRouterRecordId(createdScript) || getRouterRecordId(await router.findOne('/system/script', 'name', testScriptName));
    if (!scriptId) throw new Error('RouterOS n’a pas retourné l’identifiant du script.');
    const createdScheduler = await router.createScheduler({ name: testSchedulerName, interval: '1d', onEvent: testScriptName, comment: 'NETPULSE_REST_TEST_TEMP', disabled: true });
    schedulerId = getRouterRecordId(createdScheduler) || getRouterRecordId(await router.findOne('/system/scheduler', 'name', testSchedulerName));
    if (!schedulerId) throw new Error('RouterOS n’a pas retourné l’identifiant du scheduler.');
    await router.runScript(scriptId);
    console.log(`     ${c.green}✓ Script créé, scheduler installé et script exécuté.${c.reset}`);

    console.log(`  ${c.bright}${c.green}CRUD REST et automatisation MikroTik validés!${c.reset}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  ${c.red}Erreur lors du test CRUD REST:${c.reset}`, message);
    throw err;
  } finally {
    // Toujours restaurer l’état du routeur, même après une assertion échouée.
    await Promise.allSettled([
      userId ? router.remove('/ip/hotspot/user', userId) : Promise.resolve(),
      scriptId ? router.remove('/system/script', scriptId) : Promise.resolve(),
      schedulerId ? router.remove('/system/scheduler', schedulerId) : Promise.resolve(),
    ]);
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
    validateConnectionConfig();
    await testSystemInfo();
    await testUserProfiles();
    await testHotspotUsers();
    await testActiveSessions();
    await testVentes();
    await testHotspotServersAndInterfaces();
    await testCrudOperationsRest();

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
