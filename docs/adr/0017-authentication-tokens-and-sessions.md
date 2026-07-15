# ADR-0017: Authentication — short-lived JWT + rotating opaque refresh tokens

- **Status:** Accepted
- **Date:** 2026-07-16
- **Deciders:** Principal Architect

## Context

The platform needs stateless request authentication for a mobile client
without giving a stolen credential a long useful life, and without baking
authorization data into tokens (a role captured in a token survives until
expiry, which delays revocation exactly when it matters — suspension,
role removal, account compromise). The ADR-0003 stack already provides
PostgreSQL for durable session state.

## Decision

Two-token model:

- **Access token:** JWT, **HS256**, **15-minute TTL**. Claims are exactly
  `sub` (userId), `sid` (sessionId), `iat`, `exp` — **never roles or any
  other authorization data**. Verified statelessly per request;
  authorization is always evaluated live (ADR-0018) so revocation takes
  effect within one access-token lifetime at worst, immediately for
  status checks performed by the guard.
- **Refresh token:** 256-bit cryptographically random opaque string,
  delivered once to the client and stored server-side **only as a SHA-256
  hash**. TTL **14 days**. **Rotated on every use**: each refresh issues a
  new session row linked by `familyId` and marks the old one
  `revokedAt`/`replacedById`. Presenting an already-rotated token is
  treated as theft: the **entire session family is revoked** and an audit
  entry is written (ADR-0019).
- **Sessions are their own aggregate** (`identity_session`), separate from
  `User`: they have independent lifecycle, and a user has many.
- **Passwords:** hashed with **argon2id** (library defaults: 64 MiB memory,
  3 iterations, parallelism 4). Login against an unknown email still
  verifies a fixed dummy argon2id hash so response timing does not reveal
  account existence; wrong-password and no-such-user are both
  `INVALID_CREDENTIALS`. Password policy: **minimum 8 characters**
  (`PASSWORD_MIN_LENGTH` constant); violations are `PASSWORD_TOO_WEAK`.
- **Lifecycle rules:** logout revokes the presenting session; password
  change revokes **all** of the user's sessions. Registration returns the
  created user (no auto-login); the client logs in explicitly.
- Registration returns `EMAIL_ALREADY_REGISTERED` on conflict — a
  deliberate, documented enumeration trade-off in favour of usable
  sign-up UX.
- Email uniqueness is **case-insensitive**, enforced by normalizing to
  lowercase at the application boundary before storage/lookup, with a
  plain unique index on the stored (normalized) column. A `citext`/
  functional-index upgrade is deliberately deferred until a real bypass
  vector exists, to keep Prisma migrations drift-free.
- Secret material: a single `JWT_SECRET` via validated env (ADR-0008);
  rotation is an operational secret swap, not a code change.

## Consequences

- A stolen access token is useful for ≤15 minutes; a stolen refresh token
  is useful until its first use races the legitimate client, after which
  family revocation cuts off both parties — the legitimate user re-logs
  in, the attacker is out.
- Every protected request costs one user-status lookup (no roles in the
  token). This is the accepted price of immediate suspension.
- Refresh tokens exist in plaintext only in transit and client storage;
  a database leak exposes only SHA-256 hashes of 256-bit random values
  (not brute-forceable, no salting needed for uniform random input).
- HS256 with one secret is symmetric: any service that can verify can
  also sign. Acceptable for a modular monolith; an asymmetric upgrade
  (RS256/EdDSA) becomes its own ADR if a second verifier service appears.

## Alternatives considered

- **Long-lived JWT only, no refresh** — no rotation, no revocation story;
  rejected outright for a social platform.
- **Server-side opaque sessions only (no JWT)** — one DB hit per request
  for authentication itself; the hybrid keeps hot-path verification
  stateless while preserving revocation via short TTL + live status check.
- **Roles inside the JWT** — faster authorization but revocation lags
  until token expiry; contradicts the default-deny, evaluate-live posture
  of ADR-0018.
- **bcrypt** — viable but not memory-hard; argon2id is the current OWASP
  first recommendation and required by `security-guidelines.md`.
- **Refresh token reuse tolerance windows** — grace periods for flaky
  clients leak exactly the property rotation exists to provide; strict
  family revocation chosen instead.
