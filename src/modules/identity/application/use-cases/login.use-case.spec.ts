import { LoginUseCase } from './login.use-case';
import {
  FakePasswordHasher,
  FakeTokenSigner,
  FakeUnitOfWork,
  InMemorySessionRepository,
  InMemoryUserRepository,
  RecordingAuditWriter,
} from './test-support/fakes';
import { InvalidCredentialsError, User, UserSuspendedError } from '../../domain';

function setup() {
  const users = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository();
  const hasher = new FakePasswordHasher();
  const signer = new FakeTokenSigner();
  const uow = new FakeUnitOfWork();
  const audit = new RecordingAuditWriter();
  const useCase = new LoginUseCase(users, sessions, hasher, signer, uow, audit);

  const user = User.create({
    email: 'alice@example.com',
    passwordHash: 'hashed:correct-password',
    displayName: 'Alice',
  });
  users.seed(user);

  return { users, sessions, hasher, uow, audit, useCase, user };
}

const BASE = { password: 'correct-password', refreshTtlDays: 14 };

describe('LoginUseCase', () => {
  it('issues a token pair and audits login success in-transaction', async () => {
    const { useCase, sessions, audit, user } = setup();

    const tokens = await useCase.execute({ ...BASE, email: 'Alice@Example.com' });

    expect(tokens.accessToken).toBe(`jwt:${user.id}:${sessions.all()[0].id}`);
    expect(tokens.refreshToken).toHaveLength(43); // 32 bytes base64url
    expect(tokens.expiresIn).toBe(900);
    expect(sessions.all()).toHaveLength(1);
    expect(sessions.all()[0].refreshTokenHash).not.toContain(tokens.refreshToken);
    expect(audit.records).toEqual([
      expect.objectContaining({ action: 'auth.login.succeeded', inTx: true }),
    ]);
  });

  it('returns INVALID_CREDENTIALS for a wrong password and audits the failure with an email hash', async () => {
    const { useCase, audit } = setup();

    await expect(
      useCase.execute({ ...BASE, email: 'alice@example.com', password: 'wrong' }),
    ).rejects.toThrow(InvalidCredentialsError);

    const failure = audit.records[0];
    expect(failure.action).toBe('auth.login.failed');
    expect(failure.actorId).toBeNull();
    expect(JSON.stringify(failure.metadata)).not.toContain('alice@example.com');
    expect((failure.metadata as { emailHash: string }).emailHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns the same INVALID_CREDENTIALS for an unknown email, verifying the dummy hash (timing safety)', async () => {
    const { useCase, hasher } = setup();

    await expect(useCase.execute({ ...BASE, email: 'nobody@example.com' })).rejects.toThrow(
      InvalidCredentialsError,
    );

    expect(hasher.verifiedAgainst).toEqual([hasher.dummyHash]);
  });

  it('rejects a suspended user with USER_SUSPENDED after password verification', async () => {
    const { useCase, users, user } = setup();
    users.setStatus(user.id, 'suspended');

    await expect(useCase.execute({ ...BASE, email: 'alice@example.com' })).rejects.toThrow(
      UserSuspendedError,
    );
  });

  it('treats a deleted user as INVALID_CREDENTIALS (indistinguishable from unknown)', async () => {
    const { useCase, users, user } = setup();
    users.setStatus(user.id, 'deleted');

    await expect(useCase.execute({ ...BASE, email: 'alice@example.com' })).rejects.toThrow(
      InvalidCredentialsError,
    );
  });
});
