import { envSchema } from './env.schema';

export interface AppConfig {
  readonly nodeEnv: 'development' | 'test' | 'production';
  readonly port: number;
  readonly databaseUrl: string;
  readonly redisUrl: string;
  readonly sentryDsn: string | null;
  readonly sentryRelease: string | null;
  readonly logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  readonly isDevelopment: boolean;
  readonly jwtSecret: string;
  readonly accessTokenTtlSeconds: number;
  readonly refreshTokenTtlDays: number;
  readonly stravaClientId: string | null;
  readonly stravaClientSecret: string | null;
  readonly stravaRedirectUri: string | null;
  readonly stravaWebhookVerifyToken: string | null;
  readonly integrationTokenEncryptionKey: string | null;
  readonly wayfinderMobileRedirectUri: string;
  /** Parsed from CORS_ORIGINS (comma-separated). Empty in production means
   * no cross-origin browser access at all — fail-closed, not fail-open. */
  readonly corsOrigins: string[];
  readonly trustProxyHops: number;
  readonly requestBodyLimitKb: number;
}

/**
 * The only place in the app allowed to read `process.env` (ADR-0008).
 * Fails closed: any missing/invalid variable aborts startup, naming the
 * offending variable(s) rather than surfacing a generic error.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = envSchema.safeParse(env);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  const parsed = result.data;
  if (parsed.NODE_ENV === 'production') {
    const productionIssues: string[] = [];
    if (!parsed.REDIS_URL) productionIssues.push('  - REDIS_URL: Required in production');
    if (!parsed.SENTRY_DSN) productionIssues.push('  - SENTRY_DSN: Required in production');
    if (productionIssues.length > 0) {
      throw new Error(`Invalid environment configuration:\n${productionIssues.join('\n')}`);
    }
  }

  return Object.freeze({
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    redisUrl: parsed.REDIS_URL ?? 'redis://localhost:6379',
    sentryDsn: parsed.SENTRY_DSN ?? null,
    sentryRelease: parsed.SENTRY_RELEASE ?? null,
    logLevel: parsed.LOG_LEVEL,
    isDevelopment: parsed.NODE_ENV === 'development',
    jwtSecret: parsed.JWT_SECRET,
    accessTokenTtlSeconds: parsed.ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenTtlDays: parsed.REFRESH_TOKEN_TTL_DAYS,
    stravaClientId: parsed.STRAVA_CLIENT_ID ?? null,
    stravaClientSecret: parsed.STRAVA_CLIENT_SECRET ?? null,
    stravaRedirectUri: parsed.STRAVA_REDIRECT_URI ?? null,
    stravaWebhookVerifyToken: parsed.STRAVA_WEBHOOK_VERIFY_TOKEN ?? null,
    integrationTokenEncryptionKey: parsed.INTEGRATION_TOKEN_ENCRYPTION_KEY ?? null,
    wayfinderMobileRedirectUri: parsed.WAYFINDER_MOBILE_REDIRECT_URI,
    corsOrigins: (parsed.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
    trustProxyHops: parsed.TRUST_PROXY_HOPS,
    requestBodyLimitKb: parsed.REQUEST_BODY_LIMIT_KB,
  });
}
