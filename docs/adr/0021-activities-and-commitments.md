# ADR-0021: Activities and Commitments bounded context

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Founder

## Context

Wayfinder's directional loop now has persistent person/hobby context (W3). The next missing product primitive is the real-world thing a person can decide to do.

The research prototype established several rules that must survive implementation:

- a recommendation is not the activity itself;
- a person's intent is not the commitment they eventually choose;
- commitment must never be confused with completion;
- a rejected recommendation may lead to a smaller or different activity, and the system must remember the activity actually chosen;
- activity decisions need enough context to reduce uncertainty: what, when, where, who, expected effort, preparation, and availability;
- real-world action happens outside the app; W4 records the plan/commitment, not fabricated proof of completion.

These concepts do not belong in `catalog` (shared hobby taxonomy), `profile` (person-specific context), or future `recommendation` / `progress` modules. They require their own lifecycle and persistence boundary.

## Decision

Create a new bounded context and NestJS module named **`activity`**. W4 owns two aggregates:

1. **Activity** — a real-world opportunity attached to a hobby.
2. **Activity Commitment** — a user's decision state for one activity.

### Activity

Minimum V1 Alpha fields:

- `id` — ULID;
- `hobbyId` — logical reference to an active catalog hobby;
- `title`;
- optional short `description`;
- `activityType` — data-driven string discriminator for V1 rather than a global enum;
- `startsAt` / optional `endsAt`;
- `timezone`;
- place context: `placeName`, optional `addressLabel`, optional latitude/longitude;
- optional host context: `hostName`, `hostType`, `hostReferenceId`;
- optional `communityReferenceId` for later W7 enrichment;
- `effortLevel`: `easy | moderate | challenging | open`;
- optional `capacity`;
- `status`: `draft | published | cancelled | completed`;
- preparation/expectation text;
- created/updated timestamps.

W4 stores only the host/community identifiers and labels needed to support a decision. It does **not** implement Community/People ownership early; W7 may later replace or enrich these references through public module collaboration.

### Commitment

One current commitment record per `(userId, activityId)`.

Lifecycle:

- `interested` — optional lightweight signal;
- `committed` — the user has made a real plan;
- `cancelled` — the user withdrew before the activity;
- `missed` — the activity window passed and the user reports it did not happen;
- `completed` is deliberately **not** owned by W4. Real completion/progress evidence is introduced in W6.

The core W4 participant flow creates/updates the record directly to `committed`. `interested` exists for later product surfaces but is not required by the first mobile vertical slice.

Commitment stores:

- `id`;
- `userId` logical reference;
- `activityId` within the same bounded context;
- `state`;
- `committedAt`;
- optional `cancelledAt` / `missedAt`;
- optional short `note`;
- timestamps.

### API surface

Public/authenticated read surface:

- `GET /api/v1/activities`
- `GET /api/v1/activities/{activityId}`

Authenticated self-service commitment surface:

- `GET /api/v1/me/activity-commitments`
- `GET /api/v1/me/activity-commitments/{activityId}`
- `PUT /api/v1/me/activity-commitments/{activityId}`

For W4 Alpha, activity creation/curation is seeded/admin-side only. Public user-generated activity creation is explicitly out of scope until moderation/host ownership exists.

### Authorization

- published activities are readable without authentication;
- commitment operations require `@RequiresAuth()`;
- commitment mutations call the existing policy layer explicitly and only permit the authenticated user to act on their own commitment resource;
- no cross-user commitment reads are exposed in W4.

### Cross-module collaboration

- `activity` imports `CatalogModule` only through its public exports to verify the referenced hobby exists/is active when seeding or creating activities;
- `activity` imports `AccessModule` for explicit self authorization;
- no module reaches into another bounded context's Prisma tables directly;
- `userId`, `hobbyId`, host/community reference identifiers are logical cross-context references, not database foreign keys.

### Geographic data

W4 may persist optional latitude/longitude for activity location because the database already supports PostGIS and activity discovery will eventually require proximity. Exact coordinates are optional; the user-facing place label remains first-class so an activity can exist without precise geo data.

### Capacity and availability

- `capacity = null` means no explicit numeric cap is known;
- availability is derived from published/cancelled state, time window, capacity, and current active commitments;
- W4 does not invent a fake capacity when none is supplied;
- over-capacity commitment writes must fail deterministically once capacity is known.

### Completion boundary

A `committed` activity is still ahead of the user. W4 must never surface commitment as completion.

When the activity window passes:

- W4 may expose that the commitment is awaiting follow-up;
- W6 decides how reflection/completion/progress is recorded;
- W8 later owns notification/check-in delivery.

## Consequences

- W5 recommendations can point to stable activity IDs instead of embedding activity-shaped blobs.
- W5 can preserve the distinction between recommended activity and actual committed activity.
- W6 can attach reflection/progress to an activity commitment without redefining commitment lifecycle.
- W7 can enrich host/community references without forcing W4 to own social graphs prematurely.
- W8 can schedule reminders/check-ins from stable activity/commitment timestamps.
- the first mobile Alpha can replace locally seeded activity/commitment state with server contracts incrementally.

## Alternatives considered

### Put activities inside `catalog`
Rejected. Catalog is shared hobby taxonomy; activities have time, availability, lifecycle, capacity, and participant decisions.

### Put commitments in `profile`
Rejected. Profile describes evolving user context. A commitment is an auditable decision tied to a specific real-world opportunity and has its own lifecycle.

### Include completion in W4
Rejected. It would collapse the research-proven boundary between planning and doing. Completion/reflection belongs with Progress/Journey in W6.

### Build Community/Event first and model Activity as a subtype
Rejected for W4. The product loop needs a general real-world action primitive before the richer social ownership model. W7 can add community relationships without redefining the Activity aggregate.
