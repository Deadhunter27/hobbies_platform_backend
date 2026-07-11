import { monotonicFactory } from 'ulidx';

/**
 * ADR-0015: all primary keys are ULIDs, generated here in application code
 * — never left to a database default. Monotonic within a process so ids
 * minted in the same millisecond still sort strictly.
 */
export const newId: () => string = monotonicFactory();

export const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/;

export function isValidUlid(value: string): boolean {
  return ULID_REGEX.test(value);
}
