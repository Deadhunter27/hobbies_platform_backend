import { InfrastructureError } from '@shared/errors';
import type { RedisService } from '@infra/redis';
import { RedisThrottlerStorage } from './redis-throttler.storage';

function setup(response: unknown = [1, 60_000]) {
  const redis = {
    eval: jest.fn().mockResolvedValue(response),
  } as unknown as RedisService;
  return { redis, storage: new RedisThrottlerStorage(redis) };
}

describe('RedisThrottlerStorage', () => {
  it('returns an allowed fixed-window record below the limit', async () => {
    const { redis, storage } = setup([2, 45_001]);

    await expect(storage.increment('client', 60_000, 3, 0, 'default')).resolves.toEqual({
      totalHits: 2,
      timeToExpire: 46,
      isBlocked: false,
      timeToBlockExpire: 0,
    });

    expect(redis.eval).toHaveBeenCalledWith(expect.any(String), ['rate:default:client'], ['60000']);
  });

  it('blocks after the configured limit and returns the remaining window', async () => {
    const { storage } = setup([4, 20_001]);

    await expect(storage.increment('client', 60_000, 3, 0, 'default')).resolves.toEqual({
      totalHits: 4,
      timeToExpire: 21,
      isBlocked: true,
      timeToBlockExpire: 21,
    });
  });

  it('fails closed when Redis storage is unavailable', async () => {
    const cause = new Error('connection lost');
    const redis = {
      eval: jest.fn().mockRejectedValue(cause),
    } as unknown as RedisService;
    const storage = new RedisThrottlerStorage(redis);

    await expect(storage.increment('client', 60_000, 3, 0, 'default')).rejects.toMatchObject<
      Partial<InfrastructureError>
    >({
      code: 'RATE_LIMIT_STORAGE_UNAVAILABLE',
      message: 'Rate limit storage is unavailable.',
      cause,
    });
  });
});
