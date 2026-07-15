import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { newId } from '../../src/shared/utils/id';
import { describeIfDb } from '../support/db-test.helper';

/**
 * Full auth lifecycle (M2 acceptance): register -> login -> /me ->
 * refresh (old token dies) -> reuse revokes the family (+audit row) ->
 * logout -> refresh after logout fails. Self-contained: unique emails per
 * run, own cleanup, no dependence on seed or suite order.
 */
describeIfDb('Auth e2e', () => {
  let app: INestApplication;
  const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

  const run = newId().toLowerCase();
  const email = `e2e-auth-${run}@example.com`;
  const password = 'initial-password-1';
  let userId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await prisma.auditEntry.deleteMany({ where: { actorId: userId } });
    await prisma.identitySession.deleteMany({ where: { userId } });
    await prisma.identityUser.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  function api() {
    return request(app.getHttpServer());
  }

  it('registers, rejects the duplicate, and enforces the password policy', async () => {
    const created = await api()
      .post('/api/v1/auth/register')
      .send({ email, password, displayName: 'E2E Auth' })
      .expect(201);
    userId = created.body.id;
    expect(created.body.email).toBe(email);

    const dupe = await api()
      .post('/api/v1/auth/register')
      .send({ email: email.toUpperCase(), password, displayName: 'X' })
      .expect(409);
    expect(dupe.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');

    const weak = await api()
      .post('/api/v1/auth/register')
      .send({ email: `weak-${run}@example.com`, password: '1234567', displayName: 'W' })
      .expect(400);
    expect(weak.body.error.code).toBe('PASSWORD_TOO_WEAK');
  });

  it('login returns identical INVALID_CREDENTIALS for wrong password and unknown email', async () => {
    const wrongPw = await api()
      .post('/api/v1/auth/login')
      .send({ email, password: 'not-the-password' })
      .expect(401);
    const unknown = await api()
      .post('/api/v1/auth/login')
      .send({ email: `ghost-${run}@example.com`, password: 'whatever-123' })
      .expect(401);

    expect(wrongPw.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(unknown.body).toEqual(wrongPw.body);
  });

  it('walks the full lifecycle: login -> me -> refresh -> reuse revokes family -> audit row', async () => {
    const login = await api().post('/api/v1/auth/login').send({ email, password }).expect(200);
    const { accessToken, refreshToken } = login.body;

    // JWT payload is exactly sub, sid, iat, exp — no roles (ADR-0017).
    const payload = JSON.parse(
      Buffer.from(accessToken.split('.')[1], 'base64url').toString('utf8'),
    );
    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'sid', 'sub']);

    const me = await api()
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(me.body.id).toBe(userId);

    await api().get('/api/v1/me').expect(401);

    // Rotation: old refresh token must die.
    const rotated = await api().post('/api/v1/auth/refresh').send({ refreshToken }).expect(200);
    expect(rotated.body.refreshToken).not.toBe(refreshToken);

    // Reuse of the rotated token → theft: whole family revoked + audited.
    const reuse = await api().post('/api/v1/auth/refresh').send({ refreshToken }).expect(401);
    expect(reuse.body.error.code).toBe('SESSION_REVOKED');

    const successorDead = await api()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: rotated.body.refreshToken })
      .expect(401);
    expect(successorDead.body.error.code).toBe('SESSION_REVOKED');

    const reuseAudits = await prisma.auditEntry.count({
      where: { action: 'auth.refresh.reuse_detected', actorId: userId },
    });
    expect(reuseAudits).toBeGreaterThan(0);
  });

  it('logout revokes the presenting session; its refresh token stops working', async () => {
    const login = await api().post('/api/v1/auth/login').send({ email, password }).expect(200);

    await api()
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(204);

    const afterLogout = await api()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: login.body.refreshToken })
      .expect(401);
    expect(afterLogout.body.error.code).toBe('SESSION_REVOKED');
  });

  it('change-password revokes every session and the old password stops working', async () => {
    const a = await api().post('/api/v1/auth/login').send({ email, password }).expect(200);
    const b = await api().post('/api/v1/auth/login').send({ email, password }).expect(200);

    await api()
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${a.body.accessToken}`)
      .send({ currentPassword: password, newPassword: 'rotated-password-2' })
      .expect(204);

    for (const tokens of [a.body, b.body]) {
      const dead = await api()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: tokens.refreshToken })
        .expect(401);
      expect(dead.body.error.code).toBe('SESSION_REVOKED');
    }

    await api().post('/api/v1/auth/login').send({ email, password }).expect(401);
    await api()
      .post('/api/v1/auth/login')
      .send({ email, password: 'rotated-password-2' })
      .expect(200);
  });

  it('suspension takes effect on a still-valid access token (403 USER_SUSPENDED)', async () => {
    const login = await api()
      .post('/api/v1/auth/login')
      .send({ email, password: 'rotated-password-2' })
      .expect(200);

    await prisma.identityUser.update({ where: { id: userId }, data: { status: 'suspended' } });
    try {
      const suspended = await api()
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(403);
      expect(suspended.body.error.code).toBe('USER_SUSPENDED');
    } finally {
      await prisma.identityUser.update({ where: { id: userId }, data: { status: 'active' } });
    }
  });

  it('audit trail covers the lifecycle actions with requestId on every row', async () => {
    const rows = await prisma.auditEntry.findMany({ where: { actorId: userId } });
    const actions = new Set(rows.map((r) => r.action));

    for (const expected of [
      'auth.register',
      'auth.login.succeeded',
      'auth.refresh.rotated',
      'auth.refresh.reuse_detected',
      'auth.logout',
      'auth.password.changed',
    ]) {
      expect(actions).toContain(expected);
    }
    expect(rows.every((r) => r.requestId !== null)).toBe(true);
    expect(JSON.stringify(rows)).not.toContain(password);
  });
});
