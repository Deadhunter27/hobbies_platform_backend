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

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest<Request & RequestWithActor>();
    const response = context.switchToHttp().getResponse<Response>();

    if (request.method === 'OPTIONS' || request.path.startsWith('/health/')) {
      return true;
    }

    const policy = this.resolvePolicy(context, request.method);
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

    return true;
  }

  private resolvePolicy(context: ExecutionContext, method: string): RateLimitPolicy {
    const configured = this.reflector.getAllAndOverride<RateLimitPolicyName>(RATE_LIMIT_POLICY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (configured) return RATE_LIMIT_POLICIES[configured];
    return MUTATION_METHODS.has(method) ? DEFAULT_WRITE_RATE_LIMIT : DEFAULT_READ_RATE_LIMIT;
  }

  private identityFor(request: Request & RequestWithActor, policy: RateLimitPolicy): string {
    if (policy.identity === 'actor-or-ip' && request.actor) {
      return `actor:${request.actor.id}`;
    }

    return `ip:${request.ip ?? request.socket.remoteAddress ?? 'unknown'}`;
  }

  private hash(identity: string): string {
    return createHash('sha256').update(identity).digest('hex').slice(0, 32);
  }
}
