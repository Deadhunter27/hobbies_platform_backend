import { randomUUID } from 'node:crypto';
import { loadConfig } from '../../src/config/configuration';
import { RedisService } from '../../src/infrastructure/redis';

describe('Redis rate-limit integration', () => {
  const redis = new RedisService(loadConfig(process.env));

  afterAll(async () => {
    await redis.onModuleDestroy();
  });

  it('pings Redis and atomically increments one expiring window', async () => {
    await expect(redis.ping()).resolves.toBeUndefined();

    const key = `test:rate-limit:${randomUUID()}`;
    const first = await redis.consumeRateLimit(key, 10_000);
    const second = await redis.consumeRateLimit(key, 10_000);

    expect(first.count).toBe(1);
    expect(second.count).toBe(2);
    expect(first.retryAfterMs).toBeGreaterThan(0);
    expect(first.retryAfterMs).toBeLessThanOrEqual(10_000);
    expect(second.retryAfterMs).toBeGreaterThan(0);
    expect(second.retryAfterMs).toBeLessThanOrEqual(first.retryAfterMs);
  });
});
