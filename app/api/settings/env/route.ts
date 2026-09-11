import { NextRequest, NextResponse } from 'next/server';
import { getEnvRaw, getSanitizedEnv, parseEnv, updateEnvFile } from '@/lib/env-manager';
import { getServerSession } from '@/lib/auth';

/**
 * GET /api/settings/env
 * Returns sanitized .env variables for the UI inspection and editing
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    const isSetupCheck = req.nextUrl.searchParams.get('mode') === 'setup';

    // In production or authenticated mode, require admin role unless in setup mode
    if (!isSetupCheck && (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'super_admin'))) {
      // Return 401 if unauthorized
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const sanitized = getSanitizedEnv();
    const raw = getEnvRaw();

    return NextResponse.json({
      success: true,
      env: sanitized,
      rawPreview: raw,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/**
 * POST /api/settings/env
 * Updates specified environment variables in .env
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    const body = await req.json();
    const isSetupCheck = body._isSetup === true;

    if (!isSetupCheck && (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'super_admin'))) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const updates = body.updates as Record<string, string | number | boolean>;
    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Mises à jour invalides' }, { status: 400 });
    }

    const success = updateEnvFile(updates);
    if (!success) {
      return NextResponse.json({ error: "Échec de l'écriture dans .env" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Fichier .env mis à jour avec succès.',
      updatedKeys: Object.keys(updates),
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
