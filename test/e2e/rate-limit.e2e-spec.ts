import { randomInt } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { buildOpenApiDocument, configureApp, configureHttpSecurity } from '../../src/bootstrap';
import { APP_CONFIG, type AppConfig } from '../../src/config';
import { describeIfDb } from '../support/db-test.helper';

void buildOpenApiDocument;

describeIfDb('Redis-backed rate limiting e2e', () => {
  let app: NestExpressApplication;
  const clientIp = `198.18.${randomInt(0, 256)}.${randomInt(1, 255)}`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureHttpSecurity(app, app.get<AppConfig>(APP_CONFIG));
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('includes Redis in readiness without throttling health probes', async () => {
    const response = await request(app.getHttpServer()).get('/health/ready').expect(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.info.redis.status).toBe('up');
  });

  it('returns stable RATE_LIMITED + Retry-After after the register limit', async () => {
    for (let index = 0; index < 20; index += 1) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .set('X-Forwarded-For', clientIp)
        .send({})
        .expect(400);
    }

    const throttled = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set('X-Forwarded-For', clientIp)
      .send({})
      .expect(429);

    expect(throttled.headers['retry-after']).toBeDefined();
    expect(throttled.body.error).toMatchObject({
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please try again later.',
    });
    expect(throttled.body.error.details[0].retryAfterSeconds).toBeGreaterThan(0);
  });
});
