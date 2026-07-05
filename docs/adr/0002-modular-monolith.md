# ADR-0002: Modular monolith over microservices

- **Status:** Accepted
- **Date:** 2026-07-04
- **Deciders:** Founder

## Context

The product spans many domains (communities, discussions, events, and a large planned ecosystem). A tempting instinct for an ambitious platform is to start with microservices "so it scales." The team is one person plus an AI agent, pre-funding.

## Decision

We will build a **single deployable NestJS application** organized as a **modular monolith**: independent modules per bounded context, with strictly enforced boundaries (a module is reachable only through its published interface or via domain events).

## Consequences

- **One thing to build, deploy, debug, and reason about.** No network hops between contexts, no distributed transactions, no per-service ops burden.
- **Extensible by addition.** New contexts are new modules; existing ones are untouched. The blueprint's future features become additive work, not rewrites.
- **Future-service-ready.** Because boundaries are clean, extracting a module into its own service later is mechanical (swap in-process calls for network calls) rather than a rescue project.
- **Cost accepted:** independent per-context scaling and independent deploys are not available until/unless we extract a service. For our scale, this is irrelevant today.
- **Discipline required:** the boundary rule must be enforced in review (and by Claude Code per CLAUDE.md), or the monolith degrades into a big ball of mud.

## Alternatives considered

- **Microservices from day one.** Solves problems we don't have (org scale, independent scaling) and creates problems we can't absorb (distributed systems complexity, multi-service local dev, ops). Rejected as premature.
- **Unstructured monolith.** Fast initially, but with this many domains it becomes unmaintainable and impossible to later decompose. Rejected.
