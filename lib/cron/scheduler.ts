import cron from 'node-cron';
import { getSetting } from '../db/queries/settings';
import { getAllProfiles } from '../db/queries/profiles';
import { getAllRouters, updateRouterStatus } from '../db/queries/routers';
import { MikroTikClient } from '../mikrotik/client';
import { dispatchNotification } from '../reports-service';

declare global {
  var __netpulseCronInitialized: boolean | undefined;
}

/**
 * Initialize background cron jobs for NetPulse Hotspot Manager
 */
export function initCronJobs() {
  if (globalThis.__netpulseCronInitialized) {
    return;
  }
  globalThis.__netpulseCronInitialized = true;

  console.log('⏰ [Cron] Initializing NetPulse background scheduled tasks...');

  // 1. Daily automated closure report at 23:59
  cron.schedule('59 23 * * *', async () => {
    console.log('⏰ [Cron] Running automated daily closure report (23:59)...');
    try {
      await dispatchNotification({
        reportType: 'daily',
        channel: 'both',
        customNotes: 'Rapport automatique quotidien de 23h59',
      });
    } catch (err) {
      console.error('⏰ [Cron] Daily closure failed:', err);
    }
  });

  // 2. Critical stock monitor every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    try {
      const profiles = await getAllProfiles();
      const critical = profiles.filter((p) => p.availableCount < p.minStockAlert);
      if (critical.length > 0) {
        console.log(`⏰ [Cron] Critical stock detected on ${critical.length} profiles!`);
        await dispatchNotification({
          reportType: 'stock_alert',
          channel: 'both',
        });
      }
    } catch (err) {
      console.error('⏰ [Cron] Stock monitor error:', err);
    }
  });

  // 3. MikroTik router health check every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const routers = await getAllRouters();
      for (const r of routers) {
        const client = new MikroTikClient({
          host: r.host,
          port: r.apiPort,
          user: r.username,
          password: r.passwordEncrypted ?? undefined,
          connectionType: r.connectionType as 'socket' | 'rest',
        });
        const metrics = await client.getHardwareMetrics();
        await updateRouterStatus(r.id, 'online', metrics);
      }
    } catch (err) {
      console.error('⏰ [Cron] Router ping check error:', err);
    }
  });

  console.log('⏰ [Cron] All scheduled tasks active (Daily Closure, Stock Monitor, Router Ping)');
}
