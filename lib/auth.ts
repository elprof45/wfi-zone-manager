import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { db } from './db';
import * as schema from './db/schema';
import { headers } from 'next/headers';

import { createAccessControl } from 'better-auth/plugins/access';

const authSecret = process.env.BETTER_AUTH_SECRET;
if (process.env.NODE_ENV === 'production' && !authSecret) {
  throw new Error('BETTER_AUTH_SECRET must be configured in production');
}

const statement = {
  user: ['create', 'list', 'set-role', 'ban', 'impersonate', 'delete'] as const,
};
const ac = createAccessControl(statement);
const superAdminRole = ac.newRole({
  user: ['create', 'list', 'set-role', 'ban', 'impersonate', 'delete'],
});
const adminRole = ac.newRole({
  user: ['create', 'list', 'set-role'],
});
const cashierRole = ac.newRole({
  user: [],
});

export const auth = betterAuth({
  secret: authSecret || 'development-only-netpulse-secret',
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  trustedOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://10.96.40.44:3000',
    'http://10.96.40.44:3001',
  ],
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  plugins: [
    admin({
      defaultRole: 'cashier',
      adminRoles: ['super_admin', 'admin'],
      roles: {
        super_admin: superAdminRole,
        admin: adminRole,
        cashier: cashierRole,
      },
    }),
  ],
});

/**
 * Get current server session from Next.js request headers
 */
export async function getServerSession() {
  try {
    const reqHeaders = await headers();
    return await auth.api.getSession({
      headers: reqHeaders,
    });
  } catch {
    return null;
  }
}

/**
 * Require an active session or throw/return null
 */
export async function requireUser() {
  const session = await getServerSession();
  if (!session?.user) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}
