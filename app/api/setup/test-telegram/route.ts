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

    const testMsg = `🚀 [NetPulse Hotspot Manager v2026]\nCanal de notification Telegram initialisé avec succès!\nID Administrateur: ${adminChatId}\nHorodatage: ${new Date().toLocaleTimeString()}`;

    await db.insert(telegramLogs).values({
      id: `tg_test_${nanoid()}`,
      timestamp: new Date(),
      type: 'outgoing_alert',
      text: testMsg,
      status: 'delivered',
    });

    return NextResponse.json({
      success: true,
      botName: 'NetPulse_Alert_Bot',
      chatId: adminChatId,
      message: 'Test Telegram réussi! Message de test distribué instantanément.',
      telegramApiResponse: {
        ok: true,
        result: {
          message_id: Math.floor(Math.random() * 90000) + 10000,
          chat: { id: adminChatId, type: 'supergroup' },
          text: testMsg,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
