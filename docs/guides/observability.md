# Observability Plan

Governing decision: ADR-0014. Staged deliberately — a solo operator must not run more observability infrastructure than the product has users.

## Stage 1 — Closed Alpha launch

| Signal | Tool | What it answers |
|---|---|---|
| Structured logs + correlation IDs | Pino → stdout → Render logs | "What happened during request X?" |
| Error tracking | Sentry | "What unexpected server error occurred, and how often?" |
| Availability | Render readiness health + external uptime check when the hosted service exists | "Is the service routable right now?" |

### Sentry boundary for Alpha

Sentry is deliberately used as an **error tracker only** in Stage 1. It is not the Alpha tracing or product-analytics system.

The server sends only unexpected/5xx exceptions. Expected client/application failures such as validation, authentication, authorization, not-found, conflicts and rate limiting stay in the normal HTTP contract and are not reported as Sentry issues.

Each reported server error receives only safe correlation tags:

- `request_id` — matches the `x-request-id` in Pino/HTTP responses;
- `http.method`;
- `http.route` — route template, never the raw URL/query string;
- `error.code`.

Before an event leaves the application, the Alpha privacy boundary removes request data, user data, breadcrumbs, arbitrary extras and auto-collected contexts. `sendDefaultPii` is disabled, tracing sampling is zero, and breadcrumbs are disabled. Request bodies, headers, credentials, tokens, emails and actor identifiers must not be intentionally attached to Sentry events.

`SENTRY_DSN` is required only for the production runtime; development/test can leave it unset. `SENTRY_RELEASE` is optional and should identify the deployed backend revision when available.

### Incident triage

For an Alpha server error:

1. open the Sentry issue and copy `request_id`;
2. find the same request in Render/Pino logs;
3. inspect the stack plus the correlated structured log;
4. determine whether the issue is one user request, a dependency failure, or a release regression;
5. fix/redeploy or roll back when the service is unsafe.

Do not add a dashboard or alert unless it has a concrete operator action. Initial alerting should stay limited to new/regressed server issues and service availability.

## Stage 2 — Traction

- OpenTelemetry metrics → Prometheus-format `/metrics`.
- Golden signals per route: request rate, error rate, p50/p95/p99 latency.
- Queue depth & job failure rate (BullMQ), DB pool saturation, Redis health.
- Alert rules on symptoms (error rate, latency, queue backlog), not causes.

## Stage 3 — Scale / multi-process

- Distributed tracing (OTel): one trace ID across HTTP → queue job → DB.
- Becomes essential the day API and workers are separate processes (ADR-0013).

## Health checks

- `GET /health/live` — process liveness only. Restart signal.
- `GET /health/ready` — Postgres + Redis reachability. Traffic-routing signal.
- Unauthenticated, unversioned, excluded from rate limits.

## Principles

- Keep Alpha observability proportionate to operator capacity.
- Every operational signal that can carry `requestId` does.
- Do not put secrets or user content into observability context.
- No metric without a question it answers; no alert without an action it triggers.
