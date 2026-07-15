import { Inject, Injectable } from '@nestjs/common';
import {
  AUDIT_WRITER,
  UNIT_OF_WORK,
  type AuditWriter,
  type UnitOfWork,
  type UseCase,
} from '@shared/application';
import {
  assertPasswordPolicy,
  EmailAlreadyRegisteredError,
  normalizeEmail,
  User,
} from '../../domain';
import { USER_REPOSITORY, type UserRepository } from '../ports/user.repository.port';
import { PASSWORD_HASHER, type PasswordHasher } from '../ports/password-hasher.port';
import { AUTH_AUDIT } from '../auth-audit-actions';

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  requestId?: string | null;
}

@Injectable()
export class RegisterUseCase implements UseCase<RegisterInput, User> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(AUDIT_WRITER) private readonly audit: AuditWriter,
  ) {}

  async execute(input: RegisterInput): Promise<User> {
    assertPasswordPolicy(input.password);

    const email = normalizeEmail(input.email);
    const existing = await this.users.findByEmail(email);
    if (existing) {
      // Documented enumeration trade-off (ADR-0017).
      throw new EmailAlreadyRegisteredError();
    }

    const passwordHash = await this.hasher.hash(input.password);
    const user = User.create({ email, passwordHash, displayName: input.displayName });

    await this.uow.run(async (tx) => {
      await this.users.create(user, tx);
      await this.audit.write(
        {
          actorId: user.id,
          action: AUTH_AUDIT.register,
          resourceType: 'user',
          resourceId: user.id,
          requestId: input.requestId ?? null,
        },
        tx,
      );
    });

    return user;
  }
}
