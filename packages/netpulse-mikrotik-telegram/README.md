# @netpulse/mikrotik-telegram

Runtime-neutral TypeScript package for RouterOS REST automation and Telegram commands.

## Scope

- RouterOS REST only; no binary socket client.
- Zod-validated configuration and mutation inputs.
- Hotspot users, profiles, sessions, scripts and schedulers.
- Voucher generation with dry-run support.
- Telegram command registry with aliases, roles and expiring confirmations.
- Fetch injection for Bun, Node, Workers, serverless and tests.

## Example

```ts
import { createConfigFromEnv, createRuntime } from '@netpulse/mikrotik-telegram';

const config = createConfigFromEnv(process.env);
const runtime = createRuntime(config);
await runtime.handleUpdate(telegramUpdate);
```

Destructive commands must be registered with `minimumRole: 'admin'` and use `requestConfirmation()` before mutation.
