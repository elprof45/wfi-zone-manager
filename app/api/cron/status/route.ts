// app/api/cron/status/route.ts
import { NextResponse } from 'next/server';
import { getCronStats } from '@/lib/cron/scheduler';
import { isDatabaseReady } from '@/lib/db';

export async function GET() {
  const dbConnected = await isDatabaseReady(2000);
  const cronInfo = getCronStats();

  return NextResponse.json({
    success: true,
    dbConnected,
    cron: cronInfo,
    timestamp: new Date().toISOString(),
  });
}
