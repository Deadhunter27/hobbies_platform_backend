# Wayfinder V1 Alpha — Backend Delivery Plan

Status: implementation foundation. This document adapts the existing backend roadmap to the current Wayfinder product thesis.

## Decision

**Reuse this backend. Do not rewrite it.**

The existing NestJS modular monolith, Prisma/PostgreSQL persistence, identity/access/audit stack, OpenAPI contract discipline, Docker setup, and test/CI foundation are strong enough to serve as the V1 spine.

The main change required is delivery priority. The old roadmap is social-surface-first (Communities → Events → Feed → Chat). Wayfinder now needs the directional real-world loop to ship first.

## Product loop to support

**Context → What's Next → Guidance → Activity → Commitment → Real-world action → Progress → Next → Journey**

## Recommended milestones

### W3 — Profile + Hobby Relationship / Context

Add first-class user product context:
- profile extensions
- user ↔ hobby relationship
- experience / relationship level
- primary intent
- optional secondary intent
- optional goal
- city/location preference
- privacy basics

Outcome: backend can represent why the user is here and what matters now.

### W4 — Activities + Commitments

Add:
- Activity aggregate
- place/time/host/community linkage
- activity status and capacity
- activity level / preparation / expectations
- participant commitment lifecycle
- cancellation / changed-plan state

Keep commitment distinct from completion.

### W5 — What's Next + Recovery

Rule-based recommendation service/module:
- deterministic recommendation rules
- recommendation rationale
- source/context inputs
- reject reason
- alternative recommendation / recovery path
- preserve actual chosen path

No ML/LLM dependency required for V1.

### W6 — Progress + Journey

Add:
- reflection / progress entry
- qualitative tags
- optional metrics
- personal note
- recognition context
- Journey moment read model
- meaningful milestone support without competitive gamification

Progress is not synonymous with performance.

### W7 — Communities + People Context

Implement the minimum community/person surface needed to support activity decisions:
- community profile
- membership
- community host roles
- visible trust/context needed by Activity

Do not build a large social network surface before the core loop is coherent.

### W8 — Notifications / Check-ins

Add:
- activity reminder
- post-activity check-in
- missed-plan check-in
- background jobs / Redis/BullMQ activation as needed

### W9 — Conversations / Feed

Only after the directional loop is usable. Build enough to connect discussion to hobbies/communities/activities.

### W10 — Admin / Moderation / Seeding

Add staff tooling for:
- taxonomy writes
- activity/community seeding and curation
- moderation
- recommendation content/rule inputs where appropriate

## Suggested domain additions

Likely bounded contexts / modules:
- profile
- hobby-context (or relationship)
- activity
- recommendation
- progress
- journey/read-model
- community
- notification

Keep identity/access/catalog as existing platform modules.

## Data modeling principles

- Store intent/context separately from the recommendation shown.
- Store the actual committed path separately from the original recommendation.
- Commitment lifecycle must distinguish planned / cancelled / completed / missed.
- Journey is derived from meaningful events, not a mutable performance dashboard.
- Recommendation rationale should be persistable/explainable for analytics and debugging.
- Use server-side persistence for real product state; the localStorage model belongs only to the research prototype.

## API delivery order

1. Identity/profile/context
2. Catalog/hobby relationship
3. Home / What's Next read model
4. Activity detail
5. Commit/reject/recover
6. Progress/reflection
7. Journey
8. Notifications/check-ins
9. Community/person support

Generate/commit OpenAPI continuously so mobile can consume typed contracts.

## Explicit non-goals for initial V1 Alpha

- microservices
- ML recommendation infrastructure
- AI coach
- realtime chat
- GPS workout tracking
- wearables/Strava
- marketplace/payments
- advanced trust graph

## Architecture rule

Stay a modular monolith until actual scale, deployment, team, or reliability boundaries justify extraction. Do not pre-pay microservice complexity.
