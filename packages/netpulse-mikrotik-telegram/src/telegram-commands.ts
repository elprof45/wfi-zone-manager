import { AuthorizationError, ConfirmationRequiredError } from './errors';
import type { CommandContext, CommandDefinition, CommandResponse, TelegramRole } from './types';

const ROLE_WEIGHT: Record<TelegramRole, number> = { viewer: 1, operator: 2, admin: 3 };

export interface CommandRegistryOptions {
  readonly confirmationTtlMs?: number;
  readonly now?: () => number;
  readonly idGenerator?: () => string;
}

interface PendingConfirmation {
  readonly id: string;
  readonly chatId: string;
  readonly command: string;
  readonly expiresAt: number;
}

export function parseCommand(text: string): { name: string; args: Readonly<Record<string, string>>; positional: readonly string[] } {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  const name = (tokens.shift() || '').replace(/^\//, '').split('@')[0].toLowerCase();
  const args: Record<string, string> = {}; const positional: string[] = [];
  for (const token of tokens) {
    const separator = token.indexOf('=');
    if (separator > 0) args[token.slice(0, separator).toLowerCase()] = token.slice(separator + 1);
    else positional.push(token);
  }
  return { name, args, positional };
}

export class TelegramCommandRegistry {
  private readonly commands = new Map<string, CommandDefinition>();
  private readonly pending = new Map<string, PendingConfirmation>();
  private readonly confirmationTtlMs: number;
  private readonly now: () => number;
  private readonly idGenerator: () => string;

  constructor(options: CommandRegistryOptions = {}) {
    this.confirmationTtlMs = options.confirmationTtlMs ?? 60_000;
    this.now = options.now ?? Date.now;
    this.idGenerator = options.idGenerator ?? (() => Math.random().toString(36).slice(2, 12));
  }

  register(definition: CommandDefinition): this {
    const names = [definition.name, ...(definition.aliases || [])];
    for (const name of names) this.commands.set(name.toLowerCase().replace(/^\//, ''), definition);
    return this;
  }

  registerMany(definitions: readonly CommandDefinition[]): this {
    definitions.forEach((definition) => this.register(definition)); return this;
  }

  list(): readonly CommandDefinition[] {
    return [...new Set(this.commands.values())];
  }

  requestConfirmation(context: CommandContext, command: string): CommandResponse {
    const id = this.idGenerator();
    this.pending.set(id, { id, chatId: context.chatId, command, expiresAt: this.now() + this.confirmationTtlMs });
    return { text: `Confirmation requise pour ${command}.`, buttons: [[{ text: 'Confirmer', callbackData: `confirm:${id}` }, { text: 'Annuler', callbackData: `cancel:${id}` }]] };
  }

  consumeConfirmation(id: string, chatId: string): string {
    const pending = this.pending.get(id); this.pending.delete(id);
    if (!pending || pending.chatId !== chatId || pending.expiresAt < this.now()) throw new ConfirmationRequiredError(id, 'Confirmation absente ou expirée.');
    return pending.command;
  }

  async execute(text: string, context: Omit<CommandContext, 'args' | 'positional' | 'rawText'>): Promise<CommandResponse> {
    const parsed = parseCommand(text); const definition = this.commands.get(parsed.name);
    if (!definition) return { text: 'Commande inconnue. Utilisez /help.' };
    const fullContext: CommandContext = { ...context, ...parsed, rawText: text };
    if (ROLE_WEIGHT[fullContext.role] < ROLE_WEIGHT[definition.minimumRole]) throw new AuthorizationError();
    return definition.execute(fullContext);
  }
}
