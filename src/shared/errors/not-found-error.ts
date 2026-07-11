import { AppError } from './app-error';

export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown[], code = 'RESOURCE_NOT_FOUND', cause?: unknown) {
    super(code, message, details, cause);
  }
}
