import { Inject, Injectable } from '@nestjs/common';
import {
  AUDIT_WRITER,
  UNIT_OF_WORK,
  type AuditWriter,
  type UnitOfWork,
  type UseCase,
} from '@shared/application';
import { assertPasswordPolicy, InvalidCredentialsError } from '../../domain';
import { USER_REPOSITORY, type UserRepository } from '../ports/user.repository.port';
import { SESSION_REPOSITORY, type SessionRepository } from '../ports/session.repository.port';
import { PASSWORD_HASHER, type PasswordHasher } from '../ports/password-hasher.port';
import { AUTH_AUDIT } from '../auth-audit-actions';

export interface ChangePasswordInput {
  actorId: string;
  currentPassword: string;
  newPassword: string;
  requestId?: string | null;
}

/** ADR-0017: credential change revokes ALL of the user's sessions —
 * every device re-authenticates with the new password. */
@Injectable()
export class ChangePasswordUseCase implements UseCase<ChangePasswordInput, void> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(AUDIT_WRITER) private readonly audit: AuditWriter,
  ) {}

  async execute(input: ChangePasswordInput): Promise<void> {
    assertPasswordPolicy(input.newPassword);

    const user = await this.users.findById(input.actorId);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    const currentOk = await this.hasher.verify(user.passwordHash, input.currentPassword);
    if (!currentOk) {
      throw new InvalidCredentialsError();
    }

    const newHash = await this.hasher.hash(input.newPassword);

    await this.uow.run(async (tx) => {
      await this.users.updatePasswordHash(user.id, newHash, tx);
      await this.sessions.revokeAllForUser(user.id, tx);
      await this.audit.write(
        {
          actorId: user.id,
          action: AUTH_AUDIT.passwordChanged,
          resourceType: 'user',
          resourceId: user.id,
          requestId: input.requestId ?? null,
        },
        tx,
      );
    });
  }
}
