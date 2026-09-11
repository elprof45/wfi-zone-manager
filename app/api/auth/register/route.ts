// app/api/auth/register/route.ts
// Custom registration endpoint — allows role assignment for the first user (bootstrap).
// For subsequent users, role is always 'cashier' for security.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { countUsers, updateUser } from '@/lib/db/queries/users';
import { headers } from 'next/headers';
import { getClientKey, rateLimit } from '@/lib/rate-limit';

const RegisterSchema = z.object({
  name: z.string().min(2, 'Nom trop court').max(100),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe trop court (min 8 caractères)'),
  role: z.enum(['super_admin', 'admin', 'cashier']).default('cashier'),
});

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(getClientKey(req, 'register'), 5, 15 * 60 * 1000);
    if (limited) return limited;

    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const { name, email, password, role } = parsed.data;

    // Count existing users — only the first user gets the chosen role (bootstrap)
    const userCount = await countUsers();
    const assignedRole = userCount === 0 ? role : 'cashier';

    const reqHeaders = await headers();
    const result = await auth.api.signUpEmail({
      body: { name, email, password },
      headers: reqHeaders,
    });

    if (!result || !result.user) {
      return NextResponse.json({ error: 'Échec de la création du compte' }, { status: 500 });
    }

    // Set custom role if needed
    if (assignedRole !== 'cashier') {
      await updateUser(result.user.id, { role: assignedRole });
    }

    // Auto sign-in after registration to ensure session cookie is present
    const signInResult = await auth.api.signInEmail({
      body: { email, password },
      headers: reqHeaders,
    });

    const response = NextResponse.json(
      { success: true, user: { ...result.user, role: assignedRole }, role: assignedRole, isFirstUser: userCount === 0 },
      { status: 201 }
    );

    // Forward the Set-Cookie header from better-auth so the session is established
    const setCookie = (signInResult as any)?.headers?.get?.('set-cookie') || (result as any)?.headers?.get?.('set-cookie');
    if (setCookie) {
      response.headers.set('set-cookie', setCookie);
    }

    return response;
  } catch (error: any) {
    console.error('[register POST]', error);
    const msg = error?.body?.message || error?.message || 'Erreur serveur';
    const status =
      msg.toLowerCase().includes('already') || msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('existe')
        ? 409
        : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
