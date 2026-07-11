import { loadConfig } from './configuration';

function baseEnv(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'test',
    PORT: '3000',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    LOG_LEVEL: 'info',
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
      logLevel: 'info',
      isDevelopment: false,
    });
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('throws naming DATABASE_URL when it is missing', () => {
    const env = baseEnv();
    delete env.DATABASE_URL;

    expect(() => loadConfig(env)).toThrow(/DATABASE_URL/);
  });

  it('throws naming PORT when it is not a valid number', () => {
    expect(() => loadConfig(baseEnv({ PORT: 'not-a-number' }))).toThrow(/PORT/);
  });

  it('defaults NODE_ENV to development and marks isDevelopment true', () => {
    const env = baseEnv();
    delete env.NODE_ENV;

    const config = loadConfig(env);

    expect(config.nodeEnv).toBe('development');
    expect(config.isDevelopment).toBe(true);
  });
});
