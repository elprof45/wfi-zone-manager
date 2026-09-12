import type { CommandResponse } from './types';

export interface TelegramClientOptions {
  readonly token: string;
  readonly fetch?: typeof fetch;
  readonly timeoutMs?: number;
}

export interface TelegramSendResult {
  readonly messageId: number;
  readonly chatId: string;
}

export class TelegramClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: TelegramClientOptions) {
    this.baseUrl = `https://api.telegram.org/bot${options.token}`;
    this.fetcher = options.fetch ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async sendMessage(chatId: string, response: CommandResponse): Promise<TelegramSendResult> {
    const result = await this.request<{ message_id: number }>('sendMessage', {
      chat_id: chatId, text: response.text, parse_mode: response.parseMode,
      ...(response.buttons ? { reply_markup: { inline_keyboard: response.buttons } } : {}),
    });
    return { messageId: result.message_id, chatId };
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
    await this.request('answerCallbackQuery', { callback_query_id: callbackQueryId, text });
  }

  private async request<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}/${method}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(this.timeoutMs),
    });
    const data = await response.json() as { ok: boolean; result?: T; description?: string };
    if (!response.ok || !data.ok) throw new Error(`Telegram API ${method}: ${data.description || response.status}`);
    return data.result as T;
  }
}
