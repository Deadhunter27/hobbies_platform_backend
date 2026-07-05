# ADR-0001: Backend language and framework

- **Status:** Accepted
- **Date:** 2026-07-04
- **Deciders:** Founder

## Context

The platform is being built by a solo founder working with Claude Code. The mobile app is **React Native + Expo** (TypeScript). The backend must support a modular, multi-context product that grows over years, and must be implementable with minimal ambiguity by an AI coding agent. The dominant constraint is **cognitive load on a very small team**, not raw runtime performance.

## Decision

We will build the backend in **TypeScript (strict mode) using NestJS**.

## Consequences

- **One language across the whole product** — mobile, backend, and shared validation/types. This is the single largest efficiency multiplier available to a solo builder: fewer mental models, shareable types, and the largest pool of training data for reliable AI-assisted code.
- **NestJS modules map cleanly onto bounded contexts**, making the modular-monolith architecture (ADR-0002) natural rather than bolted-on. Its dependency injection supports Clean Architecture layering.
- **Cost accepted:** we forgo frameworks (notably Django) that ship a batteries-included admin/CMS. We will build or integrate an admin surface separately when needed. We judge one-language leverage to outweigh a free admin panel.
- **Cost accepted:** Node's raw compute throughput is lower than JVM/Go for CPU-bound work. Our workload is I/O-bound (DB, cache, network), where Node is well-suited; if a CPU-heavy need arises, it can be isolated later.

## Alternatives considered

- **Django (Python).** Strongest counter-argument: a free, mature admin and ORM would accelerate internal tooling, and the blueprint does list an admin dashboard. Rejected because it forces a second language into a TypeScript-everywhere product, raising cognitive load for a solo founder — the exact thing we are optimizing against.
- **Go / Java (Spring).** Excellent at scale and performance, but heavier ceremony, a separate language from mobile, and premature for pre-funding scale.
- **Plain Express/Fastify (TypeScript, no framework).** Less ceremony, but we would hand-roll the structure NestJS gives us (DI, modules, guards, pipes). For a long-lived, multi-context system, the opinionation is a feature, not a tax.
