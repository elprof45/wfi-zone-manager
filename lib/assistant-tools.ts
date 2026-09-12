import { createHmac, timingSafeEqual } from 'node:crypto';

export const ASSISTANT_TOOLS = [
  { id: 'router_health', label: 'Santé réseau', mode: 'read', description: 'Vérifie tous les routeurs et leurs métriques.' },
  { id: 'mikrotik_info', label: 'Info MikroTik', mode: 'read', description: 'Retourne l’identité, la version et les métriques d’un routeur.' },
  { id: 'stock_check', label: 'Stock critique', mode: 'read', description: 'Recherche les profils hotspot sous le seuil.' },
  { id: 'sales_summary', label: 'Résumé commercial', mode: 'read', description: 'Génère le rapport de ventes du jour, de la semaine ou du mois.' },
  { id: 'closure_summary', label: 'Clôtures de caisse', mode: 'read', description: 'Résume les clôtures et le chiffre d’affaires verrouillé.' },
  { id: 'audit_history', label: 'Historique actions', mode: 'read', description: 'Consulte les derniers événements et outils exécutés.' },
  { id: 'profile_list', label: 'Profils hotspot', mode: 'read', description: 'Liste les profils, tarifs, validité et stock disponible.' },
  { id: 'router_ping', label: 'Ping routeur ciblé', mode: 'read', description: 'Teste un routeur précis avec son identifiant.' },
  { id: 'routeros_script_preview', label: 'Script RouterOS', mode: 'preview', description: 'Génère un script RouterOS prévisualisable et copiable.' },
  { id: 'profile_create', label: 'Créer un profil', mode: 'write', description: 'Crée un profil hotspot après confirmation.' },
  { id: 'tickets_generate', label: 'Générer des tickets', mode: 'write', description: 'Génère des tickets selon un profil et un routeur après confirmation.' },
  { id: 'purge_expired', label: 'Purger sessions expirées', mode: 'write', description: 'Supprime les sessions expirées d’un routeur après confirmation.' },
  { id: 'purge_ram', label: 'Purger RAM MikroTik', mode: 'write', description: 'Nettoie les sessions expirées d’un routeur après confirmation.' },
] as const;

export type AssistantToolId = typeof ASSISTANT_TOOLS[number]['id'];

export function generateRouterOsScript(params: Record<string, string | undefined>) {
  const identity = params.identity || 'netpulse-router';
  const target = params.target || '1.1.1.1';
  const interval = params.interval || '5m';
  return [
    `# NetPulse Assistant - RouterOS v7 - ${identity}`,
    '# Prévisualisation uniquement : valider dans une session console séparée.',
    `/system/script/remove [find name="NetPulse-AI-Ping"];`,
    `/system/script/add name="NetPulse-AI-Ping" policy=read,test source={`,
    `  :local result [/ping ${target} count=5 as-value];`,
    '  :log info ("[NetPulse AI] Diagnostic ping : " . $result);',
    '}',
    `/system/scheduler/remove [find name="NetPulse-AI-Ping-Schedule"];`,
    `/system/scheduler/add name="NetPulse-AI-Ping-Schedule" interval=${interval} on-event="NetPulse-AI-Ping" policy=read,test;`,
  ].join('\n');
}

const PLAN_TTL_MS = 5 * 60 * 1000;

function getSigningKey() {
  return process.env.BETTER_AUTH_SECRET || 'development-only-netpulse-secret';
}

export function createAssistantPlan(action: AssistantToolId, params: Record<string, string | undefined> = {}) {
  const payload = Buffer.from(JSON.stringify({ action, params, exp: Date.now() + PLAN_TTL_MS })).toString('base64url');
  const signature = createHmac('sha256', getSigningKey()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyAssistantPlan(token: string): { action: AssistantToolId; params: Record<string, string | undefined> } | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = createHmac('sha256', getSigningKey()).update(payload).digest('base64url');
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== signatureBuffer.length || !timingSafeEqual(expectedBuffer, signatureBuffer)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      action: AssistantToolId;
      params: Record<string, string | undefined>;
      exp: number;
    };
    if (decoded.exp < Date.now() || !ASSISTANT_TOOLS.some((tool) => tool.id === decoded.action)) return null;
    return { action: decoded.action, params: decoded.params || {} };
  } catch {
    return null;
  }
}