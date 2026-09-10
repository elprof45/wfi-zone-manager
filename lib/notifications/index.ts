import nodemailer from 'nodemailer';
import { getSetting } from '../db/queries/settings';
import { db } from '../db';
import { notificationLogs, telegramLogs } from '../db/schema';
import { nanoid } from '../db/utils';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface SendTelegramOptions {
  chatId?: string;
  message: string;
  parseMode?: 'Markdown' | 'HTML';
}

/**
 * Send an email using configured SMTP settings (or fallback logger)
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const smtpConfig = await getSetting<any>('smtp');

    if (!smtpConfig || !smtpConfig.host) {
      console.log(`[Email Mock Delivery] To: ${options.to}, Subject: ${options.subject}`);
      return { success: true, messageId: `mock_${Date.now()}` };
    }

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: Number(smtpConfig.port) || 587,
      secure: Boolean(smtpConfig.secure),
      auth: smtpConfig.username
        ? {
            user: smtpConfig.username,
            pass: smtpConfig.password || '',
          }
        : undefined,
    });

    const info = await transporter.sendMail({
      from: smtpConfig.senderEmail || 'notifications@netpulse-hotspot.com',
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('SMTP send error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send a Telegram notification using Telegram Bot API
 */
export async function sendTelegramMessage(options: SendTelegramOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const telegramConfig = await getSetting<any>('telegram');
    const token = telegramConfig?.botToken;
    const targetChat = options.chatId || telegramConfig?.adminChatId;

    if (!token || !targetChat) {
      console.log(`[Telegram Mock Delivery] Chat: ${targetChat}, Message: ${options.message.slice(0, 80)}...`);
      return { success: true };
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChat,
        text: options.message,
        parse_mode: options.parseMode || 'Markdown',
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return { success: false, error: errJson.description || `HTTP ${res.status}` };
    }

    // Log to telegram_logs in DB
    await db.insert(telegramLogs).values({
      id: `tg_${nanoid()}`,
      timestamp: new Date(),
      type: 'outgoing_alert',
      text: options.message,
      status: 'delivered',
    });

    return { success: true };
  } catch (error: any) {
    console.error('Telegram send error:', error);
    return { success: false, error: error.message };
  }
}
