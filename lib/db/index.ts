// PostgreSQL connection singleton using postgres.js + Drizzle ORM

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Singleton pattern for Next.js dev server (prevents connection pool exhaustion on HMR)
declare global {
  // eslint-disable-next-line no-var
  var __pgClient: postgres.Sql | undefined;
}

function createClient(): postgres.Sql {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  return postgres(url, {
    max: 10, // Max pool connections
    idle_timeout: 20, // Close idle connections after 20s
    connect_timeout: 10, // Fail fast if DB unreachable
    prepare: false, // Required for Drizzle with transactions
  });
}

// Reuse connection in dev to survive hot-module-reloads
const client: postgres.Sql =
  process.env.NODE_ENV === 'development'
    ? (global.__pgClient ??= createClient())
    : createClient();

if (process.env.NODE_ENV === 'development') {
  global.__pgClient = client;
}

export const db = drizzle(client, { schema });

export type Database = typeof db;
