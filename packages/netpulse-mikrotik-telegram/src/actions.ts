import { z } from 'zod';

export type ActionExecutionResult<TData = unknown> = {
  readonly ok: boolean;
  readonly data?: TData;
  readonly error?: string;
};

export type ActionContext = {
  readonly chatId: string;
  readonly userId?: string;
  readonly role: 'admin' | 'operator' | 'viewer';
};

export type ProtectedActionOptions<TInput, TData> = {
  readonly requiredRole: ActionContext['role'];
  readonly requiresConfirmation?: boolean;
  readonly maxBatchSize?: number;
  readonly confirm?: (input: TInput, context: ActionContext) => Promise<ActionExecutionResult<void>>;
};

export function createProtectedAction<TInput, TData>(
  name: string,
  action: (input: TInput, context: ActionContext) => Promise<ActionExecutionResult<TData>>,
  options: ProtectedActionOptions<TInput, TData>,
) {
  const roleWeight = { viewer: 1, operator: 2, admin: 3 } as const;

  return async (input: TInput, context: ActionContext): Promise<ActionExecutionResult<TData>> => {
    if (roleWeight[context.role] < roleWeight[options.requiredRole]) {
      return { ok: false, error: `Role insuffisant pour ${name}.` };
    }

    const inputList = Array.isArray((input as { ids?: unknown[] })?.ids)
      ? (input as { ids: unknown[] }).ids.length
      : undefined;

    if (options.maxBatchSize !== undefined && inputList !== undefined && inputList > options.maxBatchSize) {
      return { ok: false, error: `Lot destructif trop large pour ${name}. Maximum autorisé: ${options.maxBatchSize}.` };
    }

    if (options.requiresConfirmation) {
      const confirmation = options.confirm ? await options.confirm(input, context) : { ok: true };
      if (!confirmation.ok) {
        return { ok: false, error: confirmation.error || `Confirmation refusée pour ${name}.` };
      }
    }

    return action(input, context);
  };
}

export type RouterActionCatalog = {
  readonly health: () => Promise<ActionExecutionResult<unknown>>;
  readonly disconnectUser: (input: { sessionId: string; reason?: string }) => Promise<ActionExecutionResult<unknown>>;
  readonly banUser: (input: { address?: string; user?: string; comment?: string; timeout?: string }) => Promise<ActionExecutionResult<unknown>>;
};

export function createRouterActionCatalog(actions: Partial<RouterActionCatalog>): RouterActionCatalog {
  const catalog = {
    health: actions.health ?? (async () => ({ ok: true, data: { status: 'healthy' } })),
    disconnectUser: actions.disconnectUser ?? (async (input) => ({ ok: true, data: { success: true, id: input.sessionId, operation: 'disconnect-session' } })),
    banUser: actions.banUser ?? (async (input) => ({ ok: true, data: { success: true, address: input.address || input.user, ruleId: 'generated' } })),
  };

  return {
    health: () => catalog.health(),
    disconnectUser: (input) => catalog.disconnectUser(input),
    banUser: (input) => catalog.banUser(input),
  };
}

export const ProtectedActionInputSchema = z.object({
  address: z.string().trim().min(1).optional(),
  user: z.string().trim().min(1).optional(),
  comment: z.string().max(255).optional(),
  timeout: z.string().trim().min(1).optional(),
});
