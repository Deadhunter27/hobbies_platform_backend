import type { AuditRecord, AuditWriter, TxContext, UnitOfWork } from '@shared/application';
import { Session, User, type SessionProps, type UserProps } from '../../../domain';
import type { UserRepository } from '../../ports/user.repository.port';
import type { SessionRepository } from '../../ports/session.repository.port';
import type { PasswordHasher } from '../../ports/password-hasher.port';
import type { AccessTokenClaims, TokenSigner } from '../../ports/token-signer.port';

const FAKE_TX = {} as TxContext;

export class FakeUnitOfWork implements UnitOfWork {
  runs = 0;
  async run<T>(fn: (tx: TxContext) => Promise<T>): Promise<T> {
    this.runs += 1;
    return fn(FAKE_TX);
  }
}

export class RecordingAuditWriter implements AuditWriter {
  records: Array<AuditRecord & { inTx: boolean }> = [];
  async write(record: AuditRecord, tx?: TxContext): Promise<void> {
    this.records.push({ ...record, inTx: tx !== undefined });
  }
  actions(): string[] {
    return this.records.map((r) => r.action);
  }
}

export class InMemoryUserRepository implements UserRepository {
  private rows = new Map<string, UserProps>();

  seed(user: User): void {
    this.rows.set(user.id, this.toProps(user));
  }

  async findByEmail(email: string): Promise<User | null> {
    const found = [...this.rows.values()].find((row) => row.email === email);
    return found ? User.reconstitute({ ...found }) : null;
  }

  async findById(id: string): Promise<User | null> {
    const found = this.rows.get(id);
    return found ? User.reconstitute({ ...found }) : null;
  }

  async create(user: User): Promise<void> {
    this.rows.set(user.id, this.toProps(user));
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    const row = this.rows.get(userId);
    if (row) row.passwordHash = passwordHash;
  }

  setStatus(userId: string, status: UserProps['status']): void {
    const row = this.rows.get(userId);
    if (row) row.status = status;
  }

  private toProps(user: User): UserProps {
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      displayName: user.displayName,
      status: user.status,
      globalRole: user.globalRole,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export class InMemorySessionRepository implements SessionRepository {
  private rows = new Map<string, SessionProps>();

  async create(session: Session): Promise<void> {
    this.rows.set(session.id, {
      id: session.id,
      userId: session.userId,
      refreshTokenHash: session.refreshTokenHash,
      familyId: session.familyId,
      deviceLabel: session.deviceLabel,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      replacedById: session.replacedById,
      createdAt: session.createdAt,
    });
  }

  async findByTokenHash(refreshTokenHash: string): Promise<Session | null> {
    const found = [...this.rows.values()].find((r) => r.refreshTokenHash === refreshTokenHash);
    return found ? Session.reconstitute({ ...found }) : null;
  }

  async findById(id: string): Promise<Session | null> {
    const found = this.rows.get(id);
    return found ? Session.reconstitute({ ...found }) : null;
  }

  async markRotated(sessionId: string, replacedById: string): Promise<void> {
    const row = this.rows.get(sessionId);
    if (row) {
      row.revokedAt = new Date();
      row.replacedById = replacedById;
    }
  }

  async revoke(sessionId: string): Promise<void> {
    const row = this.rows.get(sessionId);
    if (row && row.revokedAt === null) row.revokedAt = new Date();
  }

  async revokeFamily(familyId: string): Promise<void> {
    for (const row of this.rows.values()) {
      if (row.familyId === familyId && row.revokedAt === null) row.revokedAt = new Date();
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    for (const row of this.rows.values()) {
      if (row.userId === userId && row.revokedAt === null) row.revokedAt = new Date();
    }
  }

  all(): SessionProps[] {
    return [...this.rows.values()].map((r) => ({ ...r }));
  }

  forceExpire(sessionId: string): void {
    const row = this.rows.get(sessionId);
    if (row) row.expiresAt = new Date(0);
  }
}

/** Deterministic fake: hash(x) = `hashed:x`, verify by string compare.
 * Records every verify target so timing-safety tests can prove the dummy
 * hash was exercised for unknown emails. */
export class FakePasswordHasher implements PasswordHasher {
  readonly dummyHash = 'hashed:__dummy__';
  verifiedAgainst: string[] = [];

  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    this.verifiedAgainst.push(hash);
    return hash === `hashed:${plain}`;
  }
}

export class FakeTokenSigner implements TokenSigner {
  readonly accessTtlSeconds = 900;
  async sign(claims: AccessTokenClaims): Promise<string> {
    return `jwt:${claims.sub}:${claims.sid}`;
  }
}
