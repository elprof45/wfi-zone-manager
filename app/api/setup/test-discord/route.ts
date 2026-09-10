import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { discordLogs } from '@/lib/db/schema';
import { nanoid } from '@/lib/db/utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { webhookUrl, botUsername } = body;

    if (!webhookUrl) {
      return NextResponse.json(
        { success: false, error: 'URL du webhook Discord requis.' },
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
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: botUsername || 'NetPulse 📡',
          embeds: [testEmbed],
        }),
        signal: AbortSignal.timeout(8000),
      });
      // Discord returns 204 No Content on success
      apiSuccess = res.status === 204 || res.ok;
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
      text: 'Test de connexion Discord webhook',
      status: apiSuccess ? 'delivered' : 'failed',
    });

    if (!apiSuccess) {
      // Accept demo/mock webhooks
      if (webhookUrl.includes('demo') || webhookUrl.includes('mock') || webhookUrl.includes('localhost')) {
        return NextResponse.json({
          success: true,
          mode: 'mock',
          message: 'Mode démo Discord accepté pour les tests locaux.',
        });
      }
      return NextResponse.json(
        { success: false, error: `Échec Discord: ${apiError}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test Discord réussi ! Embed envoyé sur votre canal.',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
