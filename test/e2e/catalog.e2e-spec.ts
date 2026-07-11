import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { describeIfDb } from '../support/db-test.helper';

/**
 * Full auth-free read lifecycle. Requires the DB-gated migrate+seed
 * workflow to have run first (same Postgres the integration suite uses) —
 * 'padel' and friends must exist.
 */
describeIfDb('Catalog e2e', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health/live returns 200', async () => {
    await request(app.getHttpServer()).get('/health/live').expect(200);
  });

  it('GET /health/ready returns 200 with the database up', async () => {
    const res = await request(app.getHttpServer()).get('/health/ready').expect(200);
    expect(res.body.info.database.status).toBe('up');
  });

  it('GET /api/v1/hobby-categories returns the seeded categories envelope', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/hobby-categories').expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/hobbies paginates and the cursor resumes to a distinct next page', async () => {
    const first = await request(app.getHttpServer()).get('/api/v1/hobbies?limit=2').expect(200);
    expect(first.body.data).toHaveLength(2);
    expect(first.body.page.hasMore).toBe(true);

    const second = await request(app.getHttpServer())
      .get(`/api/v1/hobbies?limit=2&cursor=${encodeURIComponent(first.body.page.nextCursor)}`)
      .expect(200);

    const firstIds = first.body.data.map((hobby: { id: string }) => hobby.id);
    const secondIds = second.body.data.map((hobby: { id: string }) => hobby.id);
    expect(secondIds.some((id: string) => firstIds.includes(id))).toBe(false);
  });

  it('GET /api/v1/hobbies/:slugOrId resolves the same resource by slug and by id', async () => {
    const bySlug = await request(app.getHttpServer()).get('/api/v1/hobbies/padel').expect(200);
    const byId = await request(app.getHttpServer())
      .get(`/api/v1/hobbies/${bySlug.body.id}`)
      .expect(200);

    expect(byId.body.slug).toBe('padel');
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
});
