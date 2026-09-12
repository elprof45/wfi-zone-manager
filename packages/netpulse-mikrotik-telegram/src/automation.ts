import { z } from 'zod';
import type { Alert } from './alerts';

export const AutomationActionSchema = z.enum([
  'health-check',
  'stock-check',
  'cleanup',
  'cleanup-sessions',
  'backup',
  'report',
  'daily-report',
  'weekly-report',
  'router-sync',
]);
export type AutomationAction = z.infer<typeof AutomationActionSchema>;

export const AutomationRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  action: AutomationActionSchema,
  intervalMs: z.number().int().positive(),
  enabled: z.boolean().default(true),
  runImmediately: z.boolean().default(false),
});
export type AutomationRule = z.infer<typeof AutomationRuleSchema>;

export interface AutomationContext {
  readonly now: Date;
  readonly execute: (action: AutomationAction, rule: AutomationRule) => Promise<AutomationResult>;
}

export interface AutomationResult {
  readonly ruleId: string;
  readonly action: AutomationAction;
  readonly success: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly error?: string;
  readonly alerts?: readonly Alert[];
}

interface RegisteredRule {
  rule: AutomationRule;
  lastRunAt?: number;
}

export class AutomationEngine {
  private readonly rules = new Map<string, RegisteredRule>();

  register(input: AutomationRule): AutomationRule {
    const rule = AutomationRuleSchema.parse(input);
    this.rules.set(rule.id, { rule });
    return rule;
  }

  unregister(id: string): boolean {
    return this.rules.delete(z.string().min(1).parse(id));
  }

  pause(id: string): AutomationRule {
    const entry = this.getEntry(id);
    entry.rule = { ...entry.rule, enabled: false };
    return entry.rule;
  }

  resume(id: string): AutomationRule {
    const entry = this.getEntry(id);
    entry.rule = { ...entry.rule, enabled: true };
    return entry.rule;
  }

  list(): readonly AutomationRule[] {
    return [...this.rules.values()].map((entry) => entry.rule);
  }

  async run(id: string, context: AutomationContext): Promise<AutomationResult> {
    const entry = this.getEntry(id);
    const startedAt = context.now.toISOString();
    if (!entry.rule.enabled) return { ruleId: id, action: entry.rule.action, success: false, startedAt, finishedAt: context.now.toISOString(), error: 'Automation désactivée.' };
    try {
      const result = await context.execute(entry.rule.action, entry.rule);
      entry.lastRunAt = context.now.getTime();
      return { ...result, ruleId: id, action: entry.rule.action, startedAt, finishedAt: new Date().toISOString() };
    } catch (error) {
      entry.lastRunAt = context.now.getTime();
      return { ruleId: id, action: entry.rule.action, success: false, startedAt, finishedAt: new Date().toISOString(), error: error instanceof Error ? error.message : String(error) };
    }
  }

  async runDue(context: AutomationContext): Promise<readonly AutomationResult[]> {
    const now = context.now.getTime();
    const due = [...this.rules.values()].filter((entry) => entry.rule.enabled && (entry.rule.runImmediately || entry.lastRunAt === undefined || now - entry.lastRunAt >= entry.rule.intervalMs));
    return Promise.all(due.map((entry) => this.run(entry.rule.id, context)));
  }

  private getEntry(id: string): RegisteredRule {
    const entry = this.rules.get(z.string().min(1).parse(id));
    if (!entry) throw new Error(`Automation inconnue: ${id}`);
    return entry;
  }
}
