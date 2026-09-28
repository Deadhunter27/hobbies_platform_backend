# ADR-0024 — Community membership and activity-facing people context

- Status: Accepted
- Date: 2026-09-28

## Context

Wayfinder's real-world activity decisions already expose lightweight host labels and an optional `communityReferenceId`, but W4 intentionally left Community/People ownership for a later milestone. The Running Alpha now needs enough durable context to answer practical trust questions such as who is hosting, what community an activity belongs to, and whether the user is already part of that community.

W7 must add that context without turning Wayfinder into a generic social network or making community membership a prerequisite for participating in an activity.

## Decision

1. W7 introduces a Community bounded context with a minimal published community profile: hobby reference, name, slug, description, location, and lifecycle status.
2. Community membership is durable user-owned state. A user may join or leave a community, while the current membership record preserves role and lifecycle timestamps.
3. Membership roles are explicit: `member`, `host`, or `organizer`. Host/organizer roles are community context, not global authorization roles.
4. Public community detail may expose only the people context needed for trust and activity decisions: stable person reference, display-name snapshot, and community role. It does not expose private identity fields such as email.
5. A membership display name is a community-facing snapshot captured from the authenticated actor (or seeded fixture for Alpha supply). Identity remains the canonical owner of account data; W7 does not import Identity repositories.
6. Activity keeps its existing logical `communityReferenceId` and host references. W7 exposes a public application seam that Activity or later presentation layers can use to resolve community context without importing Community infrastructure.
7. Community membership is **not** required to commit to or complete an Activity. The community surface is decision context, not a gate.
8. Community, user, hobby, and activity references remain logical across bounded contexts. Database foreign keys are used only inside the Community context where ownership is local.
9. W7 does not introduce follows, friend graphs, direct messaging, feeds, reputation scores, endorsements, public follower counts, or broad member-directory discovery.

## Consequences

- Activity detail can evolve from free-text social labels toward resolvable host/community context without rewriting W4 ownership.
- Users can tell whether they already belong to an activity's community and see who is acting as host/organizer.
- Community roles describe responsibility inside one community and must not be reused as platform authorization grants.
- Display-name snapshots may lag a later Identity rename; a future synchronization mechanism can address that without coupling repositories now.
- W9 Conversations/Feed remains separate; W7 is intentionally limited to real-world decision support.
