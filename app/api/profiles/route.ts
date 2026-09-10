import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getAllProfiles,
  getProfileById,
  createProfile,
  updateProfile,
  deleteProfile,
} from '@/lib/db/queries/profiles';
import { HotspotProfile } from '@/lib/types';
import { HotspotProfile as DbHotspotProfile } from '@/lib/db/schema';

function formatProfile(p: DbHotspotProfile & { availableCount?: number }): HotspotProfile {
  return {
    id: p.id,
    name: p.name,
    rateLimit: p.rateLimit,
    validityDuration: p.validityLabel,
    validityMinutes: p.validityMinutes,
    price: Number(p.price),
    currency: p.currency,
    sharedUsers: p.sharedUsers,
    minStockAlert: p.minStockAlert,
    availableCount: p.availableCount ?? 0,
    color: p.color,
  };
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const profileId = searchParams.get('id');

    if (profileId) {
      const p = await getProfileById(profileId);
      if (!p) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
      return NextResponse.json(formatProfile(p));
    }

    const profilesWithCount = await getAllProfiles();
    return NextResponse.json(profilesWithCount.map(formatProfile));
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

const ProfileCreateSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(100),
  routerId: z.string().nullable().optional(),
  rateLimit: z.string().min(1, 'Rate limit requis'),
  validityDuration: z.string().default('24 Heures'),
  validityMinutes: z.number().int().min(1).default(1440),
  price: z.union([z.string(), z.number()]).transform(String),
  currency: z.string().default('FCFA'),
  sharedUsers: z.number().int().min(1).default(1),
  minStockAlert: z.number().int().min(0).default(15),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#3b82f6'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ProfileCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 422 });
    }
    const d = parsed.data;

    const created = await createProfile({
      name: d.name,
      routerId: d.routerId ?? null,
      rateLimit: d.rateLimit,
      validityLabel: d.validityDuration,
      validityMinutes: d.validityMinutes,
      price: d.price,
      currency: d.currency,
      sharedUsers: d.sharedUsers,
      minStockAlert: d.minStockAlert,
      color: d.color,
    });

    return NextResponse.json({ success: true, profile: formatProfile(created) });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

    const updated = await updateProfile(id, {
      ...updates,
      price: updates.price !== undefined ? String(updates.price) : undefined,
      validityLabel: updates.validityDuration !== undefined ? updates.validityDuration : undefined,
      validityMinutes: updates.validityMinutes !== undefined ? Number(updates.validityMinutes) : undefined,
      sharedUsers: updates.sharedUsers !== undefined ? Number(updates.sharedUsers) : undefined,
      minStockAlert: updates.minStockAlert !== undefined ? Number(updates.minStockAlert) : undefined,
    });

    if (!updated) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });

    return NextResponse.json({ success: true, profile: formatProfile(updated) });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

    const deleted = await deleteProfile(id);
    if (!deleted) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
