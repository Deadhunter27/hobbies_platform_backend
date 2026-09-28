import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { newId } from '../../src/shared/utils/id';
import { describeIfDb } from '../support/db-test.helper';

describeIfDb('W10 admin operability e2e', () => {
  let app: INestApplication;
  const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
  const run = newId().toLowerCase();
  const email = `e2e-admin-${run}@example.com`;
  const password = 'admin-password-1';
  const activityId = newId();
  const communityId = newId();
  const conversationId = newId();
  let userId: string;
  let accessToken: string;
  let categoryId: string;
  let hobbyId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    const created = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, displayName: 'W10 Operator' })
      .expect(201);
    userId = created.body.id;

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    accessToken = login.body.accessToken;
  });

  afterAll(async () => {
    await prisma.$executeRaw`DELETE FROM "conversation_reply" WHERE "conversationId" = ${conversationId}`;
    await prisma.$executeRaw`DELETE FROM "conversation" WHERE "id" = ${conversationId}`;
    await prisma.activity.deleteMany({ where: { id: activityId } });
    await prisma.communityMembership.deleteMany({ where: { communityId } });
    await prisma.community.deleteMany({ where: { id: communityId } });
    if (hobbyId) await prisma.catalogHobby.deleteMany({ where: { id: hobbyId } });
    if (categoryId) await prisma.catalogHobbyCategory.deleteMany({ where: { id: categoryId } });
    await prisma.auditEntry.deleteMany({ where: { actorId: userId } });
    await prisma.identitySession.deleteMany({ where: { userId } });
    await prisma.identityUser.deleteMany({ where: { id: userId } });
    await app.close();
    await prisma.$disconnect();
  });

  it('defaults staff routes to authenticated + authorized access', async () => {
    const payload = {
      parentId: null,
      name: `Admin Category ${run}`,
      slug: `admin-category-${run}`,
      description: null,
      sortOrder: 999,
    };

    await request(app.getHttpServer()).post('/api/v1/admin/catalog/categories').send(payload).expect(401);

    const denied = await request(app.getHttpServer())
      .post('/api/v1/admin/catalog/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(403);
    expect(denied.body.error.code).toBe('ADMIN_ACCESS_DENIED');

    const moderationDenied = await request(app.getHttpServer())
      .post(`/api/v1/admin/conversations/${conversationId}/archive`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
    expect(moderationDenied.body.error.code).toBe('ADMIN_ACCESS_DENIED');
  });

  it('lets live staff operate the minimum W10 Catalog + curation + moderation surfaces', async () => {
    await prisma.identityUser.update({ where: { id: userId }, data: { globalRole: 'staff' } });

    const category = await request(app.getHttpServer())
      .post('/api/v1/admin/catalog/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        parentId: null,
        name: `Admin Category ${run}`,
        slug: `admin-category-${run}`,
        description: 'W10 e2e taxonomy fixture.',
        sortOrder: 999,
      })
      .expect(201);
    categoryId = category.body.id;

    const hobby = await request(app.getHttpServer())
      .post('/api/v1/admin/catalog/hobbies')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        categoryId,
        name: `Admin Hobby ${run}`,
        slug: `admin-hobby-${run}`,
        description: 'W10 e2e hobby fixture.',
        difficulty: 'beginner_friendly',
        costLevel: 'free',
        setting: 'outdoor',
      })
      .expect(201);
    hobbyId = hobby.body.id;
    expect(hobby.body.status).toBe('draft');

    const activated = await request(app.getHttpServer())
      .put(`/api/v1/admin/catalog/hobbies/${hobbyId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        categoryId,
        name: hobby.body.name,
        slug: hobby.body.slug,
        description: hobby.body.description,
        difficulty: hobby.body.difficulty,
        costLevel: hobby.body.costLevel,
        setting: hobby.body.setting,
        status: 'active',
      })
      .expect(200);
    expect(activated.body.status).toBe('active');

    await prisma.community.create({
      data: {
        id: communityId,
        hobbyId,
        name: `Admin Community ${run}`,
        slug: `admin-community-${run}`,
        description: 'W10 curation fixture.',
        city: 'Jakarta',
        countryCode: 'ID',
        status: 'draft',
      },
    });
    await prisma.activity.create({
      data: {
        id: activityId,
        hobbyId,
        title: `Admin Activity ${run}`,
        description: 'W10 activity curation fixture.',
        activityType: 'group_run',
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        timezone: 'Asia/Jakarta',
        placeName: 'GBK Main Gate',
        hostName: 'Wayfinder W10',
        hostType: 'guide',
        effortLevel: 'easy',
        capacity: 20,
        status: 'draft',
        preparation: 'Bring water.',
        expectations: 'Safe staff curation.',
      },
    });
    await prisma.$executeRaw`
      INSERT INTO "conversation" (
        "id", "hobbyId", "authorId", "authorDisplayName", "title", "body", "status"
      ) VALUES (
        ${conversationId}, ${hobbyId}, ${userId}, 'W10 Operator',
        'W10 moderation fixture', 'This conversation should be explicitly moderatable.',
        'published'::"conversation_status"
      )
    `;

    await request(app.getHttpServer())
      .put(`/api/v1/admin/activities/${activityId}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'published' })
      .expect(200);
    await request(app.getHttpServer())
      .put(`/api/v1/admin/communities/${communityId}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'published' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/conversations/${conversationId}/archive`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect((await prisma.activity.findUniqueOrThrow({ where: { id: activityId } })).status).toBe(
      'published',
    );
    expect((await prisma.community.findUniqueOrThrow({ where: { id: communityId } })).status).toBe(
      'published',
    );
    const archived = await prisma.$queryRaw<Array<{ status: string }>>`
      SELECT "status"::text AS "status" FROM "conversation" WHERE "id" = ${conversationId}
    `;
    expect(archived[0]?.status).toBe('archived');

    await request(app.getHttpServer())
      .post(`/api/v1/admin/conversations/${conversationId}/publish`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const actions = new Set(
      (await prisma.auditEntry.findMany({ where: { actorId: userId } })).map((row) => row.action),
    );
    for (const expected of [
      'catalog.category.create',
      'catalog.hobby.create',
      'catalog.hobby.update',
      'activity.publish',
      'community.publish',
      'conversation.archive',
      'conversation.publish',
    ]) {
      expect(actions).toContain(expected);
    }
  });
});
