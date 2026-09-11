import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';

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
  if (!role || !allowedRoles.includes(role)) {
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