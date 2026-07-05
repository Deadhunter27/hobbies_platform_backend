# Security Guidelines (Engineering)

SECURITY.md covers reporting and posture; this guide is the working checklist engineers (and Claude Code) apply to every change. Baseline threat model: a public API for a mobile social platform that facilitates real-world meetups — so account takeover, scraping of location data, and abuse/harassment vectors are first-order concerns, not afterthoughts.

## Non-negotiables per change

- **Validate every input at the boundary** (ADR-0011). No exceptions for "internal" endpoints.
- **Authorize explicitly at every protected operation.** Authorization is relationship-scoped (role relative to the resource); never inferred from earlier calls. Default deny.
- **Never leak internals** — error responses carry stable codes and safe messages only (ADR-0009).
- **Never log secrets or PII** — central redaction (ADR-0010); no raw request-body logging.
- **Secrets only via validated env** (ADR-0008); never in code, git, or images.
- **Least privilege** for DB roles, storage credentials, CI tokens.

## Platform-level requirements (implemented in the identity/interface phases)

- Short-lived access tokens + rotating refresh tokens; revocation on credential change.
- Password hashing with a modern memory-hard KDF (argon2id).
- Rate limiting on authentication and expensive endpoints (Redis-backed), plus global sane defaults.
- Standard HTTP hardening: helmet-style headers, strict CORS allowlist, body-size limits, HTTPS-only.
- **Location privacy:** precise coordinates are never exposed to other users by default; user-facing proximity is coarse (distance bands / area names). Any feature touching precise location or minors' data requires a recorded privacy review (SECURITY.md).
- IDs exposed publicly are non-sequential (UUID/ULID) to prevent enumeration.

## Supply chain

- Dependabot weekly + CodeQL on every PR (ADR-0007).
- New dependencies need justification in the PR: maintenance health, license, footprint. Prefer the standard library and existing deps over new ones.
- Lockfile is committed; CI installs with `--frozen-lockfile`.
