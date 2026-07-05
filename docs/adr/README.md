# Architecture Decision Records (ADRs)

An ADR captures a single significant decision: its context, the choice made, and its consequences. ADRs are **append-only history** — never deleted, never renumbered; a changed decision is recorded as a *new* ADR that supersedes the old one.

## Why we keep ADRs

Code shows *what*; ADRs preserve *why*. This matters doubly here because implementation is delegated to Claude Code, which must respect prior decisions rather than relitigate them. A decision not written down does not exist.

## Format

Lightweight Nygard style — see the [template](0000-template.md). Number sequentially: `NNNN-short-title.md`.

## Status values

`Proposed` → `Accepted` → (later) `Superseded by ADR-XXXX` or `Deprecated`.

## Index

| # | Title | Status | Covers |
|---|---|---|---|
| [0001](0001-backend-language-and-framework.md) | Backend language and framework | Accepted | Why TypeScript, why NestJS |
| [0002](0002-modular-monolith.md) | Modular monolith over microservices | Accepted | Architecture shape, future service boundaries |
| [0003](0003-database-and-persistence.md) | Database and persistence spine | Accepted | Why PostgreSQL(+PostGIS), why Redis, migration mandate |
| [0004](0004-orm-prisma.md) | Prisma as the ORM | Accepted | Closes the ORM question left open in 0003 |
| [0005](0005-openapi-contract.md) | OpenAPI as the single contract source | Accepted | Swagger generation, mobile type consumption |
| [0006](0006-docker-and-compose.md) | Docker + Docker Compose | Accepted | Packaging, local infrastructure |
| [0007](0007-ci-github-actions.md) | GitHub Actions for CI/CD | Accepted | Pipeline platform |
| [0008](0008-configuration-strategy.md) | Configuration strategy | Accepted | Validated env, typed access, fail-closed |
| [0009](0009-error-handling.md) | Error handling philosophy | Accepted | Error hierarchy, codes, global filter |
| [0010](0010-logging.md) | Logging strategy | Accepted | Pino, JSON, correlation IDs, redaction |
| [0011](0011-validation.md) | Validation strategy | Accepted | Zod at every boundary |
| [0012](0012-api-versioning.md) | API versioning | Accepted | URI versioning, deprecation policy |
| [0013](0013-background-jobs.md) | Background jobs | Accepted | BullMQ, worker-split-ready deployment |
| [0014](0014-observability-and-health.md) | Observability & health checks | Accepted | Liveness/readiness, staged observability |

> **Numbering note.** Some externally circulated topic lists number these decisions differently (e.g. "ADR-0001 Why NestJS, 0004 Why PostgreSQL"). The numbers above are canonical: 0001–0003 were accepted earlier and ADRs are never renumbered. Every topic from that list is covered — NestJS (0001), modular monolith (0002), PostgreSQL and Redis (0003), Prisma (0004), OpenAPI (0005), Docker (0006), GitHub Actions (0007), configuration (0008), errors (0009), logging (0010), validation (0011), versioning (0012), jobs (0013), observability (0014).

## Open decisions (record before implementation touches them)

- Authentication mechanism details (token model, session strategy) — owned by the identity phase
- Relationship-scoped RBAC model
- Hobby taxonomy / data-driven catalog model
- Geo & discovery/search approach (PostGIS query patterns, ranking)
- Deployment target / infrastructure provider
- Realtime transport (WebSockets/SSE) — deferred until a feature needs it
