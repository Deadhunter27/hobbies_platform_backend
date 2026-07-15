import { createHash, randomBytes } from 'node:crypto';

/** ADR-0017: 256-bit random opaque refresh token, stored only as SHA-256. */
export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** SHA-256 of the normalized email — audit metadata never carries raw
 * emails (ADR-0019 privacy rules). */
export function hashEmailForAudit(normalizedEmail: string): string {
  return createHash('sha256').update(normalizedEmail, 'utf8').digest('hex');
}
