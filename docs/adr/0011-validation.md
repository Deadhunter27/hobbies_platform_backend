# ADR-0011: Validation strategy — Zod at every boundary

- **Status:** Accepted
- **Date:** 2026-07-05
- **Deciders:** Founder

## Context

Untrusted input enters through HTTP requests, environment config, queue payloads, and third-party responses. The API conventions already mandate boundary validation; this ADR locks the tool and the pattern.

## Decision

- **Zod** is the validation library for all boundaries: request DTOs, environment config (ADR-0008), background-job payloads, and webhook/third-party payloads.
- Request validation runs in the **interface layer** via a Nest pipe that parses body/query/params against a Zod schema; failures become `400` with structured `details` (per ADR-0009). Handlers receive **parsed, typed** data — types are *inferred from the schema*, never hand-written twice.
- Validation at the edge covers **shape and syntax**; **business rules live in the domain** (e.g. "RSVP capacity exceeded" is a domain rule, not a DTO rule).
- One schema, three artifacts: runtime validation, inferred TS types, and (via a bridge such as `zod-openapi` / `nestjs-zod`) the OpenAPI schema — keeping ADR-0005's contract truthful without duplication.

## Consequences

- A single definition per input eliminates the classic DTO/type/spec triplication and its drift.
- **Cost accepted:** `class-validator` is the NestJS default and more tutorial-adjacent; we deviate deliberately because class-validator duplicates types (class + decorators), is weaker at composition/refinement, and cannot serve as the config/queue validator — Zod covers all boundaries with one mental model.

## Alternatives considered

- **class-validator + class-transformer.** See cost above; also relies on reflection metadata quirks. Rejected.
- **Hand-rolled guards.** Unreviewable and incomplete by construction. Rejected.
