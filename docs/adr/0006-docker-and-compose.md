# ADR-0006: Docker for packaging, Docker Compose for local infrastructure

- **Status:** Accepted
- **Date:** 2026-07-05
- **Deciders:** Founder

## Context

The app must run identically on the founder's machine, in CI, and in production. Local development needs PostgreSQL+PostGIS, Redis, and S3-compatible storage without manual installs.

## Decision

- The application ships as a **multi-stage Docker image** (build stage → slim runtime stage, non-root user).
- **Docker Compose** provides local infrastructure: `postgis/postgis`, `redis`, `minio`. The app itself runs on the host during development (fast reload) and in a container in CI/production.
- The image is the **same artifact** promoted through environments; configuration differs only via environment variables (ADR-0008).

## Consequences

- One-command local setup (`docker compose up -d`); no "works on my machine."
- Deployment target stays open: the container runs on any host — a VPS, Fly.io, Cloud Run, ECS, or Kubernetes later. We are not locking an infrastructure provider in Phase 1.
- **Cost accepted:** slightly slower cold builds; mitigated by layer caching and pnpm's store.

## Alternatives considered

- **No containers (bare Node + local installs).** Fast today, divergence forever. Rejected.
- **Dev containers / running the app itself in Compose during dev.** Optional later; hot-reload ergonomics on the host are better for now.
