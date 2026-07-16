# GitHub Milestone Plan

The milestones that should exist on the GitHub repository. This file is the
plan of record; create them in the UI/API verbatim. Status mirrors
[`docs/roadmap.md`](roadmap.md).

## Closed

### ✅ M1 — Foundation (v0.1.0)

Platform kernel (config, errors, logging, health, versioning, OpenAPI,
Docker, CI) + read-only `catalog` module as the normative bounded-context
reference.
**Acceptance (met):** all ADR 0001–0016 mechanisms live; fresh-DB migration
proof; idempotent seed; unit/integration/e2e green; OpenAPI staleness gate
and Docker boot gate in CI; production boot verified.

### ✅ M2 — Identity & Access (v0.2.0)

`identity` + `access` modules with append-only audit trail (ADRs 0017–0019).
**Acceptance (met):** full auth lifecycle e2e including reuse-detection
family revocation; timing-safe login; JWT claims exactly `sub/sid/iat/exp`;
default-deny policy layer accepting resource-scoped queries; audit rows
in-transaction with requestId and email hashes only; all M1 tests untouched
and green; CI + CodeQL green on `main`.

## Open

### ⬜ M3 — Communities

Community aggregate, membership lifecycle, geo discovery (PostGIS in real
use), community-scoped audit actions.
**Acceptance:** create/join/leave/discover flows; PostGIS-backed proximity
queries with coarse location exposure only (security-guidelines); membership
rows feed `access_resource_role`; audit coverage; e2e lifecycle; migrations
from zero; specs/CI green.

### ⬜ M4 — Events

Event lifecycle within communities, RSVPs, and the first real
community-scoped roles (organizer/moderator) flowing through the unchanged
`can()` interface.
**Acceptance:** event CRUD gated by community roles; RSVP flows; policy
rules added without engine changes; audit coverage; e2e; migrations clean.

### ⬜ M5 — Social Feed

Activity read models over communities/events; first heavy read-path work
(fan-out strategy decision → ADR).
**Acceptance:** feed endpoints with keyset pagination; read-model
consistency documented; performance baseline recorded.

### ⬜ M6 — Chat

Realtime messaging. Blocked on the open realtime-transport decision
(WebSocket/SSE) — ADR required first.
**Acceptance:** transport ADR accepted; message persistence + delivery;
abuse/reporting hooks into audit.

### ⬜ M7 — Notifications

BullMQ workers go live (`PROCESS_ROLE` split per ADR-0013); Redis wiring
lands here at the latest; rate limiting unblocked.
**Acceptance:** idempotent Zod-validated jobs carrying ids; worker split
deployable; notification preferences; delivery audit.

### ⬜ M8 — Admin CMS

Staff tooling: catalog taxonomy write endpoints (staff-gated per ADR-0016),
user moderation (suspension already enforced by the guard), audit browsing.
**Acceptance:** all writes behind `can()` staff/platform rules; suspension
flow audited end-to-end; taxonomy writes replace seed-only content
management.
