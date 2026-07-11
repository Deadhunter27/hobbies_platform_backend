import { ValidationError } from './validation-error';

/**
 * Thrown whenever an opaque pagination cursor fails to decode or fails its
 * shape validation (tampered, malformed, or minted under a different sort).
 */
export class InvalidCursorError extends ValidationError {
  constructor(message = 'The provided cursor is invalid.', details?: unknown[]) {
    super(message, details, 'INVALID_CURSOR');
  }
}
