import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { UnauthorizedError } from '@shared/errors';
import { SuspendedActorError, type Actor } from '../domain';
import { TOKEN_VERIFIER, type TokenVerifier } from '../application/ports/token-verifier.port';
import { ACTOR_DIRECTORY, type ActorDirectory } from '../application/ports/actor-directory.port';
import { REQUIRES_AUTH_KEY, type RequestWithActor } from './auth.decorators';

/**
 * ADR-0017/0018: verifies the JWT statelessly, then loads the actor LIVE —
 * suspension takes effect on the next request, not at token expiry.
 * Registered as a global APP_GUARD; routes opt in via @RequiresAuth().
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_VERIFIER) private readonly tokens: TokenVerifier,
    @Inject(ACTOR_DIRECTORY) private readonly actors: ActorDirectory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiresAuth = this.reflector.getAllAndOverride<boolean>(REQUIRES_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiresAuth) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & RequestWithActor>();
    const token = this.extractBearer(request);
    if (!token) {
      throw new UnauthorizedError('Missing bearer token.');
    }

    const claims = await this.tokens.verify(token);
    if (!claims) {
      throw new UnauthorizedError('Invalid or expired access token.');
    }

    const record = await this.actors.findActor(claims.sub);
    if (!record || record.status === 'deleted') {
      throw new UnauthorizedError('Invalid or expired access token.');
    }
    if (record.status === 'suspended') {
      throw new SuspendedActorError();
    }

    const actor: Actor = { ...record, sessionId: claims.sid };
    request.actor = actor;
    return true;
  }

  private extractBearer(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header) return null;
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
    return token;
  }
}
