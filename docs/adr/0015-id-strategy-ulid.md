# ADR-0015: ID strategy — ULID

- **Status:** Accepted
- **Date:** 2026-07-11
- **Deciders:** Principal Architect

## Context

Every aggregate in the system needs a primary key. The choice affects three
things at once: how indexes and page caches behave under high insert rates,
whether IDs exposed on a public, social platform can be enumerated or
scraped, and whether an ID alone can serve as a stable pagination tiebreaker
without an extra "created at" column. An auto-increment integer leaks
sequence/volume information and enumerates trivially; a random UUIDv4
defeats index locality (random insert order across a B-tree) and carries no
temporal ordering, so pagination still needs a separate timestamp column and
tiebreak.

## Decision

We will use **ULID** (Universally Unique Lexicographically Sortable
Identifier) for every primary key across every bounded context. IDs are
**generated in the application's domain layer**, not by the database, and
stored as `CHAR(26)` (the canonical Crockford base32 ULID encoding).

## Consequences

- IDs are time-ordered, so B-tree indexes on primary keys stay
  insert-friendly (no random-order page splits), and an ID alone gives a
  stable secondary sort key for cursor pagination tiebreaks.
- IDs are non-enumerable in practice (an attacker cannot walk `id+1` to
  scrape content), which matters on a platform where hobby/community/user
  IDs are public in URLs.
- Because generation happens in the domain layer, every `create()`-style
  factory method is responsible for calling the ID generator explicitly —
  Prisma schemas must never declare a `@default(...)` on an `id` column, or
  "app-generated" silently degrades into "DB-generated when the app forgets
  to pass one."
- `CHAR(26)` is fixed-width, which keeps index entries predictable in size
  compared to a variable-length string column.
- ULIDs still leak coarse creation time (millisecond-precision timestamp
  prefix). This is accepted: no ID in this system is treated as a secret,
  and coarse timing information is not considered sensitive here.

## Alternatives considered

- **Auto-increment integer** — smallest index footprint, but enumerable
  (`/hobbies/1042` invites scraping and reveals total volume) and requires a
  round-trip to the database before an aggregate has an identity, which
  complicates domain-layer construction and event publication before
  persistence.
- **UUIDv4** — widely supported, non-enumerable, but purely random: no
  temporal ordering, poor B-tree locality under high write volume, and
  pagination still needs a separate `createdAt` tiebreak column.
- **UUIDv7** — time-ordered like ULID and standardized, but tooling support
  (Prisma, various client libraries) was less mature at the time of this
  decision, and ULID's plain-text sortable encoding is easier to reason
  about and debug in logs/URLs than UUID's hyphenated hex form.
