import { createHash } from 'node:crypto';
import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { RedisService } from '@infra/redis';
import type { RequestWithActor } from '@modules/access';
import { RateLimitExceededError } from '@shared/errors';
import { RATE_LIMIT_POLICY_KEY } from './rate-limit.decorator';
import {
  DEFAULT_READ_RATE_LIMIT,
  DEFAULT_WRITE_RATE_LIMIT,
  RATE_LIMIT_POLICIES,
  type RateLimitPolicy,
  type RateLimitPolicyName,
} from './rate-limit.policy';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

type RateLimitedRequest = Request & RequestWithActor;

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest<RateLimitedRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    if (request.method === 'OPTIONS' || request.path.startsWith('/health/')) {
      return true;
    }

    const globalPolicy = MUTATION_METHODS.has(request.method)
      ? DEFAULT_WRITE_RATE_LIMIT
      : DEFAULT_READ_RATE_LIMIT;
    await this.enforce(request, response, globalPolicy);

    const configured = this.reflector.getAllAndOverride<RateLimitPolicyName>(
      RATE_LIMIT_POLICY_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (configured) {
      await this.enforce(request, response, RATE_LIMIT_POLICIES[configured]);
    }

    return true;
  }

  private async enforce(
    request: RateLimitedRequest,
    response: Response,
    policy: RateLimitPolicy,
  ): Promise<void> {
    const identity = this.identityFor(request, policy);
    const key = `wayfinder:rate-limit:${policy.name}:${this.hash(identity)}`;
    const counter = await this.redis.consumeRateLimit(key, policy.windowMs);
    const remaining = Math.max(0, policy.limit - counter.count);

    response.setHeader('RateLimit-Limit', String(policy.limit));
    response.setHeader('RateLimit-Remaining', String(remaining));
    response.setHeader('RateLimit-Reset', String(Math.ceil(counter.retryAfterMs / 1000)));

    if (counter.count > policy.limit) {
      response.setHeader('Retry-After', String(Math.ceil(counter.retryAfterMs / 1000)));
      throw new RateLimitExceededError(counter.retryAfterMs);
    }
  }

  private identityFor(request: RateLimitedRequest, policy: RateLimitPolicy): string {
    if (policy.identity === 'actor-or-ip' && request.actor) {
      return `actor:${request.actor.id}`;
    }

    if (policy.identity === 'auth-target') {
      const body = this.bodyOf(request);
      if ((policy.name === 'auth-register' || policy.name === 'auth-login') && body.email) {
        return `auth-email:${body.email.trim().toLowerCase()}`;
      }
      if (policy.name === 'auth-refresh' && body.refreshToken) {
        return `auth-refresh:${body.refreshToken}`;
      }
    }

    return `ip:${request.ip ?? request.socket.remoteAddress ?? 'unknown'}`;
  }

  private bodyOf(request: Request): { email?: string; refreshToken?: string } {
    if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body)) return {};
    const body = request.body as Record<string, unknown>;
    return {
      email: typeof body.email === 'string' ? body.email : undefined,
      refreshToken: typeof body.refreshToken === 'string' ? body.refreshToken : undefined,
    };
  }

  private hash(identity: string): string {
    return createHash('sha256').update(identity).digest('hex').slice(0, 32);
  }
}
