import { describe, expect, test } from 'bun:test';
import { createConfigFromEnv } from './config';
import { RouterOsRestClient } from './rest-client';
import { parseCommand, TelegramCommandRegistry } from './telegram-commands';
import { AlertEngine, evaluateRouterAnomalies, evaluateTrafficAnomalies } from './alerts';
import { AutomationEngine } from './automation';
import { createRouterActionCatalog, createProtectedAction } from './actions';
import { createBunBot, createCronRunner, createNodeBot, createRuntimeAdapter, createServerlessHandler, createWebhookHandler, createWorkerRuntime } from './runtime-adapters';
import { MikroTikService } from './mikrotik-service';
import { createAuditLogger, exportAuditLog } from './audit';

const configEnv = {
  MIKROTIK_HOST: 'router.local', MIKROTIK_USER: 'admin', MIKROTIK_PASSWORD: 'secret', MIKROTIK_HTTP_PORT: '80',
  MIKROTIK_HTTPS: 'false', TELEGRAM_BOT_TOKEN: 'telegram-token', TELEGRAM_CHAT_ID: '123',
};

describe('NetPulse package contracts', () => {
  test('loads and validates runtime configuration from environment', () => {
    const config = createConfigFromEnv(configEnv);
    expect(config.mikrotik.host).toBe('router.local');
    expect(config.mikrotik.https).toBe(false);
    expect(config.telegram.allowedChatIds).toEqual(['123']);
  });

  test('parses slash commands, key/value arguments and positional arguments', () => {
    expect(parseCommand('/users profile=200 limit=10')).toEqual({ name: 'users', args: { profile: '200', limit: '10' }, positional: [] });
    expect(parseCommand('/routeros@netpulse 123')).toEqual({ name: 'routeros', args: {}, positional: ['123'] });
  });

  test('expires destructive confirmations and binds them to the chat', () => {
    let now = 1000;
    const registry = new TelegramCommandRegistry({ now: () => now, idGenerator: () => 'confirmation-1' });
    const response = registry.requestConfirmation({ chatId: '42', role: 'admin', args: {}, positional: [], rawText: '/delete x' }, '/delete x');
    expect(response.buttons?.[0]?.[0]?.callbackData).toBe('confirm:confirmation-1');
    expect(() => registry.consumeConfirmation('confirmation-1', '99')).toThrow();
    registry.requestConfirmation({ chatId: '42', role: 'admin', args: {}, positional: [], rawText: '/delete x' }, '/delete x');
    now += 61_000;
    expect(() => registry.consumeConfirmation('confirmation-1', '42')).toThrow();
  });

  test('accepts Telegram callback confirmations and cancellations', async () => {
    let now = 1000;
    const registry = new TelegramCommandRegistry({ now: () => now, idGenerator: () => 'confirmation-2' });

    registry.register({
      name: 'delete',
      description: 'delete a hotspot user',
      minimumRole: 'admin',
      execute: async () => ({ text: 'Utilisateur supprimé' }),
    });

    const response = registry.requestConfirmation({ chatId: '42', role: 'admin', args: {}, positional: ['alice'], rawText: '/delete alice' }, '/delete alice');
    expect(response.buttons?.[0]?.[1]?.callbackData).toBe('cancel:confirmation-2');

    const confirmed = await registry.executeCallback('confirm:confirmation-2', '42');
    expect(confirmed.text).toContain('confirmée');

    const cancelled = await registry.executeCallback('cancel:confirmation-2', '42');
    expect(cancelled.text).toContain('annul');
  });
});

describe('RouterOS REST transport', () => {
  test('uses RouterOS command endpoints and parses JSON responses', async () => {
    const calls: { url: string; method?: string; body?: string }[] = [];
    const client = new RouterOsRestClient({
      host: 'router.local', port: 80, username: 'admin', password: 'secret',
      fetch: async (input, init) => {
        calls.push({ url: String(input), method: init?.method, body: init?.body as string | undefined });
        return new Response(JSON.stringify({ ret: '*1' }), { status: 200, headers: { 'content-type': 'application/json' } });
      },
    });
    const result = await client.create('/ip/hotspot/user/add', { name: 'test', password: 'test', profile: 'default' });
    expect(result.ret).toBe('*1');
    expect(calls[0]?.url).toContain('/rest/ip/hotspot/user/add');
    expect(calls[0]?.method).toBe('POST');
  });
});

describe('Monitoring and automation', () => {
  test('emits critical CPU/offline alerts and applies cooldown', () => {
    let now = 1_000;
    const evaluation = evaluateRouterAnomalies({ online: false, health: {
      identity: 'gw', model: 'rb', version: '7', uptime: '1d', cpuLoadPercent: 95,
      totalMemoryBytes: 128, freeMemoryBytes: 8, totalStorageBytes: 256, freeStorageBytes: 32, latencyMs: 4,
    } });
    const engine = new AlertEngine(60_000, () => now);
    expect(engine.filter(evaluation.alerts).alerts.length).toBe(4);
    expect(engine.filter(evaluation.alerts).alerts.length).toBe(0);
    now += 60_001;
    expect(engine.filter(evaluation.alerts).alerts.length).toBe(4);
  });

  test('runs due automation and supports pause/resume', async () => {
    const engine = new AutomationEngine();
    engine.register({ id: 'health', name: 'Health', action: 'health-check', intervalMs: 1_000, enabled: true, runImmediately: true });
    let executions = 0;
    const context = { now: new Date(1_000), execute: async () => { executions += 1; return { ruleId: 'health', action: 'health-check' as const, success: true, startedAt: '', finishedAt: '' }; } };
    expect((await engine.runDue(context)).length).toBe(1);
    expect(executions).toBe(1);
    engine.pause('health');
    expect((await engine.runDue({ ...context, now: new Date(10_000) })).length).toBe(0);
    engine.resume('health');
    expect((await engine.runDue({ ...context, now: new Date(10_000) })).length).toBe(1);
  });

  test('exposes callable protected actions and a catalog for advanced bot workflows', async () => {
    const actions = createRouterActionCatalog({
      async health() { return { ok: true, data: { identity: 'gw', cpuLoadPercent: 30 } }; },
      async disconnectUser(input: { sessionId: string }) { return { ok: true, data: { id: input.sessionId, operation: 'disconnect-session' } }; },
      async banUser(input: { address?: string }) { return { ok: true, data: { success: true, address: input.address, ruleId: 'ban-1' } }; },
    });

    const protectedAction = createProtectedAction('ban-user', async (input: { address: string }) => ({ ok: true, data: { address: input.address } }), {
      requiredRole: 'admin',
      requiresConfirmation: true,
      confirm: async () => ({ ok: true }),
    });

    const catalogResult = await actions.health();
    const protectedResult = await protectedAction({ address: '10.0.0.2' }, { userId: 'u1', role: 'admin', chatId: '42' });

    expect(catalogResult.ok).toBe(true);
    expect(protectedResult.ok).toBe(true);
    expect(protectedResult.data).toMatchObject({ address: '10.0.0.2' });
  });

  test('builds runtime adapters and handles Telegram webhooks for advanced bot deployments', async () => {
    const runtime = createRuntimeAdapter();
    const bot = createNodeBot({ token: 'token', allowedChatIds: ['42'], adminChatIds: ['42'] });
    const bunBot = createBunBot({ token: 'token', allowedChatIds: ['42'], adminChatIds: ['42'] });
    const serverless = createServerlessHandler(async () => ({ ok: true }));

    const handler = createWebhookHandler(async (update) => {
      expect(update.update_id).toBe(11);
      return { ok: true, update };
    }, { secret: 'secret' });

    expect(typeof runtime.now).toBe('function');
    expect(typeof bot.handleUpdate).toBe('function');
    expect(typeof bunBot.handleUpdate).toBe('function');
    expect(typeof serverless).toBe('function');

    const response = await handler(new Request('https://example.com', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-telegram-bot-api-secret-token': 'secret',
      },
      body: JSON.stringify({ update_id: 11, message: { message_id: 1, text: '/status', chat: { id: 42, type: 'private' }, from: { id: 99, username: 'alice' } } }),
    }));

    expect(response.status).toBe(200);
  });

  test('detects traffic anomalies and can generate advanced voucher batches with duplicate safeguards', async () => {
    const traffic = evaluateTrafficAnomalies({
      rxBytesPerSecond: 11_000_000,
      txBytesPerSecond: 9_500_000,
      totalSessions: 180,
      peakSessions: 220,
      online: true,
    });
    expect(traffic.alerts.some((alert) => alert.key === 'traffic.sessions.warning')).toBe(true);

    const service = new MikroTikService(new RouterOsRestClient({
      host: 'router.local', port: 80, username: 'admin', password: 'secret',
      fetch: async (input) => {
        const url = String(input);
        if (url.includes('/ip/hotspot/user/add')) {
          return new Response(JSON.stringify({ ret: `*${(Math.random() * 10).toString(36)}` }), { status: 200, headers: { 'content-type': 'application/json' } });
        }
        if (url.includes('/ip/hotspot/user')) {
          return new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } });
        }
        return new Response(JSON.stringify({}), { status: 200, headers: { 'content-type': 'application/json' } });
      },
    }));

    const result = await service.generateVouchers({ count: 2, prefix: 'NET', profile: 'vip', limitUptime: '2h', price: 200, expiresAt: '2030-12-31T00:00:00.000Z', dryRun: false });
    expect(result.created).toBe(2);
    expect(result.vouchers.every((voucher) => voucher.name.startsWith('NET-'))).toBe(true);
  });

  test('blocks oversized destructive batches and supports richer automation actions', async () => {
    const guardedAction = createProtectedAction('delete-user', async (input: { ids: string[] }) => ({ ok: true, data: { deleted: input.ids.length } }), {
      requiredRole: 'admin',
      requiresConfirmation: true,
      maxBatchSize: 2,
      confirm: async () => ({ ok: true }),
    });

    const result = await guardedAction({ ids: ['a', 'b', 'c'] }, { userId: 'u1', role: 'admin', chatId: '42' });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('2');

    const engine = new AutomationEngine();
    engine.register({ id: 'cleanup-sessions', name: 'Cleanup sessions', action: 'cleanup-sessions', intervalMs: 500, enabled: true, runImmediately: true });
    const execution = await engine.run('cleanup-sessions', { now: new Date(1_000), execute: async (action) => ({ ruleId: 'cleanup-sessions', action, success: true, startedAt: '', finishedAt: '' }) });
    expect(execution.success).toBe(true);
    expect(execution.action).toBe('cleanup-sessions');
  });

  test('supports advanced Telegram commands and escalated alert rule evaluation', async () => {
    const registry = new TelegramCommandRegistry();
    registry.register({
      name: 'generate',
      description: 'Create vouchers',
      minimumRole: 'operator',
      execute: async (context) => ({ text: `Generated ${context.args.count || context.positional[0] || 1}` }),
    });
    registry.register({
      name: 'ban',
      description: 'Ban a hotspot user',
      minimumRole: 'admin',
      execute: async (context) => ({ text: `Banned ${context.positional[0] || 'unknown'}` }),
    });

    const generate = await registry.execute('/generate count=2', { chatId: '42', role: 'operator', args: {}, positional: [], rawText: '/generate count=2' });
    const ban = await registry.execute('/ban alice', { chatId: '42', role: 'admin', args: {}, positional: [], rawText: '/ban alice' });
    const alert = evaluateTrafficAnomalies({ online: true, rxBytesPerSecond: 12_000_000, txBytesPerSecond: 10_000_000, totalSessions: 225, peakSessions: 200 });

    expect(generate.text).toContain('2');
    expect(ban.text).toContain('alice');
    expect(alert.alerts.some((entry) => entry.key === 'traffic.sessions.warning')).toBe(true);
  });

  test('escalates repeated alerts after repeated offenses while preserving cooldown', () => {
    let now = 1_000;
    const engine = new AlertEngine(30_000, () => now);
    const alert = { key: 'router.cpu.warning', severity: 'warning' as const, title: 'CPU élevé', message: 'CPU 85%', createdAt: new Date(now).toISOString() };

    engine.filter([alert]);
    now += 10_000;
    engine.filter([alert]);
    now += 10_000;
    const result = engine.filter([alert]);

    expect(result.alerts[0]?.severity).toBe('critical');
  });

  test('supports production cron/worker entrypoints and exports audit logs', async () => {
    const cron = createCronRunner(async () => ({ ok: true, id: 'cron-1' }));
    const worker = createWorkerRuntime(async () => ({ ok: true, id: 'worker-1' }));
    const audit = createAuditLogger('prod');

    audit.log({ action: 'voucher.create', actor: 'operator', resource: 'hotspot-user', status: 'success' });

    expect(typeof cron).toBe('function');
    expect(typeof worker).toBe('function');
    expect(exportAuditLog(audit.snapshot()).length).toBeGreaterThan(0);
    expect((await cron()).ok).toBe(true);
  });
});
