import { Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { RedisService } from '@infra/redis';
import { InfrastructureError } from '@shared/errors';

const INCREMENT_FIXED_WINDOW_SCRIPT = `
local hits = redis.call('INCR', KEYS[1])
if hits == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return { hits, ttl }
`;

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    _blockDuration: number,
    throttlerName: string,
  ) {
    try {
      const response = await this.redis.eval(
        INCREMENT_FIXED_WINDOW_SCRIPT,
        [`rate:${throttlerName}:${key}`],
        [String(ttl)],
      );

      if (!Array.isArray(response) || response.length !== 2) {
        throw new Error('Unexpected Redis rate-limit response.');
      }

      const totalHits = Number(response[0]);
      const ttlMs = Math.max(0, Number(response[1]));
      if (!Number.isFinite(totalHits) || !Number.isFinite(ttlMs)) {
        throw new Error('Invalid Redis rate-limit response.');
      }

      const timeToExpire = Math.max(1, Math.ceil(ttlMs / 1000));
      const isBlocked = totalHits > limit;

      return {
        totalHits,
        timeToExpire,
        isBlocked,
        timeToBlockExpire: isBlocked ? timeToExpire : 0,
      };
    } catch (error) {
      throw new InfrastructureError(
        'Rate limit storage is unavailable.',
        undefined,
        'RATE_LIMIT_STORAGE_UNAVAILABLE',
        error,
      );
    }
  }
}
