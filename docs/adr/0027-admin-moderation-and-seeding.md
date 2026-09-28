# ADR-0027 — Staff operations, moderation, and seeded supply management

- Status: Accepted
- Date: 2026-09-28

## Context

The Wayfinder Alpha now has enough real product state that supply and trust can no longer be maintained only by editing database rows or hard-coded fixtures. W10 needs staff tooling for taxonomy writes, activity/community curation, moderation, and seeded supply management without creating a second authorization system or exposing dangerous operational shortcuts.

## Decision

1. W10 introduces an `admin` application/interface boundary for staff operations. It coordinates existing bounded contexts rather than taking ownership of Catalog, Activity, Community, or Conversation data.
2. Every W10 endpoint requires authentication and an explicit existing policy decision. Catalog taxonomy writes use `catalog.manage`; other staff operations use `platform.manage`. Global `staff` remains the platform role that can satisfy those capabilities.
3. Moderation is modeled as explicit lifecycle transitions on source aggregates. W10 does not create hidden shadow copies of user/community/conversation content.
4. The first moderation surface is intentionally narrow: staff can archive/publish Conversation content and curate Activity/Community lifecycle state through module-owned seams. Moderation does not introduce engagement scoring, reputation scoring, or automated content judgment.
5. Catalog writes remain owned by Catalog. W10 may expose staff endpoints/use cases for creating or updating hobby taxonomy, but business validation and persistence stay inside the Catalog module.
6. Seed data stays deterministic, reviewable, and idempotent in repository-owned seed scripts. W10 does **not** expose an HTTP endpoint that executes arbitrary seed scripts or accepts executable seed payloads in production.
7. Seeded supply may use stable source identifiers so staff-created/curated Activity and Community records can be reconciled safely during development and Alpha operations.
8. All staff mutations are auditable using the existing append-only audit capability where the touched module already emits audit events; new W10 orchestration must not bypass existing audit boundaries.
9. W10 does not build a separate admin frontend framework, workflow engine, bulk-import platform, recommendation-rule DSL, or autonomous moderation system. The milestone is the minimum safe staff API/tooling needed to operate the Alpha.

## Consequences

- Staff capabilities remain reviewable in the existing default-deny policy layer instead of being scattered through controllers.
- Product bounded contexts retain ownership of their own state and validation rules.
- Development/Alpha seed workflows remain reproducible and code-reviewed rather than remotely executable.
- Moderation can evolve later into richer queues/reasons/history without blocking safe lifecycle controls now.
- A future dedicated staff UI can consume the W10 API without changing core ownership boundaries.
