# Roadmap & Milestones

Single source of truth for milestone status. A milestone is **done** only
when its acceptance criteria are proven by tests and a green CI run on
`main`, and the architect has signed off.

The product direction was realigned after the Wayfinder research prototype.
M1 and M2 remain complete and frozen. From W3 onward, delivery is organized
around the directional real-world loop:

**Context → What's Next → Guidance → Activity → Commitment → Real-world action → Progress → Next → Journey**

## Status

| Milestone | Scope                                        | Status      | Version |
| --------- | -------------------------------------------- | ----------- | ------- |
| M1        | Platform kernel + catalog (read-only)        | ✅ Complete | v0.1.0  |
| M2        | Identity & access + audit trail              | ✅ Complete | v0.2.0  |
| W3        | Profile + hobby relationship / context       | ✅ Complete | —       |
| W4        | Activities + commitments                     | ✅ Complete | —       |
| W5        | What's Next + recovery                       | ✅ Complete | —       |
| W6        | Progress + Journey                           | ✅ Complete | —       |
| W7        | Communities + people context                 | ✅ Complete | —       |
| W8        | Notifications / check-ins                    | ✅ Complete | —       |
| W9        | Conversations / feed                         | ✅ Complete | —       |
| W10       | Admin / moderation / seeding                 | ✅ Complete | —       |

## Completed

### M1 — Platform kernel + catalog (v0.1.0)

Bootable NestJS app executing ADRs 0001–0016: fail-closed Zod config,
AppError hierarchy + global filter, Pino logging with request correlation,
Terminus health probes, URI versioning, OpenAPI generated-and-committed
with a CI staleness gate, Docker image with a CI boot gate. The `catalog`
module (read-only hobby taxonomy, keyset pagination) is the normative
reference for module anatomy.

### M2 — Identity & access (v0.2.0)

ADRs 0017–0019 executed: argon2id passwords with timing-safe login,
15-minute HS256 JWTs carrying only `sub`/`sid`, rotating opaque refresh
tokens with family revocation on reuse, default-deny `can()` policy layer
with a grants table ready for scoped roles, global `AuthGuard` with opt-in
`@RequiresAuth()`, and an append-only audit trail written in-transaction
across the auth lifecycle.

### W3 — Profile + hobby relationship / context

ADR-0020 is implemented on `main`. Authenticated users can persist lightweight
profile context and one evolving context record per hobby, including experience
level, primary/secondary intent, goal, and social preference. Cross-context
ownership remains logical rather than DB-coupled, protected operations call the
existing policy layer explicitly, OpenAPI and migration artifacts are committed,
and the main-branch CI + CodeQL runs are green.

### W4 — Activities + commitments

ADR-0021 is implemented on `main`. Published activities expose hobby, time/place,
host, effort, preparation, capacity/availability, and status context. Authenticated
users can persist interested/committed/cancelled/missed states without treating
commitment as completion. Capacity is enforced on writes, running fixtures cover
the current Alpha branches, and the mobile Alpha is wired to the W4 APIs.

### W5 — What's Next + recovery

ADR-0022 is implemented on `main`. Authenticated users receive one current,
explainable next-step recommendation generated deterministically from W3 context
and W4 viable activity inventory. The server persists rationale and fit signals,
keeps rejected recommendations distinct from later choices, returns meaningfully
different recovery options when available, and preserves the actual selected path.
The mobile Alpha consumes the server-backed recommendation and recovery contract.

### W6 — Progress + Journey

ADR-0023 is implemented on `main`. A saved activity commitment remains intent,
while a user-authored post-activity reflection becomes durable evidence of a
completed real-world action. Reflections support qualitative rating, tags, and
notes, are revisable without rewriting their original occurrence time, and feed a
server-authoritative Journey read model enriched with activity context. W6 adds no
streaks, XP, leaderboards, GPS proof, wearable proof, or competitive scoring. The
mobile Alpha persists reflections and renders server-backed Journey moments.

### W7 — Communities + People Context

ADR-0024 is implemented on `main`. Published community profiles expose only the
minimum identity, hobby, location, member-count, and host/organizer context needed
around real-world Activity decisions. Authenticated users can join, leave, and
rejoin communities through durable membership state with explicit community roles.
Activity resolves its logical community reference through the public Community seam,
while membership remains optional and never gates an Activity commitment. The
Running Alpha includes Jakarta Runners seed supply and the mobile client consumes
this trust context without introducing a generic social-network surface.

### W8 — Notifications / Check-ins

ADR-0025 is implemented on `main`. Authenticated users receive deterministic in-app
check-ins derived from authoritative committed Activity state: a pre-activity
reminder, post-activity reflection prompt, or missed-plan recovery prompt depending
on server-owned timing. Check-ins have their own `pending | actioned | dismissed`
lifecycle and never silently mutate Activity completion or missed state. The mobile
Alpha surfaces the server-authored nonjudgmental prompts on Home and routes them to
the existing plan, reflection, or recovery flows. W8 intentionally adds no push,
email, SMS, delivery-provider, Redis/BullMQ scheduling, or engagement-notification
surface.

### W9 — Conversations / Feed

ADR-0026 is implemented on `main`. Conversation is a hobby-scoped discussion object
with flat replies, while Feed is a bounded read model combining published
Conversations and upcoming Activities for one hobby. Source type/id is preserved,
ordering is deterministic/contextual rather than engagement-ranked, and writes are
protected through the existing default-deny policy layer. W9 adds no likes, follows,
reposts, DMs, reputation score, deep reply trees, or algorithmic virality ranking.
The mobile Alpha exposes separate “What’s happening?” and “Conversations” surfaces
so discussion never replaces the real-world Activity primitive.

### W10 — Admin / Moderation / Seeding

ADR-0027 is implemented as the minimum staff-operability layer required to run the
Alpha without bypassing bounded-context ownership. Staff operations reuse the
existing default-deny policy layer: Catalog taxonomy management requires
`catalog.manage`, while Activity/Community curation and Conversation moderation
require `platform.manage`.

Catalog retains its own validation and persistence for hobby/category mutations.
Activity and Community expose narrow source-owned lifecycle seams for staff curation,
and Conversation exposes explicit publish/archive transitions rather than shadow
moderation copies. Admin orchestration coordinates those source use cases, while
staff mutations and their audit records commit in the same transaction.

The staff interface is intentionally narrow and Zod-validated, is represented in
OpenAPI, and defaults non-staff actors to denied access. W10 adds no reputation or
engagement scoring, automated content judgment, generic CMS, workflow engine,
admin frontend framework, or remote seed executor. Repository-owned seed data
remains deterministic, idempotent, code-reviewed, and uses stable identifiers for
re-runnable Alpha supply. Unit/integration/e2e coverage proves staff authorization,
Catalog writes, Activity/Community curation, Conversation archive/publish, source
state changes, and audit recording; CI and CodeQL are green before merge.

See `docs/wayfinder-v1-backend-plan.md` for the product rationale and sequencing.

## Standing pre-launch items (tracked, not milestone-bound)

- Error tracker (Sentry/GlitchTip) — ADR-0014 stage 1, blocked on the
  deployment-target decision (open).
- Rate limiting (Redis-backed) + CORS allowlist — security-guidelines
  platform requirements; land with Redis wiring.
- Deployment target / infrastructure provider — open ADR decision.
