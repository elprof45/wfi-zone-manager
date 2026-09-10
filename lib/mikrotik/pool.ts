// lib/mikrotik/pool.ts
// Singleton connection pool for MikroTik routers
// Maintains one persistent MikrotikAPI instance per router ID

import { MikrotikAPI } from '@fibercom/routeros-api';
import type { Router } from '../db/schema';

interface PoolEntry {
  api: MikrotikAPI;
  routerId: string;
  host: string;
  connectedAt: Date;
  lastUsedAt: Date;
}

class RouterPool {
  private readonly pool = new Map<string, PoolEntry>();
  /** Max idle time before auto-release (ms) */
  private readonly IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  /** Get or create a connected MikrotikAPI for a router DB record */
  async get(router: Router): Promise<MikrotikAPI> {
    const existing = this.pool.get(router.id);

    if (existing && existing.api.connected) {
      existing.lastUsedAt = new Date();
      return existing.api;
    }

    // Stale entry — remove it
    if (existing) this.pool.delete(router.id);

    const api = new MikrotikAPI({
      host: router.host,
      port: router.apiPort ?? 8728,
      user: router.username,
      password: router.passwordEncrypted ?? '',
      timeout: 10,
      tls: router.connectionType === 'rest',
    });

    await api.connect();

    const entry: PoolEntry = {
      api,
      routerId: router.id,
      host: router.host,
      connectedAt: new Date(),
      lastUsedAt: new Date(),
    };

    this.pool.set(router.id, entry);

    // Register disconnect cleanup
    api.on('error', () => {
      this.pool.delete(router.id);
    });

    return api;
  }

  /** Release and close a specific router connection */
  async release(routerId: string): Promise<void> {
    const entry = this.pool.get(routerId);
    if (!entry) return;

    this.pool.delete(routerId);
    try {
      if (entry.api.connected) await entry.api.close();
    } catch {}
  }

  /** Release all connections (e.g., on server shutdown) */
  async releaseAll(): Promise<void> {
    const ids = [...this.pool.keys()];
    await Promise.allSettled(ids.map((id) => this.release(id)));
  }

  /** Ping a router — returns true if reachable with real latency and error message */
  async ping(router: Router): Promise<{ alive: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const api = await this.get(router);
      await api.getSystemIdentity();
      return { alive: true, latencyMs: Date.now() - start };
    } catch (err: unknown) {
      this.pool.delete(router.id);
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { alive: false, latencyMs: Date.now() - start, error: errorMsg };
    }
  }

  /** Release connections idle longer than IDLE_TIMEOUT_MS */
  async evictIdle(): Promise<void> {
    const now = Date.now();
    for (const [id, entry] of this.pool.entries()) {
      if (now - entry.lastUsedAt.getTime() > this.IDLE_TIMEOUT_MS) {
        await this.release(id);
      }
    }
  }

  get size(): number {
    return this.pool.size;
  }

  get connectedRouterIds(): string[] {
    return [...this.pool.keys()];
  }
}

// Global singleton — persists across hot-reloads in dev via globalThis
const globalPool = globalThis as typeof globalThis & { __mikrotikPool?: RouterPool };
if (!globalPool.__mikrotikPool) {
  globalPool.__mikrotikPool = new RouterPool();
}

export const routerPool = globalPool.__mikrotikPool;
