import { PrismaClient } from '@prisma/client';
import type { PrismaService } from '@infra/database';
import type { TxContext } from '@shared/application';
import { PrismaUserRepository } from '@modules/identity/infrastructure/prisma-user.repository';
import { PrismaSessionRepository } from '@modules/identity/infrastructure/prisma-session.repository';
import { PrismaAuditWriter } from '@infra/audit';
import { Session, User } from '@modules/identity/domain';
import { newId } from '@shared/utils';
import { describeIfDb } from '../../support/db-test.helper';

const FUTURE = new Date(Date.now() + 86_400_000);

describeIfDb('identity Prisma repositories (integration)', () => {
  const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
  const svc = prisma as unknown as PrismaService;
  const users = new PrismaUserRepository(svc);
  const sessions = new PrismaSessionRepository(svc);
  const audit = new PrismaAuditWriter(svc);

  beforeEach(async () => {
    await prisma.auditEntry.deleteMany();
    await prisma.identitySession.deleteMany();
    await prisma.identityUser.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function makeUser(email = `it-${newId().toLowerCase()}@example.com`): User {
    return User.create({ email, passwordHash: '$argon2id$fake', displayName: 'IT' });
  }

  it('user round-trip: create, find by (normalized) email and id', async () => {
    const user = makeUser();
    await users.create(user);

    expect((await users.findByEmail(user.email))?.id).toBe(user.id);
    expect((await users.findById(user.id))?.email).toBe(user.email);
    expect(await users.findByEmail('nobody@example.com')).toBeNull();
  });

  it('duplicate email is rejected by the unique index', async () => {
    const user = makeUser('dupe@example.com');
    await users.create(user);
    await expect(users.create(makeUser('dupe@example.com'))).rejects.toThrow();
  });

  it('session lookup by token hash; rotation and family revocation update the right rows', async () => {
    const user = makeUser();
    await users.create(user);
    const first = Session.create({
      userId: user.id,
      refreshTokenHash: 'a'.repeat(64),
      expiresAt: FUTURE,
    });
    await sessions.create(first);
    const successor = Session.create({
      userId: user.id,
      refreshTokenHash: 'b'.repeat(64),
      expiresAt: FUTURE,
      familyId: first.familyId,
    });
    await sessions.create(successor);
    const otherFamily = Session.create({
      userId: user.id,
      refreshTokenHash: 'c'.repeat(64),
      expiresAt: FUTURE,
    });
    await sessions.create(otherFamily);

    await sessions.markRotated(first.id, successor.id);
    const rotated = await sessions.findByTokenHash('a'.repeat(64));
    expect(rotated?.isRotatedOrRevoked).toBe(true);
    expect(rotated?.replacedById).toBe(successor.id);

    await sessions.revokeFamily(first.familyId);
    expect((await sessions.findById(successor.id))?.revokedAt).not.toBeNull();
    expect((await sessions.findById(otherFamily.id))?.revokedAt).toBeNull();

    await sessions.revokeAllForUser(user.id);
    expect((await sessions.findById(otherFamily.id))?.revokedAt).not.toBeNull();
  });

  it('audit writer inside a rolled-back transaction leaves NO row (ADR-0019)', async () => {
    const marker = `tx-proof-${newId()}`;
    await expect(
      prisma.$transaction(async (tx) => {
        await audit.write(
          { actorId: null, action: marker, resourceType: 'test', resourceId: null },
          tx as unknown as TxContext,
        );
        throw new Error('force rollback');
      }),
    ).rejects.toThrow('force rollback');

    expect(await prisma.auditEntry.count({ where: { action: marker } })).toBe(0);

    await audit.write({ actorId: null, action: marker, resourceType: 'test', resourceId: null });
    expect(await prisma.auditEntry.count({ where: { action: marker } })).toBe(1);
  });

  it('argon2id adapter output is stored and verifiable end-to-end', async () => {
    const { Argon2PasswordHasher } =
      await import('@modules/identity/infrastructure/argon2-password-hasher');
    const hasher = new Argon2PasswordHasher();
    const hash = await hasher.hash('integration-password');

    const user = User.create({
      email: `argon-${newId().toLowerCase()}@example.com`,
      passwordHash: hash,
      displayName: 'A',
    });
    await users.create(user);

    const stored = (await users.findById(user.id))!;
    expect(stored.passwordHash.startsWith('$argon2id$')).toBe(true);
    expect(stored.passwordHash).not.toContain('integration-password');
    expect(await hasher.verify(stored.passwordHash, 'integration-password')).toBe(true);
    expect(await hasher.verify(stored.passwordHash, 'wrong')).toBe(false);
    expect(await hasher.verify(hasher.dummyHash, 'anything')).toBe(false);
  });
});
