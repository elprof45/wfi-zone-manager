import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { telegramLogs } from '@/lib/db/schema';
import { nanoid } from '@/lib/db/utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { botToken, adminChatId } = body;

    await new Promise((resolve) => setTimeout(resolve, 850));

    if (!botToken || !adminChatId) {
      return NextResponse.json(
        { success: false, error: 'Token Bot Telegram et Chat ID requis.' },
        { status: 400 }
      );
    }

    const testMsg = `🚀 [NetPulse Hotspot Manager v2026]\nCanal de notification Telegram initialisé avec succès!\nID Administrateur: \`${adminChatId}\`\nHorodatage: ${new Date().toLocaleTimeString()}`;

    // Real API attempt
    let apiSuccess = false;
    let apiError: string | undefined;

    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          text: testMsg,
          parse_mode: 'Markdown',
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        apiSuccess = true;
      } else {
        apiError = data?.description || 'Erreur API Telegram';
      }
    } catch (e: any) {
      apiError = e.message;
    }

    // Record log
    await db.insert(telegramLogs).values({
      id: `tg_test_${nanoid()}`,
      timestamp: new Date(),
      type: 'outgoing_alert',
      text: testMsg,
      status: apiSuccess ? 'delivered' : 'failed',
    });

    if (!apiSuccess) {
      // In development or demo token, accept mock
      if (botToken.includes('demo') || botToken.includes('mock') || botToken.includes('123456')) {
        return NextResponse.json({
          success: true,
          botName: 'NetPulse_Alert_Bot (Mock)',
          chatId: adminChatId,
          message: 'Mode démo Telegram accepté pour les tests locaux.',
        });
      }
      return NextResponse.json(
        { success: false, error: `Échec Telegram: ${apiError}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      botName: 'NetPulse_Alert_Bot',
      chatId: adminChatId,
      message: 'Test Telegram réussi ! Message distribué instantanément sur votre canal/chat.',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
