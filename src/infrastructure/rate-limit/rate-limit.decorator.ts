import { SetMetadata, type CustomDecorator } from '@nestjs/common';
import type { RateLimitPolicyName } from './rate-limit.policy';

export const RATE_LIMIT_POLICY_KEY = 'rate-limit:policy';

export function RateLimit(policy: RateLimitPolicyName): CustomDecorator<string> {
  return SetMetadata(RATE_LIMIT_POLICY_KEY, policy);
}
