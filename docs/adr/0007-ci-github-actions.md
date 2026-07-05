# ADR-0007: GitHub Actions for CI/CD

- **Status:** Accepted
- **Date:** 2026-07-05
- **Deciders:** Founder

## Context

The repo lives on GitHub; the team is one person; CI must gate every merge to a protected `main` (CONTRIBUTING.md).

## Decision

**GitHub Actions** is the CI/CD platform. Required checks on every PR: format, lint, typecheck, tests, build, commitlint, CodeQL. Integration tests run against services (Postgres, Redis) provisioned in the workflow. Release/deploy workflows trigger on version tags (ADR pending once a deploy target is chosen).

## Consequences

- Zero-infrastructure CI, co-located with code review; branch protection makes green CI the merge gate.
- **Cost accepted:** vendor coupling to GitHub. Acceptable — workflows are thin wrappers over `pnpm` scripts, so migration cost is low.

## Alternatives considered

- **CircleCI / GitLab CI / Jenkins.** All add either a second vendor or self-hosted ops burden with no benefit at this scale. Rejected.
