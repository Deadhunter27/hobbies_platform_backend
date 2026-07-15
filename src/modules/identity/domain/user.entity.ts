import { Entity } from '@shared/domain';
import { newId } from '@shared/utils';
import type { GlobalRole, UserStatus } from './enums';
import { normalizeEmail } from './email';

export interface UserProps {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  status: UserStatus;
  globalRole: GlobalRole;
  createdAt: Date;
  updatedAt: Date;
}

export class User extends Entity {
  private constructor(private readonly props: UserProps) {
    super(props.id);
  }

  /** New registration. Email is normalized here (ADR-0017); the caller
   * supplies an already-computed argon2id hash — never a plaintext. */
  static create(input: { email: string; passwordHash: string; displayName: string }): User {
    const now = new Date();
    return new User({
      id: newId(),
      email: normalizeEmail(input.email),
      passwordHash: input.passwordHash,
      displayName: input.displayName,
      status: 'active',
      globalRole: 'user',
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: UserProps): User {
    return new User(props);
  }

  get email(): string {
    return this.props.email;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get displayName(): string {
    return this.props.displayName;
  }

  get status(): UserStatus {
    return this.props.status;
  }

  get globalRole(): GlobalRole {
    return this.props.globalRole;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get isActive(): boolean {
    return this.props.status === 'active';
  }
}
