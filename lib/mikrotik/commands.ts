// lib/mikrotik/commands.ts
// High-level RouterOS command helpers built on @fibercom/routeros-api

import type { MikrotikAPI } from '@fibercom/routeros-api';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface HotspotActiveUser {
  id: string;
  user: string;
  address: string;
  macAddress: string;
  uptime: string;
  sessionTime: string;
  bytesIn: number;
  bytesOut: number;
  server: string;
}

export interface InterfaceTraffic {
  name: string;
  rxBitsPerSecond: number;
  txBitsPerSecond: number;
  rxPacketsPerSecond: number;
  txPacketsPerSecond: number;
}

export interface DhcpLease {
  id: string;
  address: string;
  macAddress: string;
  hostname: string;
  server: string;
  status: string;
  comment: string;
}

export interface RouterLog {
  id: string;
  time: string;
  topics: string;
  message: string;
}

export interface HotspotUser {
  id: string;
  name: string;
  profile: string;
  password: string;
  comment: string;
  disabled: boolean;
  limitUptime: string;
  limitBytesTotal: number;
}

// ─── Active Hotspot Users ──────────────────────────────────────────────────────

export async function getActiveHotspotUsers(api: MikrotikAPI): Promise<HotspotActiveUser[]> {
  try {
    const raw = await api.write('/ip/hotspot/active/print');
    return (raw ?? []).map((r: Record<string, string>) => ({
      id: r['.id'] ?? '',
      user: r.user ?? '',
      address: r.address ?? '',
      macAddress: r['mac-address'] ?? '',
      uptime: r.uptime ?? '0s',
      sessionTime: r['session-time-left'] ?? '',
      bytesIn: Number(r['bytes-in'] ?? 0),
      bytesOut: Number(r['bytes-out'] ?? 0),
      server: r.server ?? '',
    }));
  } catch {
    return [];
  }
}

// ─── Interface Traffic (one-shot snapshot) ────────────────────────────────────

export async function getInterfaceTraffic(
  api: MikrotikAPI,
  interfaceName?: string
): Promise<InterfaceTraffic[]> {
  try {
    const raw = await api.getInterfaceStats(interfaceName);
    const items = Array.isArray(raw) ? raw : [raw];
    return items.map((r: Record<string, string | number>) => ({
      name: String(r.name ?? ''),
      rxBitsPerSecond: Number(r['rx-bits-per-second'] ?? 0),
      txBitsPerSecond: Number(r['tx-bits-per-second'] ?? 0),
      rxPacketsPerSecond: Number(r['rx-packets-per-second'] ?? 0),
      txPacketsPerSecond: Number(r['tx-packets-per-second'] ?? 0),
    }));
  } catch {
    return [];
  }
}

// ─── System Logs ──────────────────────────────────────────────────────────────

export async function getLogs(
  api: MikrotikAPI,
  topics?: string
): Promise<RouterLog[]> {
  try {
    const raw = await api.getSystemLogs(topics);
    return (raw ?? []).slice(-100).map((r: Record<string, string>) => ({
      id: r['.id'] ?? '',
      time: r.time ?? '',
      topics: r.topics ?? '',
      message: r.message ?? '',
    }));
  } catch {
    return [];
  }
}

// ─── Run RouterOS Script ──────────────────────────────────────────────────────

export async function runScript(api: MikrotikAPI, scriptName: string): Promise<boolean> {
  try {
    await api.runScript(scriptName);
    return true;
  } catch {
    return false;
  }
}

// ─── DHCP Leases ──────────────────────────────────────────────────────────────

export async function getDhcpLeases(
  api: MikrotikAPI,
  serverName?: string
): Promise<DhcpLease[]> {
  try {
    const raw = await api.getDhcpLeases(serverName);
    return (raw ?? []).map((r: Record<string, string>) => ({
      id: r['.id'] ?? '',
      address: r.address ?? '',
      macAddress: r['mac-address'] ?? '',
      hostname: r.hostname ?? '',
      server: r.server ?? '',
      status: r.status ?? 'bound',
      comment: r.comment ?? '',
    }));
  } catch {
    return [];
  }
}

// ─── Hotspot Users (database, not active sessions) ────────────────────────────

export async function getHotspotUsers(
  api: MikrotikAPI,
  profile?: string
): Promise<HotspotUser[]> {
  try {
    const cmd = profile
      ? ['/ip/hotspot/user/print', `?profile=${profile}`]
      : ['/ip/hotspot/user/print'];

    const raw = await api.write(cmd);
    return (raw ?? []).map((r: Record<string, string>) => ({
      id: r['.id'] ?? '',
      name: r.name ?? '',
      profile: r.profile ?? '',
      password: r.password ?? '',
      comment: r.comment ?? '',
      disabled: r.disabled === 'true',
      limitUptime: r['limit-uptime'] ?? '',
      limitBytesTotal: Number(r['limit-bytes-total'] ?? 0),
    }));
  } catch {
    return [];
  }
}

// ─── Remove Hotspot User from router ─────────────────────────────────────────

export async function removeHotspotUser(api: MikrotikAPI, userName: string): Promise<boolean> {
  try {
    const users = await api.write(['/ip/hotspot/user/print', `?name=${userName}`]);
    const user = users?.[0];
    if (!user) return false;

    await api.write('/ip/hotspot/user/remove', `=.id=${user['.id']}`);
    return true;
  } catch {
    return false;
  }
}

// ─── Kick active hotspot session ─────────────────────────────────────────────

export async function kickActiveUser(api: MikrotikAPI, sessionId: string): Promise<boolean> {
  try {
    await api.write('/ip/hotspot/active/remove', `=.id=${sessionId}`);
    return true;
  } catch {
    return false;
  }
}
