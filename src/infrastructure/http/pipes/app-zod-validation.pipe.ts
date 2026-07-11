import { createZodValidationPipe } from 'nestjs-zod';
import { ZodError } from 'zod';
import { ValidationError } from '@shared/errors';

/**
 * Turns nestjs-zod's own ZodError into our AppError hierarchy so the global
 * exception filter — not nestjs-zod's default BadRequestException shape —
 * is the single place that decides the response envelope (ADR-0009).
 */
function toValidationError(error: unknown): Error {
  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    return new ValidationError('Request validation failed.', details);
  }
  return new ValidationError('Request validation failed.');
}

export const AppZodValidationPipe = createZodValidationPipe({
  createValidationException: toValidationError,
});
