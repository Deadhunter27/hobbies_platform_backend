# Architecture Overview

## The one-paragraph version

the platform's backend is a **single deployable NestJS application** (a modular monolith) partitioned into **bounded contexts** — Identity, Catalog, Community, Discussion, Events, and more added over time. Each context is internally structured with **Clean Architecture** so its core domain logic is independent of the framework and database. PostgreSQL (with PostGIS) is the single source of truth; Redis provides caching, sessions, and background job queues; an S3-compatible store holds media. The system is built to **grow by adding modules, not by rewriting** — and to be split into services later only if and when a specific pressure proves it necessary.

## Why this shape

The product blueprint describes a large ecosystem (communities, discussions, events, and eventually mentorship, progress tracking, marketplace, and more). The failure mode for an ambitious platform built by a very small team is trying to operate all of it at once. Our architecture resolves this tension:

- **Design for many contexts, build a few.** Module boundaries make future features additive.
- **Modular monolith, not microservices.** One thing to deploy, debug, and reason about. No network hops, no distributed-transaction pain, no per-service ops burden — none of which a pre-funding team can afford. See [ADR-0002](../adr/0002-modular-monolith.md).
- **Boring, proven infrastructure.** Postgres, Redis, object storage. Nothing exotic. See [ADR-0003](../adr/0003-database-and-persistence.md).

## Layers (per module)

```
interface       HTTP controllers, DTOs, request validation, presenters
   │  (depends inward)
application      use cases / command & query handlers, orchestration
   │
domain           entities, value objects, domain events, business rules
   ▲
infrastructure   DB repositories, cache, storage, external adapters
                 (implements interfaces defined by domain/application)
```

Dependencies point **inward**. `domain` knows nothing about NestJS, HTTP, or SQL. This keeps the part that encodes actual product rules testable in isolation and durable across framework changes.

## System context (high level)

```
        ┌─────────────────────────┐
        │  Mobile app (RN + Expo)  │
        └────────────┬────────────┘
                     │ HTTPS (REST, /api/v1)
                     ▼
        ┌─────────────────────────┐
        │   Hobbies Platform Backend      │
        │   (NestJS modular        │
        │    monolith)             │
        └───┬──────────┬───────┬───┘
            │          │       │
      ┌─────▼───┐ ┌────▼───┐ ┌─▼──────────┐
      │Postgres │ │ Redis  │ │ Object     │
      │+PostGIS │ │        │ │ storage+CDN│
      └─────────┘ └────────┘ └────────────┘
```

## Cross-cutting concerns

Authentication, authorization (relationship-scoped), configuration, logging, error handling, and validation are handled by `src/shared` and `src/infrastructure` so modules don't reinvent them. Each gets its own guide or ADR as it is implemented.
