import { z } from 'zod';

const BooleanSchema = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
  return value;
}, z.boolean());

export const PackageConfigSchema = z.object({
  mikrotik: z.object({
    host: z.string().min(1),
    username: z.string().min(1),
    password: z.string().min(1),
    port: z.number().int().min(1).max(65535).default(80),
    https: z.boolean().default(false),
    timeoutMs: z.number().int().positive().default(10_000),
  }),
  telegram: z.object({
    token: z.string().min(1),
    allowedChatIds: z.array(z.string()).default([]),
    webhookSecret: z.string().min(16).optional(),
  }),
  security: z.object({
    confirmationTtlSeconds: z.number().int().positive().default(60),
    defaultRole: z.enum(['admin', 'operator', 'viewer']).default('viewer'),
    adminChatIds: z.array(z.string()).default([]),
    operatorChatIds: z.array(z.string()).default([]),
  }).default({
    confirmationTtlSeconds: 60,
    defaultRole: 'viewer',
    adminChatIds: [],
    operatorChatIds: [],
  }),
});

export type PackageConfig = z.infer<typeof PackageConfigSchema>;

export function createConfig(input: unknown): PackageConfig {
  return PackageConfigSchema.parse(input);
}

export function createConfigFromEnv(env: Record<string, string | undefined>): PackageConfig {
  const allowedChatIds = (env.TELEGRAM_ALLOWED_CHAT_IDS || env.TELEGRAM_CHAT_ID || '')
    .split(',').map((value) => value.trim()).filter(Boolean);
  const adminChatIds = (env.TELEGRAM_ADMIN_CHAT_IDS || '').split(',').map((value) => value.trim()).filter(Boolean);
  const operatorChatIds = (env.TELEGRAM_OPERATOR_CHAT_IDS || '').split(',').map((value) => value.trim()).filter(Boolean);

  return createConfig({
    mikrotik: {
      host: env.MIKROTIK_HOST,
      username: env.MIKROTIK_USER,
      password: env.MIKROTIK_PASSWORD,
      port: Number(env.MIKROTIK_HTTP_PORT || 80),
      https: BooleanSchema.parse(env.MIKROTIK_HTTPS || false),
      timeoutMs: Number(env.MIKROTIK_TIMEOUT_MS || 10_000),
    },
    telegram: {
      token: env.TELEGRAM_BOT_TOKEN,
      allowedChatIds,
      webhookSecret: env.TELEGRAM_WEBHOOK_SECRET,
    },
    security: {
      confirmationTtlSeconds: Number(env.TELEGRAM_CONFIRMATION_TTL_SECONDS || 60),
      defaultRole: 'viewer',
      adminChatIds,
      operatorChatIds,
    },
  });
}
