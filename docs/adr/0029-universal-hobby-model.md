# ADR-0029: Universal hobby model with a scope guard

- **Status:** Proposed
- **Date:** 2026-10-17
- **Deciders:** Founder (review pending)
- **Builds on:** ADR-0016 (taxonomy), ADR-0020 (profile/hobby context), ADR-0022 (What's Next), ADR-0027 (staff operations)

## Context

Wayfinder is meant to be a home for any hobby, but the Alpha behaves like a running app:

- The backend is mostly hobby-neutral: the catalog is data (ADR-0016), and profile, activity, progress, community and conversation records all carry a `hobbyId`. The catalog holds six hobbies.
- The coupling sits at the edges:
  - Strava sync writes every activity into the `running` hobby and drops non-running sport types (`runningHobbyId`, `isRunningActivity`).
  - What's Next throws `NoViableRecommendationError` when a hobby has no curated activity supply, which today is every hobby except Running.
- The mobile app is coupled throughout: 16 files reference Running.
  - One hard-coded content file maps backend activity ids to local copy.
  - The record form always sends `sportType: 'Run'` and only offers duration and distance.
  - App state holds a single `hobbyId`.

The founder wants any hobby to be usable freely, while the product stays about hobbies. A free-text "anything goes" field would quickly fill the platform with things that are not hobbies: work, shopping, spam, unsafe or adult content. A closed staff-only list would block people whose hobby is not listed yet.

## Decision

### 1. Every piece of user content belongs to exactly one catalog hobby

This is the scope guard. Profiles, records, activities, communities and conversations already require a `hobbyId`. No feature may introduce content that floats outside a hobby.

### 2. Users can propose a hobby that is missing

A user who cannot find their hobby can propose one.

- **Proposed hobby:** a `catalog_hobby` row with a new status `proposed` and `proposedByUserId`. The proposer can use it at once for their own profile and private records, so nobody is blocked.
- **Searchable before review, but not promoted:**
  - Other users can find a proposed hobby in search, clearly labelled "baru diusulkan" (newly proposed), and use it for their own profile and private records.
  - It stays out of Explore, recommendations and curated lists.
  - It cannot host communities or activities until staff approve it.
  - The review queue is ordered by how many people use a proposal, so hobbies other people also want get reviewed first.
  - Name normalization and a blocklist apply before a proposal becomes searchable.
- **Staff review** through the ADR-0027 staff boundary, with one of three outcomes, each audited:
  - **Approve** → `active`, with category and facets set by staff.
  - **Merge** into an existing hobby (a duplicate, or a different name for the same thing). The proposer's data is re-pointed to the existing hobby, and the proposed name becomes an alias.
  - **Reject** as out of scope, with a reason code. The proposer's records stay private and intact (no data loss), and the client asks them to move the records to an existing hobby.
- **Duplicate prevention before proposing:** the client must search first. The search covers names, translations and aliases (section 4), and proposing is offered only when nothing matches.
- **Abuse limits:**
  - At most 3 pending proposals per user.
  - Proposals count toward the existing Redis sensitive-write rate limit.
  - Names are length-limited and normalized.
- **What counts as a hobby.** The staff rubric is also shown to proposers in plain words: something people do in their free time by choice, for enjoyment, growth or connection. These are out of scope:
  - paid work tasks;
  - buying or selling as the activity itself;
  - single errands;
  - illegal, harmful or sexual content;
  - brands, products or people as hobbies.

### 3. Each hobby declares how progress is recorded

A typed enum column `catalog_hobby.recordProfile` decides which fields the record form shows and the backend accepts. Following ADR-0016 there is no EAV and no JSON blob.

| Profile | Fields | Examples |
| --- | --- | --- |
| `distance_time` | duration, distance (pace derived) | running, cycling, hiking, swimming |
| `time` | duration | guitar practice, yoga, climbing, gaming |
| `count` | quantity + the hobby's `quantityUnit` label | reading (pages), photography (photos), baking (bakes) |
| `moment` | notes first; duration optional | cooking a new dish, a concert, a workshop |

- `activity_record` gains a nullable `quantity` column.
- `distanceMeters` and `quantity` are validated against the hobby's profile.
- `sportType` becomes nullable and is used only for provider-imported records.
- Notes, visibility and date stay common to all profiles.
- Media attaches through the future media platform (P4), not here.

### 4. Names are localized and searchable

- `catalog_hobby_translation (hobbyId, locale, name, description)` holds display text. Seed `id` and `en`.
- `catalog_hobby_alias (hobbyId, locale, alias)` lets search match everyday words, e.g. "lari", "jogging" → Running; "sepeda", "gowes" → Cycling.
- The existing `name` stays as the canonical English name.
- Both tables are typed rows owned by `catalog`, which ADR-0016 allows.

### 5. What's Next works for every hobby

When a hobby has no curated activity supply, What's Next returns an explainable, honest fallback instead of throwing. The fallback suggests a next step from what exists for that hobby:

- record a session;
- read or start a conversation;
- look at a community.

The rationale names the reason ("there are no activities listed for this hobby nearby yet"). Curated supply, when present, keeps ranking as in ADR-0022.

### 6. Guidance is honest about coverage

- Curated guidance becomes per-hobby data.
- A hobby without curated guidance shows a short generic starter plus a clear statement that specific guidance is not available yet.
- No hobby borrows another hobby's content.

### 7. Provider imports map sport types to hobbies through data

`catalog_hobby_provider_mapping (provider, providerType, hobbyId)` replaces the hard-coded running check.

- Strava `Run`, `TrailRun` and `VirtualRun` map to Running.
- Seed mappings for Ride, Hike, Walk, Swim and others where the hobby exists.
- An unmapped type is skipped and counted in the sync result, never forced into Running.

### 8. Mobile follows the server

The mobile app removes `src/data/running.ts` and all Running-specific branches:

- Onboarding is a catalog search with "propose a hobby".
- The record form renders from `recordProfile`.
- State holds the user's list of hobbies, with one selected as current.

## Delivery

The work ships in reviewable steps, each with migrations, OpenAPI and tests:

1. Catalog: `recordProfile`, `quantityUnit`, translations, aliases, `proposed` status, expanded seed (around 25 hobbies across sport, music, food, arts and crafts, outdoor, games, reading and writing).
2. Activity record: `quantity`, profile-aware validation, nullable `sportType`.
3. Proposals: propose, own-use and staff review endpoints.
4. What's Next fallback and provider mapping.
5. Mobile: hobby picker, profile-driven record form, multi-hobby state, removal of Running-only code.

## Consequences

- Any hobby can be used on day one by the person who needs it, while public spaces only contain staff-approved hobbies. Freedom for the individual, curation for the commons.
- New hobbies need no deploy. A new record profile still needs a migration, which is accepted because profiles are few and stable.
- Staff review becomes a real, recurring duty. The Alpha has no staff account yet, so one must be created before proposals ship.
- Search quality now depends on aliases, which are seeded content that must be maintained.
- Running loses its special status in code. Its deeper content and supply remain as data.

## Alternatives considered

- **Free-text hobby on every record.** Maximum freedom, but no shared spaces, no deduplication and no scope control. Rejected.
- **Staff-only closed catalog.** Safe, but blocks anyone whose hobby is missing until staff act. Rejected as the only path; kept as the public layer.
- **Generic attribute table or JSONB for per-hobby metrics.** Unlimited metric shapes, but rejected by ADR-0016 for the reasons given there. Four profiles cover the known hobbies.
- **Automatic approval with AI classification.** Faster, but makes trust decisions opaque at a stage with few users. Rejected for the Alpha; it may assist staff review later.

## Review decisions (2026-10-17)

1. **Visibility before approval:** middle ground, as described in section 2. Searchable and usable with a "baru diusulkan" label; not promoted and unable to host communities or activities until approved.
2. **Starter catalog:** around 25 hobbies across sport (running, cycling, swimming, badminton, futsal, padel, gym, yoga, climbing), outdoors (hiking, camping, birdwatching), music (guitar, piano, singing), food (cooking, baking, manual brew coffee), arts and crafts (photography, drawing, pottery, knitting) and other (reading, writing, board games). The final list ships as seed data in step 1.
3. **Localization:** translations and aliases both ship in step 1. The Alpha UI is Indonesian, so display names need `id` translations, and search needs everyday Indonesian aliases.
