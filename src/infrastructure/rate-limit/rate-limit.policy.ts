export type RateLimitPolicyName =
  'auth-register' | 'auth-login' | 'auth-refresh' | 'sensitive-write';

export interface RateLimitPolicy {
  readonly name: string;
  readonly limit: number;
  readonly windowMs: number;
  readonly identity: 'ip' | 'actor-or-ip' | 'auth-target';
}

export const RATE_LIMIT_POLICIES: Readonly<Record<RateLimitPolicyName, RateLimitPolicy>> = {
  'auth-register': {
    name: 'auth-register',
    limit: 5,
    windowMs: 15 * 60 * 1000,
    identity: 'auth-target',
  },
  'auth-login': {
    name: 'auth-login',
    limit: 10,
    windowMs: 5 * 60 * 1000,
    identity: 'auth-target',
  },
  'auth-refresh': {
    name: 'auth-refresh',
    limit: 30,
    windowMs: 5 * 60 * 1000,
    identity: 'auth-target',
  },
  'sensitive-write': {
    name: 'sensitive-write',
    limit: 20,
    windowMs: 60 * 1000,
    identity: 'actor-or-ip',
  },
};

export const DEFAULT_READ_RATE_LIMIT: RateLimitPolicy = {
  name: 'global-read',
  limit: 180,
  windowMs: 60 * 1000,
  identity: 'ip',
};

export const DEFAULT_WRITE_RATE_LIMIT: RateLimitPolicy = {
  name: 'global-write',
  limit: 60,
  windowMs: 60 * 1000,
  identity: 'actor-or-ip',
};
