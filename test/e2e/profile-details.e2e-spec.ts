import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { newId } from '../../src/shared/utils/id';
import { describeIfDb } from '../support/db-test.helper';
import { useIsolatedClientIp } from '../support/e2e-client';

describeIfDb('Profile details ("Kenalan dulu") e2e', () => {
  let app: INestApplication;
  const client = useIsolatedClientIp(() => app);
  const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
  const run = newId().toLowerCase();
  const handle = `e2e_${run.slice(-10)}`;
  const users: Array<{ id: string; token: string }> = [];

  async function signUp(label: string) {
    const email = `e2e-details-${label}-${run}@example.com`;
    const password = 'details-password-1';
    const created = await client()
      .post('/api/v1/auth/register')
      .send({ email, password, displayName: `Details ${label}` })
      .expect(201);
    const login = await client().post('/api/v1/auth/login').send({ email, password }).expect(200);
    const user = { id: created.body.id as string, token: login.body.accessToken as string };
    users.push(user);
    return user;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    const ids = users.map((user) => user.id);
    await prisma.profileUserDetails.deleteMany({ where: { userId: { in: ids } } });
    await prisma.auditEntry.deleteMany({ where: { actorId: { in: ids } } });
    await prisma.identitySession.deleteMany({ where: { userId: { in: ids } } });
    await prisma.identityUser.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it('requires authentication', async () => {
    await client().get('/api/v1/me/profile-details').expect(401);
  });

  it('returns empty details with marketing consent off for a new user', async () => {
    const user = await signUp('empty');
    const res = await client()
      .get('/api/v1/me/profile-details')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);
    expect(res.body).toEqual({
      handle: null,
      birthYear: null,
      gender: null,
      instagramHandle: null,
      tiktokHandle: null,
      acquisitionSource: null,
      acquisitionDetail: null,
      avatarMediaId: null,
      avatarUrl: null,
      marketingConsent: false,
      marketingConsentUpdatedAt: null,
      introCompletedAt: null,
    });
  });

  it('saves a partial update, normalizes handles and keeps omitted fields', async () => {
    const user = await signUp('owner');
    await client()
      .patch('/api/v1/me/profile-details')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ handle: `@${handle.toUpperCase()}`, birthYear: 2003, gender: 'male' })
      .expect(200);
    const res = await client()
      .patch('/api/v1/me/profile-details')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        instagramHandle: '@RunWithReza',
        acquisitionSource: 'instagram',
        marketingConsent: true,
        introCompleted: true,
      })
      .expect(200);
    expect(res.body).toMatchObject({
      handle,
      birthYear: 2003,
      gender: 'male',
      instagramHandle: 'runwithreza',
      acquisitionSource: 'instagram',
      marketingConsent: true,
    });
    expect(res.body.marketingConsentUpdatedAt).toEqual(expect.any(String));
    expect(res.body.introCompletedAt).toEqual(expect.any(String));
  });

  it('rejects a handle already used by someone else with HANDLE_TAKEN', async () => {
    const other = await signUp('other');
    const res = await client()
      .patch('/api/v1/me/profile-details')
      .set('Authorization', `Bearer ${other.token}`)
      .send({ handle })
      .expect(409);
    expect(res.body.error.code).toBe('HANDLE_TAKEN');
  });

  it('rejects invalid input', async () => {
    const user = users[0]!;
    await client()
      .patch('/api/v1/me/profile-details')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ birthYear: new Date().getUTCFullYear() - 5 })
      .expect(400);
  });
});
