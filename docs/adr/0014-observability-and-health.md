# ADR-0014: Observability and health checks

- **Status:** Accepted
- **Date:** 2026-07-05
- **Deciders:** Founder

## Context

A solo operator cannot watch dashboards all day; the system must announce its own problems. Orchestrators and load balancers need machine-checkable health. Full observability stacks (Prometheus+Grafana+Tempo) are real ops burden — the plan must be staged, not maximal.

## Decision

**Health endpoints** (via `@nestjs/terminus`), unversioned and unauthenticated at the infrastructure edge:

- `GET /health/live` — process is up (no dependency checks). For restart decisions.
- `GET /health/ready` — dependencies reachable (Postgres ping, Redis ping). For traffic-routing decisions. Never called in a hot loop; cheap checks only.

**Staged observability plan** (recorded here, expanded in `docs/guides/observability.md`):

- **Stage 1 (launch):** structured logs with correlation IDs (ADR-0010) + an **error tracker** (Sentry or self-hosted GlitchTip) + uptime pings against `/health/ready`. This is the minimum that pages a human.
- **Stage 2 (traction):** metrics via **OpenTelemetry** instrumentation exporting Prometheus-format `/metrics` — RED metrics (rate, errors, duration) per route, queue depth, DB pool saturation.
- **Stage 3 (scale/multi-process):** distributed tracing (OTel traces), tying HTTP → job → DB spans under one trace ID.

Instrumentation is added via OpenTelemetry APIs from the start where trivial, so stages 2–3 are configuration, not rewrites.

## Consequences

- Liveness/readiness split prevents the classic outage where a dead dependency causes restart storms.
- Costs are staged to match team capacity; nothing requires running a metrics stack on day one.

## Alternatives considered

- **Full Prometheus/Grafana/Tempo from day one.** Ops burden without an operator. Deferred by design.
- **Vendor APM (Datadog/New Relic) from day one.** Excellent but costly; OTel-first keeps vendors swappable. Revisit at Stage 2.
