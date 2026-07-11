import { AppError } from './app-error';

export class ForbiddenError extends AppError {
  constructor(message: string, details?: unknown[], code = 'FORBIDDEN', cause?: unknown) {
    super(code, message, details, cause);
  }
}
