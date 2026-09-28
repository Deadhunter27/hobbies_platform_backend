# Render Closed Alpha deployment runbook

This runbook defines the minimum hosted shape for the first Wayfinder Closed Alpha. It is intentionally provider-specific and small; it is not a reusable multi-cloud abstraction.

## Target topology

All latency-sensitive resources live in Render Singapore:

- one public backend web service;
- one managed PostgreSQL database;
- one managed Redis-compatible Key Value instance;
- provider-managed HTTPS on the public service URL.

A custom domain is not required for the first Closed Alpha.

## Required application environment

Never commit production values to the repository.

- `NODE_ENV=production`
- `PORT` — supplied by Render to the web service; the application also has a local default for development.
- `DATABASE_URL` — hosted PostgreSQL connection string.
- `JWT_SECRET` — unique production secret; generate independently from development/test credentials.
- `LOG_LEVEL=info` unless incident debugging requires a temporary change.
- `ACCESS_TOKEN_TTL_SECONDS=900`
- `REFRESH_TOKEN_TTL_DAYS=14`
- `CORS_ORIGINS` — comma-separated browser origins. Empty means no cross-origin browser origin is allowed. Native mobile clients do not require browser CORS permission.
- `TRUST_PROXY_HOPS=1` — Render terminates public HTTPS in front of the service. Trust exactly one proxy hop so protocol/client-IP semantics are correct without trusting arbitrary forwarded headers by default.
- `REQUEST_BODY_LIMIT_KB=100` — explicit JSON and URL-encoded request size ceiling for the Alpha API.

Redis connectivity variables are added in AR2 together with the rate-limiter implementation; do not add unused runtime secrets early.

## Deploy contract

The repository production image is the deployable artifact. The application process is:

```text
node -r tsconfig-paths/register dist/main.js
```

The public provider health check should use:

```text
GET /health/ready
```

`/health/live` proves only that the process is alive. `/health/ready` is the traffic-routing probe and currently verifies PostgreSQL reachability; Redis joins readiness in AR2 when it becomes a runtime dependency.

## Database migration

Schema migration is explicit and separate from normal application startup:

```text
pnpm db:migrate
```

Run `prisma migrate deploy` through that repository script before sending traffic to a new schema-dependent release. Application startup must not silently mutate the database schema.

The Alpha seed is also explicit:

```text
pnpm db:seed
```

Do not run the seed automatically on every deploy. Apply it deliberately when creating/reconciling the controlled Alpha supply. The seed is repository-owned and idempotent.

## First deployment sequence

1. Provision PostgreSQL and Key Value in Singapore only after owner approval for the selected plans.
2. Create the Docker-backed web service from this repository and `main`.
3. Set production environment variables in Render, not in source control.
4. Run the database migration against the hosted PostgreSQL instance.
5. Deliberately apply the Alpha seed.
6. Verify `/health/live` and `/health/ready` over HTTPS.
7. Run the AR4 real-device smoke-test flow before inviting Alpha users.

## Failure and rollback rule

A failed readiness probe means the release does not receive traffic. Do not solve a failed deploy by weakening environment validation, health checks, CORS, or authentication. Roll back/redeploy the last known-good revision, diagnose from application/provider logs, and only then retry the release.
