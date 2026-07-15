# ADR-0018: Authorization — relationship-scoped policy layer, default deny

- **Status:** Accepted
- **Date:** 2026-07-16
- **Deciders:** Principal Architect

## Context

`security-guidelines.md` mandates explicit, relationship-scoped
authorization at every protected operation with default deny. Upcoming
milestones add communities where the same user is owner of one resource
and stranger to another, so authorization must be evaluated relative to
the resource — a global role list cannot express that, and tokens must
not cache it (ADR-0017).

## Decision

- A single entry point in the `access` module:
  `can(actor, action, resource) → { allow: true } | { allow: false, reason }`.
  Called **explicitly** by protected use-cases and guards; nothing is ever
  implied by routing or inferred from earlier calls. **Unknown
  action/resource combinations deny.**
- **Grants table** `access_resource_role (userId, resourceType,
  resourceId, role)` with a unique index on `(userId, resourceType,
  resourceId)` — one role per user per resource. Platform-wide scope is
  expressed as `resourceType = 'platform'`, `resourceId = 'platform'`.
  Community/event-scoped rows (M4+) reuse the identical shape and policy
  interface unchanged.
- **Global roles** `user | staff` live on `identity_user.globalRole` and
  are evaluated live by the policy engine (staff satisfies staff-level
  platform actions without a grant row).
- **Built-in relationship rule — self:** a specific allow-list of actions
  on `resourceType 'user'` where `resourceId === actor.id` (e.g. password
  change). Ownership of other resource types arrives with those modules'
  rules, never as a blanket "owner may do anything".
- **Guard:** `AuthGuard` in the `access` module verifies the JWT
  statelessly, then loads the actor **live** and rejects
  suspended (`403 USER_SUSPENDED`) and deleted/missing (`401`) users.
  Route protection is opt-in via a `@RequiresAuth()` decorator at M2
  (the public catalog API predates authentication and stays public);
  `can()` itself remains default-deny. Actor attachment is exposed via
  `@CurrentUser()`.
- **Dependency direction:** `access` declares the ports it needs
  (`TokenVerifier`, `ActorDirectory`); `identity` implements them and the
  composition root binds them. `identity → access` is the only
  cross-module import direction; `access` imports no other module.

## Consequences

- Suspension and role changes take effect on the next request — no token
  expiry lag — at the cost of one user lookup per authenticated request.
- Every future module ships policy *rules*, not policy *mechanisms*; the
  engine, grants table, and guard are reused as-is.
- Denials carry machine-readable reasons, which feeds the audit trail and
  debugging without leaking policy internals to clients.
- The opt-in `@RequiresAuth()` posture means a forgotten decorator fails
  open at the routing layer. Mitigated by review + e2e coverage per
  protected endpoint; flipping to default-protected with `@Public()`
  becomes trivial once the public surface is fully enumerated.

## Alternatives considered

- **RBAC via roles in JWT** — rejected (revocation lag, ADR-0017).
- **Per-endpoint ad-hoc checks** — what the policy layer exists to
  prevent: unauditable, inconsistent, and impossible to reason about
  globally.
- **Full policy language (Casbin/OPA/CASL)** — heavyweight for a monolith
  with one entry point; `can()` + typed rules in code is auditable and
  test-provable. Revisit only if policy count explodes.
- **Separate `platform_role` table instead of `globalRole` column** — a
  join on every request for exactly two roles; the column is simpler and
  the grants table still covers scoped roles.
