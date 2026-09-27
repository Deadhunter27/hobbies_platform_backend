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
| W3        | Profile + hobby relationship / context       | 🟡 In progress | —       |
| W4        | Activities + commitments                     | ⬜ Planned     | —       |
| W5        | What's Next + recovery                       | ⬜ Planned     | —       |
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

## Current

### W3 — Profile + hobby relationship / context

Approved scope is defined by ADR-0020. W3 gives Wayfinder persistent product
context without expanding into recommendations or activities yet.

Acceptance criteria:

- authenticated users can read/update their own lightweight profile context;
- authenticated users can create/read/update their own context for an active hobby;
- hobby context captures experience level, primary intent, optional secondary intents,
  optional goal, and social preference;
- protected operations call the existing policy layer explicitly and default-deny;
- the profile module does not own identity or catalog data and does not add cross-context DB foreign keys;
- all input boundaries are Zod-validated and all endpoints are represented in OpenAPI;
- persistence is introduced by a reviewed Prisma migration;
- unit/integration/e2e coverage and CI remain green.

## Planned

- **W4 Activities + Commitments** — Activity aggregate, place/time/host context,
  availability/capacity, preparation/expectations, and commitment lifecycle.
- **W5 What's Next + Recovery** — deterministic recommendations, rationale,
  rejection reasons, alternatives, and preservation of the actual chosen path.
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
