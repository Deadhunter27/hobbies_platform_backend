import { AppError } from './app-error';

export class RateLimitExceededError extends AppError {
  constructor(retryAfterMs: number) {
    super('RATE_LIMIT_EXCEEDED', 'Too many requests. Try again later.', [{ retryAfterMs }]);
  }
}
