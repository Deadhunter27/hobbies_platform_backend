import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import type { TokenVerifier, VerifiedTokenClaims } from '../application/ports/token-verifier.port';
import type { ActorDirectory, ActorRecord } from '../application/ports/actor-directory.port';
import { UnauthorizedError } from '@shared/errors';

const USER_ID = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
const SESSION_ID = '01ARZ3NDEKTSV4RRFFQ69G5FAW';

class FakeVerifier implements TokenVerifier {
  constructor(private readonly result: VerifiedTokenClaims | null) {}
  seen: string[] = [];
  async verify(token: string): Promise<VerifiedTokenClaims | null> {
    this.seen.push(token);
    return this.result;
  }
}

class FakeDirectory implements ActorDirectory {
  constructor(private readonly record: ActorRecord | null) {}
  async findActor(): Promise<ActorRecord | null> {
    return this.record;
  }
}

function makeContext(options: { requiresAuth: boolean; authorization?: string }): {
  context: ExecutionContext;
  reflector: Reflector;
  request: { headers: Record<string, string>; actor?: unknown };
} {
  const request: { headers: Record<string, string>; actor?: unknown } = {
    headers: options.authorization ? { authorization: options.authorization } : {},
  };
  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  const reflector = {
    getAllAndOverride: () => options.requiresAuth,
  } as unknown as Reflector;
  return { context, reflector, request };
}

function activeActor(overrides: Partial<ActorRecord> = {}): ActorRecord {
  return {
    id: USER_ID,
    email: 'a@b.co',
    displayName: 'A',
    status: 'active',
    globalRole: 'user',
    ...overrides,
  };
}

describe('AuthGuard', () => {
  it('passes routes without @RequiresAuth straight through, never touching the verifier', async () => {
    const verifier = new FakeVerifier(null);
    const { context, reflector } = makeContext({ requiresAuth: false });
    const guard = new AuthGuard(reflector, verifier, new FakeDirectory(null));

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verifier.seen).toHaveLength(0);
  });

  it('rejects a protected route without a bearer token: 401 UNAUTHORIZED', async () => {
    const { context, reflector } = makeContext({ requiresAuth: true });
    const guard = new AuthGuard(reflector, new FakeVerifier(null), new FakeDirectory(null));

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedError);
  });

  it('rejects an invalid/expired token: 401 UNAUTHORIZED', async () => {
    const { context, reflector } = makeContext({
      requiresAuth: true,
      authorization: 'Bearer bad-token',
    });
    const guard = new AuthGuard(
      reflector,
      new FakeVerifier(null),
      new FakeDirectory(activeActor()),
    );

    await expect(guard.canActivate(context)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('rejects a valid token whose user is suspended: 403 USER_SUSPENDED', async () => {
    const { context, reflector } = makeContext({ requiresAuth: true, authorization: 'Bearer t' });
    const guard = new AuthGuard(
      reflector,
      new FakeVerifier({ sub: USER_ID, sid: SESSION_ID }),
      new FakeDirectory(activeActor({ status: 'suspended' })),
    );

    await expect(guard.canActivate(context)).rejects.toMatchObject({ code: 'USER_SUSPENDED' });
  });

  it('rejects a valid token whose user is deleted or missing: 401', async () => {
    const { context, reflector } = makeContext({ requiresAuth: true, authorization: 'Bearer t' });
    const deleted = new AuthGuard(
      reflector,
      new FakeVerifier({ sub: USER_ID, sid: SESSION_ID }),
      new FakeDirectory(activeActor({ status: 'deleted' })),
    );
    const missing = new AuthGuard(
      reflector,
      new FakeVerifier({ sub: USER_ID, sid: SESSION_ID }),
      new FakeDirectory(null),
    );

    await expect(deleted.canActivate(context)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(missing.canActivate(context)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('attaches the live actor (with sid) to the request on success', async () => {
    const { context, reflector, request } = makeContext({
      requiresAuth: true,
      authorization: 'Bearer good',
    });
    const guard = new AuthGuard(
      reflector,
      new FakeVerifier({ sub: USER_ID, sid: SESSION_ID }),
      new FakeDirectory(activeActor()),
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.actor).toEqual(expect.objectContaining({ id: USER_ID, sessionId: SESSION_ID }));
  });

  it('rejects non-bearer authorization schemes', async () => {
    const { context, reflector } = makeContext({
      requiresAuth: true,
      authorization: 'Basic dXNlcjpwYXNz',
    });
    const guard = new AuthGuard(
      reflector,
      new FakeVerifier({ sub: USER_ID, sid: SESSION_ID }),
      new FakeDirectory(activeActor()),
    );

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedError);
  });
});
