import { AuthorizationError } from './errors';
import type { PackageConfig } from './config';
import { RouterOsRestClient } from './rest-client';
import { MikroTikService } from './mikrotik-service';
import { TelegramClient } from './telegram-client';
import { TelegramCommandRegistry } from './telegram-commands';
import type { CommandContext, CommandResponse, TelegramRole, TelegramUpdate } from './types';

function roleFor(config: PackageConfig, chatId: string): TelegramRole {
  if (config.security.adminChatIds.includes(chatId)) return 'admin';
  if (config.security.operatorChatIds.includes(chatId)) return 'operator';
  return config.security.defaultRole;
}

function contextFromUpdate(config: PackageConfig, update: TelegramUpdate): { context: CommandContext; text: string } | undefined {
  const message = update.message;
  if (!message?.text) return undefined;
  const chatId = String(message.chat.id);
  return { context: { chatId, userId: message.from ? String(message.from.id) : undefined, username: message.from?.username, role: roleFor(config, chatId), args: {}, positional: [], rawText: message.text }, text: message.text };
}

export interface NetPulseRuntime {
  readonly registry: TelegramCommandRegistry;
  readonly mikrotik: MikroTikService;
  handleUpdate(update: TelegramUpdate): Promise<CommandResponse | undefined>;
}

export function createRuntime(config: PackageConfig, fetcher: typeof fetch = fetch): NetPulseRuntime {
  const restClient = new RouterOsRestClient({ ...config.mikrotik, fetch: fetcher });
  const mikrotik = new MikroTikService(restClient);
  const telegram = new TelegramClient({ token: config.telegram.token, fetch: fetcher });
  const registry = new TelegramCommandRegistry({ confirmationTtlMs: config.security.confirmationTtlSeconds * 1000 });

  registry.registerMany([
    { name: 'start', aliases: ['help'], description: 'Afficher les commandes', minimumRole: 'viewer', execute: async () => ({ text: 'NetPulse MikroTik Bot 2026\n/status · /users · /profiles · /sessions · /generate' }) },
    { name: 'status', aliases: ['health'], description: 'État matériel du routeur', minimumRole: 'viewer', execute: async () => { const health = await mikrotik.getSystemHealth(); return { text: `🟢 ${health.identity} · ${health.model}\nCPU: ${health.cpuLoadPercent}% · RAM libre: ${Math.round(health.freeMemoryBytes / 1048576)} MB\nLatence REST: ${health.latencyMs} ms` }; } },
    { name: 'users', description: 'Lister les tickets hotspot', minimumRole: 'viewer', execute: async (context) => { const users = await mikrotik.listHotspotUsers({ profile: context.args.profile, limit: Number(context.args.limit || 20) }); return { text: users.length ? users.map((user) => `• ${user.name} (${user.profile || 'default'})`).join('\n') : 'Aucun ticket trouvé.' }; } },
    { name: 'profiles', description: 'Lister les profils hotspot', minimumRole: 'viewer', execute: async () => { const profiles = await mikrotik.listProfiles(); return { text: profiles.length ? profiles.map((profile) => `• ${profile.name} · ${profile.rateLimit || 'illimité'}`).join('\n') : 'Aucun profil trouvé.' }; } },
    { name: 'sessions', description: 'Lister les sessions actives', minimumRole: 'viewer', execute: async () => { const sessions = await mikrotik.listActiveSessions(); return { text: sessions.length ? sessions.map((session) => `• ${session.user} · ${session.address || 'IP inconnue'}`).join('\n') : 'Aucune session active.' }; } },
    { name: 'generate', description: 'Générer des vouchers', minimumRole: 'operator', execute: async (context) => { const result = await mikrotik.generateVouchers({ count: Number(context.args.count || context.positional[0] || 1), profile: context.args.profile, limitUptime: context.args.duration, comment: context.args.comment }); return { text: `✅ ${result.created} voucher(s) créé(s)\n${result.vouchers.map((voucher) => `${voucher.name} · ${voucher.password}`).join('\n')}` }; } },
  ]);

  return {
    registry, mikrotik,
    async handleUpdate(update) {
      const incoming = contextFromUpdate(config, update);
      if (!incoming) return undefined;
      if (config.telegram.allowedChatIds.length && !config.telegram.allowedChatIds.includes(incoming.context.chatId)) throw new AuthorizationError('Chat Telegram non autorisé.');
      const response = await registry.execute(incoming.text, incoming.context);
      await telegram.sendMessage(incoming.context.chatId, response);
      return response;
    },
  };
}