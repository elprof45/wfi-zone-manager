import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || !body.rateLimit || !body.price) {
      return NextResponse.json({ error: 'Nom, limitation de vitesse et prix requis' }, { status: 400 });
    }

    const created = await createProfile({
      name: body.name,
      routerId: body.routerId || null,
      rateLimit: body.rateLimit,
      validityLabel: body.validityDuration || '24 Heures',
      validityMinutes: Number(body.validityMinutes) || 1440,
      price: String(body.price),
      currency: body.currency || 'FCFA',
      sharedUsers: Number(body.sharedUsers) || 1,
      minStockAlert: Number(body.minStockAlert) || 15,
      color: body.color || '#3b82f6',
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
