// Drizzle ORM Schema — NetPulse Hotspot Manager v2
// Full PostgreSQL schema with all tables

import {
    pgTable,
    text,
    integer,
    boolean,
    timestamp,
    numeric,
    jsonb,
    pgEnum
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['super_admin', 'admin', 'cashier']);
export const routerStatusEnum = pgEnum('router_status', ['online', 'offline', 'warning']);
export const connectionTypeEnum = pgEnum('connection_type', ['socket', 'rest']);
export const ticketStatusEnum = pgEnum('ticket_status', ['available', 'active', 'used', 'expired']);
export const notifTypeEnum = pgEnum('notif_type', [
  'daily_report',
  'weekly_report',
  'monthly_report',
  'closure_income',
  'critical_stock_alert',
  'router_warning',
]);
export const notifChannelEnum = pgEnum('notif_channel', [
  'telegram',
  'email',
  'discord',
  'all',
]);
export const notifStatusEnum = pgEnum('notif_status', ['delivered', 'sent', 'failed']);
export const telegramLogTypeEnum = pgEnum('telegram_log_type', [
  'incoming_command',
  'outgoing_alert',
  'closure_report',
]);
export const botLogTypeEnum = pgEnum('bot_log_type', [
  'incoming_command',
  'outgoing_alert',
  'closure_report',
  'test',
]);

// ─── Better-Auth Tables ───────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  role: userRoleEnum('role').notNull().default('cashier'),
  banned: boolean('banned').default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  impersonatedBy: text('impersonated_by'),
});

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ─── MikroTik Routers ─────────────────────────────────────────────────────────

export const routers = pgTable('routers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  location: text('location').notNull(),
  host: text('host').notNull(),
  apiPort: integer('api_port').notNull().default(8728),
  connectionType: connectionTypeEnum('connection_type').notNull().default('socket'),
  username: text('username').notNull(),
  passwordEncrypted: text('password_encrypted'),
  hotspotDnsName: text('hotspot_dns_name').notNull().default('hotspot.wifi'),
  status: routerStatusEnum('status').notNull().default('offline'),
  lastSeenAt: timestamp('last_seen_at'),
  // Cached hardware metrics (updated on ping)
  hardwareJson: jsonb('hardware_json'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Hotspot Profiles ─────────────────────────────────────────────────────────

export const hotspotProfiles = pgTable('hotspot_profiles', {
  id: text('id').primaryKey(),
  routerId: text('router_id').references(() => routers.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  rateLimit: text('rate_limit').notNull(), // e.g. "2M/2M"
  sharedUsers: integer('shared_users').notNull().default(1),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('FCFA'),
  validityMinutes: integer('validity_minutes').notNull(),
  validityLabel: text('validity_label').notNull(), // e.g. "1 Heure", "24 Heures"
  minStockAlert: integer('min_stock_alert').notNull().default(15),
  color: text('color').notNull().default('#3b82f6'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Hotspot Tickets ──────────────────────────────────────────────────────────

export const hotspotTickets = pgTable('hotspot_tickets', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  password: text('password'),
  profileId: text('profile_id')
    .notNull()
    .references(() => hotspotProfiles.id, { onDelete: 'restrict' }),
  routerId: text('router_id')
    .notNull()
    .references(() => routers.id, { onDelete: 'restrict' }),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('FCFA'),
  status: ticketStatusEnum('status').notNull().default('available'),
  batchId: text('batch_id'), // Group tickets generated together
  createdAt: timestamp('created_at').notNull().defaultNow(),
  soldAt: timestamp('sold_at'),
  soldByUserId: text('sold_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  activatedAt: timestamp('activated_at'),
  expiresAt: timestamp('expires_at'),
  isClosed: boolean('is_closed').notNull().default(false),
  closureId: text('closure_id'), // FK set after closure exists
});

// ─── Daily Closures ───────────────────────────────────────────────────────────

export const dailyClosures = pgTable('daily_closures', {
  id: text('id').primaryKey(),
  sessionCode: text('session_code').notNull().unique(), // e.g. "CLOT-2026-0909-001"
  closedAt: timestamp('closed_at').notNull().defaultNow(),
  closedByUserId: text('closed_by_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  routerId: text('router_id'), // null = all routers
  routerName: text('router_name').notNull(),
  totalRevenue: numeric('total_revenue', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('FCFA'),
  ticketsSoldCount: integer('tickets_sold_count').notNull(),
  breakdownJson: jsonb('breakdown_json').notNull(), // BreakdownByProfile[]
  mikrotikPurgedCount: integer('mikrotik_purged_count').notNull().default(0),
  emailSent: boolean('email_sent').notNull().default(false),
  telegramSent: boolean('telegram_sent').notNull().default(false),
  notes: text('notes'),
});

// ─── System Settings (key/value store) ───────────────────────────────────────

export const systemSettings = pgTable('system_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Notification Logs ────────────────────────────────────────────────────────

export const notificationLogs = pgTable('notification_logs', {
  id: text('id').primaryKey(),
  type: notifTypeEnum('type').notNull(),
  channel: notifChannelEnum('channel').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  recipient: text('recipient').notNull(),
  status: notifStatusEnum('status').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  revenueAmount: numeric('revenue_amount', { precision: 12, scale: 2 }),
  ticketsCount: integer('tickets_count'),
});

// ─── Telegram Logs ────────────────────────────────────────────────────────────

export const telegramLogs = pgTable('telegram_logs', {
  id: text('id').primaryKey(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  type: telegramLogTypeEnum('type').notNull(),
  command: text('command'),
  text: text('text').notNull(),
  status: notifStatusEnum('status').notNull().default('sent'),
});

// ─── Discord Logs ─────────────────────────────────────────────────────────────

export const discordLogs = pgTable('discord_logs', {
  id: text('id').primaryKey(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  type: botLogTypeEnum('type').notNull(),
  command: text('command'),
  text: text('text').notNull(),
  guildId: text('guild_id'),
  channelId: text('channel_id'),
  status: notifStatusEnum('status').notNull().default('sent'),
});

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(), // e.g. "ticket.generate", "closure.execute"
  entityType: text('entity_type'), // e.g. "ticket", "router"
  entityId: text('entity_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  tickets: many(hotspotTickets),
  closures: many(dailyClosures),
  auditLogs: many(auditLogs),
}));

export const routersRelations = relations(routers, ({ many }) => ({
  profiles: many(hotspotProfiles),
  tickets: many(hotspotTickets),
}));

export const hotspotProfilesRelations = relations(hotspotProfiles, ({ one, many }) => ({
  router: one(routers, { fields: [hotspotProfiles.routerId], references: [routers.id] }),
  tickets: many(hotspotTickets),
}));

export const hotspotTicketsRelations = relations(hotspotTickets, ({ one }) => ({
  profile: one(hotspotProfiles, { fields: [hotspotTickets.profileId], references: [hotspotProfiles.id] }),
  router: one(routers, { fields: [hotspotTickets.routerId], references: [routers.id] }),
  soldBy: one(users, { fields: [hotspotTickets.soldByUserId], references: [users.id] }),
}));

export const dailyClosuresRelations = relations(dailyClosures, ({ one }) => ({
  closedBy: one(users, { fields: [dailyClosures.closedByUserId], references: [users.id] }),
}));

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Router = typeof routers.$inferSelect;
export type NewRouter = typeof routers.$inferInsert;
export type HotspotProfile = typeof hotspotProfiles.$inferSelect;
export type NewHotspotProfile = typeof hotspotProfiles.$inferInsert;
export type HotspotTicket = typeof hotspotTickets.$inferSelect;
export type NewHotspotTicket = typeof hotspotTickets.$inferInsert;
export type DailyClosure = typeof dailyClosures.$inferSelect;
export type NewDailyClosure = typeof dailyClosures.$inferInsert;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type NotificationLog = typeof notificationLogs.$inferSelect;
export type TelegramLog = typeof telegramLogs.$inferSelect;
export type DiscordLog = typeof discordLogs.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;

// ─── Breakdown type (stored as JSONB) ─────────────────────────────────────────

export interface ClosureBreakdown {
  profileId: string;
  profileName: string;
  count: number;
  revenue: number;
}

// ─── Hardware metrics type (stored as JSONB in router) ────────────────────────

export interface RouterHardwareMetrics {
  model: string;
  cpuPercent: number;
  ramTotalMb: number;
  ramFreeMb: number;
  flashTotalMb: number;
  flashFreeMb: number;
  uptime: string;
  temperatureC?: number;
  activeUsersCount: number;
  lastError?: string;
}
