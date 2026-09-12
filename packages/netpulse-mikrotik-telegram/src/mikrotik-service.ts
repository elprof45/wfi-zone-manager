import { z } from 'zod';
import { RouterOsRestClient } from './rest-client';
import type {
    ActiveSession, CreateHotspotUserInput, CreateProfileInput, CreateSchedulerInput, CreateScriptInput,
    HotspotProfile, HotspotUser, MutationResult, RouterId, RouterRecord, RouterScheduler, RouterScript,
    SystemHealth, UpdateHotspotUserInput, UpdateProfileInput, UpdateSchedulerInput, UserQuery,
    GenerateVouchersInput, GenerateVouchersResult,
} from './types';

const RouterIdSchema = z.string().min(1);
const UserSchema = z.object({
  name: z.string().min(1).max(64), password: z.string().min(1).max(128), profile: z.string().min(1),
  comment: z.string().max(255).optional(), limitUptime: z.string().min(1).optional(),
});
const ProfileSchema = z.object({
  name: z.string().min(1).max(64), rateLimit: z.string().max(128).optional(),
  sharedUsers: z.number().int().positive().optional(), onLogin: z.string().max(4096).optional(),
});
const ScriptSchema = z.object({ name: z.string().min(1).max(64), source: z.string().min(1), comment: z.string().max(255).optional() });
const SchedulerSchema = z.object({
  name: z.string().min(1).max(64), interval: z.string().min(1), onEvent: z.string().min(1),
  comment: z.string().max(255).optional(), disabled: z.boolean().optional(),
});
const VoucherGenerationSchema = z.object({
  count: z.number().int().min(1).max(500), length: z.number().int().min(4).max(32).default(6),
  prefix: z.string().regex(/^[A-Za-z0-9_-]*$/).max(16).default('NET'), profile: z.string().min(1).default('default'),
  passwordLength: z.number().int().min(4).max(32).default(8), limitUptime: z.string().min(1).optional(),
  comment: z.string().max(255).optional(), dryRun: z.boolean().default(false),
});

function idOf(record: RouterRecord): RouterId {
  const id = record['.id'] || record.ret || record.id;
  return RouterIdSchema.parse(id);
}

function userOf(record: RouterRecord): HotspotUser {
  return { id: idOf(record), name: record.name || '', password: record.password, profile: record.profile, comment: record.comment, limitUptime: record['limit-uptime'], uptime: record.uptime };
}

function randomCode(length: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

export class MikroTikService {
  constructor(private readonly client: RouterOsRestClient) {}

  async getSystemHealth(): Promise<SystemHealth> {
    const started = Date.now();
    const [resource, identity, board] = await Promise.all([
      this.client.get<RouterRecord>('/system/resource'),
      this.client.list<RouterRecord>('/system/identity'),
      this.client.list<RouterRecord>('/system/routerboard'),
    ]);
    const metrics = resource;
    return {
      identity: identity[0]?.name || 'Unknown', model: metrics['board-name'] || board[0]?.model || 'Unknown',
      version: metrics.version || 'Unknown', uptime: metrics.uptime || 'Unknown',
      cpuLoadPercent: Number(metrics['cpu-load'] || 0), totalMemoryBytes: Number(metrics['total-memory'] || 0),
      freeMemoryBytes: Number(metrics['free-memory'] || 0), totalStorageBytes: Number(metrics['total-hdd-space'] || 0),
      freeStorageBytes: Number(metrics['free-hdd-space'] || 0), latencyMs: Date.now() - started,
    };
  }

  async listHotspotUsers(query: UserQuery = {}): Promise<HotspotUser[]> {
    const params = new URLSearchParams();
    if (query.name) params.set('name', query.name);
    if (query.profile) params.set('profile', query.profile);
    const records = await this.client.list<RouterRecord>(`/ip/hotspot/user${params.size ? `?${params}` : ''}`);
    return records.slice(0, query.limit || records.length).map(userOf);
  }

  async createHotspotUser(input: CreateHotspotUserInput): Promise<HotspotUser> {
    const data = UserSchema.parse({ profile: 'default', ...input });
    const record = await this.client.create('/ip/hotspot/user/add', {
      name: data.name, password: data.password, profile: data.profile,
      ...(data.comment ? { comment: data.comment } : {}), ...(data.limitUptime ? { 'limit-uptime': data.limitUptime } : {}),
    });
    const id = idOf(record);
    return userOf({ ...record, '.id': id, name: data.name, password: data.password, profile: data.profile });
  }

  async generateVouchers(input: GenerateVouchersInput): Promise<GenerateVouchersResult> {
    const data = VoucherGenerationSchema.parse(input);
    const vouchers = Array.from({ length: data.count }, (_, index) => ({
      name: `${data.prefix}-${randomCode(data.length)}-${index + 1}`,
      password: randomCode(data.passwordLength), profile: data.profile,
    }));
    if (data.dryRun) return { requested: data.count, created: 0, dryRun: true, vouchers: vouchers.map((voucher) => ({ ...voucher, created: false })) };
    const created = await Promise.all(vouchers.map(async (voucher) => {
      await this.createHotspotUser({ ...voucher, limitUptime: data.limitUptime, comment: data.comment });
      return { ...voucher, created: true };
    }));
    return { requested: data.count, created: created.length, dryRun: false, vouchers: created };
  }

  async updateHotspotUser(id: RouterId, input: UpdateHotspotUserInput): Promise<HotspotUser> {
    const validId = RouterIdSchema.parse(id); const data = UserSchema.partial().parse(input);
    await this.client.update('/ip/hotspot/user', validId, {
      ...(data.name ? { name: data.name } : {}), ...(data.password ? { password: data.password } : {}),
      ...(data.profile ? { profile: data.profile } : {}), ...(data.comment !== undefined ? { comment: data.comment } : {}),
      ...(data.limitUptime ? { 'limit-uptime': data.limitUptime } : {}),
    });
    const updated = await this.client.get<RouterRecord>(`/ip/hotspot/user/${encodeURIComponent(validId)}`);
    return userOf({ ...updated, '.id': validId });
  }

  async deleteHotspotUser(id: RouterId): Promise<MutationResult> {
    const validId = RouterIdSchema.parse(id); await this.client.remove('/ip/hotspot/user', validId);
    return { success: true, id: validId, operation: 'delete-hotspot-user' };
  }

  async listProfiles(): Promise<HotspotProfile[]> {
    const records = await this.client.list<RouterRecord>('/ip/hotspot/user/profile');
    return records.map((record) => ({ id: idOf(record), name: record.name || '', rateLimit: record['rate-limit'], sharedUsers: Number(record['shared-users'] || 0), onLogin: record['on-login'] }));
  }

  async createProfile(input: CreateProfileInput): Promise<HotspotProfile> {
    const data = ProfileSchema.parse(input);
    const record = await this.client.create('/ip/hotspot/user/profile/add', {
      name: data.name, ...(data.rateLimit ? { 'rate-limit': data.rateLimit } : {}),
      ...(data.sharedUsers ? { 'shared-users': data.sharedUsers } : {}), ...(data.onLogin ? { 'on-login': data.onLogin } : {}),
    });
    return { id: idOf(record), name: data.name, rateLimit: data.rateLimit, sharedUsers: data.sharedUsers, onLogin: data.onLogin };
  }

  async updateProfile(id: RouterId, input: UpdateProfileInput): Promise<HotspotProfile> {
    const validId = RouterIdSchema.parse(id); const data = ProfileSchema.partial().parse(input);
    const record = await this.client.update('/ip/hotspot/user/profile', validId, {
      ...(data.name ? { name: data.name } : {}), ...(data.rateLimit ? { 'rate-limit': data.rateLimit } : {}),
      ...(data.sharedUsers ? { 'shared-users': data.sharedUsers } : {}), ...(data.onLogin ? { 'on-login': data.onLogin } : {}),
    });
    return { id: validId, name: record.name || data.name || '', rateLimit: record['rate-limit'] || data.rateLimit, sharedUsers: Number(record['shared-users'] || data.sharedUsers || 0), onLogin: record['on-login'] || data.onLogin };
  }

  async deleteProfile(id: RouterId): Promise<MutationResult> {
    const validId = RouterIdSchema.parse(id); await this.client.remove('/ip/hotspot/user/profile', validId);
    return { success: true, id: validId, operation: 'delete-profile' };
  }

  async listActiveSessions(): Promise<ActiveSession[]> {
    const records = await this.client.list<RouterRecord>('/ip/hotspot/active');
    return records.map((record) => ({ id: idOf(record), user: record.user || '', address: record.address, macAddress: record['mac-address'], uptime: record.uptime, sessionTimeLeft: record['session-time-left'], bytesIn: Number(record['bytes-in'] || 0), bytesOut: Number(record['bytes-out'] || 0) }));
  }

  async disconnectSession(id: RouterId): Promise<MutationResult> {
    const validId = RouterIdSchema.parse(id); await this.client.remove('/ip/hotspot/active', validId);
    return { success: true, id: validId, operation: 'disconnect-session' };
  }

  async createScript(input: CreateScriptInput): Promise<RouterScript> {
    const data = ScriptSchema.parse(input); const record = await this.client.create('/system/script/add', data);
    return { id: idOf(record), name: data.name, source: data.source, comment: data.comment };
  }

  async runScript(id: RouterId): Promise<MutationResult> {
    const validId = RouterIdSchema.parse(id); await this.client.request('POST', '/system/script/run', { '.id': validId });
    return { success: true, id: validId, operation: 'run-script' };
  }

  async createScheduler(input: CreateSchedulerInput): Promise<RouterScheduler> {
    const data = SchedulerSchema.parse(input); const record = await this.client.create('/system/scheduler/add', {
      name: data.name, interval: data.interval, 'on-event': data.onEvent, disabled: data.disabled ? 'yes' : 'no', ...(data.comment ? { comment: data.comment } : {}),
    });
    return { id: idOf(record), name: data.name, interval: data.interval, onEvent: data.onEvent, disabled: Boolean(data.disabled) };
  }

  async updateScheduler(id: RouterId, input: UpdateSchedulerInput): Promise<RouterScheduler> {
    const validId = RouterIdSchema.parse(id); const data = SchedulerSchema.partial().parse(input);
    const record = await this.client.update('/system/scheduler', validId, {
      ...(data.name ? { name: data.name } : {}), ...(data.interval ? { interval: data.interval } : {}), ...(data.onEvent ? { 'on-event': data.onEvent } : {}),
      ...(data.comment !== undefined ? { comment: data.comment } : {}), ...(data.disabled !== undefined ? { disabled: data.disabled ? 'yes' : 'no' } : {}),
    });
    return { id: validId, name: record.name || data.name || '', interval: record.interval || data.interval || '', onEvent: record['on-event'] || data.onEvent || '', disabled: record.disabled === 'true' || record.disabled === 'yes' };
  }

  async deleteScheduler(id: RouterId): Promise<MutationResult> {
    const validId = RouterIdSchema.parse(id); await this.client.remove('/system/scheduler', validId);
    return { success: true, id: validId, operation: 'delete-scheduler' };
  }
}
