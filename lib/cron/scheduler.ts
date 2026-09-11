// lib/cron/scheduler.ts
// Robust & Decoupled Background Task Scheduler for NetPulse Hotspot Manager
// Supports graceful DB recovery, per-router ping timeouts, external execution, and runtime toggle

import cron from 'node-cron';
import { isDatabaseReady } from '../db';
import { getAllProfiles } from '../db/queries/profiles';
import { getAllRouters, updateRouterStatus } from '../db/queries/routers';
import { MikroTikClient } from '../mikrotik/client';
import { dispatchNotification } from '../reports-service';

declare global {
  // eslint-disable-next-line no-var
  var __netpulseCronInitialized: boolean | undefined;
  // eslint-disable-next-line no-var
  var __netpulseCronStats:
    | {
        lastHealthCheck?: { timestamp: string; checked: number; online: number; errors: number };
        lastStockCheck?: { timestamp: string; criticalCount: number };
        lastDailyClosure?: { timestamp: string; success: boolean };
        isWorkerStandalone?: boolean;
      }
    | undefined;
}

if (!globalThis.__netpulseCronStats) {
  globalThis.__netpulseCronStats = {};
}

// ─── Individual Executable Tasks (Exposed for Internal Cron, API Trigger & Standalone Worker) ───

/**
 * 1. Ping and update metrics for all registered MikroTik routers.
 * Uses concurrent promises with per-router 4s timeouts to prevent hanging.
 */
export async function runRouterHealthChecks(): Promise<{
  checked: number;
  online: number;
  errors: number;
}> {
  const ready = await isDatabaseReady();
  if (!ready) {
    console.warn('⚠️ [Cron] Base de données PostgreSQL temporairement inaccessible. Ping routeurs reporté.');
    return { checked: 0, online: 0, errors: 0 };
  }

  try {
    const routersList = await getAllRouters();
    if (!routersList || routersList.length === 0) {
      return { checked: 0, online: 0, errors: 0 };
    }

    let onlineCount = 0;
    let errorCount = 0;

    const pingTasks = routersList.map(async (r) => {
      try {
        const client = new MikroTikClient({
          host: r.host,
          port: r.apiPort,
          user: r.username,
          password: r.passwordEncrypted ?? undefined,
          connectionType: r.connectionType as 'socket' | 'rest',
        });

        // Timeout of 4500ms per router to avoid blocking
        const metricsPromise = client.getHardwareMetrics();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout de connexion (4.5s)')), 4500)
        );

        const metrics = await Promise.race([metricsPromise, timeoutPromise]);
        await updateRouterStatus(r.id, 'online', metrics);
        onlineCount++;
      } catch (err: any) {
        errorCount++;
        // Mark router as offline without crashing
        await updateRouterStatus(r.id, 'offline').catch(() => {});
      }
    });

    await Promise.allSettled(pingTasks);

    if (globalThis.__netpulseCronStats) {
      globalThis.__netpulseCronStats.lastHealthCheck = {
        timestamp: new Date().toISOString(),
        checked: routersList.length,
        online: onlineCount,
        errors: errorCount,
      };
    }

    return { checked: routersList.length, online: onlineCount, errors: errorCount };
  } catch (err: any) {
    console.warn('⚠️ [Cron] Erreur lors de la vérification de santé des routeurs:', err.message);
    return { checked: 0, online: 0, errors: 1 };
  }
}

/**
 * 2. Critical stock verification.
 */
export async function runCriticalStockCheck(): Promise<{ criticalCount: number }> {
  const ready = await isDatabaseReady();
  if (!ready) {
    console.warn('⚠️ [Cron] Base de données inaccessible. Vérification du stock reportée.');
    return { criticalCount: 0 };
  }

  try {
    const profiles = await getAllProfiles();
    const critical = profiles.filter((p) => p.availableCount < p.minStockAlert);

    if (critical.length > 0) {
      console.log(`⏰ [Cron] Stock critique détecté sur ${critical.length} profil(s) ! Expédition alerte...`);
      await dispatchNotification({
        reportType: 'stock_alert',
        channel: 'all',
      }).catch((e) => console.warn('⚠️ [Cron] Échec expédition alerte stock:', e.message));
    }

    if (globalThis.__netpulseCronStats) {
      globalThis.__netpulseCronStats.lastStockCheck = {
        timestamp: new Date().toISOString(),
        criticalCount: critical.length,
      };
    }

    return { criticalCount: critical.length };
  } catch (err: any) {
    console.warn('⚠️ [Cron] Erreur lors de la surveillance des stocks:', err.message);
    return { criticalCount: 0 };
  }
}

/**
 * 3. Daily automated closure report.
 */
export async function runDailyClosureReport(): Promise<{ success: boolean; message?: string }> {
  const ready = await isDatabaseReady();
  if (!ready) {
    console.warn('⚠️ [Cron] Base de données inaccessible. Clôture automatique quotidienne reportée.');
    return { success: false, message: 'Base de données inaccessible' };
  }

  try {
    const res = await dispatchNotification({
      reportType: 'daily',
      channel: 'all',
      customNotes: 'Arrêté automatique journalier généré par le planificateur de tâches',
    });

    if (globalThis.__netpulseCronStats) {
      globalThis.__netpulseCronStats.lastDailyClosure = {
        timestamp: new Date().toISOString(),
        success: res.success,
      };
    }

    return { success: res.success, message: res.message };
  } catch (err: any) {
    console.warn('⚠️ [Cron] Échec clôture journalière:', err.message);
    return { success: false, message: err.message };
  }
}

/**
 * Get current cron status stats for dashboard/monitoring.
 */
export function getCronStats() {
  return {
    initialized: Boolean(globalThis.__netpulseCronInitialized),
    isBackgroundEnabled: process.env.ENABLE_BACKGROUND_CRON !== 'false',
    stats: globalThis.__netpulseCronStats || {},
  };
}

// ─── Main In-App Scheduler Initialization ─────────────────────────────────────

/**
 * Initialize background cron jobs for NetPulse Hotspot Manager.
 * Can be explicitly disabled via ENABLE_BACKGROUND_CRON=false if running in decoupled worker mode.
 */
export function initCronJobs() {
  if (globalThis.__netpulseCronInitialized) {
    return;
  }

  // Decoupling switch: if set to false, don't run cron in the Next.js web server process
  if (process.env.ENABLE_BACKGROUND_CRON === 'false' || process.env.ENABLE_BACKGROUND_CRON === '0') {
    console.log('⏸️ [Cron] Tâches d’arrière-plan internes désactivées (ENABLE_BACKGROUND_CRON=false). Mode worker autonome ou externe activé.');
    return;
  }

  globalThis.__netpulseCronInitialized = true;
  console.log('⏰ [Cron] Initialisation du planificateur NetPulse (Clôture 23h59, Stock 30m, Ping 5m)...');

  // 1. Daily automated closure report at 23:59
  cron.schedule('59 23 * * *', async () => {
    console.log('⏰ [Cron] Exécution de la clôture automatique journalière (23:59)...');
    await runDailyClosureReport();
  });

  // 2. Critical stock monitor every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    await runCriticalStockCheck();
  });

  // 3. MikroTik router health check every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    await runRouterHealthChecks();
  });

  console.log('✅ [Cron] Planificateur actif et résilient.');
}
