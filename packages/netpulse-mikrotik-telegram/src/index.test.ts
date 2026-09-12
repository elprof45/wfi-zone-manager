import { describe, expect, test } from 'bun:test';
import { createConfigFromEnv } from './config';
import { RouterOsRestClient } from './rest-client';
import { parseCommand, TelegramCommandRegistry } from './telegram-commands';

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
