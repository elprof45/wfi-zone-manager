import { NextRequest, NextResponse } from 'next/server';
import { getSanitizedEnv, updateEnvFile } from '@/lib/env-manager';
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
    return NextResponse.json({
      success: true,
      env: sanitized,
      rawPreview: '',
      message: 'Les valeurs secrètes ne sont jamais renvoyées au navigateur.',
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
    const envWriteAllowed = process.env.NODE_ENV !== 'production' && process.env.SETUP_ALLOW_ENV_WRITE === 'true';

    if (!envWriteAllowed) {
      return NextResponse.json(
        { error: 'Écriture .env désactivée. Utilisez les variables d’environnement ou un gestionnaire de secrets en production.' },
        { status: 403 }
      );
    }

    if (!isSetupCheck && (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'super_admin'))) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const updates = body.updates as Record<string, string | number | boolean>;
    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Mises à jour invalides' }, { status: 400 });
    }

    const allowedKeys = new Set([
      'NEXT_PUBLIC_APP_NAME', 'DEFAULT_CURRENCY', 'DEFAULT_TIMEZONE', 'LOW_STOCK_THRESHOLD',
      'POSTGRES_HOST', 'POSTGRES_PORT', 'POSTGRES_USER', 'POSTGRES_DB', 'DATABASE_URL',
      'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'NOTIFICATION_EMAILS',
      'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'DISCORD_BOT_TOKEN', 'DISCORD_CHANNEL_ID',
      'RESEND_API_KEY', 'GEMINI_API_KEY',
    ]);
    const safeUpdates = Object.fromEntries(Object.entries(updates).filter(([key]) => allowedKeys.has(key)));
    const success = updateEnvFile(safeUpdates);
    if (!success) {
      return NextResponse.json({ error: "Échec de l'écriture dans .env" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Fichier .env mis à jour avec succès.',
      updatedKeys: Object.keys(safeUpdates),
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
