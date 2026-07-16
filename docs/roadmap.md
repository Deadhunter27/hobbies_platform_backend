# Roadmap & Milestones

Single source of truth for milestone status. A milestone is **done** only
when its acceptance criteria are proven by tests and a green CI run on
`main`, and the architect has signed off.

## Status

| Milestone | Scope                                        | Status      | Version |
| --------- | -------------------------------------------- | ----------- | ------- |
| M1        | Platform kernel + catalog (read-only)        | ✅ Complete | v0.1.0  |
| M2        | Identity & access + audit trail              | ✅ Complete | v0.2.0  |
| M3        | Communities                                  | ⬜ Planned  | —       |
| M4        | Events (incl. community-scoped roles)        | ⬜ Planned  | —       |
| M5        | Social feed                                  | ⬜ Planned  | —       |
| M6        | Chat                                         | ⬜ Planned  | —       |
| M7        | Notifications                                | ⬜ Planned  | —       |
| M8        | Admin CMS (staff tooling, taxonomy writes)   | ⬜ Planned  | —       |

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
with a grants table ready for M4's community roles, global `AuthGuard`
with opt-in `@RequiresAuth()`, and an append-only audit trail written
in-transaction across the whole auth lifecycle.

## Upcoming (scope sketches — each milestone gets its own instruction)

- **M3 Communities** — community aggregate, membership, geo discovery
  (PostGIS enters real use), community-scoped audit actions.
- **M4 Events** — event lifecycle, RSVPs, community-scoped roles landing in
  `access_resource_role` (the policy interface already accepts them).
- **M5 Social feed** — activity read models; first heavy read-path work.
- **M6 Chat** — realtime transport decision required first (open ADR).
- **M7 Notifications** — BullMQ workers go live (`PROCESS_ROLE` split,
  ADR-0013); Redis wiring lands here at the latest.
- **M8 Admin CMS** — staff tooling; catalog taxonomy write endpoints
  (staff-gated per ADR-0016) and moderation surfaces.

## Standing pre-launch items (tracked, not milestone-bound)

- Error tracker (Sentry/GlitchTip) — ADR-0014 stage 1, blocked on the
  deployment-target decision (open).
- Rate limiting (Redis-backed) + CORS allowlist — security-guidelines
  platform requirements; land with Redis wiring.
- Deployment target / infrastructure provider — open ADR decision.
