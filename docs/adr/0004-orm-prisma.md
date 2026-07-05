# ADR-0004: Prisma as the ORM

- **Status:** Accepted
- **Date:** 2026-07-05
- **Deciders:** Founder
- **Note:** This closes the decision deliberately left open in ADR-0003.

## Context

ADR-0003 chose PostgreSQL + PostGIS and explicit migrations, but intentionally deferred the ORM choice. Implementation is approaching and the data-access layer must be locked before any schema work. The team is a solo founder + Claude Code; the dominant constraints are type-safety end-to-end, migration discipline, and how reliably an AI agent can generate correct data-access code.

## Decision

We will use **Prisma** as the ORM: `schema.prisma` as the declarative schema, **Prisma Migrate** for versioned SQL migrations, and the generated client for type-safe queries.

## Consequences

- **Schema as reviewable artifact.** `schema.prisma` is a single, diffable declaration of the data model; migrations are generated SQL files, committed and reviewed like code — this satisfies ADR-0003's "every change is a migration" rule with strong tooling.
- **End-to-end type safety.** The generated client's types flow into application code; combined with OpenAPI generation (ADR-0005), types can reach the mobile client without hand-written duplication.
- **Best-in-class AI ergonomics.** Prisma has an enormous public footprint; Claude Code produces markedly more reliable Prisma code than TypeORM code, whose decorator/lazy-relation pitfalls are a known source of subtle bugs.
- **Cost accepted — PostGIS support is partial.** Prisma does not natively model geometry types. Geospatial columns will be introduced via raw SQL in migrations and queried via `$queryRaw` behind repository methods. This is contained: geo logic lives in a handful of repositories, not scattered.
- **Cost accepted — abstraction ceiling.** Complex reporting queries may outgrow the client; the sanctioned escape hatch is typed raw SQL inside repositories (never in application/domain layers).
- **Architecture guardrail unchanged:** the Prisma client is an infrastructure detail. It appears only in `infrastructure/` repository implementations, never in `domain/` or `application/`.

## Alternatives considered

- **TypeORM.** NestJS-native and mature, but decorator-heavy entities blur Clean Architecture layering, migration DX is weaker, and its query semantics (lazy relations, `save()` upsert behavior) are a recurring bug source — worse under AI-generated code.
- **Kysely (query builder).** Excellent type safety and full SQL power (including PostGIS), but no schema/migration story of its own and a smaller ecosystem; more assembly required than a solo team should take on. Remains attractive as a *complement* if raw-query needs grow.
- **Drizzle.** Promising and SQL-close, but younger; churn risk outweighs benefits for a 5-year foundation. Revisit only if Prisma's PostGIS gap becomes a chronic tax.
