import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { newId } from '../../src/shared/utils/id';
import { describeIfDb } from '../support/db-test.helper';

describeIfDb('Communities, events and reports e2e (ADR-0035/0036)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
  const run = newId().toLowerCase();
  const categoryId = newId();
  const hobbyId = newId();
  const users: Array<{ id: string; token: string }> = [];
  let communityId: string;
  let eventId: string;
  let postId: string;
  const http = () => request(app.getHttpServer());
  const auth = (index: number) => ({ Authorization: `Bearer ${users[index]!.token}` });
  const inDays = (days: number) => new Date(Date.now() + days * 86400000).toISOString();

  beforeAll(async () => {
    await prisma.catalogHobbyCategory.create({
      data: {
        id: categoryId,
        slug: `e2e-create-cat-${run}`,
        name: `Create E2E ${run}`,
        sortOrder: 999,
      },
    });
    await prisma.catalogHobby.create({
      data: {
        id: hobbyId,
        categoryId,
        slug: `e2e-create-hobby-${run}`,
        name: `Create Hobby ${run}`,
        difficulty: 'beginner_friendly',
        costLevel: 'free',
        setting: 'outdoor',
        status: 'active',
      },
    });
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    // 0 organizer, 1 member, 2-3 reporters, 4 staff
    for (let index = 0; index < 5; index += 1) {
      const email = `e2e-create-${index}-${run}@example.com`;
      const password = 'create-password-123';
      const created = await http()
        .post('/api/v1/auth/register')
        .send({ email, password, displayName: `Person ${index}` })
        .expect(201);
      if (index === 4) {
        await prisma.identityUser.update({
          where: { id: created.body.id },
          data: { globalRole: 'staff' },
        });
      }
      const login = await http().post('/api/v1/auth/login').send({ email, password }).expect(200);
      users.push({ id: created.body.id, token: login.body.accessToken });
    }
  });

  afterAll(async () => {
    const ids = users.map((user) => user.id);
    await prisma.contentReport.deleteMany({ where: { reporterId: { in: ids } } });
    await prisma.$executeRaw`DELETE FROM "conversation" WHERE "hobbyId" = ${hobbyId}`;
    await prisma.activityCommitment.deleteMany({ where: { activity: { hobbyId } } });
    await prisma.activity.deleteMany({ where: { hobbyId } });
    await prisma.communityMembership.deleteMany({ where: { community: { hobbyId } } });
    await prisma.community.deleteMany({ where: { hobbyId } });
    await app.close();
    await prisma.auditEntry.deleteMany({ where: { actorId: { in: ids } } });
    await prisma.identitySession.deleteMany({ where: { userId: { in: ids } } });
    await prisma.identityUser.deleteMany({ where: { id: { in: ids } } });
    await prisma.catalogHobby.deleteMany({ where: { id: hobbyId } });
    await prisma.catalogHobbyCategory.deleteMany({ where: { id: categoryId } });
    await prisma.$disconnect();
  });

  it('lets a person start a community and makes them its organizer', async () => {
    const created = await http()
      .post('/api/v1/communities')
      .set(auth(0))
      .send({ hobbyId, name: 'Sunday Slow Runners', city: 'Jakarta' })
      .expect(201);
    communityId = created.body.id;
    expect(created.body).toMatchObject({ name: 'Sunday Slow Runners', status: 'published' });
    expect(created.body.people.hosts).toEqual([
      expect.objectContaining({ personId: users[0]!.id, role: 'organizer' }),
    ]);

    const listed = await http().get(`/api/v1/communities?hobbyId=${hobbyId}`).expect(200);
    expect(listed.body.data).toEqual([
      expect.objectContaining({ id: communityId, memberCount: 1 }),
    ]);
  });

  it('always lets staff create a community (policy itself is covered by unit tests)', async () => {
    await http()
      .post('/api/v1/communities')
      .set(auth(4))
      .send({ hobbyId, name: 'Staff Community' })
      .expect(201);
  });

  it('creates events: organizers inside their community, members only outside it', async () => {
    await http()
      .post('/api/v1/activities')
      .set(auth(1))
      .send({
        hobbyId,
        communityId,
        title: 'Not my community',
        startsAt: inDays(3),
        placeName: 'GBK',
      })
      .expect(403);
    await http()
      .post('/api/v1/activities')
      .set(auth(0))
      .send({ hobbyId, title: 'Too late', startsAt: inDays(-1), placeName: 'GBK' })
      .expect(400);

    const event = await http()
      .post('/api/v1/activities')
      .set(auth(0))
      .send({
        hobbyId,
        communityId,
        title: 'Easy 5K',
        startsAt: inDays(3),
        endsAt: inDays(3.05),
        placeName: 'GBK Gate 5',
        capacity: 10,
        effortLevel: 'easy',
      })
      .expect(201);
    eventId = event.body.id;
    expect(event.body).toMatchObject({
      status: 'published',
      hostType: 'person',
      hostReferenceId: users[0]!.id,
      availability: 'available',
      spotsRemaining: 10,
    });

    const byCommunity = await http()
      .get(`/api/v1/activities?communityId=${communityId}`)
      .expect(200);
    expect(byCommunity.body.data.map((a: { id: string }) => a.id)).toEqual([eventId]);
  });

  it('lets only the host cancel an event', async () => {
    await http().post(`/api/v1/activities/${eventId}/cancel`).set(auth(1)).expect(403);
    const cancelled = await http()
      .post(`/api/v1/activities/${eventId}/cancel`)
      .set(auth(0))
      .expect(200);
    expect(cancelled.body.availability).toBe('cancelled');
  });

  it('hides a post after three different reports and restores it when staff dismiss', async () => {
    const post = await http()
      .post('/api/v1/posts')
      .set(auth(0))
      .send({ hobbyId, body: 'Totally normal post' })
      .expect(201);
    postId = post.body.id;

    const report = (index: number) =>
      http()
        .post('/api/v1/reports')
        .set(auth(index))
        .send({ targetType: 'post', targetId: postId, reason: 'spam' })
        .expect(200);
    expect((await report(1)).body).toEqual({ received: true, hidden: false });
    expect((await report(1)).body).toEqual({ received: true, hidden: false });
    expect((await report(2)).body.hidden).toBe(false);
    expect((await report(3)).body.hidden).toBe(true);
    await http().get(`/api/v1/posts/${postId}`).expect(404);

    await http().get('/api/v1/admin/reports').set(auth(1)).expect(403);
    const queue = await http().get('/api/v1/admin/reports').set(auth(4)).expect(200);
    expect(queue.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ targetId: postId, reportCount: 3, autoHidden: true }),
      ]),
    );

    await http()
      .post('/api/v1/admin/reports/resolve')
      .set(auth(4))
      .send({ targetType: 'post', targetId: postId, decision: 'dismiss' })
      .expect(200);
    await http().get(`/api/v1/posts/${postId}`).expect(200);
  });

  it('refuses self-reports and reports about missing content', async () => {
    await http()
      .post('/api/v1/reports')
      .set(auth(1))
      .send({ targetType: 'person', targetId: users[1]!.id, reason: 'other' })
      .expect(409);
    await http()
      .post('/api/v1/reports')
      .set(auth(1))
      .send({ targetType: 'event', targetId: newId(), reason: 'scam' })
      .expect(404);
  });
});
