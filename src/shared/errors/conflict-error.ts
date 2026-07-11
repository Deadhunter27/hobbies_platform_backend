import { AppError } from './app-error';

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown[], code = 'CONFLICT', cause?: unknown) {
    super(code, message, details, cause);
  }
}
