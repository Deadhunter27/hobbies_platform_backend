import { assertPasswordPolicy, PASSWORD_MIN_LENGTH } from './password-policy';
import { PasswordTooWeakError } from './errors';

describe('password policy', () => {
  it('documents the minimum length as 8', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
  });

  it('rejects passwords shorter than the minimum with PASSWORD_TOO_WEAK', () => {
    expect(() => assertPasswordPolicy('1234567')).toThrow(PasswordTooWeakError);
    try {
      assertPasswordPolicy('short');
    } catch (error) {
      expect((error as PasswordTooWeakError).code).toBe('PASSWORD_TOO_WEAK');
    }
  });

  it('accepts passwords at exactly the minimum length', () => {
    expect(() => assertPasswordPolicy('12345678')).not.toThrow();
  });
});
