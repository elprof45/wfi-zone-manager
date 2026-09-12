import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/api-auth';
import { runCriticalStockCheck, runRouterHealthChecks } from '@/lib/cron/scheduler';
import { getRouterById } from '@/lib/db/queries/routers';
import { getAllProfiles, createProfile } from '@/lib/db/queries/profiles';
import { getAllClosures } from '@/lib/db/queries/closures';
import { createTicketsBatch } from '@/lib/db/queries/tickets';
import { MikroTikClient } from '@/lib/mikrotik/client';
import { decryptRouterPassword } from '@/lib/secret-crypto';
import { generateSalesReportSummary } from '@/lib/reports-service';
import { createAuditLog, getAuditLogs } from '@/lib/db/queries/audit';
import { generateVoucherCode, generateVoucherPassword } from '@/lib/crypto-generator';
import { ASSISTANT_TOOLS, createAssistantPlan, generateRouterOsScript, verifyAssistantPlan, type AssistantToolId } from '@/lib/assistant-tools';

const ActionSchema = z.object({
  action: z.enum(['router_health', 'mikrotik_info', 'stock_check', 'sales_summary', 'closure_summary', 'audit_history', 'profile_list', 'router_ping', 'routeros_script_preview', 'profile_create', 'tickets_generate', 'purge_expired', 'purge_ram']),
  routerId: z.string().optional(),
  period: z.enum(['daily', 'weekly', 'monthly', 'closure']).default('daily'),
  params: z.record(z.string(), z.string()).optional(),
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
    const actionParams = { ...(parsed.data.params || {}), routerId: parsed.data.routerId, period: parsed.data.period };
    if (parsed.data.mode === 'preview') {
      const tool = ASSISTANT_TOOLS.find((item) => item.id === action);
      return NextResponse.json({
        success: true,
        mode: 'preview',
        action,
        requiresConfirmation: tool?.mode === 'write',
        plan: createAssistantPlan(action, actionParams),
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
    const plannedParams = plan.params;

    let result: unknown;
    let message = '';
    if (parsed.data.action === 'router_health') {
      result = await runRouterHealthChecks();
      message = `${(result as { online: number }).online}/${(result as { checked: number }).checked} routeur(s) en ligne.`;
    } else if (parsed.data.action === 'mikrotik_info' || parsed.data.action === 'router_ping') {
      if (!parsed.data.routerId) return NextResponse.json({ error: 'routerId requis pour cet outil.' }, { status: 400 });
      const router = await getRouterById(parsed.data.routerId);
      if (!router) return NextResponse.json({ error: 'Routeur introuvable.' }, { status: 404 });
      const client = new MikroTikClient({ host: router.host, port: router.apiPort, user: router.username, password: decryptRouterPassword(router.passwordEncrypted), connectionType: router.connectionType, timeout: 8 });
      result = parsed.data.action === 'router_ping' ? await client.testConnection() : await client.getHardwareMetrics(false);
      message = parsed.data.action === 'router_ping' ? `Ping terminé pour ${router.name}.` : `Informations MikroTik récupérées pour ${router.name}.`;
    } else if (parsed.data.action === 'stock_check') {
      result = await runCriticalStockCheck();
      message = `${(result as { criticalCount: number }).criticalCount} profil(s) avec stock critique.`;
    } else if (parsed.data.action === 'sales_summary') {
      result = await generateSalesReportSummary(parsed.data.period);
      const summary = result as { totalRevenue: number; ticketsCount: number; currency: string };
      message = `${summary.totalRevenue.toLocaleString()} ${summary.currency} sur ${summary.ticketsCount} ticket(s) pour la période ${parsed.data.period}.`;
    } else if (parsed.data.action === 'closure_summary') {
      result = await getAllClosures();
      message = `${(result as unknown[]).length} clôture(s) disponibles dans l’historique.`;
    } else if (parsed.data.action === 'audit_history') {
      result = await getAuditLogs({ limit: 50 });
      message = `${(result as unknown[]).length} événement(s) d’audit récent(s).`;
    } else if (parsed.data.action === 'profile_list') {
      result = await getAllProfiles();
      message = `${(result as unknown[]).length} profil(s) hotspot trouvé(s).`;
    } else if (parsed.data.action === 'routeros_script_preview') {
      result = { script: generateRouterOsScript(plannedParams) };
      message = 'Script RouterOS généré en prévisualisation. Aucune commande n’a été exécutée.';
    } else if (parsed.data.action === 'profile_create') {
      const params = plannedParams;
      const input = z.object({ name: z.string().min(2).max(100), rateLimit: z.string().min(1), validityMinutes: z.coerce.number().int().min(1), price: z.coerce.number().nonnegative(), currency: z.string().min(1).max(8).default('FCFA') }).safeParse(params);
      if (!input.success) return NextResponse.json({ error: 'Paramètres profil invalides.', details: input.error.flatten() }, { status: 400 });
      result = await createProfile({ name: input.data.name, rateLimit: input.data.rateLimit, validityMinutes: input.data.validityMinutes, validityLabel: `${input.data.validityMinutes} minutes`, price: String(input.data.price), currency: input.data.currency, sharedUsers: 1, minStockAlert: 15, color: '#f59e0b', routerId: parsed.data.routerId || null });
      message = `Profil ${input.data.name} créé.`;
    } else if (parsed.data.action === 'tickets_generate') {
      const params = plannedParams;
      const input = z.object({ profileId: z.string().min(1), routerId: z.string().min(1), count: z.coerce.number().int().min(1).max(1000), prefix: z.string().max(10).default('') }).safeParse(params);
      if (!input.success) return NextResponse.json({ error: 'Paramètres tickets invalides.', details: input.error.flatten() }, { status: 400 });
      const profile = await getAllProfiles().then((items) => items.find((item) => item.id === input.data.profileId));
      const router = await getRouterById(input.data.routerId);
      if (!profile || !router) return NextResponse.json({ error: 'Profil ou routeur introuvable.' }, { status: 404 });
      const batchId = `ai_${Date.now()}`;
      const tickets = Array.from({ length: input.data.count }, () => ({ profileId: profile.id, routerId: router.id, code: generateVoucherCode(6, input.data.prefix), password: generateVoucherPassword(4), price: profile.price, currency: profile.currency, batchId }));
      result = await createTicketsBatch(tickets);
      message = `${(result as unknown[]).length} ticket(s) généré(s) pour ${profile.name}.`;
    } else {
      if (!parsed.data.routerId) return NextResponse.json({ error: 'routerId requis pour cet outil.' }, { status: 400 });
      const router = await getRouterById(parsed.data.routerId);
      if (!router) return NextResponse.json({ error: 'Routeur introuvable.' }, { status: 404 });
      const client = new MikroTikClient({ host: router.host, port: router.apiPort, user: router.username, password: decryptRouterPassword(router.passwordEncrypted), connectionType: router.connectionType, timeout: 8 });
      if (parsed.data.action === 'purge_expired' || parsed.data.action === 'purge_ram') {
        result = await client.purgeExpiredSessions();
        message = `Purge RAM/session terminée pour ${router.name}.`;
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