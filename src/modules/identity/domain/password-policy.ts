import { PasswordTooWeakError } from './errors';
import { PASSWORD_MIN_LENGTH } from './constants';

export { PASSWORD_MIN_LENGTH };

export function assertPasswordPolicy(plain: string): void {
  if (plain.length < PASSWORD_MIN_LENGTH) {
    throw new PasswordTooWeakError();
  }
}
