import { HttpStatus } from '@nestjs/common';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  DomainRuleViolation,
  InfrastructureError,
} from '@shared/errors';

/**
 * AppError category → HTTP status. The specific `code` on the error itself
 * (e.g. HOBBY_NOT_FOUND) always rides along unchanged; only the category
 * decides the status code (ADR-0009).
 */
export function statusForAppError(error: unknown): number {
  if (error instanceof ValidationError) return HttpStatus.BAD_REQUEST;
  if (error instanceof NotFoundError) return HttpStatus.NOT_FOUND;
  if (error instanceof ConflictError) return HttpStatus.CONFLICT;
  if (error instanceof UnauthorizedError) return HttpStatus.UNAUTHORIZED;
  if (error instanceof ForbiddenError) return HttpStatus.FORBIDDEN;
  if (error instanceof DomainRuleViolation) return HttpStatus.UNPROCESSABLE_ENTITY;
  if (error instanceof InfrastructureError) return HttpStatus.INTERNAL_SERVER_ERROR;
  return HttpStatus.INTERNAL_SERVER_ERROR;
}
