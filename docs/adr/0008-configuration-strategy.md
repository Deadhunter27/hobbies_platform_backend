# ADR-0008: Configuration strategy — validated environment, typed access, fail closed

- **Status:** Accepted
- **Date:** 2026-07-05
- **Deciders:** Founder

## Context

Config errors are a leading cause of production incidents; they must fail loudly at boot, not subtly at runtime. Twelve-factor principles were already asserted in the environment guide; this ADR makes them a recorded decision.

## Decision

- All configuration comes from **environment variables** — never files baked into images, never hardcoded values.
- On boot, the entire environment is parsed against a **Zod schema** in `src/config`. Any missing/invalid required variable **aborts startup** with a precise error naming the variable.
- Application code consumes a **typed, frozen config object**; reading `process.env` outside `src/config` is a lint-level violation.
- `.env.example` is the canonical, documented registry of every variable. Adding config is a three-step contract: schema → `.env.example` → typed consumption.
- Secrets in production are injected by the platform's secret manager at runtime; rotation must never require a code change.

## Consequences

- Misconfiguration is caught in seconds at deploy, not in hours in production. Config has autocomplete and types everywhere.
- **Cost accepted:** minor boilerplate per new variable — deliberate friction that keeps the config surface auditable.

## Alternatives considered

- **`@nestjs/config` with Joi.** Fine, but Zod gives full TypeScript type inference from the schema (one definition, types for free) and is already the validation library of the codebase (ADR-0011). We may still wrap the Zod-parsed object in Nest's DI for injection ergonomics — an implementation detail, not a decision change.
- **Config files per environment (yaml/json).** Drifts from 12-factor, encourages committing environment specifics. Rejected.
