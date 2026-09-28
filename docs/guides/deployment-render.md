# Render Closed Alpha deployment runbook

This runbook defines the minimum hosted shape for the first Wayfinder Closed Alpha. It is intentionally provider-specific and small; it is not a reusable multi-cloud abstraction.

## Target topology

All latency-sensitive resources live in Render Singapore:

- one public backend web service;
- one managed PostgreSQL database;
- one managed Redis-compatible Key Value instance;
- provider-managed HTTPS on the public service URL.

A custom domain is not required for the first Closed Alpha. Sentry is the external Stage-1 error tracker; it is not part of the latency-sensitive Render topology.

## Required application environment

Never commit production values to the repository.

- `NODE_ENV=production`
- `PORT` — supplied by Render to the web service; the application also has a local default for development.
- `DATABASE_URL` — hosted PostgreSQL connection string.
- `REDIS_URL` — hosted Key Value connection string. Production startup fails closed when it is absent.
- `SENTRY_DSN` — DSN for the dedicated Wayfinder backend Sentry project. Production startup fails closed when it is absent.
- `SENTRY_RELEASE` — optional deployed backend revision/label used for release correlation.
- `JWT_SECRET` — unique production secret; generate independently from development/test credentials.
- `LOG_LEVEL=info` unless incident debugging requires a temporary change.
- `ACCESS_TOKEN_TTL_SECONDS=900`
- `REFRESH_TOKEN_TTL_DAYS=14`
- `CORS_ORIGINS` — comma-separated browser origins. Empty means no cross-origin browser origin is allowed. Native mobile clients do not require browser CORS permission.
- `TRUST_PROXY_HOPS=1` — Render terminates public HTTPS in front of the service. Trust exactly one proxy hop so protocol/client-IP semantics are correct without trusting arbitrary forwarded headers by default.
- `REQUEST_BODY_LIMIT_KB=100` — explicit JSON and URL-encoded request size ceiling for the Alpha API.

The Alpha Sentry integration sends unexpected/5xx exceptions only. Request bodies, headers, user data, credentials and arbitrary extra context are removed by the application privacy boundary before events are sent. Tracing is disabled in Stage 1.

## Deploy contract

The repository production image is the deployable artifact. The application process is:

```text
node -r tsconfig-paths/register dist/main.js
```

The public provider health check should use:

```text
GET /health/ready
```

`/health/live` proves only that the process is alive. `/health/ready` is the traffic-routing probe and verifies both PostgreSQL and Redis reachability. A Redis outage therefore removes an instance from readiness rather than silently disabling abuse protection.

## Release-time database commands

Schema migration is explicit and separate from normal application startup. Run it from the production image before sending traffic to a schema-dependent release:

```text
./node_modules/.bin/prisma migrate deploy
```

The controlled Alpha seed is compiled into the same image and is also explicit:

```text
node dist-seed/prisma/seed.js
```

The runtime seed artifact intentionally does not require `ts-node` or development dependencies. Local development and the non-Docker integration suite can continue using `pnpm db:seed`.

Do not run the seed automatically on every deploy. Apply it deliberately when creating or reconciling the controlled Alpha supply. The seed remains repository-owned and idempotent. CI must prove both release-time commands from the built production image against a clean PostgreSQL service.

## First deployment sequence

1. Provision PostgreSQL and Key Value in Singapore only after owner approval for the selected plans.
2. Create the dedicated Sentry backend project and obtain its DSN before production/staging traffic is enabled.
3. Create the Docker-backed Render web service from this repository and `main`.
4. Set production environment variables in Render, including `DATABASE_URL`, internal `REDIS_URL`, `SENTRY_DSN`, and the application secrets; never commit them.
5. Run `./node_modules/.bin/prisma migrate deploy` from the deployed production artifact against hosted PostgreSQL.
6. Deliberately run `node dist-seed/prisma/seed.js` once to establish/reconcile the controlled Alpha supply.
7. Verify `/health/live` and `/health/ready` over HTTPS.
8. Trigger one controlled server-side test error and verify its Sentry event can be correlated to Render logs by `request_id`.
9. Run the AR4 real-device smoke-test flow before inviting Alpha users.

## Failure and rollback rule

A failed readiness probe means the release does not receive traffic. Do not solve a failed deploy by weakening environment validation, health checks, CORS, authentication, rate limiting, or error-tracking privacy controls. Roll back/redeploy the last known-good revision, diagnose from application/provider logs and Sentry when relevant, and only then retry the release.
