import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { hasAllowedRole } from '@/lib/authorization';

type Session = NonNullable<Awaited<ReturnType<typeof getServerSession>>>;

export async function requireRole(allowedRoles: readonly string[]) {
  const session = await getServerSession();

  if (!session?.user) {
    return {
      response: NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Session required' },
        { status: 401 }
      ),
    } as const;
  }

  const role = (session.user as { role?: string }).role;
  if (!hasAllowedRole(role, allowedRoles)) {
    return {
      response: NextResponse.json(
        { error: 'FORBIDDEN', message: 'Insufficient permissions' },
        { status: 403 }
      ),
    } as const;
  }

  return { session } as { session: Session };
}

export async function requireSession() {
  return requireRole(['super_admin', 'admin', 'cashier']);
}

export async function requireSetupAccess() {
  const [{ usersCount }] = await db
    .select({ usersCount: sql<number>`count(*)::int` })
    .from(users);

  if (usersCount === 0) {
    return { bootstrap: true } as const;
  }

  const guard = await requireRole(['super_admin', 'admin']);
  if ('response' in guard) return guard;

  return { session: guard.session, bootstrap: false } as const;
}