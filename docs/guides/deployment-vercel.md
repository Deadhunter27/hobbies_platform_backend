# Vercel personal staging runbook

This runbook defines the zero-cost hosted path used for Wayfinder personal testing before external Closed Alpha. It complements, rather than replaces, `deployment-render.md`.

## Purpose and boundary

Vercel is the current AR4 personal-staging compute target because the Hobby plan can host the NestJS API with Fluid Compute and scale to zero between requests. Render remains the preferred simple one-provider option for a later always-on Closed Alpha once billing is intentionally enabled.

This path must not change the application architecture merely to fit Vercel. The existing modular NestJS app, Prisma persistence boundary, Redis-backed rate limiting, Sentry error boundary, migration flow and seed flow remain source of truth.

## Target topology

- API compute: Vercel Hobby, native NestJS detection, Singapore (`sin1`).
- PostgreSQL: free managed PostgreSQL located in Singapore or the closest available region. The initial provider may be Supabase; another PostgreSQL provider is acceptable only if it preserves the same `DATABASE_URL` contract and migration behavior.
- Redis: Upstash Redis free tier using its TLS TCP connection string (`rediss://...`) through the existing `redis` package.
- Error tracking: Sentry Developer/free project.
- Public API: Vercel-managed HTTPS URL; custom domain is not required.
- Mobile: `EXPO_PUBLIC_API_URL=https://<deployment>/api/v1`.

## Why native NestJS instead of a Vercel-specific wrapper

Vercel recognizes `src/main.ts` as a NestJS entry point. Keep the conventional bootstrap and `app.listen(...)`; do not create an `/api` wrapper, duplicate application entry point, or provider-specific Dockerfile unless a verified platform incompatibility appears.

The repository `Dockerfile` remains the traditional container artifact for Render, CI, local Docker, and future container hosts. Vercel personal staging intentionally uses its native NestJS path first.

## Runtime configuration

`vercel.json` pins the single Vercel Function to Singapore. `package.json` pins Node `22.x` so Vercel uses the same Node major as `.nvmrc` and GitHub CI rather than automatically selecting a newer major.

Required production variables:

- `NODE_ENV=production`
- `DATABASE_URL` — pooled/serverless-safe PostgreSQL URL supplied by the selected database provider.
- `REDIS_URL` — Upstash TLS TCP URL beginning with `rediss://`.
- `SENTRY_DSN` — Wayfinder backend Sentry project DSN.
- `SENTRY_RELEASE` — optional deployed revision/label.
- `JWT_SECRET` — unique secret, minimum 32 characters.
- `LOG_LEVEL=info`
- `ACCESS_TOKEN_TTL_SECONDS=900`
- `REFRESH_TOKEN_TTL_DAYS=14`
- `CORS_ORIGINS` — leave empty for native-mobile-only personal testing unless a browser client genuinely needs access.
- `TRUST_PROXY_HOPS=1`
- `REQUEST_BODY_LIMIT_KB=100`

Do not commit real environment values.

### Proxy/IP rule

Vercel overwrites `x-forwarded-for` with the public client IP before the request reaches the application. With one trusted platform proxy hop, Express `request.ip` remains the input to the existing hashed Redis rate-limit identity. Do not add a second Vercel-only IP parser unless hosted evidence shows this contract is not true in the deployed NestJS runtime.

## PostgreSQL connection rule

The runtime URL must be appropriate for serverless/pooled connections. Prisma remains lazy: application construction does not eagerly connect and the first real query establishes the connection.

Database schema changes are never tied to function cold starts. Run `prisma migrate deploy` deliberately with a migration-safe database connection before exposing a schema-dependent release. If the provider offers separate pooled runtime and direct migration URLs, use the direct connection only for the migration command and keep the pooled URL as the application's `DATABASE_URL`.

## Redis connection rule

The existing `redis` client is retained. Upstash exposes a standard TLS Redis connection string compatible with `node-redis`, so no REST-specific Redis SDK is required for this Alpha. Redis stays operational infrastructure for rate limiting/readiness only; PostgreSQL remains the source of truth.

## Seed rule

Do not seed on every deployment or function startup. Apply the repository-owned Alpha seed deliberately after migrations. The seed is expected to be idempotent and must be verified against the hosted database before real-device smoke testing.

## Health and observability

- `GET /health/live` proves the NestJS function can serve traffic.
- `GET /health/ready` verifies PostgreSQL and Redis reachability.
- A failed readiness response is a deployment blocker, not a reason to weaken dependency checks.
- Sentry remains the Stage-1 unexpected/5xx tracker; Pino request IDs remain the log correlation key.

## First personal-staging sequence

1. Provision free PostgreSQL, Upstash Redis, and Sentry resources without paid upgrades.
2. Create/import the backend repository as a Vercel Hobby project.
3. Configure the production environment variables above.
4. Deploy `main` through native NestJS detection in `sin1`.
5. Run database migrations deliberately against the hosted database.
6. Apply the Alpha seed deliberately and rerun it once to prove idempotence.
7. Verify `/health/live` and `/health/ready` over HTTPS.
8. Trigger one controlled server-side error and correlate its Sentry event with the Pino `request_id`.
9. Point the mobile app at the Vercel HTTPS API and run the AR4 real-device flow.
10. Prove Vercel rollback/redeploy using a known-good deployment before inviting external testers.

## Personal staging is not the Closed Alpha launch environment

A successful Vercel personal staging run proves hosted execution, external dependencies, HTTPS, migration/seed discipline and real-device API use. It does not automatically approve AR5. Before external testers are invited, reassess whether the free topology remains reliable enough or whether the application should move to the planned paid/simple Render topology.
