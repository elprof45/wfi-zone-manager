import type { TelegramUpdate } from './types';

export interface RuntimeAdapter {
  readonly fetch: typeof fetch;
  now(): Date;
  sleep(milliseconds: number): Promise<void>;
}

export interface BotRuntimeConfig {
  readonly token: string;
  readonly allowedChatIds?: readonly string[];
  readonly adminChatIds?: readonly string[];
  readonly operatorChatIds?: readonly string[];
  readonly webhookSecret?: string;
  readonly onUpdate?: UpdateHandler;
}

export function createRuntimeAdapter(fetcher: typeof fetch = fetch): RuntimeAdapter {
  return {
    fetch: fetcher,
    now: () => new Date(),
    sleep: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  };
}

export interface UpdateHandler {
  (update: TelegramUpdate): Promise<unknown>;
}

export interface WebhookHandler {
  (request: Request): Promise<Response>;
}

export interface BotRuntime {
  readonly token: string;
  readonly allowedChatIds: readonly string[];
  readonly adminChatIds: readonly string[];
  readonly operatorChatIds: readonly string[];
  readonly handleUpdate: UpdateHandler;
  readonly createWebhookHandler: (options?: { readonly secret?: string }) => WebhookHandler;
}

function buildBotRuntime(config: BotRuntimeConfig, runtime: RuntimeAdapter = createRuntimeAdapter()): BotRuntime {
  const handleUpdate: UpdateHandler = async (update) => {
    const custom = config.onUpdate ?? (async () => ({ ok: true, update }));
    return custom(update, runtime);
  };

  return {
    token: config.token,
    allowedChatIds: config.allowedChatIds ?? [],
    adminChatIds: config.adminChatIds ?? [],
    operatorChatIds: config.operatorChatIds ?? [],
    handleUpdate,
    createWebhookHandler: (options = {}) => createWebhookHandler(handleUpdate, { secret: options.secret ?? config.webhookSecret }),
  };
}

export function createNodeBot(config: BotRuntimeConfig, runtime: RuntimeAdapter = createRuntimeAdapter()): BotRuntime {
  return buildBotRuntime(config, runtime);
}

export function createBunBot(config: BotRuntimeConfig, runtime: RuntimeAdapter = createRuntimeAdapter()): BotRuntime {
  return buildBotRuntime(config, runtime);
}

export function createServerlessHandler(handler: UpdateHandler): (request: Request) => Promise<Response> {
  return createWebhookHandler(handler);
}

export function createWorkerHandler(handler: UpdateHandler): (request: Request) => Promise<Response> {
  return createWebhookHandler(handler);
}

export function createCronRunner<T = unknown>(runner: () => Promise<T> | T): () => Promise<{ ok: boolean; data?: T; id?: string }> {
  return async () => {
    try {
      const data = await runner();
      return { ok: true, data, id: 'cron-runner' };
    } catch (error) {
      return { ok: false, id: 'cron-runner', data: undefined };
    }
  };
}

export function createWorkerRuntime<T = unknown>(runner: () => Promise<T> | T): () => Promise<{ ok: boolean; data?: T; id?: string }> {
  return async () => {
    try {
      const data = await runner();
      return { ok: true, data, id: 'worker-runtime' };
    } catch {
      return { ok: false, id: 'worker-runtime', data: undefined };
    }
  };
}

export function createWebhookHandler(
  handler: UpdateHandler,
  options: { readonly secret?: string } = {},
): WebhookHandler {
  return async (request) => {
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    if (options.secret && request.headers.get('x-telegram-bot-api-secret-token') !== options.secret) {
      return new Response('Unauthorized', { status: 401 });
    }
    try {
      const update = await request.json() as TelegramUpdate;
      await handler(update);
      return Response.json({ ok: true });
    } catch (error) {
      return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
    }
  };
}

export interface PollingTransport {
  getUpdates(offset?: number, timeoutSeconds?: number): Promise<readonly TelegramUpdate[]>;
}

export async function runPolling(
  transport: PollingTransport,
  handler: UpdateHandler,
  runtime: RuntimeAdapter = createRuntimeAdapter(),
  options: { readonly signal?: AbortSignal; readonly timeoutSeconds?: number; readonly retryMs?: number } = {},
): Promise<void> {
  let offset: number | undefined;
  while (!options.signal?.aborted) {
    try {
      const updates = await transport.getUpdates(offset, options.timeoutSeconds ?? 25);
      for (const update of updates) {
        offset = update.update_id + 1;
        await handler(update);
      }
    } catch {
      await runtime.sleep(options.retryMs ?? 2_000);
    }
  }
}
