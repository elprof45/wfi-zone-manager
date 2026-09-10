// lib/notifications/email.ts
// Real SMTP email dispatcher using nodemailer and system_settings

import nodemailer from 'nodemailer';
import { getSetting } from '@/lib/db/queries/settings';

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
}

export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  try {
    const smtpSettings = await getSetting<any>('smtp');

    if (!smtpSettings || !smtpSettings.host || !smtpSettings.senderEmail) {
      console.warn('⚠️ [Email] Configuration SMTP non renseignée dans system_settings.');
      return {
        success: false,
        error: 'Serveur SMTP non configuré. Veuillez renseigner les paramètres dans Configurations.',
      };
    }

    const transporter = nodemailer.createTransport({
      host: smtpSettings.host,
      port: Number(smtpSettings.port) || 587,
      secure: Boolean(smtpSettings.useTls) || Number(smtpSettings.port) === 465,
      auth: smtpSettings.username
        ? {
            user: smtpSettings.username,
            pass: smtpSettings.password || '',
          }
        : undefined,
      tls: {
        rejectUnauthorized: false, // Permet les certificats locaux
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

    console.log(`✉️ [Email] Message expédié avec succès vers ${recipients} (ID: ${info.messageId})`);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("❌ [Email] Échec d'envoi email SMTP:", errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
