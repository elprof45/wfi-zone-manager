export type UserRole = 'super_admin' | 'admin' | 'cashier';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
}

export interface MikroTikRouter {
  id: string;
  name: string;
  location: string;
  host: string;
  apiPort: number; // 8728 (Socket) or 443 (REST)
  connectionType: 'socket' | 'rest';
  username: string;
  password?: string;
  hotspotDnsName: string; // e.g. "hotspot.wifi" or "login.netpulse.local"
  status: 'online' | 'offline' | 'warning';
  lastSeen: string;
  hardware: {
    model: string; // e.g. "RB951Ui-2HnD"
    cpuPercent: number; // 0-100
    ramTotalMb: number; // 128
    ramFreeMb: number;
    flashTotalMb: number; // 128
    flashFreeMb: number;
    uptime: string;
    temperatureC?: number;
    activeUsersCount: number;
  };
}

export interface HotspotProfile {
  id: string;
  name: string;
  rateLimit: string; // e.g. "2M/2M" or "5M/10M" (upload/download)
  validityDuration: string; // e.g. "1h", "24h", "7d", "30d"
  validityMinutes: number; // e.g. 60, 1440
  price: number; // in local currency (e.g. 100, 500, 2000 FCFA / USD)
  currency: string; // "FCFA", "EUR", "USD"
  sharedUsers: number; // 1
  minStockAlert: number; // default 15
  availableCount?: number;
  color: string;
}

export interface HotspotTicket {
  id: string;
  code: string; // cryptographic string without ambiguous chars
  password?: string;
  profileId: string;
  profileName: string;
  routerId: string;
  routerName: string;
  price: number;
  currency: string;
  validityDuration: string;
  rateLimit: string;
  status: 'available' | 'active' | 'used' | 'expired';
  createdAt: string;
  soldAt?: string;
  soldByUserId?: string;
  soldByUserName?: string;
  activatedAt?: string;
  expiresAt?: string;
  isClosed: boolean; // locked in daily closure
  closureId?: string;
}

export interface DailyClosure {
  id: string;
  sessionCode: string; // e.g. "CLOT-2026-0909-001"
  closedAt: string;
  closedByUserId: string;
  closedByUserName: string;
  routerId: string | 'all';
  routerName: string;
  totalRevenue: number;
  currency: string;
  ticketsSoldCount: number;
  breakdownByProfile: {
    profileId: string;
    profileName: string;
    count: number;
    revenue: number;
  }[];
  mikrotikPurgedCount: number; // Number of expired users removed from RouterOS
  notificationStatus: {
    emailSent: boolean;
    telegramSent: boolean;
  };
  notes?: string;
}

export interface SystemConfig {
  isSetupCompleted: boolean;
  database: {
    type: 'postgres_remote' | 'postgres_local';
    host: string;
    port: number;
    databaseName: string;
    username: string;
    isConnected: boolean;
    lastTestedAt?: string;
  };
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    senderEmail: string;
    isConfigured: boolean;
    lastTestedAt?: string;
  };
  telegram: {
    botToken: string;
    adminChatId: string;
    isConfigured: boolean;
    lastTestedAt?: string;
  };
  general: {
    companyName: string;
    currency: string;
    dailyClosureTime: string; // "23:59"
    enableAutoClosure: boolean;
    enableThrottling: boolean;
    batchSize: number; // 20
    batchDelayMs: number; // 50
  };
  reportsAutomation: {
    enableDailyTelegram: boolean;
    enableDailyEmail: boolean;
    dailyTime: string; // "23:59"
    enableWeeklyEmail: boolean;
    weeklyDay: string; // "dimanche"
    enableMonthlyEmail: boolean;
    emailRecipients: string[];
    telegramChatId: string;
    alertOnLowStock: boolean;
    alertOnHighCpu: boolean;
  };
}

export interface TelegramLogMessage {
  id: string;
  timestamp: string;
  type: 'incoming_command' | 'outgoing_alert' | 'closure_report';
  command?: string;
  text: string;
  status: 'sent' | 'delivered' | 'failed';
}

export interface NotificationLog {
  id: string;
  type: 'daily_report' | 'weekly_report' | 'monthly_report' | 'closure_income' | 'critical_stock_alert' | 'router_warning';
  channel: 'telegram' | 'email' | 'both';
  timestamp: string;
  recipient: string;
  status: 'delivered' | 'sent' | 'failed';
  title: string;
  summary: string;
  revenue?: number;
  ticketsCount?: number;
}
