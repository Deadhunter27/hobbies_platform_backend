import { AppError } from './app-error';

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown[], code = 'VALIDATION_FAILED', cause?: unknown) {
    super(code, message, details, cause);
  }
}
