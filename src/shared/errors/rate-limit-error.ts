import { AppError } from './app-error';

export class RateLimitError extends AppError {
  constructor(retryAfterSeconds: number) {
    super(
      'RATE_LIMITED',
      'Too many requests. Please try again later.',
      [{ retryAfterSeconds }],
    );
  }
}
