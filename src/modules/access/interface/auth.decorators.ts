import {
  createParamDecorator,
  SetMetadata,
  type CustomDecorator,
  type ExecutionContext,
} from '@nestjs/common';
import type { Actor } from '../domain';

export const REQUIRES_AUTH_KEY = 'access:requires_auth';

/** Opt-in route protection (ADR-0018: the public catalog API predates
 * authentication; can() itself stays default-deny). */
export function RequiresAuth(): CustomDecorator<string> {
  return SetMetadata(REQUIRES_AUTH_KEY, true);
}

export interface RequestWithActor {
  actor?: Actor;
}

/** The authenticated actor attached by AuthGuard. Only meaningful on
 * routes marked @RequiresAuth(). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Actor => {
    const request = context.switchToHttp().getRequest<RequestWithActor>();
    if (!request.actor) {
      throw new Error(
        'CurrentUser used on a route without @RequiresAuth() — actor was never attached.',
      );
    }
    return request.actor;
  },
);
