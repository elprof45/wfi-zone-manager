import { db } from './index';
import * as schema from './schema';
import { generateVoucherCode, generateVoucherPassword } from '../crypto-generator';
import { auth } from '../auth';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Starting NetPulse database seed...');

  // 1. Clean existing tables (in FK-safe order)
  console.log('🧹 Cleaning existing tables...');
  await db.delete(schema.auditLogs);
  await db.delete(schema.notificationLogs);
  await db.delete(schema.telegramLogs);
  await db.delete(schema.hotspotTickets);
  await db.delete(schema.dailyClosures);
  await db.delete(schema.hotspotProfiles);
  await db.delete(schema.routers);
  await db.delete(schema.systemSettings);
  await db.delete(schema.sessions);
  await db.delete(schema.accounts);
  await db.delete(schema.verifications);
  await db.delete(schema.users);

  // 2. Create Users via BetterAuth API
  console.log('👤 Creating demo users...');
  
  const superAdminRes = await auth.api.signUpEmail({
    body: {
      email: 'koffikomi.dev@gmail.com',
      password: 'admin123',
      name: 'Koffi Komi (Admin Réseau)',
    },
  });

  const cashierRes = await auth.api.signUpEmail({
    body: {
      email: 'amina.caisse@netpulse.local',
      password: 'caisse123',
      name: 'Amina Diallo (Gérant Caisse)',
    },
  });

  const superAdminId = superAdminRes.user.id;
  const cashierId = cashierRes.user.id;

  // Update roles and image avatars
  await db.update(schema.users)
    .set({
      role: 'super_admin',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    })
    .where(eq(schema.users.id, superAdminId));

  await db.update(schema.users)
    .set({
      role: 'cashier',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    })
    .where(eq(schema.users.id, cashierId));

  console.log('   ✓ Super Admin created (koffikomi.dev@gmail.com / admin123)');
  console.log('   ✓ Cashier created (amina.caisse@netpulse.local / caisse123)');

  // 3. Create Routers
  console.log('📡 Creating MikroTik routers...');
  const routerData: schema.NewRouter[] = [
    {
      id: 'rtr_rb951ui_1',
      name: 'Agence Centrale (RB951Ui)',
      location: 'Siège Principal - Lomé',
      host: '192.168.88.1',
      apiPort: 8728,
      connectionType: 'socket',
      username: 'api_netpulse',
      hotspotDnsName: 'wifi.netpulse.local',
      status: 'online',
      lastSeenAt: new Date(),
      hardwareJson: {
        model: 'MikroTik RouterBOARD 951Ui-2HnD (MIPSBE 600MHz)',
        cpuPercent: 12,
        ramTotalMb: 128,
        ramFreeMb: 82,
        flashTotalMb: 128,
        flashFreeMb: 94,
        uptime: '47d 14h 22m',
        temperatureC: 41,
        activeUsersCount: 38,
      },
    },
    {
      id: 'rtr_hex_2',
      name: 'Hotspot CyberCafé & Lounge',
      location: 'Zone Universitaire - Campus Nord',
      host: '192.168.10.1',
      apiPort: 8728,
      connectionType: 'socket',
      username: 'netpulse_mgr',
      hotspotDnsName: 'cyber.hotspot.lan',
      status: 'online',
      lastSeenAt: new Date(),
      hardwareJson: {
        model: 'MikroTik hEX S (MMIPS 880MHz 4-core)',
        cpuPercent: 7,
        ramTotalMb: 256,
        ramFreeMb: 198,
        flashTotalMb: 512,
        flashFreeMb: 420,
        uptime: '89d 06h 11m',
        temperatureC: 38,
        activeUsersCount: 54,
      },
    },
    {
      id: 'rtr_hap_3',
      name: 'Résidence Étudiante Le Palier',
      location: 'Immeuble B - 3ème étage',
      host: '192.168.20.1',
      apiPort: 443,
      connectionType: 'rest',
      username: 'admin_rest',
      hotspotDnsName: 'residence.hotspot.lan',
      status: 'warning',
      lastSeenAt: new Date(),
      hardwareJson: {
        model: 'MikroTik hAP ac² (ARM 716MHz)',
        cpuPercent: 68,
        ramTotalMb: 128,
        ramFreeMb: 24,
        flashTotalMb: 16,
        flashFreeMb: 3.2,
        uptime: '12d 02h 45m',
        temperatureC: 49,
        activeUsersCount: 29,
      },
    },
  ];

  await db.insert(schema.routers).values(routerData);
  console.log(`   ✓ ${routerData.length} Routers inserted`);

  // 4. Create Profiles
  console.log('🏷️ Creating Hotspot profiles...');
  const profileData: schema.NewHotspotProfile[] = [
    {
      id: 'prof_1h',
      routerId: 'rtr_rb951ui_1',
      name: 'Pass 1 Heure',
      rateLimit: '2M/2M',
      validityLabel: '1 Heure',
      validityMinutes: 60,
      price: '100',
      currency: 'FCFA',
      sharedUsers: 1,
      minStockAlert: 15,
      color: '#3b82f6',
    },
    {
      id: 'prof_24h',
      routerId: 'rtr_rb951ui_1',
      name: 'Pass Journée 24H',
      rateLimit: '5M/5M',
      validityLabel: '24 Heures',
      validityMinutes: 1440,
      price: '500',
      currency: 'FCFA',
      sharedUsers: 1,
      minStockAlert: 15,
      color: '#10b981',
    },
    {
      id: 'prof_7d',
      routerId: 'rtr_hex_2',
      name: 'Pass Semaine 7J',
      rateLimit: '8M/8M',
      validityLabel: '7 Jours',
      validityMinutes: 10080,
      price: '2500',
      currency: 'FCFA',
      sharedUsers: 1,
      minStockAlert: 15,
      color: '#8b5cf6',
    },
    {
      id: 'prof_30d',
      routerId: 'rtr_hex_2',
      name: 'Pass Illimité Mois 30J',
      rateLimit: '12M/15M',
      validityLabel: '30 Jours',
      validityMinutes: 43200,
      price: '8000',
      currency: 'FCFA',
      sharedUsers: 2,
      minStockAlert: 15,
      color: '#f59e0b',
    },
    {
      id: 'prof_flash_30m',
      routerId: 'rtr_hap_3',
      name: 'Pass Express 30 Min',
      rateLimit: '3M/3M',
      validityLabel: '30 Minutes',
      validityMinutes: 30,
      price: '50',
      currency: 'FCFA',
      sharedUsers: 1,
      minStockAlert: 15,
      color: '#ef4444',
    },
  ];

  await db.insert(schema.hotspotProfiles).values(profileData);
  console.log(`   ✓ ${profileData.length} Profiles inserted`);

  // 5. Create Closures (past 2 days)
  console.log('📊 Creating past daily closures...');
  const now = new Date();
  const pastClosure1Id = 'clot_20260908_01';
  const pastClosure2Id = 'clot_20260907_01';

  await db.insert(schema.dailyClosures).values([
    {
      id: pastClosure1Id,
      sessionCode: 'CLOT-2026-0908-001',
      closedAt: new Date(now.getTime() - 24 * 3600 * 1000),
      closedByUserId: superAdminId,
      routerId: null,
      routerName: 'Tous les sites consolidés',
      totalRevenue: '28400.00',
      currency: 'FCFA',
      ticketsSoldCount: 32,
      breakdownJson: [
        { profileId: 'prof_1h', profileName: 'Pass 1 Heure', count: 14, revenue: 1400 },
        { profileId: 'prof_24h', profileName: 'Pass Journée 24H', count: 9, revenue: 4500 },
        { profileId: 'prof_7d', profileName: 'Pass Semaine 7J', count: 4, revenue: 10000 },
        { profileId: 'prof_30d', profileName: 'Pass Illimité Mois 30J', count: 1, revenue: 8000 },
        { profileId: 'prof_flash_30m', profileName: 'Pass Express 30 Min', count: 4, revenue: 200 },
      ],
      mikrotikPurgedCount: 47,
      emailSent: true,
      telegramSent: true,
      notes: 'Clôture automatique de 23h59. Purge des sessions expirées sur les 3 MikroTik exécutée sans anomalie.',
    },
    {
      id: pastClosure2Id,
      sessionCode: 'CLOT-2026-0907-001',
      closedAt: new Date(now.getTime() - 48 * 3600 * 1000),
      closedByUserId: superAdminId,
      routerId: null,
      routerName: 'Tous les sites consolidés',
      totalRevenue: '24900.00',
      currency: 'FCFA',
      ticketsSoldCount: 29,
      breakdownJson: [
        { profileId: 'prof_1h', profileName: 'Pass 1 Heure', count: 12, revenue: 1200 },
        { profileId: 'prof_24h', profileName: 'Pass Journée 24H', count: 8, revenue: 4000 },
        { profileId: 'prof_7d', profileName: 'Pass Semaine 7J', count: 3, revenue: 7500 },
        { profileId: 'prof_30d', profileName: 'Pass Illimité Mois 30J', count: 1, revenue: 8000 },
        { profileId: 'prof_flash_30m', profileName: 'Pass Express 30 Min', count: 5, revenue: 250 },
      ],
      mikrotikPurgedCount: 39,
      emailSent: true,
      telegramSent: true,
      notes: 'Clôture manuelle effectuée par administrateur.',
    },
  ]);
  console.log('   ✓ 2 Daily Closures inserted');

  // 6. Create Tickets
  console.log('🎫 Generating tickets (Available, Today Sales, Closed)...');
  const tickets: schema.NewHotspotTicket[] = [];

  // Available stock tickets (45)
  for (let i = 0; i < 45; i++) {
    const prof = profileData[i % profileData.length];
    const rtr = routerData[i % routerData.length];
    tickets.push({
      id: `tkt_avail_${i + 1}`,
      code: generateVoucherCode(6),
      password: generateVoucherPassword(4),
      profileId: prof.id,
      routerId: rtr.id,
      price: prof.price,
      currency: prof.currency,
      status: 'available',
      batchId: 'batch_initial_stock',
      createdAt: new Date(now.getTime() - Math.floor(Math.random() * 48 * 3600 * 1000)),
      isClosed: false,
    });
  }

  // Sold tickets for today (28) — not yet closed
  for (let i = 0; i < 28; i++) {
    const prof = profileData[i % profileData.length];
    const rtr = routerData[i % routerData.length];
    const saleDate = new Date(now.getTime() - Math.floor(Math.random() * 8 * 3600 * 1000));
    tickets.push({
      id: `tkt_today_${i + 1}`,
      code: generateVoucherCode(6),
      password: generateVoucherPassword(4),
      profileId: prof.id,
      routerId: rtr.id,
      price: prof.price,
      currency: prof.currency,
      status: i % 3 === 0 ? 'active' : 'used',
      batchId: 'batch_initial_stock',
      createdAt: new Date(saleDate.getTime() - 24 * 3600 * 1000),
      soldAt: saleDate,
      soldByUserId: cashierId,
      activatedAt: saleDate,
      expiresAt: new Date(saleDate.getTime() + prof.validityMinutes * 60000),
      isClosed: false,
    });
  }

  // Closed tickets from yesterday (32)
  const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
  for (let i = 0; i < 32; i++) {
    const prof = profileData[i % profileData.length];
    const rtr = routerData[i % routerData.length];
    const saleDate = new Date(yesterday.getTime() - Math.floor(Math.random() * 10 * 3600 * 1000));
    tickets.push({
      id: `tkt_closed_${i + 1}`,
      code: generateVoucherCode(6),
      password: generateVoucherPassword(4),
      profileId: prof.id,
      routerId: rtr.id,
      price: prof.price,
      currency: prof.currency,
      status: 'expired',
      batchId: 'batch_yesterday',
      createdAt: new Date(saleDate.getTime() - 24 * 3600 * 1000),
      soldAt: saleDate,
      soldByUserId: cashierId,
      isClosed: true,
      closureId: pastClosure1Id,
    });
  }

  await db.insert(schema.hotspotTickets).values(tickets);
  console.log(`   ✓ ${tickets.length} Tickets inserted (45 in stock, 28 sold today, 32 closed)`);

  // 7. System Settings
  console.log('⚙️ Inserting system settings...');
  const settingsEntries: schema.SystemSetting[] = [
    {
      key: 'general',
      value: {
        appName: 'NetPulse Hotspot Manager',
        currency: 'FCFA',
        isSetupCompleted: true,
        defaultVoucherLength: 6,
        defaultVoucherPasswordLength: 4,
      },
      updatedAt: new Date(),
    },
    {
      key: 'database',
      value: {
        type: 'postgres_local',
        host: 'localhost',
        port: 5434,
        databaseName: 'netpulse_hotspot_db',
        username: 'netpulse_hotspot',
        isConnected: true,
        lastTestedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    },
    {
      key: 'smtp',
      value: {
        host: 'smtp.resend.com',
        port: 587,
        secure: true,
        username: 'resend_api_key',
        senderEmail: 'notifications@netpulse-hotspot.com',
        isConfigured: true,
        lastTestedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    },
    {
      key: 'telegram',
      value: {
        botToken: '7829103845:AAF9x-8e2b8K9vG2LqZa90sM4v8x-DEMO',
        adminChatId: '-1002345678901',
        isConfigured: true,
        botUsername: '@NetPulseHotspotBot',
        autoSendClosures: true,
        lastTestedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    },
    {
      key: 'reports',
      value: {
        dailyAutoClosureTime: '23:59',
        autoPurgeExpiredSessions: true,
        notifyOnStockUnder: 15,
      },
      updatedAt: new Date(),
    },
  ];

  for (const s of settingsEntries) {
    await db.insert(schema.systemSettings).values(s);
  }
  console.log(`   ✓ ${settingsEntries.length} Settings records inserted`);

  // 8. Logs
  console.log('📝 Inserting sample notification and telegram logs...');
  await db.insert(schema.notificationLogs).values([
    {
      id: 'notif_1',
      type: 'closure_income',
      channel: 'all',
      recipient: 'Admin Group & koffikomi.dev@gmail.com',
      status: 'delivered',
      title: 'Clôture Journalière CLOT-2026-0908-001 validée',
      summary: 'Revenus: 28 400 FCFA — 32 tickets vendus — 47 sessions MikroTik purgées.',
      revenueAmount: '28400.00',
      ticketsCount: 32,
      timestamp: new Date(now.getTime() - 24 * 3600 * 1000),
    },
    {
      id: 'notif_2',
      type: 'critical_stock_alert',
      channel: 'telegram',
      recipient: 'Admin Group (@NetPulseHotspotBot)',
      status: 'delivered',
      title: 'Alerte Stock Critique : Pass Express 30 Min',
      summary: 'Il ne reste que 7 tickets disponibles (seuil configuré: 15). Génération recommandée.',
      revenueAmount: null,
      ticketsCount: 7,
      timestamp: new Date(now.getTime() - 4 * 3600 * 1000),
    },
  ]);

  await db.insert(schema.telegramLogs).values([
    {
      id: 'tlg_1',
      type: 'incoming_command',
      command: '/stats',
      text: 'Utilisateur @koffi a exécuté /stats',
      status: 'delivered',
      timestamp: new Date(now.getTime() - 3 * 3600 * 1000),
    },
    {
      id: 'tlg_2',
      type: 'closure_report',
      command: null,
      text: 'Rapport clôture CLOT-2026-0908-001 transmis avec succès',
      status: 'delivered',
      timestamp: new Date(now.getTime() - 24 * 3600 * 1000),
    },
  ]);

  console.log('✅ Database seeded successfully with production-ready data!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
