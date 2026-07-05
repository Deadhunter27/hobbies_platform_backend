# ADR-0010: Logging strategy — structured JSON with correlation IDs

- **Status:** Accepted
- **Date:** 2026-07-05
- **Deciders:** Founder

## Context

Logs are the primary observability signal in early production (before metrics/tracing mature — see the observability plan). They must be machine-parseable, correlated per request, and free of secrets/PII.

## Decision

- **Pino** as the logger: structured **JSON to stdout** (12-factor; the platform/agent handles shipping). Pretty-printing only in local dev.
- Every request is assigned (or propagates) a **correlation ID** (`x-request-id`), bound to all log lines for that request via async context, and returned in responses.
- Standard fields on every line: timestamp, level, message, `requestId`, module, and event-specific context. HTTP access logs include method, path, status, latency.
- **Redaction is configured centrally** for known sensitive keys (authorization headers, tokens, passwords); logging raw request bodies is forbidden by default.
- Levels: `debug` (dev detail), `info` (state changes worth auditing), `warn` (degraded but handled), `error` (violated expectation, actionable). No `console.log` in committed code.

## Consequences

- Any incident can be reconstructed by filtering one `requestId`. Logs are queryable in any aggregator without regex archaeology.
- **Cost accepted:** JSON logs are unreadable raw — hence dev pretty-printing.

## Alternatives considered

- **Winston.** Flexible but slower and less opinionated about structure; Pino is the performance-and-JSON default of the Node ecosystem. Rejected.
- **Nest's built-in logger.** Fine for hello-world; lacks structure, redaction, and context binding. Rejected.
