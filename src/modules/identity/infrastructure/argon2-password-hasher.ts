import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/**
 * ADR-0017: argon2id with library defaults (m=65536 KiB, t=3, p=4).
 * dummyHash is a real argon2id hash of a discarded random value so that
 * verifying against it costs the same as a genuine verification.
 */
@Injectable()
export class Argon2PasswordHasher {
  readonly dummyHash =
    '$argon2id$v=19$m=65536,t=3,p=4$LIBYVRi28QrflWJ6otWxFw$kSnsE7wUvFTsmCmYAdzs8h8SBPw9PK7y3VEWnZ4a4DA';

  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      // Malformed hash (should never happen with our own data) — treat as
      // verification failure rather than a 500.
      return false;
    }
  }
}
