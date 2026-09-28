# ADR-0023 — Progress evidence and Journey read model

- Status: Accepted
- Date: 2026-09-28

## Context

Wayfinder separates deciding to do something from actually doing it. W4 introduced activity commitments and W5 introduced explainable next-step decisions, but neither is evidence that a real-world activity happened.

The V1 Alpha needs a durable way to record a user's own reflection after an activity and later reconstruct a Journey without turning progress into a competitive performance dashboard.

## Decision

1. Activity commitment gains a distinct `completed` state and `completedAt` timestamp. `committed` remains intent; `completed` represents a user-confirmed real-world action.
2. W6 introduces one `ProgressReflection` per user + activity. A reflection may contain a 1–5 experiential rating, qualitative tags, and/or a personal note. At least one meaningful signal is required.
3. Saving a reflection requires an existing commitment in `committed` or `completed` state and an activity whose start time has passed. The first successful reflection transitions a still-committed activity to `completed`.
4. Editing a reflection is idempotent and preserves the original `occurredAt` time.
5. Journey is a read model over durable progress reflections enriched with activity context. It is not a separate mutable timeline table in W6.
6. Progress is deliberately broader than performance. Social connection, learning, exploration, showing up, comfort, and personal notes are valid progress signals.
7. W6 does not introduce streaks, XP, leaderboards, competitive scoring, GPS evidence, wearable evidence, or AI-generated interpretations.
8. User, hobby, and activity references in Progress remain logical cross-context references. The Progress application layer validates ownership and activity/hobby consistency through existing module seams.

## Consequences

- Commitment and completion can no longer be conflated in clients or analytics.
- The mobile app can persist reflection and Journey across devices instead of holding them only in local state.
- A missed or cancelled commitment produces no progress reflection by default; recovery remains a separate decision path.
- Journey copy can evolve independently while its factual source remains durable user-authored evidence.
- Future integrations may add corroborating evidence, but they must not overwrite or silently reinterpret the user's reflection.
