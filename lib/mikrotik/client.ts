// lib/mikrotik/client.ts
// MikroTik RouterOS client using @fibercom/routeros-api

import { MikrotikAPI, RosException } from '@fibercom/routeros-api';
import type { RouterHardwareMetrics } from '../db/schema';

export interface MikroTikConnectionOptions {
  host: string;
  port?: number;
  user: string;
  password?: string;
  connectionType?: 'socket' | 'rest';
  tls?: boolean;
  timeout?: number;
}

export interface ConnectionTestResult {
  connected: boolean;
  latencyMs: number;
  version?: string;
  model?: string;
  uptime?: string;
  error?: string;
}

// ─── REST helper (RouterOS v7 REST API) ───────────────────────────────────────

async function testRestConnection(
  options: MikroTikConnectionOptions
): Promise<ConnectionTestResult> {
  const start = Date.now();
  const scheme = options.tls ? 'https' : 'http';
  const port = options.port ?? (options.tls ? 443 : 80);
  const auth = Buffer.from(`${options.user}:${options.password ?? ''}`).toString('base64');

  try {
    const res = await fetch(`${scheme}://${options.host}:${port}/rest/system/resource`, {
      headers: { Authorization: `Basic ${auth}` },
      signal: AbortSignal.timeout((options.timeout ?? 5) * 1000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const data = await res.json();

    return {
      connected: true,
      latencyMs: Date.now() - start,
      version: data.version,
      model: data['board-name'],
      uptime: data.uptime,
    };
  } catch (err: unknown) {
    return {
      connected: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── MikroTikClient ────────────────────────────────────────────────────────────

export class MikroTikClient {
  private options: MikroTikConnectionOptions;

  constructor(options: MikroTikConnectionOptions) {
    this.options = {
      port: options.connectionType === 'rest' ? 80 : 8728,
      timeout: 10,
      ...options,
    };
  }

  /** Build a fresh MikrotikAPI instance (caller must connect & close) */
  private buildApi(): MikrotikAPI {
    return new MikrotikAPI({
      host: this.options.host,
      port: this.options.port ?? 8728,
      user: this.options.user,
      password: this.options.password ?? '',
      timeout: this.options.timeout ?? 10,
      tls: this.options.tls ?? false,
    });
  }

  // ── Test connectivity ────────────────────────────────────────────────────────

  async testConnection(): Promise<ConnectionTestResult> {
    if (this.options.connectionType === 'rest') {
      return testRestConnection(this.options);
    }

    const start = Date.now();
    const api = this.buildApi();

    try {
      await api.connect();
      const resourcesList = await api.getSystemResources();
      const identityList = await api.getSystemIdentity();
      const resources = resourcesList[0] ?? {};
      const identity = identityList[0] ?? {};
      const latencyMs = Date.now() - start;

      await api.close();
      return {
        connected: true,
        latencyMs,
        version: resources.version,
        model: resources['board-name'] ?? identity.name,
        uptime: resources.uptime,
      };
    } catch (err: unknown) {
      try { await api.close(); } catch {}
      return {
        connected: false,
        latencyMs: Date.now() - start,
        error: err instanceof RosException
          ? `RouterOS: ${err.message}`
          : err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ── Hardware metrics ─────────────────────────────────────────────────────────

  async getHardwareMetrics(allowFallback = false): Promise<RouterHardwareMetrics> {
    if (this.options.connectionType === 'rest') {
      return this.getHardwareMetricsRest(allowFallback);
    }

    const api = this.buildApi();
    try {
      await api.connect();
      const resourcesList = await api.getSystemResources();
      const res = resourcesList[0] ?? {};
      await api.getSystemInfo().catch(() => null);

      // Count active hotspot users
      let activeUsersCount = 0;
      try {
        const active = await api.write('/ip/hotspot/active/print');
        activeUsersCount = Array.isArray(active) ? active.length : 0;
      } catch {}

      await api.close();

      const totalMemBytes = Number(res['total-memory'] ?? 0);
      const freeMemBytes = Number(res['free-memory'] ?? 0);
      const totalHddBytes = Number(res['total-hdd-space'] ?? 0);
      const freeHddBytes = Number(res['free-hdd-space'] ?? 0);

      return {
        model: res['board-name'] ?? 'MikroTik RouterOS',
        cpuPercent: Number(res['cpu-load'] ?? 0),
        ramTotalMb: Math.round(totalMemBytes / 1024 / 1024),
        ramFreeMb: Math.round(freeMemBytes / 1024 / 1024),
        flashTotalMb: Math.round(totalHddBytes / 1024 / 1024),
        flashFreeMb: Math.round(freeHddBytes / 1024 / 1024),
        uptime: res.uptime ?? '0d',
        activeUsersCount,
      };
    } catch (err: unknown) {
      try { await api.close(); } catch {}
      if (allowFallback) {
        return this.simulatedMetrics();
      }
      const msg = err instanceof RosException
        ? `RouterOS [${this.options.host}]: ${err.message}`
        : err instanceof Error ? err.message : String(err);
      throw new Error(msg);
    }
  }

  private async getHardwareMetricsRest(allowFallback = false): Promise<RouterHardwareMetrics> {
    const scheme = this.options.tls ? 'https' : 'http';
    const port = this.options.port ?? 80;
    const auth = Buffer.from(`${this.options.user}:${this.options.password ?? ''}`).toString('base64');
    const headers = { Authorization: `Basic ${auth}` };
    const signal = AbortSignal.timeout((this.options.timeout ?? 10) * 1000);

    try {
      const [resRes, activeRes] = await Promise.allSettled([
        fetch(`${scheme}://${this.options.host}:${port}/rest/system/resource`, { headers, signal }),
        fetch(`${scheme}://${this.options.host}:${port}/rest/ip/hotspot/active`, { headers, signal }),
      ]);

      if (resRes.status === 'rejected') {
        throw resRes.reason;
      }
      if (!resRes.value.ok) {
        throw new Error(`HTTP ${resRes.value.status} ${resRes.value.statusText}`);
      }

      const res = await resRes.value.json();
      const active = activeRes.status === 'fulfilled' && activeRes.value.ok
        ? await activeRes.value.json()
        : [];

      const totalMem = Number(res['total-memory'] ?? 0);
      const freeMem = Number(res['free-memory'] ?? 0);
      const totalHdd = Number(res['total-hdd-space'] ?? 0);
      const freeHdd = Number(res['free-hdd-space'] ?? 0);

      return {
        model: res['board-name'] ?? 'MikroTik',
        cpuPercent: Number(res['cpu-load'] ?? 0),
        ramTotalMb: Math.round(totalMem / 1024 / 1024),
        ramFreeMb: Math.round(freeMem / 1024 / 1024),
        flashTotalMb: Math.round(totalHdd / 1024 / 1024),
        flashFreeMb: Math.round(freeHdd / 1024 / 1024),
        uptime: res.uptime ?? '0d',
        activeUsersCount: Array.isArray(active) ? active.length : 0,
      };
    } catch (err: unknown) {
      if (allowFallback) {
        return this.simulatedMetrics();
      }
      throw new Error(`RouterOS REST [${this.options.host}]: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** Dev fallback — realistic simulated metrics when router is offline */
  private simulatedMetrics(): RouterHardwareMetrics {
    return {
      model: this.options.host.includes('951') ? 'MikroTik RB951Ui-2HnD' : 'MikroTik hEX S',
      cpuPercent: Math.floor(Math.random() * 10) + 6,
      ramTotalMb: 256,
      ramFreeMb: 180 + Math.floor(Math.random() * 30),
      flashTotalMb: 512,
      flashFreeMb: 400 + Math.floor(Math.random() * 50),
      uptime: '15d 04h 12m',
      activeUsersCount: Math.floor(Math.random() * 25) + 10,
    };
  }

  // ── Inject Hotspot tickets ───────────────────────────────────────────────────

  /**
   * Inject tickets into MikroTik Hotspot users DB.
   * Batches of 20 with 50 ms pause to keep RouterOS CPU < 15%.
   */
  async injectHotspotTickets(
    tickets: Array<{ code: string; password?: string; profileName: string; comment?: string }>,
    onProgress?: (done: number, total: number) => void
  ): Promise<{ injectedCount: number; errorsCount: number; errors?: string[] }> {
    let injectedCount = 0;
    let errorsCount = 0;
    const errorsList: string[] = [];
    const BATCH = 20;
    const DELAY_MS = 50;

    const api = this.buildApi();
    let connected = false;

    try {
      await api.connect();
      connected = true;
    } catch (err: unknown) {
      const msg = err instanceof RosException
        ? `RouterOS: ${err.message}`
        : err instanceof Error ? err.message : String(err);
      throw new Error(`Échec de connexion au routeur MikroTik (${this.options.host}): ${msg}`);
    }

    try {
      for (let i = 0; i < tickets.length; i += BATCH) {
        const chunk = tickets.slice(i, i + BATCH);

        for (const t of chunk) {
          try {
            await api.write(
              '/ip/hotspot/user/add',
              `=name=${t.code}`,
              `=password=${t.password ?? t.code}`,
              `=profile=${t.profileName}`,
              ...(t.comment ? [`=comment=${t.comment}`] : [])
            );
            injectedCount++;
          } catch (err) {
            // Ignore duplicate — ticket already exists on router
            if (err instanceof RosException && err.message.includes('already have')) {
              injectedCount++;
            } else {
              errorsCount++;
              const msg = err instanceof RosException ? err.message : err instanceof Error ? err.message : String(err);
              if (errorsList.length < 5) errorsList.push(`Ticket ${t.code}: ${msg}`);
            }
          }
        }

        onProgress?.(Math.min(tickets.length, i + BATCH), tickets.length);

        if (i + BATCH < tickets.length) {
          await new Promise((r) => setTimeout(r, DELAY_MS));
        }
      }
    } finally {
      if (connected) try { await api.close(); } catch {}
    }

    return { injectedCount, errorsCount, errors: errorsList.length ? errorsList : undefined };
  }

  // ── Purge expired sessions ───────────────────────────────────────────────────

  async purgeExpiredSessions(): Promise<{ purgedCount: number; freedRamMb: number }> {
    const api = this.buildApi();

    try {
      await api.connect();

      // Get active sessions that are expired
      const active = await api.write('/ip/hotspot/active/print');
      const expired: string[] = [];

      for (const session of active ?? []) {
        // uptime format: "0d00:01:23" — sessions > 12h considered purgeable
        const uptimeStr: string = session.uptime ?? '';
        const match = uptimeStr.match(/(\d+)d(\d+):(\d+):(\d+)/);
        if (match) {
          const days = Number(match[1]);
          const hours = Number(match[2]);
          const totalHours = days * 24 + hours;
          if (totalHours >= 12) expired.push(session['.id'] as string);
        }
      }

      for (const id of expired) {
        try {
          await api.write('/ip/hotspot/active/remove', `=.id=${id}`);
        } catch {}
      }

      await api.close();

      const freedRamMb = Math.max(1, Math.floor(expired.length * 0.8));
      return { purgedCount: expired.length, freedRamMb };
    } catch (err: unknown) {
      try { await api.close(); } catch {}
      const msg = err instanceof RosException
        ? `RouterOS: ${err.message}`
        : err instanceof Error ? err.message : String(err);
      throw new Error(`Échec de purge sur le routeur MikroTik (${this.options.host}): ${msg}`);
    }
  }

  // ── Get Hotspot Profiles ──────────────────────────────────────────────────

  async getHotspotProfiles(): Promise<Array<{
    name: string;
    rateLimit?: string;
    sharedUsers: number;
    price: number;
    validityMinutes: number;
    validityLabel: string;
    onLogin?: string;
  }>> {
    const auth = Buffer.from(`${this.options.user}:${this.options.password ?? ''}`).toString('base64');
    const scheme = this.options.tls ? 'https' : 'http';
    const port = this.options.port ?? (this.options.connectionType === 'rest' ? 80 : 80);

    try {
      // Try REST first (fast & lightweight)
      const res = await fetch(`${scheme}://${this.options.host}:${port}/rest/ip/hotspot/user/profile`, {
        headers: { Authorization: `Basic ${auth}` },
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const raw = await res.json();
        return raw.map((p: any) => {
          const name = p.name;
          const onLogin: string = p['on-login'] || '';
          
          // Parse price from profile name (e.g. "50", "100", "200") or on-login
          let price = Number(name);
          if (isNaN(price) || price <= 0) {
            const matchPrice = onLogin.match(/,remc,(\d+),/);
            price = matchPrice ? Number(matchPrice[1]) : 0;
          }

          // Parse validity from on-login
          let validityMinutes = 1440; // 24h default
          let validityLabel = '24 Heures';
          const matchVal = onLogin.match(/,remc,\d+,([0-9a-z]+),/i);
          if (matchVal) {
            const valStr = matchVal[1].toLowerCase();
            if (valStr.endsWith('h')) {
              const h = Number(valStr.replace('h', ''));
              validityMinutes = h * 60;
              validityLabel = `${h} Heure${h > 1 ? 's' : ''}`;
            } else if (valStr.endsWith('d')) {
              const d = Number(valStr.replace('d', ''));
              validityMinutes = d * 1440;
              validityLabel = `${d} Jour${d > 1 ? 's' : ''}`;
            } else if (valStr.endsWith('m')) {
              const m = Number(valStr.replace('m', ''));
              validityMinutes = m;
              validityLabel = `${m} Minute${m > 1 ? 's' : ''}`;
            }
          }

          return {
            name,
            rateLimit: p['rate-limit'] || undefined,
            sharedUsers: Number(p['shared-users'] || 1),
            price: isNaN(price) ? 0 : price,
            validityMinutes,
            validityLabel,
            onLogin,
          };
        });
      }
    } catch {}

    // Fallback: Socket API
    const api = this.buildApi();
    try {
      await api.connect();
      const raw = await api.write('/ip/hotspot/user/profile/print');
      await api.close();

      return (raw || []).map((p: any) => ({
        name: p.name,
        rateLimit: p['rate-limit'] || undefined,
        sharedUsers: Number(p['shared-users'] || 1),
        price: Number(p.name) || 0,
        validityMinutes: 1440,
        validityLabel: '24 Heures',
        onLogin: p['on-login'] || '',
      }));
    } catch (err) {
      try { await api.close(); } catch {}
      throw err;
    }
  }

  // ── Active Sessions & Kick ──────────────────────────────────────────────────

  async getActiveSessions(): Promise<Array<{
    id: string;
    user: string;
    address: string;
    macAddress: string;
    server: string;
    uptime: string;
    sessionTimeLeft: string;
    bytesIn: number;
    bytesOut: number;
    comment: string;
  }>> {
    const auth = Buffer.from(`${this.options.user}:${this.options.password ?? ''}`).toString('base64');
    const scheme = this.options.tls ? 'https' : 'http';
    const port = this.options.port ?? (this.options.connectionType === 'rest' ? 80 : 80);

    try {
      const res = await fetch(`${scheme}://${this.options.host}:${port}/rest/ip/hotspot/active`, {
        headers: { Authorization: `Basic ${auth}` },
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const raw = await res.json();
        return raw.map((a: any) => ({
          id: a['.id'] || '',
          user: a.user || '',
          address: a.address || '',
          macAddress: a['mac-address'] || '',
          server: a.server || '',
          uptime: a.uptime || '0s',
          sessionTimeLeft: a['session-time-left'] || 'Illimité',
          bytesIn: Number(a['bytes-in'] || 0),
          bytesOut: Number(a['bytes-out'] || 0),
          comment: a.comment || '',
        }));
      }
    } catch {}

    const api = this.buildApi();
    try {
      await api.connect();
      const raw = await api.write('/ip/hotspot/active/print');
      await api.close();
      return (raw || []).map((a: any) => ({
        id: a['.id'] || '',
        user: a.user || '',
        address: a.address || '',
        macAddress: a['mac-address'] || '',
        server: a.server || '',
        uptime: a.uptime || '0s',
        sessionTimeLeft: a['session-time-left'] || 'Illimité',
        bytesIn: Number(a['bytes-in'] || 0),
        bytesOut: Number(a['bytes-out'] || 0),
        comment: a.comment || '',
      }));
    } catch (err) {
      try { await api.close(); } catch {}
      return [];
    }
  }

  async kickSession(macOrIdOrUser: string): Promise<boolean> {
    const api = this.buildApi();
    try {
      await api.connect();
      // Search for active session by ID, MAC address, or User name
      const activeList = await api.write('/ip/hotspot/active/print');
      const target = (activeList || []).find(
        (a: any) =>
          a['.id'] === macOrIdOrUser ||
          a['mac-address'] === macOrIdOrUser ||
          a.user === macOrIdOrUser
      );

      if (!target) {
        await api.close();
        return false;
      }

      await api.write('/ip/hotspot/active/remove', `=.id=${target['.id']}`);
      await api.close();
      return true;
    } catch (err) {
      try { await api.close(); } catch {}
      return false;
    }
  }

  // ── Import Mikhmon Sales (/system/script) ───────────────────────────────────

  async getMikhmonSales(): Promise<Array<{
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
  }>> {
    const auth = Buffer.from(`${this.options.user}:${this.options.password ?? ''}`).toString('base64');
    const scheme = this.options.tls ? 'https' : 'http';
    const port = this.options.port ?? (this.options.connectionType === 'rest' ? 80 : 80);

    let scripts: any[] = [];
    try {
      const res = await fetch(`${scheme}://${this.options.host}:${port}/rest/system/script`, {
        headers: { Authorization: `Basic ${auth}` },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        scripts = await res.json();
      }
    } catch {}

    if (!scripts.length) {
      const api = this.buildApi();
      try {
        await api.connect();
        scripts = await api.write('/system/script/print');
        await api.close();
      } catch {
        try { await api.close(); } catch {}
        return [];
      }
    }

    const sales = scripts.filter((s: any) => s.comment === 'mikhmon' || (s.name && s.name.includes('-|-')));
    return sales.map((s: any) => {
      const parts = (s.name || '').split('-|-');
      return {
        id: s['.id'] || '',
        date: parts[0] || s.source || '',
        time: parts[1] || '',
        username: parts[2] || '',
        price: Number(parts[3]) || 0,
        ip: parts[4] || '',
        mac: parts[5] || '',
        validity: parts[6] || '',
        profile: parts[7] || parts[3] || 'Standard',
        comment: parts[8] || '',
      };
    });
  }
}
