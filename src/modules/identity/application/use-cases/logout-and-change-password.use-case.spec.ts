import { LoginUseCase } from './login.use-case';
import { LogoutUseCase } from './logout.use-case';
import { ChangePasswordUseCase } from './change-password.use-case';
import {
  FakePasswordHasher,
  FakeTokenSigner,
  FakeUnitOfWork,
  InMemorySessionRepository,
  InMemoryUserRepository,
  RecordingAuditWriter,
} from './test-support/fakes';
import { InvalidCredentialsError, PasswordTooWeakError, User } from '../../domain';

async function setup() {
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
  await login.execute({ email: 'alice@example.com', password: 'pw12345678', refreshTtlDays: 14 });
  await login.execute({ email: 'alice@example.com', password: 'pw12345678', refreshTtlDays: 14 });

  return { users, sessions, hasher, uow, audit, user };
}

describe('LogoutUseCase', () => {
  it('revokes only the presenting session and audits it', async () => {
    const { sessions, uow, audit, user, users, hasher } = await setup();
    void users;
    void hasher;
    const [first, second] = sessions.all();
    const logout = new LogoutUseCase(sessions, uow, audit);

    await logout.execute({ actorId: user.id, sessionId: first.id });

    const rows = sessions.all();
    expect(rows.find((r) => r.id === first.id)!.revokedAt).not.toBeNull();
    expect(rows.find((r) => r.id === second.id)!.revokedAt).toBeNull();
    expect(audit.actions()).toContain('auth.logout');
  });

  it("is idempotent and refuses to revoke another user's session", async () => {
    const { sessions, uow, audit, user } = await setup();
    const [first] = sessions.all();
    const logout = new LogoutUseCase(sessions, uow, audit);

    await logout.execute({ actorId: 'someone-else', sessionId: first.id });
    expect(sessions.all().find((r) => r.id === first.id)!.revokedAt).toBeNull();

    await logout.execute({ actorId: user.id, sessionId: first.id });
    const auditCountAfterFirst = audit.records.length;
    await logout.execute({ actorId: user.id, sessionId: first.id });
    expect(audit.records.length).toBe(auditCountAfterFirst); // no duplicate audit
  });
});

describe('ChangePasswordUseCase', () => {
  it('verifies the current password, stores the new hash, revokes ALL sessions, audits in-tx', async () => {
    const { users, sessions, hasher, uow, audit, user } = await setup();
    const change = new ChangePasswordUseCase(users, sessions, hasher, uow, audit);

    await change.execute({
      actorId: user.id,
      currentPassword: 'pw12345678',
      newPassword: 'brand-new-password',
    });

    expect((await users.findById(user.id))!.passwordHash).toBe('hashed:brand-new-password');
    expect(sessions.all().every((r) => r.revokedAt !== null)).toBe(true);
    expect(audit.records.at(-1)).toEqual(
      expect.objectContaining({ action: 'auth.password.changed', inTx: true }),
    );
  });

  it('rejects a wrong current password with INVALID_CREDENTIALS and changes nothing', async () => {
    const { users, sessions, hasher, uow, audit, user } = await setup();
    const change = new ChangePasswordUseCase(users, sessions, hasher, uow, audit);

    await expect(
      change.execute({ actorId: user.id, currentPassword: 'wrong', newPassword: 'new-password-1' }),
    ).rejects.toThrow(InvalidCredentialsError);

    expect((await users.findById(user.id))!.passwordHash).toBe('hashed:pw12345678');
    expect(sessions.all().some((r) => r.revokedAt === null)).toBe(true);
  });

  it('enforces the password policy on the NEW password', async () => {
    const { users, sessions, hasher, uow, audit, user } = await setup();
    const change = new ChangePasswordUseCase(users, sessions, hasher, uow, audit);

    await expect(
      change.execute({ actorId: user.id, currentPassword: 'pw12345678', newPassword: 'short' }),
    ).rejects.toThrow(PasswordTooWeakError);
  });
});
