export type AuditStatus = 'success' | 'failure' | 'pending';

export interface AuditEntry {
  readonly timestamp: string;
  readonly action: string;
  readonly actor?: string;
  readonly resource?: string;
  readonly status: AuditStatus;
  readonly metadata?: Record<string, unknown>;
}

export class AuditLogger {
  private readonly entries: AuditEntry[] = [];

  constructor(private readonly namespace: string) {}

  log(input: Omit<AuditEntry, 'timestamp'>): AuditEntry {
    const entry: AuditEntry = {
      ...input,
      timestamp: new Date().toISOString(),
    };
    this.entries.push(entry);
    return entry;
  }

  snapshot(): readonly AuditEntry[] {
    return [...this.entries];
  }

  reset(): void {
    this.entries.length = 0;
  }

  get scope(): string {
    return this.namespace;
  }
}

export function createAuditLogger(namespace = 'default'): AuditLogger {
  return new AuditLogger(namespace);
}

export function exportAuditLog(entries: readonly AuditEntry[], format: 'json' | 'csv' = 'json'): string {
  if (format === 'csv') {
    const rows = [
      ['timestamp', 'action', 'actor', 'resource', 'status', 'metadata'],
      ...entries.map((entry) => [
        entry.timestamp,
        entry.action,
        entry.actor ?? '',
        entry.resource ?? '',
        entry.status,
        JSON.stringify(entry.metadata ?? {}),
      ]),
    ];

    return rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  return JSON.stringify(entries, null, 2);
}
