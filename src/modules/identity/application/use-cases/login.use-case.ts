import { Inject, Injectable } from '@nestjs/common';
import {
  AUDIT_WRITER,
  UNIT_OF_WORK,
  type AuditWriter,
  type UnitOfWork,
  type UseCase,
} from '@shared/application';
import { InvalidCredentialsError, normalizeEmail, Session, UserSuspendedError } from '../../domain';
import { USER_REPOSITORY, type UserRepository } from '../ports/user.repository.port';
import { SESSION_REPOSITORY, type SessionRepository } from '../ports/session.repository.port';
import { PASSWORD_HASHER, type PasswordHasher } from '../ports/password-hasher.port';
import { TOKEN_SIGNER, type TokenSigner } from '../ports/token-signer.port';
import { AUTH_AUDIT } from '../auth-audit-actions';
import { generateRefreshToken, hashEmailForAudit, hashRefreshToken } from '../refresh-token';

export interface LoginInput {
  email: string;
  password: string;
  deviceLabel?: string | null;
  refreshTtlDays: number;
  requestId?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  userId: string;
}

@Injectable()
export class LoginUseCase implements UseCase<LoginInput, AuthTokens> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(TOKEN_SIGNER) private readonly signer: TokenSigner,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(AUDIT_WRITER) private readonly audit: AuditWriter,
  ) {}

  async execute(input: LoginInput): Promise<AuthTokens> {
    const email = normalizeEmail(input.email);
    const user = await this.users.findByEmail(email);

    // Timing safety (ADR-0017): always run one argon2id verification,
    // against a dummy hash when the account does not exist.
    const passwordOk = await this.hasher.verify(
      user?.passwordHash ?? this.hasher.dummyHash,
      input.password,
    );

    if (!user || !passwordOk || user.status === 'deleted') {
      await this.auditFailure(email, input.requestId, 'invalid_credentials');
      throw new InvalidCredentialsError();
    }

    if (user.status === 'suspended') {
      await this.auditFailure(email, input.requestId, 'suspended', user.id);
      throw new UserSuspendedError();
    }

    const refreshToken = generateRefreshToken();
    const session = Session.create({
      userId: user.id,
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + input.refreshTtlDays * 86_400_000),
      deviceLabel: input.deviceLabel ?? null,
    });

    await this.uow.run(async (tx) => {
      await this.sessions.create(session, tx);
      await this.audit.write(
        {
          actorId: user.id,
          action: AUTH_AUDIT.loginSucceeded,
          resourceType: 'session',
          resourceId: session.id,
          requestId: input.requestId ?? null,
        },
        tx,
      );
    });

    const accessToken = await this.signer.sign({ sub: user.id, sid: session.id });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.signer.accessTtlSeconds,
      userId: user.id,
    };
  }

  /** Failed logins are pure observations (no state change) — written
   * standalone, never with the raw email (ADR-0019). */
  private async auditFailure(
    email: string,
    requestId: string | null | undefined,
    reason: string,
    actorId: string | null = null,
  ): Promise<void> {
    await this.audit.write({
      actorId,
      action: AUTH_AUDIT.loginFailed,
      resourceType: 'user',
      resourceId: actorId,
      metadata: { emailHash: hashEmailForAudit(email), reason },
      requestId: requestId ?? null,
    });
  }
}
