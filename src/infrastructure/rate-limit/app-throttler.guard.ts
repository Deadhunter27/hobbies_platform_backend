import { Injectable, type ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler';
import { RateLimitError } from '@shared/errors';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async throwThrottlingException(
    _context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new RateLimitError(Math.max(1, detail.timeToBlockExpire));
  }
}
