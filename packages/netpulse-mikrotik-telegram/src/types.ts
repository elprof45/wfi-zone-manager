export type RouterId = string;

export interface RouterRecord {
  readonly '.id'?: string;
  readonly [key: string]: string | undefined;
}

export interface RouterPayload {
  readonly [key: string]: string | number | boolean | null | undefined;
}

export type RouterResponse = RouterRecord | RouterRecord[] | string | null;

export interface SystemHealth {
  readonly identity: string;
  readonly model: string;
  readonly version: string;
  readonly uptime: string;
  readonly cpuLoadPercent: number;
  readonly totalMemoryBytes: number;
  readonly freeMemoryBytes: number;
  readonly totalStorageBytes: number;
  readonly freeStorageBytes: number;
  readonly latencyMs: number;
}

export interface HotspotUser {
  readonly id: RouterId;
  readonly name: string;
  readonly password?: string;
  readonly profile?: string;
  readonly comment?: string;
  readonly limitUptime?: string;
  readonly uptime?: string;
}

export interface HotspotProfile {
  readonly id: RouterId;
  readonly name: string;
  readonly rateLimit?: string;
  readonly sharedUsers?: number;
  readonly onLogin?: string;
}

export interface ActiveSession {
  readonly id: RouterId;
  readonly user: string;
  readonly address?: string;
  readonly macAddress?: string;
  readonly uptime?: string;
  readonly sessionTimeLeft?: string;
  readonly bytesIn: number;
  readonly bytesOut: number;
}

export interface RouterScript {
  readonly id: RouterId;
  readonly name: string;
  readonly source: string;
  readonly comment?: string;
}

export interface RouterScheduler {
  readonly id: RouterId;
  readonly name: string;
  readonly interval: string;
  readonly onEvent: string;
  readonly disabled: boolean;
}

export interface MutationResult {
  readonly success: boolean;
  readonly id?: RouterId;
  readonly operation: string;
}

export interface BanUserInput {
  readonly address?: string;
  readonly user?: string;
  readonly comment?: string;
  readonly timeout?: string;
}

export interface BanResult extends MutationResult {
  readonly address?: string;
  readonly ruleId?: RouterId;
}

export interface UnbanUserInput {
  readonly ruleId?: RouterId;
  readonly address?: string;
}

export interface DeleteUserInput {
  readonly id: RouterId;
  readonly reason?: string;
}

export interface DisconnectUserInput {
  readonly sessionId: RouterId;
  readonly reason?: string;
}

export interface UserQuery {
  readonly name?: string;
  readonly profile?: string;
  readonly limit?: number;
}

export interface CreateHotspotUserInput {
  readonly name: string;
  readonly password: string;
  readonly profile?: string;
  readonly comment?: string;
  readonly limitUptime?: string;
}

export interface GenerateVouchersInput {
  readonly count: number;
  readonly length?: number;
  readonly prefix?: string;
  readonly profile?: string;
  readonly passwordLength?: number;
  readonly limitUptime?: string;
  readonly comment?: string;
  readonly price?: number;
  readonly expiresAt?: string;
  readonly dryRun?: boolean;
  readonly duplicateCheck?: boolean;
}

export interface TrafficMetrics {
  readonly online: boolean;
  readonly rxBytesPerSecond?: number;
  readonly txBytesPerSecond?: number;
  readonly totalSessions?: number;
  readonly peakSessions?: number;
  readonly topUser?: string;
}

export interface GeneratedVoucher {
  readonly name: string;
  readonly password: string;
  readonly profile: string;
  readonly created: boolean;
  readonly price?: number;
  readonly expiresAt?: string;
}

export interface GenerateVouchersResult {
  readonly requested: number;
  readonly created: number;
  readonly vouchers: readonly GeneratedVoucher[];
  readonly dryRun: boolean;
  readonly duplicateSkipped?: number;
}

export type UpdateHotspotUserInput = Partial<CreateHotspotUserInput>;

export interface CreateProfileInput {
  readonly name: string;
  readonly rateLimit?: string;
  readonly sharedUsers?: number;
  readonly onLogin?: string;
}

export type UpdateProfileInput = Partial<CreateProfileInput>;

export interface CreateScriptInput {
  readonly name: string;
  readonly source: string;
  readonly comment?: string;
}

export interface CreateSchedulerInput {
  readonly name: string;
  readonly interval: string;
  readonly onEvent: string;
  readonly comment?: string;
  readonly disabled?: boolean;
}

export type UpdateSchedulerInput = Partial<CreateSchedulerInput>;

export interface TelegramUpdate {
  readonly update_id: number;
  readonly message?: {
    readonly message_id: number;
    readonly text?: string;
    readonly from?: { readonly id: number; readonly username?: string };
    readonly chat: { readonly id: number | string; readonly type: string };
  };
  readonly callback_query?: {
    readonly id: string;
    readonly data?: string;
    readonly from: { readonly id: number; readonly username?: string };
    readonly message?: { readonly chat: { readonly id: number | string } };
  };
}

export type TelegramRole = 'admin' | 'operator' | 'viewer';

export interface CommandContext {
  readonly chatId: string;
  readonly userId?: string;
  readonly username?: string;
  readonly role: TelegramRole;
  readonly args: Readonly<Record<string, string>>;
  readonly positional: readonly string[];
  readonly rawText: string;
}

export interface CommandResponse {
  readonly text: string;
  readonly parseMode?: 'MarkdownV2' | 'HTML';
  readonly buttons?: readonly (readonly { readonly text: string; readonly callbackData: string }[])[];
}

export interface CommandDefinition {
  readonly name: string;
  readonly aliases?: readonly string[];
  readonly description: string;
  readonly minimumRole: TelegramRole;
  readonly execute: (context: CommandContext) => Promise<CommandResponse>;
}
