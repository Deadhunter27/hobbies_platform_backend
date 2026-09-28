import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { newId } from '../../src/shared/utils/id';
import { describeIfDb } from '../support/db-test.helper';

describeIfDb('Redis-backed rate limiting e2e', () => {
  let app: INestApplication;
  const targetEmail = `rate-limit-${newId().toLowerCase()}@example.com`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  function api() {
    return request(app.getHttpServer());
  }

  it('returns the stable 429 envelope after the auth-login target budget is exhausted', async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await api()
        .post('/api/v1/auth/login')
        .send({ email: targetEmail, password: 'not-a-real-password-1' })
        .expect(401);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    }

    const limited = await api()
      .post('/api/v1/auth/login')
      .send({ email: targetEmail, password: 'not-a-real-password-1' })
      .expect(429);

    expect(limited.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(limited.headers['retry-after']).toBeDefined();
    expect(Number(limited.headers['ratelimit-remaining'])).toBe(0);

    // The stricter bucket is target-specific, while the coarse global write
    // bucket remains shared. Another credential target is not falsely blocked.
    await api()
      .post('/api/v1/auth/login')
      .send({
        email: `other-${targetEmail}`,
        password: 'not-a-real-password-1',
      })
      .expect(401);
  });
});
