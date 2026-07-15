import { RegisterUseCase } from './register.use-case';
import {
  FakePasswordHasher,
  FakeUnitOfWork,
  InMemoryUserRepository,
  RecordingAuditWriter,
} from './test-support/fakes';
import { EmailAlreadyRegisteredError, PasswordTooWeakError } from '../../domain';

function setup() {
  const users = new InMemoryUserRepository();
  const hasher = new FakePasswordHasher();
  const uow = new FakeUnitOfWork();
  const audit = new RecordingAuditWriter();
  const useCase = new RegisterUseCase(users, hasher, uow, audit);
  return { users, hasher, uow, audit, useCase };
}

describe('RegisterUseCase', () => {
  it('creates a user with normalized email and audits in-transaction', async () => {
    const { useCase, users, audit } = setup();

    const user = await useCase.execute({
      email: 'Alice@Example.com',
      password: 'password123',
      displayName: 'Alice',
    });

    expect(user.email).toBe('alice@example.com');
    expect(await users.findByEmail('alice@example.com')).not.toBeNull();
    expect(audit.records).toEqual([
      expect.objectContaining({ action: 'auth.register', actorId: user.id, inTx: true }),
    ]);
  });

  it('rejects a duplicate email case-insensitively with EMAIL_ALREADY_REGISTERED', async () => {
    const { useCase } = setup();
    await useCase.execute({ email: 'a@b.co', password: 'password123', displayName: 'A' });

    await expect(
      useCase.execute({ email: 'A@B.CO', password: 'password456', displayName: 'B' }),
    ).rejects.toThrow(EmailAlreadyRegisteredError);
  });

  it('rejects a 7-character password with PASSWORD_TOO_WEAK before touching storage', async () => {
    const { useCase, audit } = setup();

    await expect(
      useCase.execute({ email: 'a@b.co', password: '1234567', displayName: 'A' }),
    ).rejects.toThrow(PasswordTooWeakError);
    expect(audit.records).toHaveLength(0);
  });

  it('stores only the hasher output, never the raw password value', async () => {
    const { useCase, users } = setup();
    await useCase.execute({ email: 'a@b.co', password: 'password123', displayName: 'A' });

    const stored = await users.findByEmail('a@b.co');
    // The stored value is exactly what the hasher port returned — the
    // use-case adds no plaintext path. (Real argon2id output is asserted
    // in the integration suite.)
    expect(stored!.passwordHash).toBe('hashed:password123');
    expect(stored!.passwordHash).not.toBe('password123');
  });
});
