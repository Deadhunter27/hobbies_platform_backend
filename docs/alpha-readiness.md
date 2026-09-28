# Alpha Readiness / Deployment & Real-Usage Preparation

This document tracks the post-W10 work required before Wayfinder is exposed to real Alpha users.
It is intentionally not a new product-feature milestone. New product scope should only enter this program when it blocks a safe Closed Alpha.

## Goal

Make the existing Alpha deployable, observable, abuse-resistant, recoverable, and testable on real devices without weakening the product boundaries established through W10.

## Deployment decision

### Current personal-staging target

- API compute: Vercel Hobby, native NestJS, Singapore (`sin1`).
- Database: free managed PostgreSQL in Singapore or the closest available region.
- Key-value store: Upstash Redis free tier over TLS.
- Error tracking: Sentry Developer/free project.
- Deployment source: `main` after readiness verification.
- HTTPS: provider-managed public HTTPS endpoint.
- Custom domain: not required for personal staging.

### Closed Alpha target retained

Render remains the preferred simple one-provider topology for the later external Closed Alpha:

- one public NestJS web service in Singapore;
- managed PostgreSQL in the same region;
- managed Redis-compatible Key Value in the same region.

The Render path is deferred rather than removed. Initial free-resource provisioning was blocked by provider account payment verification, and the owner does not need paid/verified infrastructure while the product is still being tested personally.

### Why the staging target changed

- Existing backend is already container/build ready and provider-neutral at the application layer.
- Vercel now supports conventional NestJS entry points directly as a single Fluid Compute function, so personal hosted testing does not require an application rewrite.
- Singapore compute keeps the API close to the intended Indonesia-based test usage and should be paired with nearby data stores.
- Free personal staging should prove hosted execution and the real-device loop before infrastructure spend is justified.
- This is a testing-stage infrastructure decision, not a permanent product architecture commitment.

## Readiness gates

### AR0 — Deployment decision and readiness audit

Acceptance:

- deployment target and region are explicit;
- required runtime dependencies are enumerated;
- existing provider resources are inspected before reconciliation;
- production configuration gaps are identified before resource provisioning;
- no paid resource is created without explicit owner approval.

Current status: complete. The initial Render topology was audited and remains documented as the Closed Alpha option. Personal hosted staging has moved to Vercel + free managed PostgreSQL + Upstash because no paid or payment-verified infrastructure is justified before personal testing proves the product loop.

### AR1 — Production configuration and HTTP security

Acceptance:

- production environment variables fail closed;
- `DATABASE_URL`, JWT secret, CORS allowlist, and runtime settings are documented without committing secrets;
- CORS behavior is tested for allowed and disallowed browser origins;
- HTTPS/proxy behavior is safe behind the hosting provider;
- request/body limits and security headers are reviewed;
- migration execution is explicit and repeatable;
- health/readiness endpoints are suitable for provider probes.

Note: strict CORS allowlisting was already implemented before this program. AR1 makes proxy trust and request-size policy explicit, centralizes the HTTP hardening seam, adds behavioral e2e proof, and records provider deployment contracts in `docs/guides/`.

Current status: complete. PR #10 was merged to `main` as `910a344d`, and the merged commit passed CI and CodeQL.

### AR2 — Redis-backed abuse protection

Acceptance:

- Redis/Key Value runtime connectivity is fail-closed where rate limiting depends on it;
- global sane rate limits exist;
- authentication endpoints have stricter limits than ordinary reads;
- expensive/protected writes have explicit limits where appropriate;
- throttled requests return a stable `429` contract;
- unit/integration/e2e coverage proves the important policies;
- no engagement or product-ranking behavior is introduced through Redis.

Current status: complete. PR #11 was squash-merged to `main` as `f908afdf`, and the merged commit passed format/lint, typecheck, unit, real Redis integration, e2e, OpenAPI staleness, build, Docker readiness and CodeQL checks. The implementation uses production-required `REDIS_URL`, Redis-backed atomic counters, layered global/auth-target/sensitive-write policies, stable `429 RATE_LIMIT_EXCEEDED`, hashed limiter identities and Redis readiness health.

### AR3 — Observability and error tracking

Acceptance:

- uncaught application errors are captured by the selected error tracker;
- request correlation remains available in application logs;
- secrets/tokens/passwords are not emitted to telemetry;
- hosted logs and basic compute/database/key-value signals are usable for incident triage;
- a minimal Alpha alerting/escalation rule is documented;
- observability remains proportionate to Closed Alpha rather than becoming an enterprise monitoring project.

Current status: code-side complete and merged. PR #12 was squash-merged to `main` as `110a195d`, and the merged commit passed full CI and CodeQL. Sentry is wired as the Stage-1 server error tracker only, with tracing/metrics deferred; production requires `SENTRY_DSN`, expected 4xx failures are not reported, unexpected/5xx failures retain safe request correlation, and request/user/breadcrumb/extra/context data is removed before transmission. The formal AR3 gate remains open only until a real hosted Sentry backend project/DSN is bound and one controlled event is correlated to the matching Pino request log.

### AR4 — Hosted personal staging and real-device smoke test

Acceptance:

- the NestJS API runs on Vercel Singapore using the conventional `src/main.ts` entry point;
- PostgreSQL and Redis are hosted dependencies reachable from the deployed function;
- migrations complete successfully against an empty hosted database;
- repository-owned Alpha seed data can be applied deliberately and rerun safely;
- public health endpoints succeed over HTTPS;
- Vercel proxy/client-IP behavior preserves the intended Redis rate-limit identity;
- the mobile Alpha can call the hosted API from a real device/network;
- the directional loop is smoke-tested end to end:
  - register/login;
  - profile/hobby context;
  - What's Next;
  - Activity discovery and commitment;
  - reflection and Journey;
  - Community context;
  - Conversation create/reply;
  - staff curation/moderation;
- a deployment rollback/redeploy procedure is proven.

Current status: provider adaptation in progress on `wayfinder-alpha-readiness-vercel`. PR #13 already hardened the shared release artifact and proved migration + compiled seed execution from the production container. The Vercel adaptation keeps those capabilities intact, pins Node 22 for CI/runtime parity, sets `sin1`, preserves one-hop trusted proxy semantics, and adds a provider-specific runbook without deleting the Render deployment path.

### AR5 — Closed Alpha launch gate

Acceptance:

- test/staff accounts and staff authorization procedure are documented;
- database backup/recovery expectation is explicit;
- seed/reset policy is explicit;
- known limitations are documented;
- a user issue-reporting path exists;
- privacy-sensitive behavior is reviewed against `SECURITY.md`;
- the team has a small set of Alpha learning questions/signals;
- no unresolved P0/P1 launch blocker remains.

## Provisioning boundary

Personal staging should remain on free resources while only the owner is testing. Do not upgrade a provider, create paid infrastructure, or enable billable add-ons without explicit owner approval.

Before external Closed Alpha users are invited, reassess reliability and operational simplicity. The documented Render Singapore topology remains the leading paid/simple option once infrastructure spend is justified by real-user testing.

## What this program is not

Alpha Readiness is not permission to add another broad product milestone. Specifically, it should not introduce:

- a generic admin CMS;
- engagement ranking or social-growth mechanics;
- push/email/SMS infrastructure unless a real Alpha blocker requires it;
- microservices;
- generalized workflow engines;
- infrastructure abstractions for hypothetical future providers;
- premature autoscaling or multi-region architecture.

The purpose is to make the product already built safe and credible enough to generate real user evidence.
