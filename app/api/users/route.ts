// app/api/users/route.ts
// Users management API — CRUD via Drizzle + Better-Auth admin API

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth, getServerSession } from '@/lib/auth';
import { getAllUsers, getUserById, updateUser, deleteUser } from '@/lib/db/queries/users';
import { createAuditLog } from '@/lib/db/queries/audit';
import { headers } from 'next/headers';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const CreateUserSchema = z.object({
  name: z.string().min(2, 'Nom trop court').max(100),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe trop court (min 8 caractères)'),
  role: z.enum(['super_admin', 'admin', 'cashier']).default('cashier'),
});

const UpdateUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['super_admin', 'admin', 'cashier']).optional(),
  banned: z.boolean().optional(),
  banReason: z.string().max(255).nullable().optional(),
});

// ─── Auth guard helper ────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await getServerSession();
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) };
  }
  const role = (session.user as any).role as string;
  if (role !== 'super_admin' && role !== 'admin') {
    return { error: NextResponse.json({ error: 'Accès refusé — réservé aux admins' }, { status: 403 }) };
  }
  return { session, role };
}

async function requireSuperAdmin() {
  const session = await getServerSession();
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) };
  }
  const role = (session.user as any).role as string;
  if (role !== 'super_admin') {
    return { error: NextResponse.json({ error: 'Accès refusé — réservé au Super Admin' }, { status: 403 }) };
  }
  return { session, role };
}

// ─── GET /api/users ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ('error' in guard) return guard.error;

  try {
    const id = req.nextUrl.searchParams.get('id');

    if (id) {
      const user = await getUserById(id);
      if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
      return NextResponse.json(user);
    }

    const users = await getAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error('[users GET]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// ─── POST /api/users — create ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ('error' in guard) return guard.error;

  try {
    const body = await req.json();
    const parsed = CreateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const { name, email, password, role } = parsed.data;

    // Use Better-Auth admin API to create user with hashed password
    const reqHeaders = await headers();
    const result = await auth.api.createUser({
      body: { name, email, password, role },
      headers: reqHeaders,
    });

    if (!result) {
      return NextResponse.json({ error: 'Échec de la création' }, { status: 500 });
    }

    const createdId = (result as any)?.user?.id || (result as any)?.id;
    await createAuditLog({
      userId: (guard.session?.user as any)?.id || null,
      action: 'user.create',
      entityType: 'user',
      entityId: createdId,
      metadata: { name, email, role },
    });

    return NextResponse.json({ success: true, user: result }, { status: 201 });
  } catch (error: any) {
    console.error('[users POST]', error);
    const msg = error?.message ?? 'Erreur serveur';
    const status = msg.includes('already') || msg.includes('duplicate') ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

// ─── PUT /api/users — update ──────────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  const guard = await requireAdmin();
  if ('error' in guard) return guard.error;

  try {
    const body = await req.json();
    const parsed = UpdateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const { id, ...updates } = parsed.data;

    // Only super_admin can change roles
    if (updates.role && guard.role !== 'super_admin') {
      return NextResponse.json({ error: 'Seul le Super Admin peut modifier les rôles' }, { status: 403 });
    }

    const updated = await updateUser(id, updates);
    if (!updated) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

    await createAuditLog({
      userId: (guard.session?.user as any)?.id || null,
      action: updates.banned !== undefined ? 'user.toggle_ban' : 'user.update',
      entityType: 'user',
      entityId: id,
      metadata: { ...updates, userEmail: updated.email },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error('[users PUT]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// ─── DELETE /api/users ────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const guard = await requireSuperAdmin();
  if ('error' in guard) return guard.error;

  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

    // Prevent self-deletion
    const currentUserId = (guard.session?.user as any)?.id;
    if (id === currentUserId) {
      return NextResponse.json({ error: 'Impossible de supprimer votre propre compte' }, { status: 400 });
    }

    const deleted = await deleteUser(id);
    if (!deleted) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

    await createAuditLog({
      userId: currentUserId || null,
      action: 'user.delete',
      entityType: 'user',
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[users DELETE]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
