import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  JWT_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(14),
  // Comma-separated allowlist of browser origins permitted to call this API
  // with credentials (security-guidelines.md: "strict CORS allowlist").
  // Optional and unset by default — see configuration.ts for the fail-closed
  // production behavior when it's absent.
  CORS_ORIGINS: z.string().optional(),
  // Number of reverse-proxy hops whose forwarded protocol/client IP may be
  // trusted. Zero is the fail-closed default for local/direct deployments.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  // Keep the API request surface bounded. 100 KB matches Express' default,
  // but making it explicit prevents framework defaults from becoming policy.
  REQUEST_BODY_LIMIT_KB: z.coerce.number().int().min(16).max(1024).default(100),
});

export type EnvVars = z.infer<typeof envSchema>;
