import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { discordLogs } from '@/lib/db/schema';
import { nanoid } from '@/lib/db/utils';
import { requireSetupAccess } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  try {
    const guard = await requireSetupAccess();
    if ('response' in guard) return guard.response;

    const body = await req.json();
    const { botToken, channelId } = body;

    if (!botToken || !channelId) {
      return NextResponse.json(
        { success: false, error: 'Bot Token et Channel ID Discord requis.' },
        { status: 400 }
      );
    }

    const testEmbed = {
      title: '🛰️ NetPulse Hotspot Manager',
      description: 'Canal de notification Discord initialisé avec succès !',
      color: 0x5865f2, // Discord Blurple
      fields: [
        { name: '✅ Statut', value: 'Connecté', inline: true },
        { name: '🕐 Heure', value: new Date().toLocaleTimeString('fr-FR'), inline: true },
      ],
      footer: { text: 'NetPulse • Notification Test' },
      timestamp: new Date().toISOString(),
    };

    let apiSuccess = false;
    let apiError: string | undefined;

    try {
      const res = await fetch(`https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [testEmbed],
        }),
        signal: AbortSignal.timeout(8000),
      });
      apiSuccess = res.ok;
      if (!apiSuccess) {
        apiError = await res.text().catch(() => `HTTP ${res.status}`);
      }
    } catch (e: any) {
      apiError = e.message;
    }

    // Log to DB
    await db.insert(discordLogs).values({
      id: `dc_test_${nanoid()}`,
      timestamp: new Date(),
      type: 'test',
      text: 'Test de connexion Discord HTTP',
      status: apiSuccess ? 'delivered' : 'failed',
    });

    if (!apiSuccess) {
      return NextResponse.json(
        { success: false, error: `Échec Discord: ${apiError}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test Discord réussi ! Message HTTP envoyé sur votre canal.',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
