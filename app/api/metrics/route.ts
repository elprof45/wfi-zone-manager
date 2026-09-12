import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
    hotspotTickets
} from '@/lib/db/schema';
import { eq, and, inArray, gte } from 'drizzle-orm';
import { getAllRouters } from '@/lib/db/queries/routers';
import { getAllProfiles } from '@/lib/db/queries/profiles';
import { getUnclosedStats } from '@/lib/db/queries/closures';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const routerFilter = searchParams.get('routerId') || 'all';
    const isAll = routerFilter === 'all';

    // 1. Fetch Routers
    const allRouters = await getAllRouters();
    const targetRouters = isAll ? allRouters : allRouters.filter((r) => r.id === routerFilter);
    const selectedRouter = isAll ? null : targetRouters[0] || null;

    // 2. Fetch Unclosed Stats
    const unclosedStats = await getUnclosedStats(routerFilter);
    const todayRevenue = unclosedStats.totalRevenue;
    const unclosedTicketsCount = unclosedStats.ticketsCount;

    // 3. Active users & Hardware metrics
    let activeUsersCount = 0;
    let avgCpu = 0;
    let totalRamFree = 0;
    let totalRamTotal = 0;
    let totalFlashFree = 0;
    let totalFlashTotal = 0;

    if (targetRouters.length > 0) {
      for (const r of targetRouters) {
        const hw = (r.hardwareJson as any) || {};
        activeUsersCount += hw.activeUsersCount || 0;
        avgCpu += hw.cpuPercent || 10;
        totalRamFree += hw.ramFreeMb || 80;
        totalRamTotal += hw.ramTotalMb || 128;
        totalFlashFree += hw.flashFreeMb || 90;
        totalFlashTotal += hw.flashTotalMb || 128;
      }
      avgCpu = Math.round(avgCpu / targetRouters.length);
    }

    // 4. Stock alerts: profiles with availableCount < minStockAlert
    const allProfiles = await getAllProfiles();
    const stockAlerts = allProfiles
      .map((prof) => ({
        profileId: prof.id,
        profileName: prof.name,
        availableCount: prof.availableCount,
        minStockAlert: prof.minStockAlert,
        isCritical: prof.availableCount < prof.minStockAlert,
        color: prof.color,
      }))
      .filter((a) => a.isCritical);

    // 5. Profile sales distribution from unclosed stats breakdown
    const profileSalesDistribution = unclosedStats.breakdown.map((b) => {
      const prof = allProfiles.find((p) => p.id === b.profileId);
      return {
        name: b.profileName,
        count: b.count,
        revenue: b.revenue,
        color: prof?.color || '#3b82f6',
      };
    });

    // 6. Real sales series from PostgreSQL (today, same day seven days ago, and last 7 days)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysStart = new Date(todayStart);
    sevenDaysStart.setDate(sevenDaysStart.getDate() - 7);
    const salesConditions = [
      inArray(hotspotTickets.status, ['active', 'used', 'expired']),
      gte(hotspotTickets.soldAt, sevenDaysStart),
    ];
    if (!isAll) salesConditions.push(eq(hotspotTickets.routerId, routerFilter));

    const recentSales = await db
      .select({ soldAt: hotspotTickets.soldAt, createdAt: hotspotTickets.createdAt, price: hotspotTickets.price })
      .from(hotspotTickets)
      .where(and(...salesConditions));

    const hourKeys = Array.from({ length: 24 }, (_, hour) => hour);
    const hourlyComparison = hourKeys.map((hour) => {
      const jourJ = recentSales
        .filter((sale) => {
          const date = sale.soldAt || sale.createdAt;
          return date >= todayStart && date.getHours() === hour;
        })
        .reduce((total, sale) => total + Number(sale.price), 0);
      const previousDayStart = new Date(todayStart);
      previousDayStart.setDate(previousDayStart.getDate() - 7);
      const previousDayEnd = new Date(previousDayStart);
      previousDayEnd.setDate(previousDayEnd.getDate() + 1);
      const jourJ7 = recentSales
        .filter((sale) => {
          const date = sale.soldAt || sale.createdAt;
          return date >= previousDayStart && date < previousDayEnd && date.getHours() === hour;
        })
        .reduce((total, sale) => total + Number(sale.price), 0);

      return { hour: `${String(hour).padStart(2, '0')}h`, jourJ, jourJ7 };
    });

    // 7. Last 7 calendar days from real ticket sales, with closure fallback only for closed history.
    const daysTrend = Array.from({ length: 7 }, (_, index) => {
      const dayStart = new Date(sevenDaysStart);
      dayStart.setDate(sevenDaysStart.getDate() + index);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const daySales = recentSales.filter((sale) => {
        const date = sale.soldAt || sale.createdAt;
        return date >= dayStart && date < dayEnd;
      });
      return {
        day: index === 6 ? "Aujourd'hui (J)" : `J-${6 - index}`,
        date: dayStart.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        ca: daySales.reduce((total, sale) => total + Number(sale.price), 0),
        tickets: daySales.length,
      };
    });

    return NextResponse.json({
      selectedRouterId: routerFilter,
      selectedRouter: selectedRouter
        ? {
            ...selectedRouter,
            status: selectedRouter.status,
            lastSeen: selectedRouter.lastSeenAt?.toISOString() || new Date().toISOString(),
            hardware: selectedRouter.hardwareJson || {},
          }
        : null,
      todayRevenue,
      unclosedTicketsCount,
      activeUsersCount,
      currency: unclosedStats.currency || 'FCFA',
      hardware: {
        cpuPercent: avgCpu,
        ramFreeMb: totalRamFree,
        ramTotalMb: totalRamTotal,
        flashFreeMb: totalFlashFree,
        flashTotalMb: totalFlashTotal,
      },
      stockAlerts,
      hourlyComparison,
      daysTrend,
      profileSalesDistribution,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
