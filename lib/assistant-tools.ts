import { createHmac, timingSafeEqual } from 'node:crypto';

export const ASSISTANT_TOOLS = [
  { id: 'router_health', label: 'Santé réseau', mode: 'read', description: 'Vérifie tous les routeurs et leurs métriques.' },
  { id: 'stock_check', label: 'Stock critique', mode: 'read', description: 'Recherche les profils hotspot sous le seuil.' },
  { id: 'sales_summary', label: 'Résumé commercial', mode: 'read', description: 'Génère le rapport de ventes du jour.' },
  { id: 'router_ping', label: 'Ping routeur ciblé', mode: 'read', description: 'Teste un routeur précis avec son identifiant.' },
  { id: 'purge_expired', label: 'Purger sessions expirées', mode: 'write', description: 'Supprime les sessions expirées d’un routeur après confirmation.' },
] as const;

export type AssistantToolId = typeof ASSISTANT_TOOLS[number]['id'];

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