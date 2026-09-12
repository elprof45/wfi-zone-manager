import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { getAllRouters } from '@/lib/db/queries/routers';
import { getAllProfiles } from '@/lib/db/queries/profiles';
import { getAllClosures } from '@/lib/db/queries/closures';
import { generateSalesReportSummary } from '@/lib/reports-service';

export async function GET() {
  const guard = await requireSession();
  if ('response' in guard) return guard.response;

  try {
    const [routers, profiles, closures, daily, weekly, monthly] = await Promise.all([
      getAllRouters(),
      getAllProfiles(),
      getAllClosures(),
      generateSalesReportSummary('daily'),
      generateSalesReportSummary('weekly'),
      generateSalesReportSummary('monthly'),
    ]);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      routers: routers.map((router) => ({
        id: router.id,
        name: router.name,
        host: router.host,
        status: router.status,
        lastSeenAt: router.lastSeenAt,
        hardware: router.hardwareJson,
      })),
      profiles: profiles.map((profile) => ({
        id: profile.id,
        name: profile.name,
        price: profile.price,
        currency: profile.currency,
        validityMinutes: profile.validityMinutes,
        rateLimit: profile.rateLimit,
        availableCount: profile.availableCount,
        minStockAlert: profile.minStockAlert,
      })),
      sales: { daily, weekly, monthly },
      closures: closures.slice(0, 20),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Contexte assistant indisponible.' },
      { status: 503 }
    );
  }
}