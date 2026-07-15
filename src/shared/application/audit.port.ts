import type { TxContext } from './unit-of-work';

/**
 * ADR-0019: append-only audit facade. `write` is the ONLY operation —
 * no update or delete exists anywhere by design. Metadata must never
 * contain raw emails, passwords, tokens, or precise location.
 */
export interface AuditRecord {
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata?: Record<string, unknown>;
  requestId?: string | null;
}

export interface AuditWriter {
  write(record: AuditRecord, tx?: TxContext): Promise<void>;
}

export const AUDIT_WRITER = Symbol('AUDIT_WRITER');
