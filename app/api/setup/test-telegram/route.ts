import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { telegramLogs } from '@/lib/db/schema';
import { nanoid } from '@/lib/db/utils';
import { getTelegramConfig } from '@/lib/config';
import { requireSetupAccess } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  try {
    const guard = await requireSetupAccess();
    if ('response' in guard) return guard.response;

    const body = await req.json().catch(() => ({}));
    const activeConfig = await getTelegramConfig();

    const botToken = body.botToken || activeConfig.botToken;
    const adminChatId = body.adminChatId || activeConfig.adminChatId;
    const targetType = body.targetType || 'private';

    await new Promise((resolve) => setTimeout(resolve, 500));

    if (!botToken || !adminChatId) {
      return NextResponse.json(
        { success: false, error: 'Token Bot Telegram et Chat ID requis (non configurés dans .env ni dans le formulaire).' },
        { status: 400 }
      );
    }

    if (!/^-?\d+$/.test(String(adminChatId).trim()) && !/^@[A-Za-z0-9_]{5,}$/.test(String(adminChatId).trim())) {
      return NextResponse.json(
        {
          success: false,
          error: 'Chat ID Telegram invalide. Utilisez un ID numérique (ex. 6252843 ou -1001234567890) ou le @nom_public du chat.',
        },
        { status: 400 }
      );
    }

    const testMsg = `🚀 [NetPulse Hotspot Manager v2026]\nDestination ${targetType} initialisée avec succès !\nChat ID: \`${adminChatId}\`\nHorodatage: ${new Date().toLocaleTimeString()}`;

    // Real API attempt
    let apiSuccess = false;
    let apiError: string | undefined;

    try {
      const chatRes = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${encodeURIComponent(adminChatId)}`);
      const chatData = await chatRes.json();
      if (!chatRes.ok || !chatData.ok) {
        apiError = chatData?.description || 'Chat Telegram introuvable';
      }

      if (apiError) {
        throw new Error(apiError);
      }

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
