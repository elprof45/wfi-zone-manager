// lib/notifications/email.ts
// Dual email dispatcher: Resend API (default modern SaaS) + SMTP Fallback (Nodemailer)

import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { getSmtpConfig } from '@/lib/config';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: 'resend' | 'smtp';
}

export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  try {
    const smtpSettings = await getSmtpConfig();
    const resendApiKey = process.env.RESEND_API_KEY || (smtpSettings as any)?.resendApiKey;

    // ── 1. Modern SaaS Dispatcher: Resend API ──
    if (resendApiKey && resendApiKey.trim() !== '') {
      try {
        const resend = new Resend(resendApiKey.trim());
        const from =
          process.env.RESEND_FROM ||
          (smtpSettings.senderEmail && smtpSettings.senderEmail.includes('@')
            ? `"${smtpSettings.senderName || 'NetPulse Hotspot'}" <${smtpSettings.senderEmail}>`
            : 'NetPulse Hotspot <onboarding@resend.dev>');

        const toList = Array.isArray(options.to) ? options.to : [options.to];

        const { data, error } = await resend.emails.send({
          from,
          to: toList,
          subject: options.subject,
          html: options.html,
          text: options.text || options.subject,
          attachments: options.attachments?.map((att) => ({
            filename: att.filename,
            content: Buffer.isBuffer(att.content) ? att.content : Buffer.from(att.content),
          })),
        });

        if (error) {
          throw new Error(`Resend: ${error.message}`);
        }

        console.log(`✉️ [Resend] Email expédié avec succès vers ${toList.join(', ')} (ID: ${data?.id})`);
        return {
          success: true,
          messageId: data?.id,
          provider: 'resend',
        };
      } catch (resendErr) {
        console.warn('⚠️ [Email] Échec Resend, tentative de fallback SMTP:', (resendErr as Error).message);
        // If SMTP is also not configured, throw
        if (!smtpSettings.isConfigured || !smtpSettings.host) {
          throw resendErr;
        }
      }
    }

    // ── 2. Traditional Fallback: SMTP via Nodemailer ──
    if (!smtpSettings.isConfigured || !smtpSettings.host) {
      console.warn('⚠️ [Email] Aucun fournisseur email configuré (Resend ou SMTP).');
      return {
        success: false,
        error: 'Aucun service email configuré. Ajoutez RESEND_API_KEY ou configurez le serveur SMTP.',
      };
    }

    const transporter = nodemailer.createTransport({
      host: smtpSettings.host,
      port: smtpSettings.port,
      secure: smtpSettings.secure,
      auth: smtpSettings.username
        ? {
            user: smtpSettings.username,
            pass: smtpSettings.password || '',
          }
        : undefined,
      tls: {
        rejectUnauthorized: false,
      },
    });

    const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to;
    const from = smtpSettings.senderName
      ? `"${smtpSettings.senderName}" <${smtpSettings.senderEmail}>`
      : smtpSettings.senderEmail;

    const info = await transporter.sendMail({
      from,
      to: recipients,
      subject: options.subject,
      text: options.text || options.subject,
      html: options.html,
      attachments: options.attachments,
    });

    console.log(`✉️ [SMTP] Email expédié avec succès vers ${recipients} (ID: ${info.messageId})`);

    return {
      success: true,
      messageId: info.messageId,
      provider: 'smtp',
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("❌ [Email] Échec d'envoi de l'email:", errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
