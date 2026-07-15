import { Inject, Injectable } from '@nestjs/common';
import {
  AUDIT_WRITER,
  UNIT_OF_WORK,
  type AuditWriter,
  type UnitOfWork,
  type UseCase,
} from '@shared/application';
import {
  InvalidRefreshTokenError,
  Session,
  SessionRevokedError,
  UserSuspendedError,
} from '../../domain';
import { USER_REPOSITORY, type UserRepository } from '../ports/user.repository.port';
import { SESSION_REPOSITORY, type SessionRepository } from '../ports/session.repository.port';
import { TOKEN_SIGNER, type TokenSigner } from '../ports/token-signer.port';
import { AUTH_AUDIT } from '../auth-audit-actions';
import { generateRefreshToken, hashRefreshToken } from '../refresh-token';
import type { AuthTokens } from './login.use-case';

export interface RefreshInput {
  refreshToken: string;
  refreshTtlDays: number;
  requestId?: string | null;
}

@Injectable()
export class RefreshUseCase implements UseCase<RefreshInput, AuthTokens> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(TOKEN_SIGNER) private readonly signer: TokenSigner,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(AUDIT_WRITER) private readonly audit: AuditWriter,
  ) {}

  async execute(input: RefreshInput): Promise<AuthTokens> {
    const presentedHash = hashRefreshToken(input.refreshToken);
    const session = await this.sessions.findByTokenHash(presentedHash);

    if (!session) {
      throw new InvalidRefreshTokenError();
    }

    // Reuse detection (ADR-0017): a rotated/revoked token coming back means
    // someone replayed it. Kill the whole family, atomically with the audit.
    if (session.isRotatedOrRevoked) {
      await this.uow.run(async (tx) => {
        await this.sessions.revokeFamily(session.familyId, tx);
        await this.audit.write(
          {
            actorId: session.userId,
            action: AUTH_AUDIT.reuseDetected,
            resourceType: 'session_family',
            resourceId: session.familyId,
            metadata: { presentedSessionId: session.id },
            requestId: input.requestId ?? null,
          },
          tx,
        );
      });
      throw new SessionRevokedError();
    }

    if (session.isExpiredAt(new Date())) {
      throw new InvalidRefreshTokenError();
    }

    const user = await this.users.findById(session.userId);
    if (!user || user.status === 'deleted') {
      throw new InvalidRefreshTokenError();
    }
    if (user.status === 'suspended') {
      throw new UserSuspendedError();
    }

    const refreshToken = generateRefreshToken();
    const successor = Session.create({
      userId: session.userId,
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + input.refreshTtlDays * 86_400_000),
      familyId: session.familyId,
      deviceLabel: session.deviceLabel,
    });

    await this.uow.run(async (tx) => {
      await this.sessions.create(successor, tx);
      await this.sessions.markRotated(session.id, successor.id, tx);
      await this.audit.write(
        {
          actorId: session.userId,
          action: AUTH_AUDIT.refreshRotated,
          resourceType: 'session',
          resourceId: successor.id,
          metadata: { rotatedFrom: session.id, familyId: session.familyId },
          requestId: input.requestId ?? null,
        },
        tx,
      );
    });

    const accessToken = await this.signer.sign({ sub: user.id, sid: successor.id });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.signer.accessTtlSeconds,
      userId: user.id,
    };
  }
}
