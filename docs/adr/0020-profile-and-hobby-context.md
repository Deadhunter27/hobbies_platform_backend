# ADR-0020: Profile and Hobby Context bounded context

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Founder

## Context

Wayfinder's first real product loop depends on knowing more than identity. The system needs durable context for **why a person is here right now**: their relationship with a hobby, what they want from it, and enough lightweight location/context data to make future activities and recommendations relevant.

This information does not belong in `identity` (authentication/account lifecycle) and does not belong in `catalog` (shared hobby taxonomy). Putting it in either module would blur the boundaries already frozen in M1/M2.

The research prototype also exposed an important modeling rule: the user's **intent/context must be stored separately from the recommendation shown**, because the recommendation can be rejected or replaced while the underlying intent remains useful.

## Decision

Create a new bounded context and NestJS module named **`profile`**. W3 owns two concepts:

1. **Profile context** — lightweight, private product context attached to a user:
   - city (optional free-text city/locality label for V1);
   - country code (optional ISO-3166 alpha-2 shape);
   - timezone (optional IANA-style string; exact timezone validation may be tightened later).

2. **Hobby context** — one record per `(userId, hobbyId)` describing the user's current relationship with that hobby:
   - `experienceLevel`: `exploring | beginner | returning | regular | experienced`;
   - `primaryIntent`: `start | improve | social | explore`;
   - optional `secondaryIntents` from the same intent vocabulary;
   - optional short `goal`;
   - `socialPreference`: `solo | mixed | social`.

### API surface

Authenticated self-service endpoints:

- `GET /api/v1/me/profile-context`
- `PUT /api/v1/me/profile-context`
- `GET /api/v1/me/hobby-contexts`
- `GET /api/v1/me/hobby-contexts/{hobbyId}`
- `PUT /api/v1/me/hobby-contexts/{hobbyId}`

`PUT` is deliberately idempotent: the mobile onboarding/edit flow can send the full current context without needing a create-vs-update branch.

### Authorization

Every endpoint uses `@RequiresAuth()` and the existing ADR-0018 policy engine. W3 adds explicit self actions:

- `profile.context.read`
- `profile.context.update`

They are allowed only when `resource.type === 'user'` and `resource.id === actor.id`. No implicit ownership bypass is introduced.

### Cross-module collaboration

- `profile` imports `AccessModule` for `PolicyService`.
- `profile` imports `CatalogModule` and uses a **publicly exported catalog application service** to verify that a referenced hobby exists and is active.
- Other modules continue importing only from a bounded context's top-level `index.ts`.
- `profile` never reaches into catalog Prisma repositories or tables directly.

### Persistence and cross-context references

`profile` persists its own tables through Prisma repositories in its infrastructure layer.

The `userId` and `hobbyId` columns are **logical cross-context references, not database foreign keys**. The same database is shared by the modular monolith, but a DB-level FK across bounded contexts would couple migration order and ownership. Integrity is enforced at application boundaries:

- `userId` comes from the live authenticated actor;
- `hobbyId` must resolve through the catalog public application service before write.

The profile module owns uniqueness on `(userId, hobbyId)`.

### Privacy

W3 stores **no precise coordinates** and introduces no public-profile visibility model. City/country/timezone are private product context. Public sharing/privacy controls are intentionally deferred until a feature actually exposes profile data to other users; adding meaningless visibility flags now would create false confidence.

### Domain rules

- primary intent may not also appear in `secondaryIntents`;
- duplicate secondary intents are rejected at the boundary;
- goals are optional and intentionally short;
- profile/hobby context may evolve over time without rewriting historical Journey/Progress records in later milestones.

## Consequences

- `identity` remains focused on account/authentication lifecycle.
- `catalog` remains the source of truth for whether a hobby is active.
- W5 recommendations can consume profile/hobby context without owning it.
- W6 Journey can preserve historical events while profile context continues to change.
- The mobile app gets a stable server-side replacement for the research prototype's one-question/local-state context.

## Alternatives considered

### Add fields directly to `identity_user`
Rejected. Authentication identity would become a product-preference dumping ground and make future profile evolution risky to the auth aggregate.

### Put user-hobby relationship in `catalog`
Rejected. Catalog owns shared taxonomy, not person-specific state.

### Separate `profile` and `hobby-context` modules immediately
Rejected for W3. They have the same owner (the authenticated person's evolving product context), change together, and splitting them now creates coordination overhead without an independent lifecycle. Revisit if public profiles or complex relationship behavior later create a real boundary.

### Store recommendation state here
Rejected. Recommendations are W5. Profile stores user context; the recommendation and actual committed path remain separate concepts.
