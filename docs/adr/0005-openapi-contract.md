# ADR-0005: OpenAPI as the single source of truth for the API contract

- **Status:** Accepted
- **Date:** 2026-07-05
- **Deciders:** Founder

## Context

The mobile repository (React Native + Expo + TypeScript) already exists. Backend and mobile are separate repos maintained by the same tiny team. The classic failure mode is contract drift: the mobile app's types silently diverging from what the API actually returns. Duplicate hand-written contracts are explicitly forbidden by the cross-repo agreement.

## Decision

- The API contract is expressed as an **OpenAPI 3 document generated from the NestJS code** (`@nestjs/swagger` decorators on controllers and DTOs).
- Every endpoint and DTO **must** carry the decorators needed for complete, accurate generation — an undocumented endpoint fails review.
- The generated spec is emitted to `openapi/openapi.json` by a build script and committed, so contract changes appear as reviewable diffs in PRs.
- The mobile repository consumes this artifact to **generate TypeScript client types** (e.g. `openapi-typescript`). Codegen tooling on the mobile side is owned by the mobile repo; the backend's obligation is a complete, accurate, versioned spec.

## Consequences

- **One contract, two consumers.** Swagger UI for humans, generated types for the client. No hand-maintained duplicate.
- **Contract changes are visible in review.** A PR that changes the API changes `openapi.json`; a breaking diff is caught at review time, not in production.
- **Cost accepted:** decorator annotations add verbosity to controllers/DTOs. This is the price of a machine-readable contract; code-first keeps it adjacent to the code rather than in a drifting separate file.

## Alternatives considered

- **Spec-first (write OpenAPI by hand, generate server stubs).** Stronger contract governance, but doubles authoring effort and NestJS stub generation is weak. Wrong trade for a solo team.
- **tRPC.** Superb end-to-end types in TypeScript monorepos, but couples client and server tightly, has no language-neutral contract for a future web/admin/third-party consumer, and bypasses REST conventions already locked in the API guide. Rejected.
- **GraphQL.** Flexibility we don't need yet, with caching/authz complexity we don't want. A future ADR may revisit for specific aggregation needs.
