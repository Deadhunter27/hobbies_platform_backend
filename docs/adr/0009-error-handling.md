# ADR-0009: Error handling philosophy

- **Status:** Accepted
- **Date:** 2026-07-05
- **Deciders:** Founder

## Context

Errors cross four audiences: the mobile client (needs stable, machine-readable codes), the user (needs safe messages), the operator (needs full diagnostic context), and Claude Code (needs one unambiguous pattern to follow). Ad-hoc `throw new Error(...)` serves none of them.

## Decision

- A single **application error hierarchy** rooted in `AppError` (in `src/shared/errors`), with typed subclasses per category: `ValidationError`, `NotFoundError`, `ConflictError`, `UnauthorizedError`, `ForbiddenError`, `DomainRuleViolation`, `InfrastructureError`.
- Every `AppError` carries: a **stable machine-readable `code`** (SCREAMING_SNAKE, e.g. `COMMUNITY_NOT_FOUND`), a safe human message, optional structured `details`, and an internal `cause`.
- **Domain and application layers throw domain-meaningful errors; they never know about HTTP.** A single **global exception filter** at the interface layer maps error categories to HTTP status codes and the response envelope defined in the API conventions.
- Unknown/unexpected exceptions map to a generic `500 INTERNAL` with **no internal details leaked**; the full error (stack, cause) goes to structured logs with the request's correlation ID.
- **Expected business outcomes are not exceptions.** "No results found" for a search is an empty list; exceptions are for violated expectations.

## Consequences

- The client can branch on `error.code` forever without parsing prose; messages can be reworded freely.
- One mapping point (the filter) means status-code consistency is structural, not per-endpoint discipline.
- **Cost accepted:** slightly more ceremony than throwing strings — the entire point.

## Alternatives considered

- **Result types everywhere (no exceptions).** Explicit, but infects every signature with plumbing and fights NestJS idioms; heavy for the benefit. We reserve `Result` for domain operations where failure is a first-class outcome.
- **Throwing NestJS `HttpException` from services.** Leaks HTTP into application/domain layers, breaking Clean Architecture. Rejected.
