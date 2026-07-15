import type { TxContext } from '@shared/application';
import type { User } from '../../domain';

export interface UserRepository {
  /** Lookup by already-normalized (lowercase) email. */
  findByEmail(email: string, tx?: TxContext): Promise<User | null>;
  findById(id: string, tx?: TxContext): Promise<User | null>;
  create(user: User, tx?: TxContext): Promise<void>;
  updatePasswordHash(userId: string, passwordHash: string, tx?: TxContext): Promise<void>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
