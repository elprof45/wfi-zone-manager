// app/api/cron/trigger/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  runRouterHealthChecks,
  runCriticalStockCheck,
  runDailyClosureReport,
} from '@/lib/cron/scheduler';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { task = 'ping_routers' } = body;

    if (task === 'ping_routers') {
      const result = await runRouterHealthChecks();
      return NextResponse.json({
        success: true,
        task,
        message: `Vérification terminée : ${result.checked} routeur(s) vérifié(s), ${result.online} en ligne, ${result.errors} hors-ligne.`,
        result,
      });
    }

    if (task === 'stock_check') {
      const result = await runCriticalStockCheck();
      return NextResponse.json({
        success: true,
        task,
        message: `Vérification du stock terminée : ${result.criticalCount} profil(s) critique(s).`,
        result,
      });
    }

    if (task === 'daily_closure') {
      const result = await runDailyClosureReport();
      return NextResponse.json({
        success: result.success,
        task,
        message: result.message || 'Clôture journalière traitée avec succès.',
      });
    }

    return NextResponse.json(
      { success: false, error: `Tâche inconnue: ${task}. Valeurs valides: ping_routers, stock_check, daily_closure` },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
