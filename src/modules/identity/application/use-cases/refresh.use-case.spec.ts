import { LoginUseCase } from './login.use-case';
import { RefreshUseCase } from './refresh.use-case';
import {
  FakePasswordHasher,
  FakeTokenSigner,
  FakeUnitOfWork,
  InMemorySessionRepository,
  InMemoryUserRepository,
  RecordingAuditWriter,
} from './test-support/fakes';
import {
  InvalidRefreshTokenError,
  SessionRevokedError,
  User,
  UserSuspendedError,
} from '../../domain';

async function setupWithLogin() {
  const users = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository();
  const hasher = new FakePasswordHasher();
  const signer = new FakeTokenSigner();
  const uow = new FakeUnitOfWork();
  const audit = new RecordingAuditWriter();

  const user = User.create({
    email: 'alice@example.com',
    passwordHash: 'hashed:pw12345678',
    displayName: 'Alice',
  });
  users.seed(user);

  const login = new LoginUseCase(users, sessions, hasher, signer, uow, audit);
  const tokens = await login.execute({
    email: 'alice@example.com',
    password: 'pw12345678',
    refreshTtlDays: 14,
  });

  const refresh = new RefreshUseCase(users, sessions, signer, uow, audit);
  return { users, sessions, audit, refresh, user, firstRefreshToken: tokens.refreshToken };
}

const TTL = { refreshTtlDays: 14 };

describe('RefreshUseCase', () => {
  it('rotates: new session in the same family, old one marked rotated, audited in-tx', async () => {
    const { refresh, sessions, audit, firstRefreshToken } = await setupWithLogin();
    const originalId = sessions.all()[0].id;
    const familyId = sessions.all()[0].familyId;

    const next = await refresh.execute({ refreshToken: firstRefreshToken, ...TTL });

    expect(next.refreshToken).not.toBe(firstRefreshToken);
    const rows = sessions.all();
    expect(rows).toHaveLength(2);
    const old = rows.find((r) => r.id === originalId)!;
    const successor = rows.find((r) => r.id !== originalId)!;
    expect(old.revokedAt).not.toBeNull();
    expect(old.replacedById).toBe(successor.id);
    expect(successor.familyId).toBe(familyId);
    expect(audit.actions()).toContain('auth.refresh.rotated');
    expect(audit.records.at(-1)!.inTx).toBe(true);
  });

  it('reuse of a rotated token revokes the ENTIRE family and audits reuse detection', async () => {
    const { refresh, sessions, audit, firstRefreshToken } = await setupWithLogin();

    const second = await refresh.execute({ refreshToken: firstRefreshToken, ...TTL });
    // Replay the original (already rotated) token → theft signal.
    await expect(refresh.execute({ refreshToken: firstRefreshToken, ...TTL })).rejects.toThrow(
      SessionRevokedError,
    );

    // Every session in the family is now revoked — including the newest one.
    expect(sessions.all().every((r) => r.revokedAt !== null)).toBe(true);
    expect(audit.actions()).toContain('auth.refresh.reuse_detected');

    // The legitimate successor token is dead too.
    await expect(refresh.execute({ refreshToken: second.refreshToken, ...TTL })).rejects.toThrow(
      SessionRevokedError,
    );
  });

  it('rejects a token that was never issued with INVALID_REFRESH_TOKEN', async () => {
    const { refresh } = await setupWithLogin();
    await expect(refresh.execute({ refreshToken: 'never-issued', ...TTL })).rejects.toThrow(
      InvalidRefreshTokenError,
    );
  });

  it('rejects an expired session with INVALID_REFRESH_TOKEN without revoking the family', async () => {
    const { refresh, sessions, firstRefreshToken } = await setupWithLogin();
    sessions.forceExpire(sessions.all()[0].id);

    await expect(refresh.execute({ refreshToken: firstRefreshToken, ...TTL })).rejects.toThrow(
      InvalidRefreshTokenError,
    );
    expect(sessions.all()[0].revokedAt).toBeNull();
  });

  it('rejects refresh for a user suspended after login', async () => {
    const { refresh, users, user, firstRefreshToken } = await setupWithLogin();
    users.setStatus(user.id, 'suspended');

    await expect(refresh.execute({ refreshToken: firstRefreshToken, ...TTL })).rejects.toThrow(
      UserSuspendedError,
    );
  });
});
