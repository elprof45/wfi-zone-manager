import { z } from 'zod';
import type { HotspotProfile, SystemHealth, TrafficMetrics } from './types';

export const AlertSeveritySchema = z.enum(['info', 'warning', 'critical']);
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;

export interface Alert {
  readonly key: string;
  readonly severity: AlertSeverity;
  readonly title: string;
  readonly message: string;
  readonly createdAt: string;
  readonly resolved?: boolean;
}

export interface AlertThresholds {
  readonly cpuWarningPercent: number;
  readonly cpuCriticalPercent: number;
  readonly freeMemoryWarningBytes: number;
  readonly freeMemoryCriticalBytes: number;
  readonly freeStorageWarningBytes: number;
  readonly criticalStockMultiplier: number;
}

export const DefaultAlertThresholds: AlertThresholds = {
  cpuWarningPercent: 70,
  cpuCriticalPercent: 90,
  freeMemoryWarningBytes: 32 * 1024 * 1024,
  freeMemoryCriticalBytes: 16 * 1024 * 1024,
  freeStorageWarningBytes: 64 * 1024 * 1024,
  criticalStockMultiplier: 1,
};

export interface RouterSnapshot {
  readonly online: boolean;
  readonly health?: SystemHealth;
  readonly activeSessions?: number;
}

export interface AlertEvaluation {
  readonly alerts: readonly Alert[];
  readonly resolvedKeys: readonly string[];
}

export function evaluateRouterAnomalies(
  snapshot: RouterSnapshot,
  thresholds: AlertThresholds = DefaultAlertThresholds,
  now = new Date(),
): AlertEvaluation {
  const alerts: Alert[] = [];
  const add = (key: string, severity: AlertSeverity, title: string, message: string) => alerts.push({ key, severity, title, message, createdAt: now.toISOString() });
  if (!snapshot.online) add('router.offline', 'critical', 'Routeur hors ligne', 'Le routeur ne répond plus aux contrôles de disponibilité REST.');
  if (snapshot.health) {
    const health = snapshot.health;
    if (health.cpuLoadPercent >= thresholds.cpuCriticalPercent) add('router.cpu.critical', 'critical', 'CPU critique', `Charge CPU à ${health.cpuLoadPercent}%.`);
    else if (health.cpuLoadPercent >= thresholds.cpuWarningPercent) add('router.cpu.warning', 'warning', 'CPU élevé', `Charge CPU à ${health.cpuLoadPercent}%.`);
    if (health.freeMemoryBytes <= thresholds.freeMemoryCriticalBytes) add('router.memory.critical', 'critical', 'Mémoire critique', `Mémoire libre: ${health.freeMemoryBytes} octets.`);
    else if (health.freeMemoryBytes <= thresholds.freeMemoryWarningBytes) add('router.memory.warning', 'warning', 'Mémoire faible', `Mémoire libre: ${health.freeMemoryBytes} octets.`);
    if (health.freeStorageBytes <= thresholds.freeStorageWarningBytes) add('router.storage.warning', 'warning', 'Stockage faible', `Stockage libre: ${health.freeStorageBytes} octets.`);
  }
  return { alerts, resolvedKeys: [] };
}

export function evaluateStockAnomalies(profiles: readonly HotspotProfile[], now = new Date()): AlertEvaluation {
  const alerts = profiles.filter((profile) => profile.sharedUsers !== undefined && profile.sharedUsers <= 0).map((profile): Alert => ({
    key: `profile.stock.${profile.id}`, severity: 'warning', title: 'Profil sans capacité configurée',
    message: `Le profil ${profile.name} ne possède pas de capacité partagée positive.`, createdAt: now.toISOString(),
  }));
  return { alerts, resolvedKeys: [] };
}

export function evaluateTrafficAnomalies(metrics: TrafficMetrics, now = new Date()): AlertEvaluation {
  const alerts: Alert[] = [];
  const add = (key: string, severity: AlertSeverity, title: string, message: string) => alerts.push({
    key, severity, title, message, createdAt: now.toISOString(),
  });

  if (!metrics.online) {
    add('traffic.offline', 'critical', 'Flux hors ligne', 'Le routeur n’est plus en mesure de signaler les usages réseau.');
  }

  if (metrics.rxBytesPerSecond !== undefined && metrics.rxBytesPerSecond > 8_000_000) {
    add('traffic.download.warning', 'warning', 'Téléchargement élevé', `Le trafic entrant est de ${metrics.rxBytesPerSecond} octets/s.`);
  }

  if (metrics.txBytesPerSecond !== undefined && metrics.txBytesPerSecond > 8_000_000) {
    add('traffic.upload.warning', 'warning', 'Téléversement élevé', `Le trafic sortant est de ${metrics.txBytesPerSecond} octets/s.`);
  }

  if (metrics.totalSessions !== undefined && metrics.peakSessions !== undefined && metrics.totalSessions >= Math.max(1, metrics.peakSessions * 0.8)) {
    add('traffic.sessions.warning', 'warning', 'Sessions proches du seuil', `Sessions actives: ${metrics.totalSessions} / pic attendu: ${metrics.peakSessions}.`);
  }

  return { alerts, resolvedKeys: [] };
}

export interface AlertState {
  readonly lastEmittedAt: Readonly<Record<string, number>>;
}

export class AlertEngine {
  private readonly lastEmittedAt = new Map<string, number>();
  private readonly repeatCount = new Map<string, number>();

  constructor(private readonly cooldownMs = 15 * 60_000, private readonly now: () => number = Date.now) {}

  filter(alerts: readonly Alert[]): AlertEvaluation {
    const emitted: Alert[] = [];
    for (const alert of alerts) {
      const previous = this.lastEmittedAt.get(alert.key);
      const repeats = this.repeatCount.get(alert.key) ?? 0;
      const nextRepeat = previous !== undefined && this.now() - previous < this.cooldownMs ? repeats + 1 : 0;

      if (previous !== undefined && this.now() - previous < this.cooldownMs) {
        this.repeatCount.set(alert.key, nextRepeat);
        if (nextRepeat < 2) continue;
      } else {
        this.repeatCount.set(alert.key, 0);
      }

      const escalated: Alert = {
        ...alert,
        severity: alert.severity === 'warning' && nextRepeat >= 2 ? 'critical' : alert.severity,
        title: alert.severity === 'warning' && nextRepeat >= 2 ? `${alert.title} (escalade)` : alert.title,
        message: alert.severity === 'warning' && nextRepeat >= 2 ? `Répétition détectée: ${alert.message}` : alert.message,
      };

      this.lastEmittedAt.set(alert.key, this.now());
      emitted.push(escalated);
    }
    return { alerts: emitted, resolvedKeys: [] };
  }

  reset(key?: string): void {
    if (key) {
      this.lastEmittedAt.delete(key);
      this.repeatCount.delete(key);
      return;
    }
    this.lastEmittedAt.clear();
    this.repeatCount.clear();
  }

  snapshot(): AlertState {
    return { lastEmittedAt: Object.fromEntries(this.lastEmittedAt) };
  }
}
