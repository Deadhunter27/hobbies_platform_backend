import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { newId } from '../../src/shared/utils/id';
import { describeIfDb } from '../support/db-test.helper';

describeIfDb('Conversation + hobby feed e2e', () => {
  let app: INestApplication;
  const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
  const run = newId().toLowerCase();
  const email = `e2e-conversation-${run}@example.com`;
  const password = 'conversation-password-1';
  const categoryId = newId();
  const hobbyId = newId();
  const activityId = newId();
  const categorySlug = `e2e-conversation-cat-${run}`;
  const hobbySlug = `e2e-conversation-hobby-${run}`;
  let userId: string;
  let accessToken: string;
  let firstConversationId: string;
  let secondConversationId: string;

  beforeAll(async () => {
    await prisma.catalogHobbyCategory.create({
      data: {
        id: categoryId,
        slug: categorySlug,
        name: `Conversation E2E ${run}`,
        sortOrder: 999,
      },
    });
    await prisma.catalogHobby.create({
      data: {
        id: hobbyId,
        categoryId,
        slug: hobbySlug,
        name: `Conversation Hobby ${run}`,
        difficulty: 'beginner_friendly',
        costLevel: 'free',
        setting: 'outdoor',
        status: 'active',
      },
    });
    await prisma.activity.create({
      data: {
        id: activityId,
        hobbyId,
        title: 'Conversation Feed Run E2E',
        description: 'An upcoming real-world option that belongs in the hobby feed.',
        activityType: 'group_run',
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        timezone: 'Asia/Jakarta',
        placeName: 'GBK Main Gate',
        hostName: 'Wayfinder E2E Host',
        hostType: 'guide',
        effortLevel: 'easy',
        capacity: 20,
        status: 'published',
        preparation: 'Bring water.',
        expectations: 'Easy pace and room for questions.',
      },
    });

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    const created = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, displayName: 'Conversation Runner' })
      .expect(201);
    userId = created.body.id;

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    accessToken = login.body.accessToken;

    await request(app.getHttpServer())
      .put(`/api/v1/me/hobby-contexts/${hobbyId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        experienceLevel: 'returning',
        primaryIntent: 'social',
        secondaryIntents: [],
        goal: 'Find a comfortable way back into running.',
        socialPreference: 'mixed',
      })
      .expect(200);
  });

  afterAll(async () => {
    await prisma.$executeRaw`DELETE FROM "conversation_reply" WHERE "authorId" = ${userId}`;
    await prisma.$executeRaw`DELETE FROM "conversation" WHERE "authorId" = ${userId}`;
    await app.close();
    await prisma.profileHobbyContext.deleteMany({ where: { userId } });
    await prisma.activity.deleteMany({ where: { id: activityId } });
    await prisma.auditEntry.deleteMany({ where: { actorId: userId } });
    await prisma.identitySession.deleteMany({ where: { userId } });
    await prisma.identityUser.deleteMany({ where: { id: userId } });
    await prisma.catalogHobby.deleteMany({ where: { id: hobbyId } });
    await prisma.catalogHobbyCategory.deleteMany({ where: { id: categoryId } });
    await prisma.$disconnect();
  });

  it('requires an authenticated active hobby context to create a conversation', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/hobbies/${hobbyId}/conversations`)
      .send({ title: 'Can I ask this?', body: 'This should require authentication.' })
      .expect(401);

    const first = await request(app.getHttpServer())
      .post(`/api/v1/hobbies/${hobbyId}/conversations`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'What helped you return to running?',
        body: 'I am getting back into running and want to keep the first few weeks comfortable.',
      })
      .expect(201);

    expect(first.body.author).toEqual({ personId: userId, displayName: 'Conversation Runner' });
    expect(first.body.hobbyId).toBe(hobbyId);
    firstConversationId = first.body.id;

    const second = await request(app.getHttpServer())
      .post(`/api/v1/hobbies/${hobbyId}/conversations`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'How do you choose an easy group run?',
        body: 'I care more about a welcoming pace than speed.',
        activityReferenceId: activityId,
      })
      .expect(201);
    secondConversationId = second.body.id;
  });

  it('lists published conversations with a bounded keyset cursor', async () => {
    const firstPage = await request(app.getHttpServer())
      .get(`/api/v1/hobbies/${hobbyId}/conversations?limit=1`)
      .expect(200);

    expect(firstPage.body.data).toHaveLength(1);
    expect(firstPage.body.nextCursor).toEqual(expect.any(String));

    const secondPage = await request(app.getHttpServer())
      .get(
        `/api/v1/hobbies/${hobbyId}/conversations?limit=1&cursor=${encodeURIComponent(firstPage.body.nextCursor)}`,
      )
      .expect(200);

    expect(secondPage.body.data).toHaveLength(1);
    expect(secondPage.body.data[0].id).not.toBe(firstPage.body.data[0].id);
  });

  it('returns flat chronological replies on conversation detail', async () => {
    const reply = await request(app.getHttpServer())
      .post(`/api/v1/conversations/${firstConversationId}/replies`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ body: 'Starting slower than expected helped me keep showing up.' })
      .expect(201);

    expect(reply.body.author.displayName).toBe('Conversation Runner');

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/conversations/${firstConversationId}`)
      .expect(200);

    expect(detail.body.id).toBe(firstConversationId);
    expect(detail.body.replies).toHaveLength(1);
    expect(detail.body.replies[0].body).toContain('Starting slower');
  });

  it('builds a source-preserving hobby feed from conversations and upcoming activities', async () => {
    const feed = await request(app.getHttpServer())
      .get(`/api/v1/hobbies/${hobbyId}/feed?limit=10`)
      .expect(200);

    expect(feed.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'activity', sourceId: activityId }),
        expect.objectContaining({ type: 'conversation', sourceId: firstConversationId }),
        expect.objectContaining({ type: 'conversation', sourceId: secondConversationId }),
      ]),
    );
    expect(
      feed.body.data.every((item: { type: string }) =>
        ['activity', 'conversation'].includes(item.type),
      ),
    ).toBe(true);
  });
});
