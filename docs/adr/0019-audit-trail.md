# ADR-0019: Audit trail — append-only, in-transaction

- **Status:** Accepted
- **Date:** 2026-07-16
- **Deciders:** Principal Architect

## Context

The moment authentication exists, security-relevant events (registration,
login success/failure, token rotation, theft detection, logout, password
change) must be reconstructable after the fact. An audit trail that can
miss events (written after the transaction) or be edited (UPDATE path
exists) is worse than none — it creates false confidence.

## Decision

- Single table `audit_entry (id CHAR(26), actorId CHAR(26) NULL, action,
  resourceType, resourceId NULL, metadata JSONB, requestId NULL,
  createdAt)`, indexed on `(resourceType, resourceId, createdAt)`.
- **Append-only by construction:** the code exposes exactly one operation
  — `write` — behind an `AuditWriter` port. No update or delete method
  exists anywhere in the codebase; enforcing DB-level `REVOKE
  UPDATE/DELETE` is deferred to the deployment-hardening phase since app
  code is the only writer today.
- **In-transaction:** audit rows are written inside the same database
  transaction as the state change they record, via a `UnitOfWork` port
  (`src/shared/application`) with a Prisma implementation
  (`src/infrastructure/database`). A failed action can never leave a
  success audit row; a recorded action can never have silently failed.
  Pure observations with no accompanying state change (e.g. a failed
  login attempt) are written standalone.
- **Placement:** audit is a cross-cutting concern, so per
  `docs/architecture/overview.md` it lives in the kernel — port in
  `src/shared/application`, Prisma adapter in
  `src/infrastructure/audit` — not inside any bounded context. Modules
  depend only on the port.
- **Privacy:** metadata never contains raw emails, passwords, tokens, or
  precise location. Failed logins record `actorId = null` plus a SHA-256
  hash of the normalized email — correlatable, not reversible
  (`security-guidelines.md`).
- `requestId` carries the request correlation id (ADR-0010) so an audit
  row joins to its structured logs.

## Consequences

- Every auth-lifecycle use-case takes a `UnitOfWork` + `AuditWriter`
  dependency; slightly more wiring per use-case, bought back as a uniform
  facade every later module (moderation, community management) reuses.
- JSONB metadata is deliberately schema-less at the DB level; each action
  documents its metadata shape at the call site. Anything queried
  routinely should graduate to a real column (same principle as
  ADR-0016's "no EAV").
- The table grows monotonically; retention/partitioning is an operational
  decision deferred until volume warrants an ADR.

## Alternatives considered

- **Log-based audit (grep Pino output)** — logs are operational exhaust:
  best-effort delivery, rotated, redacted, and not transactional with the
  data they describe. Not evidence.
- **Trigger-based auditing in PostgreSQL** — captures row deltas but not
  intent (`auth.refresh.reuse_detected` is not expressible as a diff),
  and hides audit semantics from code review.
- **Event-sourcing the identity module** — the strongest audit story at
  a step-change in complexity; unjustified for current needs.
- **Post-commit async audit writes** — loses the "no success row for a
  failed action" invariant precisely when things go wrong (crash between
  commit and audit write).
