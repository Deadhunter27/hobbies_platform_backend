import { AppError } from './app-error';

export class UnauthorizedError extends AppError {
  constructor(message: string, details?: unknown[], code = 'UNAUTHORIZED', cause?: unknown) {
    super(code, message, details, cause);
  }
}
