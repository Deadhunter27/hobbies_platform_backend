# Scaling Path & Future Service Boundaries

The brief: comfortably support millions of users, horizontal scaling, background workers, and future realtime — **without premature microservices**. This document records how the monolith scales and exactly where it would split if it ever must.

## How the monolith scales horizontally

The application is **stateless by construction**, which makes horizontal scaling trivial:

- No in-process session state — sessions/tokens are verified per request; shared state lives in Redis/Postgres.
- No local filesystem writes — media goes to object storage (ADR-0003).
- No in-memory caches that matter — caching is Redis, shared across instances.
- Background work is queued in Redis (ADR-0013), consumable by any worker instance.

Scaling sequence, in order of actual bottleneck likelihood:

1. **More API instances** behind a load balancer (stateless → linear).
2. **Split workers from API** — flip `PROCESS_ROLE` (ADR-0013); a deployment change, not a code change. Scale worker count with queue depth.
3. **Postgres read replicas** for read-heavy discovery/feed queries; writes stay on the primary.
4. **Cache aggressively in Redis** for hot discovery surfaces (nearby communities/events).
5. **Dedicated search engine** only when Postgres FTS measurably fails (open ADR).
6. Only after all of the above: consider extracting a service.

## Natural service boundaries (if/when extraction is justified)

Because module boundaries are enforced (ADR-0002), each bounded context is a *pre-drawn* seam. The realistic extraction order, by pressure profile:

| Candidate | Pressure that would justify it | Why it splits cleanly |
|---|---|---|
| **Media processing** | CPU-heavy image/video work starving the event loop | Already async via queue; zero domain coupling |
| **Notifications** | Fan-out volume (push to millions) with bursty load | Consumes domain events; write-only outward |
| **Realtime gateway** (WebSocket/SSE) | Long-lived connections don't scale like request/response | Stateless edge over Redis pub/sub; added later as its own module from day one |
| **Search/discovery read model** | Query load + specialized indexing diverges from OLTP | Read-only projection fed by domain events |
| **Identity** | Only at organizational scale (multiple teams/products) | Last to extract — everything depends on it |

## What we refuse to do prematurely

- No service extraction to "prepare for scale" — extraction answers a *measured* pressure, recorded in an ADR.
- No event bus infrastructure (Kafka etc.) while in-process domain events + Redis suffice.
- No multi-region until a business reason exists.

The strategic bet, restated: **clean boundaries make extraction mechanical later; premature extraction makes everything harder now.**
