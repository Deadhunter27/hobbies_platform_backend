# CLAUDE.md — Working Contract for Claude Code

Read this file **first**, before implementing anything in this repository. It encodes the rules that make implementation unambiguous. If a task conflicts with this file or with an ADR, **stop and surface the conflict** — never silently resolve it, never silently reverse a decision.

## Prime directive

This backend exists for one reason: to help people **participate in real-world hobbies and communities**. When a design choice is ambiguous, pick the option that best serves real-world participation. Social/engagement features are means, never ends.

## Current phase — READ THIS

**Phase 1 (repository foundation) is complete and under review.** Do **not** implement authentication, user/profile modules, events, communities, feeds, chat, notifications, database schemas, Prisma models, or API endpoints until Phase 2 is explicitly approved. Foundation-level tasks only.

## Locked stack (ADRs are binding)

TypeScript strict + NestJS (0001) · Modular monolith (0002) · PostgreSQL + PostGIS, Redis, S3-compatible storage (0003) · Prisma + Prisma Migrate (0004) · OpenAPI generated from code, committed to `openapi/` (0005) · Docker + Compose (0006) · GitHub Actions (0007) · Zod-validated env config, fail-closed (0008) · `AppError` hierarchy + global filter (0009) · Pino structured logs + correlation IDs (0010) · Zod at every boundary (0011) · URI versioning `/api/v1` (0012) · BullMQ + `PROCESS_ROLE` flag (0013) · Terminus health checks + staged observability (0014)

## Before you write code

1. Read the relevant **ADRs** in `docs/adr/` — binding decisions, not suggestions.
2. Read `docs/architecture/` (overview, modular-monolith, folder-structure, scaling-and-service-boundaries).
3. Read the relevant guide in `docs/guides/` (API conventions, migrations, OpenAPI, security, testing).
4. If a task requires a decision no ADR covers, **write the ADR first** (Proposed status, in the PR), then implement. Never guess and bury a decision in code.

## Non-negotiable rules

- **One module per bounded context.** Other modules import only from its `index.ts`. Cross-module collaboration = exported service or domain events.
- **Clean Architecture layering** (`interface → application → domain`; `infrastructure` implements ports). `domain` imports nothing framework-specific — no NestJS, no Prisma, no HTTP.
- **Prisma appears only in `infrastructure/` repositories** (ADR-0004).
- **Validate at every boundary with Zod**; handlers receive parsed, typed data; types are inferred, never duplicated (ADR-0011).
- **Errors:** throw `AppError` subclasses with stable codes; never `HttpException` outside the interface layer (ADR-0009).
- **Config:** never read `process.env` outside `src/config` (ADR-0008). New config = schema + `.env.example` + typed consumption.
- **Every DB change is a committed Prisma migration; review the SQL; roll forward, never edit history** (migrations guide).
- **Every endpoint carries complete OpenAPI decorators**; regenerate the spec in the same PR (ADR-0005).
- **Jobs are idempotent, Zod-validated, carry IDs not fat objects** (ADR-0013).
- **Authorization is explicit and relationship-scoped at every protected operation. Default deny.**
- **No secrets/PII in logs; redaction is central** (ADR-0010).

## Conventions cheat-sheet

- Commits: Conventional Commits (`feat(catalog): ...`). Branches: `type/short-desc` off `main`, short-lived. Squash-merge.
- Tests: unit co-located (`*.spec.ts`), integration/e2e in `test/`; domain layer testable with zero infrastructure mocks.
- Path aliases: `@modules/*`, `@shared/*`, `@infra/*`, `@config/*`.
- Local infra: `docker compose up -d`. Health: `/health/live`, `/health/ready`.

## When in doubt

Prefer boring, proven solutions. Prefer explicit over clever. Prefer a written decision over an assumption. **Stop and ask instead of inventing.**
