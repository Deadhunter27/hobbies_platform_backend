import { ConflictError, ForbiddenError, UnauthorizedError, ValidationError } from '@shared/errors';
import { PASSWORD_MIN_LENGTH } from './constants';

export class EmailAlreadyRegisteredError extends ConflictError {
  constructor() {
    super('This email address is already registered.', undefined, 'EMAIL_ALREADY_REGISTERED');
  }
}

export class InvalidCredentialsError extends UnauthorizedError {
  constructor() {
    // Deliberately identical for wrong password and unknown email (ADR-0017).
    super('Invalid email or password.', undefined, 'INVALID_CREDENTIALS');
  }
}

export class InvalidRefreshTokenError extends UnauthorizedError {
  constructor() {
    super('The refresh token is invalid or expired.', undefined, 'INVALID_REFRESH_TOKEN');
  }
}

export class SessionRevokedError extends UnauthorizedError {
  constructor() {
    super('This session has been revoked.', undefined, 'SESSION_REVOKED');
  }
}

export class UserSuspendedError extends ForbiddenError {
  constructor() {
    super('This account is suspended.', undefined, 'USER_SUSPENDED');
  }
}

export class PasswordTooWeakError extends ValidationError {
  constructor() {
    super(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
      undefined,
      'PASSWORD_TOO_WEAK',
    );
  }
}
