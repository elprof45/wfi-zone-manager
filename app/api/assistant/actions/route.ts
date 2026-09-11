import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/api-auth';
import { runCriticalStockCheck, runRouterHealthChecks } from '@/lib/cron/scheduler';
import { getRouterById } from '@/lib/db/queries/routers';
import { MikroTikClient } from '@/lib/mikrotik/client';
import { decryptRouterPassword } from '@/lib/secret-crypto';
import { generateSalesReportSummary } from '@/lib/reports-service';
import { createAuditLog, getAuditLogs } from '@/lib/db/queries/audit';
import { ASSISTANT_TOOLS, createAssistantPlan, verifyAssistantPlan, type AssistantToolId } from '@/lib/assistant-tools';

const ActionSchema = z.object({
  action: z.enum(['router_health', 'stock_check', 'sales_summary', 'router_ping', 'purge_expired']),
  routerId: z.string().optional(),
  mode: z.enum(['preview', 'execute']).default('preview'),
  confirmationToken: z.string().optional(),
});

export async function GET() {
  const guard = await requireRole(['super_admin', 'admin']);
  if ('response' in guard) return guard.response;
  const history = await getAuditLogs({ action: 'assistant.tool', limit: 20 });
  return NextResponse.json({ tools: ASSISTANT_TOOLS, history });
}

export async function POST(req: NextRequest) {
  const guard = await requireRole(['super_admin', 'admin']);
  if ('response' in guard) return guard.response;

  const parsed = ActionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Action IA invalide.' }, { status: 400 });
  }

  try {
    const action = parsed.data.action as AssistantToolId;
    if (parsed.data.mode === 'preview') {
      const tool = ASSISTANT_TOOLS.find((item) => item.id === action);
      return NextResponse.json({
        success: true,
        mode: 'preview',
        action,
        requiresConfirmation: tool?.mode === 'write',
        plan: createAssistantPlan(action, { routerId: parsed.data.routerId }),
        message: tool?.mode === 'write' ? `Confirmation requise : ${tool.description}` : `Prêt à exécuter : ${tool?.description}`,
      });
    }

    if (!parsed.data.confirmationToken) {
      return NextResponse.json({ error: 'Confirmation requise avant exécution.' }, { status: 400 });
    }
    const plan = verifyAssistantPlan(parsed.data.confirmationToken);
    if (!plan || plan.action !== action || plan.params.routerId !== parsed.data.routerId) {
      return NextResponse.json({ error: 'Plan IA invalide ou expiré.' }, { status: 409 });
    }

    let result: unknown;
    let message = '';
    if (parsed.data.action === 'router_health') {
      result = await runRouterHealthChecks();
      message = `${(result as { online: number }).online}/${(result as { checked: number }).checked} routeur(s) en ligne.`;
    } else if (parsed.data.action === 'stock_check') {
      result = await runCriticalStockCheck();
      message = `${(result as { criticalCount: number }).criticalCount} profil(s) avec stock critique.`;
    } else if (parsed.data.action === 'sales_summary') {
      result = await generateSalesReportSummary('daily');
      const summary = result as { totalRevenue: number; ticketsCount: number; currency: string };
      message = `${summary.totalRevenue.toLocaleString()} ${summary.currency} sur ${summary.ticketsCount} ticket(s) aujourd’hui.`;
    } else {
      if (!parsed.data.routerId) return NextResponse.json({ error: 'routerId requis pour cet outil.' }, { status: 400 });
      const router = await getRouterById(parsed.data.routerId);
      if (!router) return NextResponse.json({ error: 'Routeur introuvable.' }, { status: 404 });
      const client = new MikroTikClient({ host: router.host, port: router.apiPort, user: router.username, password: decryptRouterPassword(router.passwordEncrypted), connectionType: router.connectionType, timeout: 8 });
      if (parsed.data.action === 'router_ping') {
        result = await client.testConnection();
        message = `Test de connexion terminé pour ${router.name}.`;
      } else {
        result = await client.purgeExpiredSessions();
        message = `Purge terminée pour ${router.name}.`;
      }
    }
    await createAuditLog({ userId: guard.session.user.id, action: 'assistant.tool', entityType: 'assistant_tool', entityId: action, metadata: { action, routerId: parsed.data.routerId, result } });
    return NextResponse.json({
      success: true,
      mode: 'execute',
      action,
      message,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Action impossible.' },
      { status: 500 }
    );
  }
}