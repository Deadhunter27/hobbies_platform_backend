import { ForbiddenError } from '@shared/errors';

/** The authenticated principal as the policy layer sees it. Status and
 * role are loaded live per request — never from token claims (ADR-0017). */
export interface Actor {
  id: string;
  email: string;
  displayName: string;
  status: 'active' | 'suspended' | 'deleted';
  globalRole: 'user' | 'staff';
  /** Session the presented access token belongs to (JWT sid claim). */
  sessionId: string;
}

/** Platform-wide scope convention (ADR-0018). */
export const PLATFORM_RESOURCE = { type: 'platform', id: 'platform' } as const;

export interface ResourceRef {
  type: string;
  id: string;
}

export type PolicyDecision = { allow: true } | { allow: false; reason: string };

export const allow: PolicyDecision = { allow: true };

export function deny(reason: string): PolicyDecision {
  return { allow: false, reason };
}

/** 403 USER_SUSPENDED — thrown by the guard for suspended actors. Defined
 * here (not imported from identity) so access depends on no other module. */
export class SuspendedActorError extends ForbiddenError {
  constructor() {
    super('This account is suspended.', undefined, 'USER_SUSPENDED');
  }
}
