import { AppError } from './app-error';

export class InfrastructureError extends AppError {
  constructor(
    message: string,
    details?: unknown[],
    code = 'INFRASTRUCTURE_ERROR',
    cause?: unknown,
  ) {
    super(code, message, details, cause);
  }
}
