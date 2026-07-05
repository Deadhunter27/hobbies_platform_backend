# The Modular Monolith

## Definition

A **modular monolith** is a single deployable application whose internals are divided into independent modules with **strictly enforced boundaries**. It gives us most of the organizational benefits of microservices (clear ownership, isolated domains, replaceability) without their operational cost (distributed systems, network failure modes, deployment complexity).

## The boundary rule

> A module may only be reached through its **published interface**. No module imports another module's internal files.

Concretely:
- Each module under `src/modules/<context>` exposes a small, explicit public surface (a facade service and/or events it publishes).
- Everything else in the module is private.
- Two modules that need to collaborate do so via (a) a called public service, or (b) **domain events** (fire-and-forget, decoupled).

This rule is what makes the monolith "modular" rather than a big ball of mud. It is also what makes a future extraction into a separate service *mechanical* rather than *heroic*: a module with clean boundaries can become its own service by replacing in-process calls with network calls.

## Bounded contexts (initial and planned)

| Context | Responsibility | Phase |
|---|---|---|
| `identity` | Accounts, authentication, sessions, relationship-scoped roles | Foundation |
| `catalog` | Data-driven hobby taxonomy (no hardcoded categories) | v1 |
| `community` | Beginner-friendly groups, membership | v1 |
| `discussion` | Threads: questions, buddy-finding, reviews, tips | v1 |
| `events` | Lightweight real-world meetups + RSVP (no payments yet) | v1 |
| `progress`, `mentorship`, `marketplace`, ... | Later ecosystem | Designed-for, deferred |

The table is a map, not a mandate to build everything now. Contexts are added when they enter scope.

## Why not microservices (yet)

Microservices solve problems a small team doesn't have yet: independent scaling of teams, polyglot services, isolated failure domains at scale. They *introduce* problems a small team can't absorb: network reliability, distributed transactions, service discovery, multi-service local dev, and an operations burden per service. We keep the option open (clean boundaries) and pay for it only when a real, measured pressure appears.
