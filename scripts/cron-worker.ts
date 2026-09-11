#!/usr/bin/env bun
// scripts/cron-worker.ts
// Decoupled Standalone Background Worker for NetPulse Hotspot Manager
// Runs independently from the Next.js web process (Docker service, systemd, or CLI)

import cron from 'node-cron';
import {
  runRouterHealthChecks,
  runCriticalStockCheck,
  runDailyClosureReport,
} from '../lib/cron/scheduler';
import { isDatabaseReady } from '../lib/db';

console.log('────────────────────────────────────────────────────────────');
console.log('🚀 NetPulse Standalone Background Worker (Decoupled Mode)');
console.log('────────────────────────────────────────────────────────────');

async function waitForDatabase(maxAttempts = 15, delayMs = 2000) {
  for (let i = 1; i <= maxAttempts; i++) {
    process.stdout.write(`⏳ Vérification de la connexion PostgreSQL (tentative ${i}/${maxAttempts})... `);
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

async function startWorker() {
  const dbReady = await waitForDatabase();
  if (!dbReady) {
    console.error('💥 [Worker] Impossible de joindre PostgreSQL après plusieurs tentatives. Arrêt.');
    process.exit(1);
  }

  console.log('⚡ Démarrage initial des tâches...');
  // Immediate initial run on worker boot
  await runRouterHealthChecks();
  await runCriticalStockCheck();

  // 1. Daily automated closure report at 23:59
  cron.schedule('59 23 * * *', async () => {
    console.log('⏰ [Worker] Exécution clôture quotidienne automatique (23:59)...');
    await runDailyClosureReport();
  });

  // 2. Critical stock monitor every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log('⏰ [Worker] Vérification stock critique...');
    await runCriticalStockCheck();
  });

  // 3. MikroTik router health check every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('⏰ [Worker] Ping et métriques routeurs MikroTik...');
    await runRouterHealthChecks();
  });

  console.log('✅ [Worker] Toutes les tâches récurrentes sont planifiées en arrière-plan.');
}

startWorker().catch((err) => {
  console.error('💥 [Worker] Erreur fatale du worker:', err);
  process.exit(1);
});
