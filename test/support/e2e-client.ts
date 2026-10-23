import { randomInt } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

/**
 * E2E suites run in parallel Jest workers against one shared Redis, and every
 * request arrives from 127.0.0.1. Anonymous writes (register, login) are rate
 * limited per client IP, so without isolation the suites drain one shared
 * budget and fail with 429 depending on run order.
 *
 * Each suite sends every request through the returned client, which stamps a
 * per-suite `X-Forwarded-For` address and makes the suite's own test app trust
 * exactly one proxy hop (e2e suites call `configureApp`, not the production
 * `configureHttpSecurity`, so nothing else enables proxy trust). Production
 * behaviour is unchanged: TRUST_PROXY_HOPS still defaults to 0.
 */
export function useIsolatedClientIp(getApp: () => INestApplication) {
  const clientIp = `10.${randomInt(1, 255)}.${randomInt(0, 256)}.${randomInt(1, 255)}`;
  let trusted = false;
  const server = () => {
    const app = getApp() as NestExpressApplication;
    if (!trusted) {
      app.set('trust proxy', 1);
      trusted = true;
    }
    return app.getHttpServer();
  };

  return () => ({
    get: (url: string) => request(server()).get(url).set('X-Forwarded-For', clientIp),
    post: (url: string) => request(server()).post(url).set('X-Forwarded-For', clientIp),
    put: (url: string) => request(server()).put(url).set('X-Forwarded-For', clientIp),
    patch: (url: string) => request(server()).patch(url).set('X-Forwarded-For', clientIp),
    delete: (url: string) => request(server()).delete(url).set('X-Forwarded-For', clientIp),
  });
}
