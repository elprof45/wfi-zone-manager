import { NextRequest, NextResponse } from 'next/server';
import { dispatchNotification } from '@/lib/reports-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reportType = 'daily', channel = 'both', recipientEmail, customNotes } = body;

    const result = await dispatchNotification({
      reportType,
      channel,
      recipientEmail,
      customNotes,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
