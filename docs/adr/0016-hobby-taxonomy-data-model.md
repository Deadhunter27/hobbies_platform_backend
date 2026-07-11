# ADR-0016: Hobby taxonomy — structured, data-driven

- **Status:** Accepted
- **Date:** 2026-07-11
- **Deciders:** Principal Architect

## Context

The catalog module needs to represent "what hobbies exist" in a way that
supports browsing, filtering, and search from day one, without hardcoding a
list of hobbies into application code (which would require a deploy to add
"pottery" or fix a typo) and without resorting to an open-ended
attribute-value store that makes filtering and indexing unpredictable.
Concretely, the platform needs to filter hobbies by difficulty, cost, and
setting, and to group them under browsable categories — all of which need
to be efficient, indexable queries, not application-side scans of loosely
typed data.

## Decision

We will model the hobby taxonomy as two tables owned exclusively by the
`catalog` module:

- **`catalog_hobby_category`** — a hierarchical category tree via a
  nullable, self-referencing `parentId`.
- **`catalog_hobby`** — individual hobbies, each belonging to exactly one
  category, carrying typed enum facets: `difficulty`
  (`beginner_friendly | moderate | demanding`), `costLevel`
  (`free | low | medium | high`), `setting` (`indoor | outdoor | both`), and
  `status` (`draft | active | archived`).

There is **no EAV (entity-attribute-value) table** and **no hardcoded hobby
or category list anywhere in application code**. All taxonomy content
(categories and hobbies) arrives as data — via an idempotent seed script for
initial/starter content, and later via staff-authored writes once identity
and audit logging exist to gate them. Any attribute the product needs to
filter, sort, or facet by is modeled as a real, typed column — never as a
loose key-value pair or a JSON blob scanned at query time.

## Consequences

- Filtering by difficulty/cost/setting is a plain indexed `WHERE` clause,
  not an application-side join across an attribute table or a JSON
  containment query — this keeps query plans simple and predictable as the
  catalog grows.
- Adding a genuinely new filterable facet (e.g. "typical group size") is a
  schema migration, not a code change to a generic attribute parser — this
  is an accepted cost in exchange for query simplicity and type safety.
- Content changes (new hobbies, renamed categories, fixed descriptions) are
  data changes, not deploys, from the moment write endpoints land; until
  then, the idempotent seed is the only content source, which is acceptable
  because M1 is read-only by design.
- The category tree's `parentId` self-reference means deep hierarchies are
  possible, but the catalog module makes no assumption about maximum depth;
  presentation-side concerns (how deep to render, breadcrumb construction)
  are left to consumers of the public API.
- Because writes are staff-gated and deferred until identity + audit exist,
  M1 ships with no create/update/delete endpoints for taxonomy data at all
  — this is a deliberate, temporary scope boundary, not an oversight.

## Alternatives considered

- **EAV / generic attribute table** (`hobby_id, attribute_key,
  attribute_value`) — maximally flexible without schema changes, but every
  filter becomes a join or a pivot, indexing is awkward (composite indexes
  on key+value don't compose across multiple simultaneous filters the way
  dedicated columns do), and type safety is lost (every value is a string
  until parsed).
- **JSONB "tags" column** on `catalog_hobby` — flexible and schema-light,
  but filtering/faceting requires JSON containment or GIN-index queries
  that are harder to reason about than a plain column index, and it invites
  inconsistent tag vocabularies over time with no enforcement.
- **Hardcoded enum-in-code lists** (a TypeScript array/object of known
  hobbies) — fastest to ship initially, but every content change requires a
  code review and deploy, and it conflates "what the taxonomy structurally
  allows" (code) with "what actually exists today" (data) — exactly what
  this ADR rejects.
