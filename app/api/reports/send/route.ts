import { NextRequest, NextResponse } from 'next/server';
import { dispatchNotification } from '@/lib/reports-service';
import { requireRole } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  try {
    const guard = await requireRole(['super_admin', 'admin']);
    if ('response' in guard) return guard.response;

    const body = await req.json();
    const { reportType = 'daily', channel = 'both', channels, recipientEmail, customNotes } = body;

    const result = await dispatchNotification({
      reportType,
      channel,
      channels,
      recipientEmail,
      customNotes,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
