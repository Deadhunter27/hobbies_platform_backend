import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { newId } from '../../src/shared/utils/id';
import { describeIfDb } from '../support/db-test.helper';

describeIfDb('Community e2e', () => {
  let app: INestApplication;
  const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
  const run = newId().toLowerCase();
  const email = `e2e-community-${run}@example.com`;
  const password = 'community-password-1';
  const categoryId = newId();
  const hobbyId = newId();
  const communityId = newId();
  const organizerId = newId();
  const organizerMembershipId = newId();
  const activityId = newId();
  const categorySlug = `e2e-community-cat-${run}`;
  const hobbySlug = `e2e-community-hobby-${run}`;
  const communitySlug = `e2e-community-${run}`;
  let userId: string;
  let accessToken: string;

  beforeAll(async () => {
    await prisma.catalogHobbyCategory.create({
      data: { id: categoryId, slug: categorySlug, name: `Community E2E ${run}`, sortOrder: 999 },
    });
    await prisma.catalogHobby.create({
      data: {
        id: hobbyId,
        categoryId,
        slug: hobbySlug,
        name: `Community Hobby ${run}`,
        difficulty: 'beginner_friendly',
        costLevel: 'free',
        setting: 'outdoor',
        status: 'active',
      },
    });
    await prisma.community.create({
      data: {
        id: communityId,
        hobbyId,
        name: `Jakarta Runners E2E ${run}`,
        slug: communitySlug,
        description: 'A small community fixture for activity trust context.',
        city: 'Jakarta',
        countryCode: 'ID',
        status: 'published',
      },
    });
    await prisma.communityMembership.create({
      data: {
        id: organizerMembershipId,
        communityId,
        userId: organizerId,
        displayNameSnapshot: 'E2E Community Host',
        role: 'organizer',
        state: 'active',
        joinedAt: new Date(),
      },
    });
    await prisma.activity.create({
      data: {
        id: activityId,
        hobbyId,
        title: 'Community Social Run E2E',
        description: 'Membership should be useful context, not an activity gate.',
        activityType: 'group_run',
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        timezone: 'Asia/Jakarta',
        placeName: 'GBK Main Gate',
        addressLabel: 'Gelora Bung Karno, Jakarta',
        hostName: 'E2E Community Host',
        hostType: 'community',
        hostReferenceId: organizerId,
        communityReferenceId: communityId,
        effortLevel: 'easy',
        capacity: 20,
        status: 'published',
        preparation: 'Bring water.',
        expectations: 'Easy social pace.',
      },
    });

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    const created = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, displayName: 'E2E Runner' })
      .expect(201);
    userId = created.body.id;
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    accessToken = login.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
    await prisma.activityCommitment.deleteMany({ where: { userId } });
    await prisma.communityMembership.deleteMany({ where: { communityId } });
    await prisma.activity.deleteMany({ where: { id: activityId } });
    await prisma.community.deleteMany({ where: { id: communityId } });
    await prisma.auditEntry.deleteMany({ where: { actorId: userId } });
    await prisma.identitySession.deleteMany({ where: { userId } });
    await prisma.identityUser.deleteMany({ where: { id: userId } });
    await prisma.catalogHobby.deleteMany({ where: { id: hobbyId } });
    await prisma.catalogHobbyCategory.deleteMany({ where: { id: categoryId } });
    await prisma.$disconnect();
  });

  it('exposes published community trust context without private identity fields', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/communities/${communitySlug}`)
      .expect(200);

    expect(res.body.id).toBe(communityId);
    expect(res.body.people.memberCount).toBe(1);
    expect(res.body.people.hosts).toEqual([
      {
        personId: organizerId,
        displayName: 'E2E Community Host',
        role: 'organizer',
      },
    ]);
    expect(JSON.stringify(res.body)).not.toContain('@');
  });

  it('enriches Activity with community context but does not require membership to commit', async () => {
    const detail = await request(app.getHttpServer())
      .get(`/api/v1/activities/${activityId}`)
      .expect(200);
    expect(detail.body.communityContext.id).toBe(communityId);
    expect(detail.body.communityContext.memberCount).toBe(1);

    const before = await request(app.getHttpServer())
      .get('/api/v1/me/community-memberships')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(before.body.data).toEqual([]);

    await request(app.getHttpServer())
      .put(`/api/v1/me/activity-commitments/${activityId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ state: 'committed', note: null })
      .expect(200);
  });

  it('persists join and leave state for the authenticated user', async () => {
    const joined = await request(app.getHttpServer())
      .put(`/api/v1/me/community-memberships/${communityId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ state: 'active' })
      .expect(200);
    expect(joined.body.role).toBe('member');
    expect(joined.body.state).toBe('active');
    expect(joined.body.displayName).toBe('E2E Runner');

    const listed = await request(app.getHttpServer())
      .get('/api/v1/me/community-memberships')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(listed.body.data).toHaveLength(1);

    const left = await request(app.getHttpServer())
      .put(`/api/v1/me/community-memberships/${communityId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ state: 'left' })
      .expect(200);
    expect(left.body.state).toBe('left');
    expect(left.body.leftAt).toBeTruthy();
  });

  it('requires authentication for own membership operations', async () => {
    await request(app.getHttpServer()).get('/api/v1/me/community-memberships').expect(401);
  });
});
