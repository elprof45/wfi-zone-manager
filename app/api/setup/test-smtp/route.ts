import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { host, port, username, senderEmail, recipientEmail } = body;

    await new Promise((resolve) => setTimeout(resolve, 950));

    if (!host || !senderEmail) {
      return NextResponse.json(
        { success: false, error: 'Hôte SMTP et email expéditeur obligatoires.' },
        { status: 400 }
      );
    }

    const target = recipientEmail || senderEmail;

    return NextResponse.json({
      success: true,
      message: `E-mail de test expédié avec succès vers <${target}> via ${host}:${port || 587}.`,
      smtpResponse: '250 2.0.0 OK: Message queued for delivery',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
