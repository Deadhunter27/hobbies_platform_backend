import { Controller, Get, Post, Req } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request } from 'express';
import request from 'supertest';
import { configureHttpSecurity } from '../../src/bootstrap';

@Controller('probe')
class ProbeController {
  @Post()
  post(): { ok: true } {
    return { ok: true };
  }

  @Get('request')
  request(@Req() req: Request): { protocol: string; secure: boolean } {
    return { protocol: req.protocol, secure: req.secure };
  }
}

describe('HTTP security bootstrap', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [ProbeController] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureHttpSecurity(app, {
      corsOrigins: ['https://alpha.example.com'],
      trustProxyHops: 1,
      requestBodyLimitKb: 100,
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows only configured browser origins while preserving direct/native requests', async () => {
    const allowed = await request(app.getHttpServer())
      .post('/probe')
      .set('Origin', 'https://alpha.example.com')
      .send({ ok: true })
      .expect(201);
    expect(allowed.headers['access-control-allow-origin']).toBe('https://alpha.example.com');

    const denied = await request(app.getHttpServer())
      .post('/probe')
      .set('Origin', 'https://untrusted.example.com')
      .send({ ok: true })
      .expect(201);
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();

    await request(app.getHttpServer()).post('/probe').send({ ok: true }).expect(201);
  });

  it('trusts exactly the configured proxy hop for hosted HTTPS semantics', async () => {
    const response = await request(app.getHttpServer())
      .get('/probe/request')
      .set('X-Forwarded-Proto', 'https')
      .expect(200);

    expect(response.body).toEqual({ protocol: 'https', secure: true });
  });

  it('applies Helmet headers and does not expose Express', async () => {
    const response = await request(app.getHttpServer()).get('/probe/request').expect(200);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('rejects JSON bodies larger than the configured 100 KB ceiling', async () => {
    await request(app.getHttpServer())
      .post('/probe')
      .send({ data: 'x'.repeat(101 * 1024) })
      .expect(413);
  });
});
