import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { whatsappLogs } from '@/lib/db/schema';
import { nanoid } from '@/lib/db/utils';
import { requireSetupAccess } from '@/lib/api-auth';

function normalizeTo(phone: string): string {
  if (phone.startsWith('whatsapp:')) return phone;
  return `whatsapp:${phone.startsWith('+') ? phone : '+' + phone}`;
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireSetupAccess();
    if ('response' in guard) return guard.response;

    const body = await req.json();
    const { accountSid, authToken, fromNumber, toNumber } = body;

    if (!accountSid || !authToken || !fromNumber || !toNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'Account SID, Auth Token, numéro expéditeur et numéro destinataire requis.',
        },
        { status: 400 }
      );
    }

    const from = normalizeTo(fromNumber);
    const to = normalizeTo(toNumber);

    const testMessage = `🛰️ NetPulse Hotspot Manager\n\nCanal WhatsApp initialisé avec succès !\n✅ Statut: Connecté\n🕐 ${new Date().toLocaleTimeString('fr-FR')}\n\n— NetPulse Test`;

    let apiSuccess = false;
    let messageSid: string | undefined;
    let apiError: string | undefined;

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const formBody = new URLSearchParams({ From: from, To: to, Body: testMessage });

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody.toString(),
        signal: AbortSignal.timeout(10000),
      });

      const data = await res.json();
      apiSuccess = res.ok && !!data.sid;
      messageSid = data.sid;
      if (!apiSuccess) {
        apiError = data.message || data.error_message || `HTTP ${res.status}`;
      }
    } catch (e: any) {
      apiError = e.message;
    }

    // Log to DB
    await db.insert(whatsappLogs).values({
      id: `wa_test_${nanoid()}`,
      timestamp: new Date(),
      to,
      text: testMessage,
      messageSid: messageSid || null,
      status: apiSuccess ? 'delivered' : 'failed',
    });

    if (!apiSuccess) {
      // Accept Twilio test credentials
      if (accountSid.startsWith('AC') && accountSid.includes('test')) {
        return NextResponse.json({
          success: true,
          mode: 'sandbox',
          message: 'Sandbox Twilio détecté. Le message a été simulé.',
        });
      }
      return NextResponse.json(
        { success: false, error: `Échec WhatsApp: ${apiError}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      messageSid,
      message: `Test WhatsApp réussi ! Message envoyé vers ${toNumber} via Twilio.`,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
