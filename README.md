# Hobbies Platform — Backend

The backend service for the **Hobbies Platform** (brand name pending trademark clearance; working name "Companion"), a mobile-first social platform whose single, non-negotiable objective is to help people **participate in real-world hobbies and communities**. Everything in this codebase exists to serve that objective — social features are connective tissue, not the destination.

> **Status:** v0.2.0 — the platform kernel, the public **catalog** API (M1), and the **identity & access** stack with an append-only audit trail (M2) are implemented, tested, and CI-verified. See [`docs/roadmap.md`](docs/roadmap.md) for milestone status and [`CHANGELOG.md`](CHANGELOG.md) for release history.

---

## What this repository is

A **modular monolith** built with **NestJS + TypeScript**, designed to be extended one bounded context at a time without ever requiring a rewrite. It is the durable spine of the product: extensible toward a large feature ecosystem (communities, discussions, events, and later mentorship, progress, marketplace, and more), while shipping a deliberately small first slice.

If you are a human contributor, start with the [Development Guide](docs/guides/development.md).
If you are **Claude Code**, read [`CLAUDE.md`](CLAUDE.md) first — it is your working contract.

---

## Technology spine

| Concern         | Choice                                           | Rationale (see ADRs)                                                                                                                                        |
| --------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language        | TypeScript (strict)                              | One language across mobile, backend, shared types → maximum leverage for a small team. [ADR-0001](docs/adr/0001-backend-language-and-framework.md)          |
| Framework       | NestJS                                           | Module system maps to bounded contexts; opinionated, testable, boring-in-a-good-way. [ADR-0001](docs/adr/0001-backend-language-and-framework.md)            |
| Architecture    | Modular monolith + Clean Architecture per module | Extensibility without operational tax. [ADR-0002](docs/adr/0002-modular-monolith.md)                                                                        |
| Database        | PostgreSQL + PostGIS                             | Single source of truth; geo is first-class. [ADR-0003](docs/adr/0003-database-and-persistence.md)                                                           |
| ORM             | Prisma + Prisma Migrate                          | Type-safe client, reviewable SQL migrations. [ADR-0004](docs/adr/0004-orm-prisma.md)                                                                        |
| Cache / jobs    | Redis + BullMQ                                   | Cache, sessions, background queues, worker-split-ready. [ADR-0003](docs/adr/0003-database-and-persistence.md), [ADR-0013](docs/adr/0013-background-jobs.md) |
| API contract    | OpenAPI generated from code                      | Single source of truth; mobile consumes generated types. [ADR-0005](docs/adr/0005-openapi-contract.md)                                                      |
| Packaging       | Docker + Docker Compose                          | Same image every environment; one-command local infra. [ADR-0006](docs/adr/0006-docker-and-compose.md)                                                      |
| Object storage  | S3-compatible + CDN                              | Media (avatars, community/event images). [ADR-0003](docs/adr/0003-database-and-persistence.md)                                                              |
| Package manager | pnpm                                             | Fast, disk-efficient. Swap to npm is a one-line change.                                                                                                     |
| Runtime         | Node.js LTS (see `.nvmrc`)                       | Verify against current LTS before setup.                                                                                                                    |

## Repository map

```
.github/          Issue/PR templates, CODEOWNERS, CI workflows, Dependabot
docs/             Architecture, ADRs, and engineering guides (the source of truth)
  architecture/   How the system is shaped and why
  adr/            Architecture Decision Records (append-only history)
  guides/         Development, API conventions, testing, env, releases, docs
src/              Application source (kernel + catalog, identity, access modules)
  modules/        One folder per bounded context (see src/modules/README.md)
  shared/         Cross-cutting building blocks reused by modules
  infrastructure/ Framework/adapters wiring (DB, cache, storage clients)
  config/         Typed, validated configuration loading
test/             End-to-end and cross-module integration tests
CLAUDE.md         Working contract for Claude Code
```

## Getting started

Full instructions live in the [Development Guide](docs/guides/development.md). In brief:

```bash
nvm use                 # match the pinned Node version
corepack enable         # enable pnpm
pnpm install            # install tooling
cp .env.example .env    # create your local env; never commit .env
docker compose up -d    # local PostGIS + Redis + MinIO
```

## Documentation index

- [Architecture overview](docs/architecture/overview.md) · [Modular monolith](docs/architecture/modular-monolith.md) · [Folder structure](docs/architecture/folder-structure.md) · [Scaling & service boundaries](docs/architecture/scaling-and-service-boundaries.md)
- [Architecture Decision Records](docs/adr/README.md) — 19 accepted decisions
- [Roadmap & milestones](docs/roadmap.md) · [Changelog](CHANGELOG.md)
- Guides: [Development](docs/guides/development.md) · [API conventions](docs/guides/api-conventions.md) · [OpenAPI](docs/guides/openapi.md) · [Migrations](docs/guides/database-migrations.md) · [Testing](docs/guides/testing-strategy.md) · [Environment](docs/guides/environment-variables.md) · [Security](docs/guides/security-guidelines.md) · [Observability](docs/guides/observability.md) · [Dependencies](docs/guides/dependency-policy.md) · [Versioning & releases](docs/guides/versioning-and-releases.md) · [Documentation](docs/guides/documentation-strategy.md)
- [Contributing](CONTRIBUTING.md) · [Security policy](SECURITY.md) · [Claude Code contract](CLAUDE.md)

## License

Proprietary — All Rights Reserved. See [LICENSE](LICENSE).
