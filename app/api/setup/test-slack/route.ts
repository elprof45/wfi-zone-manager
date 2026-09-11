import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { slackLogs } from '@/lib/db/schema';
import { nanoid } from '@/lib/db/utils';
import { requireSetupAccess } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  try {
    const guard = await requireSetupAccess();
    if ('response' in guard) return guard.response;

    const body = await req.json();
    const { webhookUrl, botUsername, iconEmoji } = body;

    if (!webhookUrl) {
      return NextResponse.json(
        { success: false, error: "URL du webhook Slack requis." },
        { status: 400 }
      );
    }

    const testBlocks = [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🛰️ NetPulse Hotspot Manager', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: '*✅ Statut:*\nCanal Slack connecté' },
          { type: 'mrkdwn', text: `*🕐 Heure:*\n${new Date().toLocaleTimeString('fr-FR')}` },
        ],
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: 'NetPulse • Test de connexion Slack' },
        ],
      },
      { type: 'divider' },
    ];

    let apiSuccess = false;
    let apiError: string | undefined;

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '🛰️ NetPulse Hotspot Manager — Canal Slack initialisé !',
          username: botUsername || 'NetPulse 📡',
          icon_emoji: iconEmoji || ':satellite:',
          blocks: testBlocks,
        }),
        signal: AbortSignal.timeout(8000),
      });
      // Slack returns "ok" text on success
      const responseText = await res.text();
      apiSuccess = res.ok && responseText === 'ok';
      if (!apiSuccess) apiError = responseText || `HTTP ${res.status}`;
    } catch (e: any) {
      apiError = e.message;
    }

    // Log to DB
    await db.insert(slackLogs).values({
      id: `sl_test_${nanoid()}`,
      timestamp: new Date(),
      type: 'test',
      text: 'Test de connexion Slack webhook',
      status: apiSuccess ? 'delivered' : 'failed',
    });

    if (!apiSuccess) {
      if (webhookUrl.includes('demo') || webhookUrl.includes('mock') || webhookUrl.includes('localhost')) {
        return NextResponse.json({
          success: true,
          mode: 'mock',
          message: 'Mode démo Slack accepté pour les tests locaux.',
        });
      }
      return NextResponse.json(
        { success: false, error: `Échec Slack: ${apiError}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test Slack réussi ! Block Kit envoyé sur votre canal.',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
