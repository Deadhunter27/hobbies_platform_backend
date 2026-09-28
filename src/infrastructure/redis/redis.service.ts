import { Inject, Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { createClient } from 'redis';
import { APP_CONFIG, type AppConfig } from '@config/index';
import { InfrastructureError } from '@shared/errors';

const RATE_LIMIT_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return { current, ttl }
`;

export interface RateLimitCounter {
  readonly count: number;
  readonly retryAfterMs: number;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: ReturnType<typeof createClient>;
  private connectPromise: Promise<void> | null = null;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.client = createClient({ url: config.redisUrl });
    this.client.on('error', (error: Error) => {
      this.logger.warn(`Redis client error: ${error.message}`);
    });
  }

  async ping(): Promise<void> {
    await this.execute(async () => {
      const reply = await this.client.ping();
      if (reply !== 'PONG') {
        throw new Error(`Unexpected Redis PING response: ${reply}`);
      }
    });
  }

  async consumeRateLimit(key: string, windowMs: number): Promise<RateLimitCounter> {
    return this.execute(async () => {
      const result = await this.client.eval(RATE_LIMIT_SCRIPT, {
        keys: [key],
        arguments: [String(windowMs)],
      });

      if (!Array.isArray(result) || result.length !== 2) {
        throw new Error('Unexpected Redis rate-limit response.');
      }

      const count = Number(result[0]);
      const ttl = Number(result[1]);
      if (!Number.isFinite(count) || !Number.isFinite(ttl)) {
        throw new Error('Invalid Redis rate-limit response.');
      }

      return {
        count,
        retryAfterMs: Math.max(1, ttl),
      };
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      await this.ensureConnected();
      return await operation();
    } catch (cause) {
      throw new InfrastructureError(
        'Redis is unavailable.',
        undefined,
        'REDIS_UNAVAILABLE',
        cause,
      );
    }
  }

  private async ensureConnected(): Promise<void> {
    if (this.client.isReady) return;

    if (!this.client.isOpen) {
      if (!this.connectPromise) {
        this.connectPromise = this.client
          .connect()
          .then(() => undefined)
          .finally(() => {
            this.connectPromise = null;
          });
      }
      await this.connectPromise;
    }
  }
}
