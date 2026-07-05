# ADR-0013: Background jobs — BullMQ on Redis, worker-ready from day one

- **Status:** Accepted
- **Date:** 2026-07-05
- **Deciders:** Founder

## Context

Anything slow, retryable, or non-critical to the request path (media processing, notification fan-out, digests, reminders for real-world events) must leave the HTTP request cycle. Redis is already in the stack (ADR-0003). The scaling brief requires horizontal scaling and dedicated workers *later* without rearchitecture.

## Decision

- **BullMQ** (Redis-backed) is the queue system, wrapped behind a thin `QueuePort` in shared/application code so producers depend on an abstraction, not on BullMQ.
- Job payloads are **Zod-validated** (ADR-0011) at enqueue and at consume; payloads carry IDs, not fat objects.
- Jobs are **idempotent by design** (safe to retry) with explicit retry/backoff policies and a dead-letter strategy for exhausted retries.
- **Deployment shape:** processors are registered in dedicated worker modules. Phase-early, one process runs API + workers; the boot entrypoint accepts a role flag (`api` | `worker` | `all`) so splitting into separate horizontally-scaled worker processes is a **deployment change, not a code change**.

## Consequences

- Request latency stays flat as slow work grows; the worker split is pre-designed, eliminating the classic "rip async out of the request path" rewrite.
- **Cost accepted:** Redis becomes stateful-ish infrastructure (persistence/eviction settings matter for queues); documented in the ops guide when a deploy target is chosen.

## Alternatives considered

- **pg-boss (Postgres-based queue).** One less moving part and transactional enqueue — genuinely attractive. Rejected (narrowly) because Redis is already present, BullMQ's throughput ceiling and ecosystem (rate limiting, delayed jobs, repeatables, UI) are stronger, and notification fan-out at "millions of users" favors it. Revisit only if Redis ops become a burden.
- **SQS/Cloud Tasks.** Vendor lock before an infrastructure provider is even chosen. Rejected for now.
- **In-process `setTimeout`/cron only.** Loses jobs on every deploy. Rejected.
