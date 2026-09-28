# Alpha Readiness / Deployment & Real-Usage Preparation

This document tracks the post-W10 work required before Wayfinder is exposed to real Alpha users.
It is intentionally not a new product-feature milestone. New product scope should only enter this program when it blocks a safe Closed Alpha.

## Goal

Make the existing Alpha deployable, observable, abuse-resistant, recoverable, and testable on real devices without weakening the product boundaries established through W10.

## Deployment decision

### Target

- Hosting provider: Render
- Primary region: Singapore
- Application shape: one public NestJS web service
- Database: managed PostgreSQL in the same region
- Key-value store: managed Redis-compatible Key Value in the same region
- Deployment source: `main`
- HTTPS: provider-managed public HTTPS endpoint
- Custom domain: not required for first Closed Alpha

### Why this is the Alpha default

- Existing backend is already container/build ready and has CI health-boot proof.
- Singapore is the closest available Render region to the intended initial Indonesia-based Alpha audience.
- Keeping web service, PostgreSQL, and Key Value in one provider/region reduces operational complexity for the first real-user experiment.
- This is an Alpha hosting decision, not a permanent infrastructure commitment. Revisit only when evidence shows a concrete limitation.

## Readiness gates

### AR0 — Deployment decision and readiness audit

Acceptance:

- deployment target and region are explicit;
- required runtime dependencies are enumerated;
- no existing Render resources need migration/reconciliation;
- production configuration gaps are identified before resource provisioning;
- no paid resource is created without explicit owner approval.

Current status: in progress.

### AR1 — Production configuration and HTTP security

Acceptance:

- production environment variables fail closed;
- `DATABASE_URL`, JWT secret, CORS allowlist, and runtime settings are documented without committing secrets;
- CORS behavior is tested for allowed and disallowed browser origins;
- HTTPS/proxy behavior is safe behind the hosting provider;
- request/body limits and security headers are reviewed;
- migration execution is explicit and repeatable;
- health/readiness endpoints are suitable for provider probes.

Note: strict CORS allowlisting is already implemented. AR1 verifies production wiring rather than re-implementing it.

### AR2 — Redis-backed abuse protection

Acceptance:

- Redis/Key Value runtime connectivity is fail-closed where rate limiting depends on it;
- global sane rate limits exist;
- authentication endpoints have stricter limits than ordinary reads;
- expensive/protected writes have explicit limits where appropriate;
- throttled requests return a stable `429` contract;
- unit/integration/e2e coverage proves the important policies;
- no engagement or product-ranking behavior is introduced through Redis.

### AR3 — Observability and error tracking

Acceptance:

- uncaught application errors are captured by the selected error tracker;
- request correlation remains available in application logs;
- secrets/tokens/passwords are not emitted to telemetry;
- Render logs and basic service/database/key-value metrics are usable for incident triage;
- a minimal Alpha alerting/escalation rule is documented;
- observability remains proportionate to Closed Alpha rather than becoming an enterprise monitoring project.

### AR4 — Staging deployment and real-device smoke test

Acceptance:

- web service, PostgreSQL, and Key Value run in Singapore;
- migrations complete successfully against an empty hosted database;
- repository-owned Alpha seed data can be applied deliberately and rerun safely;
- public health endpoints succeed over HTTPS;
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

Do not create paid Render resources until the repository-side AR0/AR1 audit determines the minimum required shape and the owner explicitly approves the spend.

When provisioning begins, create all latency-sensitive resources in Singapore and keep the first environment intentionally small. Scale only from observed Alpha demand.

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
