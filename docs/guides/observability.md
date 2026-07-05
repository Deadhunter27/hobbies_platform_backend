# Observability Plan

Governing decision: ADR-0014. Staged deliberately — a solo operator must not run more observability infrastructure than the product has users.

## Stage 1 — Launch (mandatory before first production traffic)

| Signal | Tool | What it answers |
|---|---|---|
| Structured logs + correlation IDs | Pino → stdout → host aggregator | "What happened during request X?" |
| Error tracking | Sentry (or GlitchTip) | "What broke, how often, for whom?" — pages a human |
| Uptime | External ping on `/health/ready` | "Is it up right now?" — pages a human |

## Stage 2 — Traction

- OpenTelemetry metrics → Prometheus-format `/metrics`.
- Golden signals per route: request rate, error rate, p50/p95/p99 latency.
- Queue depth & job failure rate (BullMQ), DB pool saturation, Redis health.
- Alert rules on symptoms (error rate, latency, queue backlog), not causes.

## Stage 3 — Scale / multi-process

- Distributed tracing (OTel): one trace ID across HTTP → queue job → DB.
- Becomes essential the day API and workers are separate processes (ADR-0013).

## Health checks (live now, in every stage)

- `GET /health/live` — process liveness only. Restart signal.
- `GET /health/ready` — Postgres + Redis reachability. Traffic-routing signal.
- Unauthenticated, unversioned, excluded from access-log noise and rate limits.

## Principles

- Instrument with OpenTelemetry APIs from the start where it costs nothing, so later stages are configuration, not rewrites.
- Every log line and metric that can carry `requestId` does.
- No metric without a question it answers; no alert without an action it triggers.
