# ADR-0003: Database and persistence spine

- **Status:** Accepted
- **Date:** 2026-07-04
- **Deciders:** Founder

## Context

The platform facilitates **real-world, local** hobby participation: nearby communities, local events, buddy-finding. Location is a first-class concern, not an afterthought. We also need caching, sessions, background jobs, and media storage. We prize boring, proven infrastructure.

## Decision

- **PostgreSQL** is the single source of truth, with the **PostGIS** extension for geospatial queries.
- **Redis** provides caching, session storage, and background job queues.
- An **S3-compatible object store + CDN** holds user media (avatars, community/event images).
- **All schema changes are explicit migrations.** No implicit schema sync in any environment.

## Consequences

- **Geo is native.** Proximity search ("communities/events near me") runs in the database via PostGIS rather than being approximated in application code.
- **One primary datastore** keeps operations simple and transactions strong; we resist adding specialized stores until a proven need appears.
- **Search starts in Postgres** (full-text + trigram). We adopt a dedicated search engine (e.g. OpenSearch/Meilisearch) only when Postgres search demonstrably no longer suffices — recorded as a future ADR.
- **Cost accepted:** Postgres full-text search is less feature-rich than a dedicated engine; acceptable for launch scale.

## Alternatives considered

- **NoSQL primary (e.g. MongoDB).** Our data is highly relational (users, memberships, events, RSVPs) and benefits from constraints and joins. Rejected as primary store.
- **Dedicated search engine from day one.** Extra infrastructure to run and sync before it is needed. Deferred.
- **ORM choice** (Prisma vs TypeORM vs Kysely) is deliberately **not** decided here; it is an open ADR to be resolved at implementation time.
