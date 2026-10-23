import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { newId } from '../../src/shared/utils/id';
import { describeIfDb } from '../support/db-test.helper';
import { useIsolatedClientIp } from '../support/e2e-client';

describeIfDb('People, follows and the Following feed e2e (ADR-0034)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
  const run = newId().toLowerCase();
  const categoryId = newId();
  const hobbyId = newId();
  const users: Array<{ id: string; token: string; handle: string }> = [];
  const http = useIsolatedClientIp(() => app);
  const auth = (index: number) => ({ Authorization: `Bearer ${users[index]!.token}` });

  beforeAll(async () => {
    await prisma.catalogHobbyCategory.create({
      data: {
        id: categoryId,
        slug: `e2e-people-cat-${run}`,
        name: `People E2E ${run}`,
        sortOrder: 999,
      },
    });
    await prisma.catalogHobby.create({
      data: {
        id: hobbyId,
        categoryId,
        slug: `e2e-people-hobby-${run}`,
        name: `People Hobby ${run}`,
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

    for (const [index, name] of ['Ayu Runner', 'Budi Climber', 'Citra Painter'].entries()) {
      const email = `e2e-people-${index}-${run}@example.com`;
      const password = 'people-password-123';
      const created = await http()
        .post('/api/v1/auth/register')
        .send({ email, password, displayName: name })
        .expect(201);
      const login = await http().post('/api/v1/auth/login').send({ email, password }).expect(200);
      const handle = `p${index}${run.slice(-8)}`;
      users.push({ id: created.body.id, token: login.body.accessToken, handle });
      await http()
        .patch('/api/v1/me/profile-details')
        .set(auth(index))
        .send({ handle, instagramHandle: `ig${index}` })
        .expect(200);
      await http()
        .put(`/api/v1/me/hobby-contexts/${hobbyId}`)
        .set(auth(index))
        .send({
          experienceLevel: 'beginner',
          primaryIntent: 'social',
          secondaryIntents: [],
          goal: null,
          socialPreference: 'mixed',
        })
        .expect(200);
    }
  });

  afterAll(async () => {
    const ids = users.map((user) => user.id);
    await prisma.personFollow.deleteMany({ where: { followerId: { in: ids } } });
    await prisma.$executeRaw`DELETE FROM "conversation" WHERE "hobbyId" = ${hobbyId}`;
    await app.close();
    await prisma.profileHobbyContext.deleteMany({ where: { userId: { in: ids } } });
    await prisma.profileUserDetails.deleteMany({ where: { userId: { in: ids } } });
    await prisma.auditEntry.deleteMany({ where: { actorId: { in: ids } } });
    await prisma.identitySession.deleteMany({ where: { userId: { in: ids } } });
    await prisma.identityUser.deleteMany({ where: { id: { in: ids } } });
    await prisma.catalogHobby.deleteMany({ where: { id: hobbyId } });
    await prisma.catalogHobbyCategory.deleteMany({ where: { id: categoryId } });
    await prisma.$disconnect();
  });

  it('shows a public profile by @handle without private fields', async () => {
    const profile = await http().get(`/api/v1/people/@${users[0]!.handle}`).expect(200);
    expect(profile.body).toMatchObject({
      id: users[0]!.id,
      displayName: 'Ayu Runner',
      handle: users[0]!.handle,
      instagramHandle: 'ig0',
      followerCount: 0,
      isFollowing: false,
      isMe: false,
    });
    expect(profile.body.hobbies.map((hobby: { id: string }) => hobby.id)).toContain(hobbyId);
    expect(profile.body).not.toHaveProperty('email');
    expect(profile.body).not.toHaveProperty('birthYear');
    await http().get('/api/v1/people/@nobody-here-at-all').expect(404);
  });

  it('follows, counts and lists followers; refuses self-follow', async () => {
    await http().put(`/api/v1/people/${users[0]!.id}/follow`).expect(401);
    await http().put(`/api/v1/people/${users[0]!.id}/follow`).set(auth(1)).expect(204);
    await http().put(`/api/v1/people/${users[0]!.id}/follow`).set(auth(1)).expect(204);
    await http().put(`/api/v1/people/${users[1]!.id}/follow`).set(auth(1)).expect(409);

    const seen = await http().get(`/api/v1/people/${users[0]!.id}`).set(auth(1)).expect(200);
    expect(seen.body).toMatchObject({ followerCount: 1, isFollowing: true });

    const followers = await http().get(`/api/v1/people/${users[0]!.id}/followers`).expect(200);
    expect(followers.body.data.map((card: { id: string }) => card.id)).toEqual([users[1]!.id]);
  });

  it('searches by name and by handle, and suggests people in the same hobby', async () => {
    const byName = await http().get('/api/v1/people?q=Citra').expect(200);
    expect(byName.body.data.map((card: { id: string }) => card.id)).toContain(users[2]!.id);
    const byHandle = await http().get(`/api/v1/people?q=@${users[0]!.handle}`).expect(200);
    expect(byHandle.body.data[0].id).toBe(users[0]!.id);

    const suggested = await http()
      .get(`/api/v1/people/suggested?hobbyId=${hobbyId}`)
      .set(auth(1))
      .expect(200);
    const ids = suggested.body.data.map((card: { id: string }) => card.id);
    expect(ids).toContain(users[2]!.id);
    expect(ids).not.toContain(users[0]!.id);
    expect(ids).not.toContain(users[1]!.id);
  });

  it('builds the Following feed only from people you follow', async () => {
    const fromFollowed = await http()
      .post('/api/v1/posts')
      .set(auth(0))
      .send({ hobbyId, body: 'From someone you follow' })
      .expect(201);
    await http()
      .post('/api/v1/posts')
      .set(auth(2))
      .send({ hobbyId, body: 'From a stranger' })
      .expect(201);

    await http().get('/api/v1/feed?following=true').expect(401);
    const feed = await http().get('/api/v1/feed?following=true').set(auth(1)).expect(200);
    expect(feed.body.data.map((post: { id: string }) => post.id)).toEqual([fromFollowed.body.id]);

    await http().delete(`/api/v1/people/${users[0]!.id}/follow`).set(auth(1)).expect(204);
    const empty = await http().get('/api/v1/feed?following=true').set(auth(1)).expect(200);
    expect(empty.body.data).toEqual([]);
  });
});
