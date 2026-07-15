export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(hash: string, plain: string): Promise<boolean>;
  /**
   * A real argon2id hash of an unguessable throwaway value. Login verifies
   * against this when the email is unknown so response timing cannot
   * distinguish "no such user" from "wrong password" (ADR-0017).
   */
  readonly dummyHash: string;
}

export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
