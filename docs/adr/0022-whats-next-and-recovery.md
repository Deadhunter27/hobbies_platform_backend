# ADR-0022: What's Next and Recovery bounded context

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Founder

## Context

Wayfinder's core product promise is not a feed or a tracker. It is helping a person move from hobby context and uncertainty to a relevant, understandable real-world next step.

W3 introduced durable profile/hobby context. W4 introduced real activities and a commitment lifecycle. W5 connects those capabilities into the first server-side **What's Next** decision.

The research prototype established several product rules that must survive implementation:

- intent/context is not the same thing as the recommendation shown;
- the recommendation must explain why it fits;
- a recommendation may be rejected without treating the user as failed;
- recovery must offer a meaningfully different path, not merely rewritten copy;
- the actual path a user chooses must be preserved separately from the original recommendation;
- deterministic, inspectable rules are preferred to opaque scoring/ML for V1 Alpha.

## Decision

Create a bounded context and NestJS module named **`recommendation`**. It owns directional recommendation decisions, rationale, rejection/recovery state, and selection of a concrete activity opportunity. It does not own profile context, activity inventory, commitments, progress, or Journey.

### Recommendation model

A recommendation is a server-generated view for one authenticated user + hobby context. It contains:

- `id` — stable ULID for the decision instance;
- `hobbyId`;
- `activityId` — the concrete W4 activity being recommended;
- `title` — participant-facing next-step label;
- `rationale` — short human-readable explanation;
- `fitSignals[]` — explicit reasons used by the deterministic rule set;
- `intent` — copied as decision-time context, never treated as the activity itself;
- `status`: `active | rejected | superseded | selected`;
- timestamps.

Recommendation records are persistent because recovery and later Journey/analytics need to distinguish:

1. the original recommendation,
2. a rejected recommendation,
3. the alternative recommendation actually selected/committed.

### Deterministic V1 decision policy

The rule engine consumes:

- W3 hobby context: experience level, primary/secondary intent, goal, social preference;
- W4 currently published/available activities for that hobby;
- current commitment state where relevant;
- rejection reason when generating recovery.

V1 ranking is deliberately explicit and boring. Candidate activities receive rule-based preference based on:

- availability first — cancelled/full/ended candidates are excluded;
- social intent/preference → prefer community/host context;
- start/return/explore intent → prefer easy/open effort and lower-commitment activity types;
- improve intent → prefer structured/moderate opportunities before generic "go faster" advice;
- experienced users should not be forced through beginner framing when a more suitable candidate exists;
- recovery reason can change the ranking (for example `too_difficult` prioritizes easier effort; `prefer_solo` deprioritizes community-linked activities).

The exact scoring weights are implementation details, but every chosen recommendation must emit human-readable `fitSignals` and `rationale` that correspond to the actual rules applied.

### Recovery / rejection vocabulary

Accepted rejection reasons for V1:

- `timing`
- `too_difficult`
- `prefer_solo`
- `learn_first`
- `social_comfort`
- `other`

Rejecting an active recommendation marks it `rejected` and may generate a replacement recommendation. The replacement must not reuse the same activity when another viable candidate exists.

### Selected path

W5 records `selectedActivityId` when the user accepts a recommendation/recovery path. W4 remains the source of truth for the activity commitment itself.

This distinction is intentional:

- W5 answers **what Wayfinder suggested and what path the user chose**;
- W4 answers **what commitment currently exists for an activity**.

The two must agree at application boundaries, but W5 does not duplicate the W4 commitment lifecycle.

### API surface

Authenticated self-service endpoints:

- `GET /api/v1/me/hobbies/{hobbyId}/whats-next`
  - returns the current active recommendation when one exists and is still viable;
  - otherwise creates a new deterministic recommendation from current context/inventory.
- `POST /api/v1/me/hobbies/{hobbyId}/whats-next/{recommendationId}/reject`
  - body: `{ reason, note? }`;
  - marks the recommendation rejected and returns the next viable alternative when available.
- `POST /api/v1/me/hobbies/{hobbyId}/whats-next/{recommendationId}/select`
  - body: `{ activityId }`;
  - records the chosen path; the client then creates/updates the W4 commitment through the activity API.

A `404/409` style domain error is returned when no viable next step exists or a stale recommendation can no longer be acted on. Stable error codes are required.

### Cross-module collaboration

- `recommendation` imports `ProfileModule` and consumes a public read-only W3 hobby-context use case exported through `@modules/profile`.
- `recommendation` imports `ActivityModule` and consumes public W4 activity read use cases exported through `@modules/activity`.
- no Prisma repository from another bounded context may be imported directly;
- profile and activity modules remain owners of their own tables and rules.

### Persistence and references

W5 owns its recommendation table. `userId`, `hobbyId`, `activityId`, and `selectedActivityId` are logical cross-context references and deliberately do not use DB foreign keys to other modules.

Recommendation persistence is not an event log replacement. It stores the minimum durable decision state needed for recovery and continuity. Product analytics can later consume domain/audit events without turning this table into an analytics warehouse.

### Authorization

All W5 endpoints require authentication and explicit self authorization using the existing default-deny policy layer. W5 adds:

- `recommendation.self.read`
- `recommendation.self.update`

They are allowed only against the authenticated user's own user resource.

## Consequences

- Wayfinder's primary direction becomes server-backed rather than hard-coded mobile copy.
- Mobile can refresh/reopen without forgetting the original vs selected path.
- Recommendation logic remains inspectable and testable.
- W6 Progress/Journey can later reference recommendation decisions without coupling to W3's mutable context.
- W5 is intentionally not an AI/ML system; future ranking approaches can replace the policy internally while preserving explainability and the API contract.

## Alternatives considered

### Keep recommendations entirely in the mobile app
Rejected. It duplicates product policy across clients, loses recovery continuity, and makes later analytics/Journey history unreliable.

### Put recommendation logic inside `profile`
Rejected. Profile owns user context, not directional decisions or activity ranking.

### Put recommendation logic inside `activity`
Rejected. Activity owns opportunities and commitments, not person-specific recommendation policy.

### Use an LLM/ML recommender now
Rejected for V1 Alpha. There is insufficient behavioral data, and the research principle requires explainable reasons rather than opaque confidence scores.

### Do not persist recommendation decisions
Rejected. The prototype already showed that remembering the difference between the original recommendation and the actual chosen path materially affects trust and continuity.
