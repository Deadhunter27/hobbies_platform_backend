# Roadmap & Milestones

Single source of truth for milestone status. A milestone is **done** only
when its acceptance criteria are proven by tests and a green CI run on
`main`, and the architect has signed off.

The product direction was realigned after the Wayfinder research prototype.
M1 and M2 remain complete and frozen. From W3 onward, delivery is organized
around the directional real-world loop:

**Context → What's Next → Guidance → Activity → Commitment → Real-world action → Progress → Next → Journey**

## Status

| Milestone | Scope                                        | Status         | Version |
| --------- | -------------------------------------------- | -------------- | ------- |
| M1        | Platform kernel + catalog (read-only)        | ✅ Complete    | v0.1.0  |
| M2        | Identity & access + audit trail              | ✅ Complete    | v0.2.0  |
| W3        | Profile + hobby relationship / context       | ✅ Complete    | —       |
| W4        | Activities + commitments                     | ✅ Complete    | —       |
| W5        | What's Next + recovery                       | 🟡 In progress | —       |
| W6        | Progress + Journey                           | ⬜ Planned     | —       |
| W7        | Communities + people context                 | ⬜ Planned     | —       |
| W8        | Notifications / check-ins                    | ⬜ Planned     | —       |
| W9        | Conversations / feed                         | ⬜ Planned     | —       |
| W10       | Admin / moderation / seeding                 | ⬜ Planned     | —       |

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

## Current

### W5 — What's Next + recovery

Approved scope is defined by ADR-0022. W5 moves recommendation and recovery policy
out of seeded mobile copy into a durable, explainable server-side decision context.

Acceptance criteria:

- authenticated users can request one current What's Next recommendation for an active hobby context;
- recommendations are generated from W3 context + W4 viable activity inventory using deterministic rules;
- every recommendation includes human-readable rationale and fit signals matching the actual rules used;
- unavailable/full/cancelled/ended activities are never returned as viable next steps;
- users can reject a recommendation with a stable reason vocabulary and receive a meaningfully different alternative when one exists;
- the original recommendation and later selected activity remain distinct durable concepts;
- recovery preserves the actual chosen path rather than snapping back to the original recommendation;
- protected operations call the existing policy layer explicitly and default-deny;
- W5 imports only public seams from Profile and Activity, never their infrastructure repositories;
- persistence is introduced by a reviewed Prisma migration;
- all input boundaries are Zod-validated and all endpoints are represented in OpenAPI;
- unit/integration/e2e coverage and CI remain green.

## Planned

- **W6 Progress + Journey** — reflections, qualitative progress, optional metrics,
  recognition context, and Journey moments without competitive gamification.
- **W7 Communities + People Context** — the minimum membership/host/trust context
  required to support real-world activity decisions.
- **W8 Notifications / Check-ins** — reminders, post-activity check-ins, and
  missed-plan check-ins; BullMQ/Redis activation as required.
- **W9 Conversations / Feed** — only after the directional loop is coherent.
- **W10 Admin / Moderation / Seeding** — staff tooling, curation, moderation,
  taxonomy writes, and seeded supply management.

See `docs/wayfinder-v1-backend-plan.md` for the product rationale and sequencing.

## Standing pre-launch items (tracked, not milestone-bound)

- Error tracker (Sentry/GlitchTip) — ADR-0014 stage 1, blocked on the
  deployment-target decision (open).
- Rate limiting (Redis-backed) + CORS allowlist — security-guidelines
  platform requirements; land with Redis wiring.
- Deployment target / infrastructure provider — open ADR decision.
