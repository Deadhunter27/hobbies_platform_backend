/**
 * ADR-0017: email uniqueness is case-insensitive, enforced by normalizing
 * before every store and lookup. This is the single normalization point.
 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}
