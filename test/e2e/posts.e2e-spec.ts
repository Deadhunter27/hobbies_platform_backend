import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { newId } from '../../src/shared/utils/id';
import { describeIfDb } from '../support/db-test.helper';
import { useIsolatedClientIp } from '../support/e2e-client';

describeIfDb('Threads-style posts e2e (ADR-0032)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
  const run = newId().toLowerCase();
  const categoryId = newId();
  const hobbyId = newId();
  const users: Array<{ id: string; token: string }> = [];
  let postId: string;
  let topReplyId: string;
  const http = useIsolatedClientIp(() => app);
  const auth = (index: number) => ({ Authorization: `Bearer ${users[index]!.token}` });

  beforeAll(async () => {
    await prisma.catalogHobbyCategory.create({
      data: {
        id: categoryId,
        slug: `e2e-posts-cat-${run}`,
        name: `Posts E2E ${run}`,
        sortOrder: 999,
      },
    });
    await prisma.catalogHobby.create({
      data: {
        id: hobbyId,
        categoryId,
        slug: `e2e-posts-hobby-${run}`,
        name: `Posts Hobby ${run}`,
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

    for (const name of ['Poster', 'Replier']) {
      const email = `e2e-posts-${name.toLowerCase()}-${run}@example.com`;
      const password = 'posts-password-123';
      const created = await http()
        .post('/api/v1/auth/register')
        .send({ email, password, displayName: name })
        .expect(201);
      const login = await http().post('/api/v1/auth/login').send({ email, password }).expect(200);
      users.push({ id: created.body.id, token: login.body.accessToken });
    }
  });

  afterAll(async () => {
    const ids = users.map((user) => user.id);
    await prisma.$executeRaw`DELETE FROM "conversation_like" WHERE "userId" IN (${ids[0]}, ${ids[1]})`;
    await prisma.$executeRaw`DELETE FROM "conversation_attachment" WHERE "conversationId" IN (SELECT "id" FROM "conversation" WHERE "hobbyId" = ${hobbyId})`;
    await prisma.$executeRaw`UPDATE "conversation_reply" SET "parentReplyId" = NULL WHERE "conversationId" IN (SELECT "id" FROM "conversation" WHERE "hobbyId" = ${hobbyId})`;
    await prisma.$executeRaw`DELETE FROM "conversation_reply" WHERE "conversationId" IN (SELECT "id" FROM "conversation" WHERE "hobbyId" = ${hobbyId})`;
    await prisma.$executeRaw`DELETE FROM "conversation" WHERE "hobbyId" = ${hobbyId}`;
    await app.close();
    await prisma.auditEntry.deleteMany({ where: { actorId: { in: ids } } });
    await prisma.identitySession.deleteMany({ where: { userId: { in: ids } } });
    await prisma.identityUser.deleteMany({ where: { id: { in: ids } } });
    await prisma.catalogHobby.deleteMany({ where: { id: hobbyId } });
    await prisma.catalogHobbyCategory.deleteMany({ where: { id: categoryId } });
    await prisma.$disconnect();
  });

  it('publishes a text-only post without a title or a hobby context', async () => {
    await http().post('/api/v1/posts').send({ hobbyId, body: 'Hi' }).expect(401);
    await http().post('/api/v1/posts').set(auth(0)).send({ hobbyId, body: '' }).expect(400);

    const created = await http()
      .post('/api/v1/posts')
      .set(auth(0))
      .send({ hobbyId, body: 'First 10K this morning. Slow and happy.' })
      .expect(201);

    expect(created.body).toMatchObject({
      title: null,
      media: [],
      likeCount: 0,
      replyCount: 0,
      likedByMe: false,
      isMine: true,
      author: { id: users[0]!.id, displayName: 'Poster', handle: null, avatarUrl: null },
      hobby: { id: hobbyId },
    });
    postId = created.body.id;
  });

  it('serves the feed to signed-out viewers and rejects an invalid token', async () => {
    const anonymous = await http().get(`/api/v1/feed?hobbyId=${hobbyId}`).expect(200);
    expect(anonymous.body.data[0]).toMatchObject({ id: postId, isMine: false, likedByMe: false });

    await http().get('/api/v1/feed').set('Authorization', 'Bearer not-a-token').expect(401);

    const byAuthor = await http()
      .get(`/api/v1/feed?authorId=${users[0]!.id}`)
      .set(auth(1))
      .expect(200);
    expect(byAuthor.body.data.map((post: { id: string }) => post.id)).toContain(postId);
  });

  it('nests replies one level and counts them', async () => {
    const top = await http()
      .post(`/api/v1/posts/${postId}/replies`)
      .set(auth(1))
      .send({ body: 'Congrats! What pace?' })
      .expect(201);
    topReplyId = top.body.id;
    expect(top.body.parentReplyId).toBeNull();

    const nested = await http()
      .post(`/api/v1/posts/${postId}/replies`)
      .set(auth(0))
      .send({ body: 'Around 7:30', parentReplyId: topReplyId })
      .expect(201);
    const deeper = await http()
      .post(`/api/v1/posts/${postId}/replies`)
      .set(auth(1))
      .send({ body: 'Nice', parentReplyId: nested.body.id })
      .expect(201);
    expect(deeper.body.parentReplyId).toBe(topReplyId);

    const detail = await http().get(`/api/v1/posts/${postId}`).expect(200);
    expect(detail.body.post.replyCount).toBe(3);
    expect(detail.body.replies).toHaveLength(3);
  });

  it('likes posts and replies idempotently', async () => {
    await http().put(`/api/v1/posts/${postId}/like`).set(auth(1)).expect(204);
    await http().put(`/api/v1/posts/${postId}/like`).set(auth(1)).expect(204);
    await http().put(`/api/v1/replies/${topReplyId}/like`).set(auth(0)).expect(204);

    const seenByLiker = await http().get(`/api/v1/posts/${postId}`).set(auth(1)).expect(200);
    expect(seenByLiker.body.post).toMatchObject({ likeCount: 1, likedByMe: true });
    const top = seenByLiker.body.replies.find((reply: { id: string }) => reply.id === topReplyId);
    expect(top).toMatchObject({ likeCount: 1, likedByMe: false });

    await http().delete(`/api/v1/posts/${postId}/like`).set(auth(1)).expect(204);
    const after = await http().get(`/api/v1/posts/${postId}`).expect(200);
    expect(after.body.post.likeCount).toBe(0);
  });

  it('keeps the W9 conversation API working for untitled posts', async () => {
    const legacy = await http().get(`/api/v1/conversations/${postId}`).expect(200);
    expect(legacy.body.title).toBe('First 10K this morning. Slow and happy.');
    expect(legacy.body.replies).toHaveLength(3);
  });

  it('lets only the author delete, and deleted content disappears', async () => {
    await http().delete(`/api/v1/replies/${topReplyId}`).set(auth(0)).expect(403);
    await http().delete(`/api/v1/replies/${topReplyId}`).set(auth(1)).expect(204);
    const detail = await http().get(`/api/v1/posts/${postId}`).expect(200);
    expect(detail.body.replies).toHaveLength(0);

    await http().delete(`/api/v1/posts/${postId}`).set(auth(1)).expect(403);
    await http().delete(`/api/v1/posts/${postId}`).set(auth(0)).expect(204);
    await http().get(`/api/v1/posts/${postId}`).expect(404);
    await http().get(`/api/v1/conversations/${postId}`).expect(404);
  });
});
