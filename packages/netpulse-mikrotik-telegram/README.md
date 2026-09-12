# mikrotik-telegram

[![npm version](https://img.shields.io/npm/v/mikrotik-telegram?logo=npm)](https://www.npmjs.com/package/mikrotik-telegram)
[![npm downloads](https://img.shields.io/npm/dm/mikrotik-telegram?logo=npm)](https://www.npmjs.com/package/mikrotik-telegram)
[![Node.js](https://img.shields.io/node/v/mikrotik-telegram?logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/npm/l/mikrotik-telegram)](./LICENSE)

Typed, runtime-neutral automation for MikroTik RouterOS REST and Telegram operations.

This package is designed as an independent library. It does not import Next.js, React, database code, application routes, the legacy RouterOS socket client, or the legacy Telegram bot. Install it from npm in any compatible Node.js, Bun, worker, serverless, or webhook project.

## What it includes

- REST transport with typed CRUD helpers and timeout handling.
- Hotspot users, profiles, active sessions, scripts, and schedulers.
- Voucher batches with validation, duplicate checks, and dry-run mode.
- Telegram commands with aliases, role checks, and expiring confirmations.
- Webhook, polling, worker, cron, Node.js, and Bun runtime adapters.
- Router, traffic, and stock anomaly evaluation with cooldown/escalation.
- Protected actions with role and batch-size guardrails.
- JSON/CSV audit export for operational traceability.

## Requirements

- Node.js `>=20`, Bun, or a runtime providing `fetch`, `Request`, and `Response`.
- MikroTik RouterOS with REST enabled.
- Zod is installed automatically as a production dependency.

## Install

```bash
npm install mikrotik-telegram
# or
pnpm add mikrotik-telegram
# or
bun add mikrotik-telegram
```

## Quick start

```ts
import { createConfigFromEnv, createRuntime } from 'mikrotik-telegram';

const config = createConfigFromEnv(process.env);
const runtime = createRuntime(config);

const response = await runtime.handleUpdate({
  update_id: 1,
  message: {
    message_id: 1,
    text: '/status',
    chat: { id: '123456789', type: 'private' },
  },
});

console.log(response?.text);
```

## Environment configuration

```env
MIKROTIK_HOST=192.168.1.64
MIKROTIK_USER=netpulse-bot
MIKROTIK_PASSWORD=replace-me
MIKROTIK_HTTP_PORT=443
MIKROTIK_HTTPS=true
MIKROTIK_TIMEOUT_MS=10000

TELEGRAM_BOT_TOKEN=replace-me
TELEGRAM_ALLOWED_CHAT_IDS=123456789,987654321
TELEGRAM_ADMIN_CHAT_IDS=123456789
TELEGRAM_OPERATOR_CHAT_IDS=987654321
TELEGRAM_WEBHOOK_SECRET=use-at-least-16-characters
TELEGRAM_CONFIRMATION_TTL_SECONDS=60
```

Use a dedicated RouterOS user with the minimum required policy. Never commit `.env` files or expose the bot token in logs.

## Advanced RouterOS usage

The service layer is available without Telegram. This is useful for dashboards, external APIs, cron jobs, and custom workflows.

```ts
import {
  MikroTikService,
  RouterOsRestClient,
} from 'mikrotik-telegram';

const client = new RouterOsRestClient({
  host: process.env.MIKROTIK_HOST!,
  port: 443,
  username: process.env.MIKROTIK_USER!,
  password: process.env.MIKROTIK_PASSWORD!,
  https: true,
  timeoutMs: 10_000,
});

const mikrotik = new MikroTikService(client);

const preview = await mikrotik.generateVouchers({
  count: 25,
  prefix: 'EVENT',
  profile: 'guest-2h',
  limitUptime: '2h',
  dryRun: true,
});

const users = await mikrotik.listHotspotUsers({ profile: 'guest-2h', limit: 100 });
console.log({ preview, users });
```

## Telegram webhook

```ts
import { createConfigFromEnv, createRuntime, createWebhookHandler } from 'mikrotik-telegram';

const runtime = createRuntime(createConfigFromEnv(process.env));
export const POST = createWebhookHandler(runtime.handleUpdate, {
  secret: process.env.TELEGRAM_WEBHOOK_SECRET,
});
```

## Protected operations

Destructive actions should be exposed through a protected action instead of being called directly from an untrusted command.

```ts
import { createProtectedAction } from 'mikrotik-telegram';

const disconnect = createProtectedAction(
  'disconnect-session',
  async (input: { sessionId: string }) => ({
    ok: true,
    data: await mikrotik.disconnectSession(input.sessionId),
  }),
  {
    requiredRole: 'operator',
    requiresConfirmation: true,
    maxBatchSize: 1,
    confirm: async () => ({ ok: true }),
  },
);
```

## Runtime support

The library owns RouterOS and Telegram behavior but does not own your web framework or process lifecycle.

| Runtime | Entry point |
| --- | --- |
| Node.js / Bun | `createNodeBot()` / `createBunBot()` |
| Fetch-compatible webhook | `createWebhookHandler()` |
| Serverless | `createServerlessHandler()` |
| Worker | `createWorkerHandler()` / `createWorkerRuntime()` |
| Cron | `createCronRunner()` |
| Long polling | `runPolling()` |

## Security model

- Chat allowlists are checked before command execution.
- Roles are ordered as `viewer < operator < admin`.
- Confirmation records are chat-bound and expire automatically.
- Destructive batches can enforce a maximum size.
- RouterOS and Telegram credentials stay in caller-managed configuration.
- Audit records can be exported as JSON or CSV.

## API surface

The public entry point exports configuration, REST transport, services, command registry, runtime adapters, alerting, automation, protected actions, types, and audit helpers from `src/index.ts`.

## Versioning

This package follows [Semantic Versioning](https://semver.org/):

- `MAJOR`: breaking API or behavior changes.
- `MINOR`: backwards-compatible features and new exports.
- `PATCH`: backwards-compatible fixes, security patches, and documentation corrections.

The npm package is currently `0.1.0`, so the API may still evolve before `1.0.0`. Releases should update `version` in `package.json`, add a changelog entry, run the checks below, and publish a new immutable npm version.

## Local package checks

These commands run from this directory and do not require the root application configuration:

```bash
npm install
npm run build
npm pack --dry-run
```

The contract suite uses Bun: `bun install`, `bun run build`, and `bun test`.

## Publishing

```bash
npm login
npm run build
npm pack --dry-run
npm publish --access public
```

The published tarball contains only `dist`, `README.md`, and `LICENSE`; source tests and the parent application are excluded.
