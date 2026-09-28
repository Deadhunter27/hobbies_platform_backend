import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import type { RedisService } from '@infra/redis';
import { InfrastructureError, RateLimitExceededError } from '@shared/errors';
import { RateLimitGuard } from './rate-limit.guard';

function contextFor(overrides: Partial<Request> = {}): {
  context: ExecutionContext;
  response: Pick<Response, 'setHeader'>;
} {
  const request = {
    method: 'POST',
    path: '/api/v1/auth/login',
    ip: '203.0.113.10',
    socket: { remoteAddress: '127.0.0.1' },
    body: { email: 'User@Example.com' },
    ...overrides,
  } as unknown as Request;
  const response = { setHeader: jest.fn() } as unknown as Pick<Response, 'setHeader'>;
  const context = {
    getType: () => 'http',
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;

  return { context, response };
}

describe('RateLimitGuard', () => {
  it('enforces global write then stricter auth-target policy and returns stable 429 error', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue('auth-login'),
    } as unknown as Reflector;
    const redis = {
      consumeRateLimit: jest
        .fn()
        .mockResolvedValueOnce({ count: 1, retryAfterMs: 60_000 })
        .mockResolvedValueOnce({ count: 11, retryAfterMs: 120_000 }),
    } as unknown as RedisService;
    const guard = new RateLimitGuard(reflector, redis);
    const { context, response } = contextFor();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(RateLimitExceededError);
    expect(redis.consumeRateLimit).toHaveBeenCalledTimes(2);
    expect(redis.consumeRateLimit).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('wayfinder:rate-limit:global-write:'),
      60_000,
    );
    expect(redis.consumeRateLimit).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('wayfinder:rate-limit:auth-login:'),
      300_000,
    );
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '120');
  });

  it('does not silently fail open when Redis is unavailable', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const unavailable = new InfrastructureError(
      'Redis is unavailable.',
      undefined,
      'REDIS_UNAVAILABLE',
    );
    const redis = {
      consumeRateLimit: jest.fn().mockRejectedValue(unavailable),
    } as unknown as RedisService;
    const guard = new RateLimitGuard(reflector, redis);
    const { context } = contextFor({ method: 'GET', path: '/api/v1/hobbies' } as Partial<Request>);

    await expect(guard.canActivate(context)).rejects.toBe(unavailable);
  });

  it('skips infrastructure health endpoints so readiness can report dependency state itself', async () => {
    const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
    const redis = { consumeRateLimit: jest.fn() } as unknown as RedisService;
    const guard = new RateLimitGuard(reflector, redis);
    const { context } = contextFor({ method: 'GET', path: '/health/ready' } as Partial<Request>);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(redis.consumeRateLimit).not.toHaveBeenCalled();
  });
});
