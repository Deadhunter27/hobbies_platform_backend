import { loadConfig } from './configuration';

const TEST_SECRET = 'unit-test-secret-at-least-32-chars-long!';

function baseEnv(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'test',
    PORT: '3000',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    LOG_LEVEL: 'info',
    JWT_SECRET: TEST_SECRET,
    ...overrides,
  } as NodeJS.ProcessEnv;
}

describe('loadConfig', () => {
  it('parses a valid environment into a frozen config object', () => {
    const config = loadConfig(baseEnv());

    expect(config).toEqual({
      nodeEnv: 'test',
      port: 3000,
      databaseUrl: 'postgresql://user:pass@localhost:5432/db',
      redisUrl: 'redis://localhost:6379',
      sentryDsn: null,
      sentryRelease: null,
      logLevel: 'info',
      isDevelopment: false,
      jwtSecret: TEST_SECRET,
      accessTokenTtlSeconds: 900,
      refreshTokenTtlDays: 14,
      corsOrigins: [],
      trustProxyHops: 0,
      requestBodyLimitKb: 100,
    });
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('throws naming DATABASE_URL when it is missing', () => {
    const env = baseEnv();
    delete env.DATABASE_URL;

    expect(() => loadConfig(env)).toThrow(/DATABASE_URL/);
  });

  it('throws naming JWT_SECRET when it is missing', () => {
    const env = baseEnv();
    delete env.JWT_SECRET;

    expect(() => loadConfig(env)).toThrow(/JWT_SECRET/);
  });

  it('throws naming JWT_SECRET when it is shorter than 32 characters', () => {
    expect(() => loadConfig(baseEnv({ JWT_SECRET: 'too-short' }))).toThrow(/JWT_SECRET/);
  });

  it('throws naming PORT when it is not a valid number', () => {
    expect(() => loadConfig(baseEnv({ PORT: 'not-a-number' }))).toThrow(/PORT/);
  });

  it('requires Redis and Sentry configuration in production', () => {
    expect(loadConfig(baseEnv()).redisUrl).toBe('redis://localhost:6379');

    expect(() => loadConfig(baseEnv({ NODE_ENV: 'production' }))).toThrow(
      /REDIS_URL[\s\S]*SENTRY_DSN/,
    );

    const production = loadConfig(
      baseEnv({
        NODE_ENV: 'production',
        REDIS_URL: 'redis://redis.internal:6379',
        SENTRY_DSN: 'https://public@example.invalid/1',
        SENTRY_RELEASE: 'backend@alpha-1',
      }),
    );
    expect(production.redisUrl).toBe('redis://redis.internal:6379');
    expect(production.sentryDsn).toBe('https://public@example.invalid/1');
    expect(production.sentryRelease).toBe('backend@alpha-1');
  });

  it('applies token TTL defaults (900s access, 14d refresh)', () => {
    const config = loadConfig(baseEnv());
    expect(config.accessTokenTtlSeconds).toBe(900);
    expect(config.refreshTokenTtlDays).toBe(14);
  });

  it('parses CORS_ORIGINS into a trimmed array; unset means no allowed origins', () => {
    expect(loadConfig(baseEnv()).corsOrigins).toEqual([]);
    expect(
      loadConfig(baseEnv({ CORS_ORIGINS: ' http://localhost:8081 ,https://app.example.com,' }))
        .corsOrigins,
    ).toEqual(['http://localhost:8081', 'https://app.example.com']);
  });

  it('defaults proxy trust to zero and the request body ceiling to 100 KB', () => {
    const config = loadConfig(baseEnv());
    expect(config.trustProxyHops).toBe(0);
    expect(config.requestBodyLimitKb).toBe(100);
  });

  it('accepts bounded proxy-hop and body-limit overrides', () => {
    const config = loadConfig(baseEnv({ TRUST_PROXY_HOPS: '1', REQUEST_BODY_LIMIT_KB: '256' }));
    expect(config.trustProxyHops).toBe(1);
    expect(config.requestBodyLimitKb).toBe(256);
  });

  it('rejects unsafe proxy-hop and request body limits', () => {
    expect(() => loadConfig(baseEnv({ TRUST_PROXY_HOPS: '-1' }))).toThrow(/TRUST_PROXY_HOPS/);
    expect(() => loadConfig(baseEnv({ TRUST_PROXY_HOPS: '6' }))).toThrow(/TRUST_PROXY_HOPS/);
    expect(() => loadConfig(baseEnv({ REQUEST_BODY_LIMIT_KB: '2048' }))).toThrow(
      /REQUEST_BODY_LIMIT_KB/,
    );
  });

  it('defaults NODE_ENV to development and marks isDevelopment true', () => {
    const env = baseEnv();
    delete env.NODE_ENV;

    const config = loadConfig(env);

    expect(config.nodeEnv).toBe('development');
    expect(config.isDevelopment).toBe(true);
  });
});
