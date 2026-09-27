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
| W4        | Activities + commitments                     | 🟡 In progress | —       |
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

### W3 — Profile + hobby relationship / context

ADR-0020 is implemented on `main`. Authenticated users can persist lightweight
profile context and one evolving context record per hobby, including experience
level, primary/secondary intent, goal, and social preference. Cross-context
ownership remains logical rather than DB-coupled, protected operations call the
existing policy layer explicitly, OpenAPI and migration artifacts are committed,
and the main-branch CI + CodeQL runs are green.

## Current

### W4 — Activities + commitments

Approved scope is defined by ADR-0021. W4 introduces the stable real-world
opportunity and decision primitives that later recommendation, progress, and
notification milestones depend on.

Acceptance criteria:

- published activities can be listed and read with hobby, place/time, host,
  effort, preparation, availability/capacity, and status context;
- authenticated users can read and mutate only their own activity commitments;
- commitment lifecycle supports interested/committed/cancelled/missed without
  treating commitment as completion;
- known capacity is enforced deterministically on commitment writes;
- activity hobby references are verified through the catalog public seam;
- cross-context user/hobby/host/community references remain logical, not DB FKs;
- all input boundaries are Zod-validated and endpoints are represented in OpenAPI;
- persistence is introduced by a reviewed Prisma migration;
- unit/integration/e2e coverage and CI remain green.

## Planned

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
