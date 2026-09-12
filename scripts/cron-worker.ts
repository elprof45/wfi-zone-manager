#!/usr/bin/env bun
// scripts/cron-worker.ts
// Decoupled Standalone Background Worker for NetPulse Hotspot Manager
// Configurable on/off switches, customizable intervals, and multi-bot alert dispatching

import cron, { type ScheduledTask } from 'node-cron';
import {
    runRouterHealthChecks,
    runCriticalStockCheck,
    runDailyClosureReport,
} from '../lib/cron/scheduler';
import { isDatabaseReady } from '../lib/db';
import { getSetting } from '../lib/db/queries/settings';

// ─── Configuration & Flags ───────────────────────────────────────────────────

const args = process.argv.slice(2);
const isRunOnce = args.includes('--once');
const isDryRun = args.includes('--dry-run');

const config = {
  // Global worker toggle
  enabled: process.env.CRON_ENABLED !== 'false' && !args.includes('--disable-all'),

  // 1. Router Health Check
  routerPing: {
    enabled:
      process.env.CRON_ROUTER_PING_ENABLED !== 'false' &&
      !args.includes('--disable-ping'),
    schedule: process.env.CRON_ROUTER_PING_INTERVAL || '*/5 * * * *',
  },

  // 2. Critical Stock Monitor
  stockCheck: {
    enabled:
      process.env.CRON_STOCK_CHECK_ENABLED !== 'false' &&
      !args.includes('--disable-stock'),
    schedule: process.env.CRON_STOCK_CHECK_INTERVAL || '*/30 * * * *',
  },

  // 3. Automated Daily Closure
  dailyClosure: {
    enabled:
      process.env.CRON_DAILY_CLOSURE_ENABLED !== 'false' &&
      !args.includes('--disable-closure'),
    schedule: process.env.CRON_DAILY_CLOSURE_TIME || '59 23 * * *',
  },

  // Run initial checks on start
  runOnBoot: process.env.CRON_RUN_ON_BOOT !== 'false' && !args.includes('--no-boot-run'),
};

console.log('──────────────────────────────────────────────────────────────────');
console.log('🚀 NetPulse Background Worker (Mode Découplé / Standalone)');
console.log('──────────────────────────────────────────────────────────────────');
console.log(`⚙️  Statut Global Worker     : ${config.enabled ? '🟢 ACTIVÉ' : '🔴 DÉSACTIVÉ'}`);
console.log(`📡 Ping Routeurs MikroTik    : ${config.routerPing.enabled ? `🟢 ACTIF (${config.routerPing.schedule})` : '⚪ DÉSACTIVÉ'}`);
console.log(`📦 Surveillance Stocks       : ${config.stockCheck.enabled ? `🟢 ACTIF (${config.stockCheck.schedule})` : '⚪ DÉSACTIVÉ'}`);
console.log(`📑 Arrêté Journalier Ventes  : ${config.dailyClosure.enabled ? `🟢 ACTIF (${config.dailyClosure.schedule})` : '⚪ DÉSACTIVÉ'}`);
if (isRunOnce) console.log('⚡ Mode : Exécution unique (--once) puis arrêt.');
if (isDryRun) console.log('🧪 Mode : Simulation (--dry-run).');
console.log('──────────────────────────────────────────────────────────────────');

if (!config.enabled) {
  console.log('⏸️ Worker désactivé via configuration (CRON_ENABLED=false ou --disable-all). Arrêt.');
  process.exit(0);
}

// ─── Database Liveness Waiter ────────────────────────────────────────────────

async function waitForDatabase(maxAttempts = 20, delayMs = 2000) {
  for (let i = 1; i <= maxAttempts; i++) {
    process.stdout.write(`⏳ Vérification PostgreSQL (tentative ${i}/${maxAttempts})... `);
    const ready = await isDatabaseReady(3000);
    if (ready) {
      console.log('✅ Connecté !');
      return true;
    }
    console.log('❌ Injoignable, attente...');
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

// ─── Active Channels Inspection ──────────────────────────────────────────────

async function printActiveChannels() {
  try {
    const notifs = (await getSetting<any>('notifications')) || {};
    const channels: string[] = [];
    if (notifs.telegram ?? true) channels.push('Telegram Bot ✈️');
    if (notifs.discord) channels.push('Discord HTTP Bot 🎮');
    if (notifs.email ?? true) channels.push('Resend / Email ✉️');

    console.log(`🔔 Canaux de diffusion actifs : ${channels.length > 0 ? channels.join(', ') : 'Aucun (alertes en console)'}`);
    console.log('──────────────────────────────────────────────────────────────────');
  } catch {
    console.log('🔔 Canaux de diffusion : Telegram & Email par défaut.');
  }
}

// ─── Worker Lifecycle ────────────────────────────────────────────────────────

const scheduledTasks: ScheduledTask[] = [];

async function startWorker() {
  const dbReady = await waitForDatabase();
  if (!dbReady) {
    console.error('💥 [Worker] Impossible de joindre PostgreSQL après plusieurs tentatives. Arrêt.');
    process.exit(1);
  }

  await printActiveChannels();

  // Mode One-Shot: execute enabled tasks once and exit
  if (isRunOnce) {
    console.log('🚀 Exécution unique des tâches activées...');
    if (config.routerPing.enabled) await runRouterHealthChecks();
    if (config.stockCheck.enabled) await runCriticalStockCheck();
    if (config.dailyClosure.enabled) await runDailyClosureReport();
    console.log('✅ Exécution unique terminée. Arrêt.');
    process.exit(0);
  }

  // Optional Boot Run
  if (config.runOnBoot) {
    console.log('⚡ Exécution initiale au démarrage du worker...');
    if (config.routerPing.enabled) {
      await runRouterHealthChecks().catch((e) => console.warn('⚠️ Ping initial:', e.message));
    }
    if (config.stockCheck.enabled) {
      await runCriticalStockCheck().catch((e) => console.warn('⚠️ Stock initial:', e.message));
    }
  }

  // 1. MikroTik Router Ping
  if (config.routerPing.enabled) {
    const t1 = cron.schedule(config.routerPing.schedule, async () => {
      console.log(`⏰ [Worker] Ping et métriques routeurs MikroTik (${new Date().toLocaleTimeString('fr-FR')})...`);
      await runRouterHealthChecks();
    });
    scheduledTasks.push(t1);
  }

  // 2. Critical Stock Monitor
  if (config.stockCheck.enabled) {
    const t2 = cron.schedule(config.stockCheck.schedule, async () => {
      console.log(`⏰ [Worker] Vérification stock critique (${new Date().toLocaleTimeString('fr-FR')})...`);
      await runCriticalStockCheck();
    });
    scheduledTasks.push(t2);
  }

  // 3. Daily Automated Closure
  if (config.dailyClosure.enabled) {
    const t3 = cron.schedule(config.dailyClosure.schedule, async () => {
      console.log(`⏰ [Worker] Clôture automatique journalière (${new Date().toLocaleTimeString('fr-FR')})...`);
      await runDailyClosureReport();
    });
    scheduledTasks.push(t3);
  }

  console.log(`✅ [Worker] ${scheduledTasks.length} tâche(s) récurrente(s) active(s) en arrière-plan.`);
  console.log('💡 Appuyez sur Ctrl+C pour arrêter le worker en douceur.');
}

// ─── Graceful Shutdown ───────────────────────────────────────────────────────

function handleShutdown(signal: string) {
  console.log(`\n🛑 Signal ${signal} reçu. Arrêt propre du worker en cours...`);
  for (const t of scheduledTasks) {
    t.stop();
  }
  console.log('👋 NetPulse Worker arrêté avec succès.');
  process.exit(0);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

startWorker().catch((err) => {
  console.error('💥 [Worker] Erreur fatale du worker:', err);
  process.exit(1);
});
