import type { TxContext } from '@shared/application';
import type { Session } from '../../domain';

export interface SessionRepository {
  create(session: Session, tx?: TxContext): Promise<void>;
  findByTokenHash(refreshTokenHash: string, tx?: TxContext): Promise<Session | null>;
  findById(id: string, tx?: TxContext): Promise<Session | null>;
  /** Marks the old session rotated: revokedAt=now, replacedById=successor. */
  markRotated(sessionId: string, replacedById: string, tx?: TxContext): Promise<void>;
  revoke(sessionId: string, tx?: TxContext): Promise<void>;
  revokeFamily(familyId: string, tx?: TxContext): Promise<void>;
  revokeAllForUser(userId: string, tx?: TxContext): Promise<void>;
}

export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');
