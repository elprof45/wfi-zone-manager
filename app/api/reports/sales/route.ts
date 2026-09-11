import { NextRequest, NextResponse } from 'next/server';
import { generateSalesReportSummary } from '@/lib/reports-service';
import { requireSession } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  try {
    const guard = await requireSession();
    if ('response' in guard) return guard.response;

    const searchParams = req.nextUrl.searchParams;
    const period = (searchParams.get('period') as 'daily' | 'weekly' | 'monthly' | 'closure') || 'daily';
    const summary = await generateSalesReportSummary(period);

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
