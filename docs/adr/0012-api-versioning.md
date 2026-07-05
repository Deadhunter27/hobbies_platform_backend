# ADR-0012: API versioning strategy

- **Status:** Accepted
- **Date:** 2026-07-05
- **Deciders:** Founder

## Context

The primary client is a mobile app that users update on their own schedule — old app versions stay alive in the wild for months. The contract must be able to evolve without stranding them.

## Decision

- **URI versioning**: all routes live under `/api/v{N}` (NestJS built-in versioning). `v1` is the launch surface.
- The version increments **only on breaking changes** (removing/renaming fields, changing types/semantics, tightening required inputs). **Additive changes** (new endpoints, new optional fields) stay within the current version.
- During a major transition, the previous version is **supported in parallel with a published deprecation window** (target: 6 months post-mobile-migration), then removed. Deprecations are announced via response headers (`Deprecation`, `Sunset`) and the changelog.
- Clients must **ignore unknown response fields** — required behavior documented in the contract, which is what makes additive evolution safe.

## Consequences

- Old mobile builds keep working through a `v2` rollout; the version is visible in every log line and metric.
- **Cost accepted:** during a window, two versions of changed endpoints coexist (thin `v1` adapters over `v2` logic — versioning lives at the interface layer only, never duplicated domain logic).

## Alternatives considered

- **Header/media-type versioning.** Cleaner URIs, but harder to debug, cache, and eyeball in logs; no practical benefit for a first-party mobile client. Rejected.
- **No versioning ("just don't break it").** Fantasy over a 5-year horizon with immovable old app installs. Rejected.
