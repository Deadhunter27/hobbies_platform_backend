import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { newId } from '../../src/shared/utils/id';
import { describeIfDb } from '../support/db-test.helper';

/**
 * Self-contained (testing-strategy.md: no shared mutable state): this suite
 * creates its own category + hobbies in beforeAll and removes them in
 * afterAll, so it passes regardless of seed state or suite ordering.
 */
describeIfDb('Catalog e2e', () => {
  let app: INestApplication;

  const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
  const run = newId().toLowerCase();
  const categorySlug = `e2e-cat-${run}`;
  const hobbySlugs = [`e2e-aaa-${run}`, `e2e-bbb-${run}`, `e2e-ccc-${run}`];
  let knownHobbyId: string;

  beforeAll(async () => {
    const categoryId = newId();
    await prisma.catalogHobbyCategory.create({
      data: { id: categoryId, slug: categorySlug, name: `E2E Category ${run}`, sortOrder: 999 },
    });
    for (const [index, slug] of hobbySlugs.entries()) {
      const id = newId();
      if (index === 0) knownHobbyId = id;
      await prisma.catalogHobby.create({
        data: {
          id,
          categoryId,
          slug,
          name: `E2E Hobby ${String.fromCharCode(65 + index)} ${run}`,
          difficulty: 'beginner_friendly',
          costLevel: 'free',
          setting: 'outdoor',
          status: 'active',
        },
      });
    }

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await prisma.catalogHobby.deleteMany({ where: { slug: { in: hobbySlugs } } });
    await prisma.catalogHobbyCategory.deleteMany({ where: { slug: categorySlug } });
    await prisma.$disconnect();
  });

  it('GET /health/live returns 200', async () => {
    await request(app.getHttpServer()).get('/health/live').expect(200);
  });

  it('GET /health/ready returns 200 with the database up', async () => {
    const res = await request(app.getHttpServer()).get('/health/ready').expect(200);
    expect(res.body.info.database.status).toBe('up');
  });

  it('GET /api/v1/hobby-categories includes the fixture category in the envelope', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/hobby-categories').expect(200);
    const slugs = res.body.data.map((category: { slug: string }) => category.slug);
    expect(slugs).toContain(categorySlug);
  });

  it('GET /api/v1/hobbies paginates and the cursor resumes to a distinct next page', async () => {
    const first = await request(app.getHttpServer())
      .get(`/api/v1/hobbies?category=${categorySlug}&limit=2`)
      .expect(200);
    expect(first.body.data).toHaveLength(2);
    expect(first.body.page.hasMore).toBe(true);

    const second = await request(app.getHttpServer())
      .get(
        `/api/v1/hobbies?category=${categorySlug}&limit=2&cursor=${encodeURIComponent(
          first.body.page.nextCursor,
        )}`,
      )
      .expect(200);

    const firstIds = first.body.data.map((hobby: { id: string }) => hobby.id);
    const secondIds = second.body.data.map((hobby: { id: string }) => hobby.id);
    expect(secondIds.length).toBeGreaterThan(0);
    expect(secondIds.some((id: string) => firstIds.includes(id))).toBe(false);
  });

  it('GET /api/v1/hobbies/:slugOrId resolves the same resource by slug and by id', async () => {
    const bySlug = await request(app.getHttpServer())
      .get(`/api/v1/hobbies/${hobbySlugs[0]}`)
      .expect(200);
    const byId = await request(app.getHttpServer())
      .get(`/api/v1/hobbies/${knownHobbyId}`)
      .expect(200);

    expect(bySlug.body.id).toBe(knownHobbyId);
    expect(byId.body.slug).toBe(hobbySlugs[0]);
  });

  it('GET /api/v1/hobbies/:id returns 404 HOBBY_NOT_FOUND for an unknown id', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/hobbies/01ARZ3NDEKTSV4RRFFQ69G5FAV')
      .expect(404);
    expect(res.body.error.code).toBe('HOBBY_NOT_FOUND');
  });

  it('GET /api/v1/hobbies?limit=abc returns 400 VALIDATION_FAILED', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/hobbies?limit=abc').expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('GET /api/v1/hobbies?bogus=1 returns 400 VALIDATION_FAILED for an unknown query param', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/hobbies?bogus=1').expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('GET /api/v1/hobbies?cursor=garbage returns 400 INVALID_CURSOR', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/hobbies?cursor=not-a-real-cursor!!')
      .expect(400);
    expect(res.body.error.code).toBe('INVALID_CURSOR');
  });

  it('GET /api/v1/does-not-exist returns 404 ROUTE_NOT_FOUND', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/does-not-exist').expect(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('responses carry an x-request-id header even when the client sends none', async () => {
    const res = await request(app.getHttpServer()).get('/health/live').expect(200);
    expect(res.headers['x-request-id']).toBeTruthy();
  });
});
