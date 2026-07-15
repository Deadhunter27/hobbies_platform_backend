import { Inject, Injectable } from '@nestjs/common';
import {
  AUDIT_WRITER,
  UNIT_OF_WORK,
  type AuditWriter,
  type UnitOfWork,
  type UseCase,
} from '@shared/application';
import { SESSION_REPOSITORY, type SessionRepository } from '../ports/session.repository.port';
import { AUTH_AUDIT } from '../auth-audit-actions';

export interface LogoutInput {
  actorId: string;
  sessionId: string;
  requestId?: string | null;
}

/** Revokes the presenting session (from the access token's sid). Idempotent:
 * logging out an already-revoked session is a no-op, not an error. */
@Injectable()
export class LogoutUseCase implements UseCase<LogoutInput, void> {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(AUDIT_WRITER) private readonly audit: AuditWriter,
  ) {}

  async execute(input: LogoutInput): Promise<void> {
    const session = await this.sessions.findById(input.sessionId);
    if (!session || session.userId !== input.actorId || session.isRotatedOrRevoked) {
      return;
    }

    await this.uow.run(async (tx) => {
      await this.sessions.revoke(session.id, tx);
      await this.audit.write(
        {
          actorId: input.actorId,
          action: AUTH_AUDIT.logout,
          resourceType: 'session',
          resourceId: session.id,
          requestId: input.requestId ?? null,
        },
        tx,
      );
    });
  }
}
