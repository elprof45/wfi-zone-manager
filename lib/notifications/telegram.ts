// lib/notifications/telegram.ts
// Native Telegram Bot API dispatcher using HTTPS fetch and system_settings

import { getSetting } from '@/lib/db/queries/settings';

export interface TelegramResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

export async function sendTelegramMessage(
  text: string,
  chatId?: string,
  overrideToken?: string
): Promise<TelegramResult> {
  try {
    const telegramSettings = await getSetting<any>('telegram');

    const token = overrideToken || telegramSettings?.botToken || process.env.TELEGRAM_BOT_TOKEN;
    const targetChatId = chatId || telegramSettings?.adminChatId || process.env.TELEGRAM_CHAT_ID;

    if (!token || !targetChatId) {
      console.warn('⚠️ [Telegram] Token ou Chat ID manquant pour l\'envoi du message.');
      return {
        success: false,
        error: 'Paramètres Telegram incomplets (Bot Token ou Chat ID manquant).',
      };
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      const errMsg = data?.description || `HTTP ${response.status}`;
      console.error(`❌ [Telegram] Erreur API Telegram:`, errMsg);
      return {
        success: false,
        error: errMsg,
      };
    }

    console.log(`🤖 [Telegram] Message expédié avec succès au chat ${targetChatId} (msg_id: ${data.result?.message_id})`);

    return {
      success: true,
      messageId: data.result?.message_id,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("❌ [Telegram] Exception lors de l'envoi Telegram:", errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
