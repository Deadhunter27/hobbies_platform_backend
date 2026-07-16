# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Full release notes live in [`docs/releases/`](docs/releases/).

## [Unreleased]

## [0.2.0] - 2026-07-16

Identity & Access. Release notes: [docs/releases/v0.2.0.md](docs/releases/v0.2.0.md).

### Added

- `identity` module: registration, login, refresh, logout, change-password,
  and `GET /api/v1/me` — argon2id password hashing with timing-safe login,
  15-minute HS256 access JWTs (claims exactly `sub`/`sid`/`iat`/`exp`),
  rotating opaque refresh tokens (SHA-256 at rest) with session-family
  revocation on reuse detection (ADR-0017).
- `access` module: default-deny `can(actor, action, resource)` policy layer,
  `access_resource_role` grants table, global `AuthGuard` with opt-in
  `@RequiresAuth()` and `@CurrentUser()`; suspended users rejected live with
  `USER_SUSPENDED` (ADR-0018).
- Append-only `audit_entry` trail written in the same transaction as the
  action it records, via a shared `UnitOfWork` port; covers the entire auth
  lifecycle with request correlation ids and email hashes only (ADR-0019).
- Migration `20260715222641_m2_identity_access_audit`; env vars `JWT_SECRET`
  (required), `ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_TOKEN_TTL_DAYS`; bearer
  security scheme in the OpenAPI contract; ADRs 0017–0019.
- Error codes: `EMAIL_ALREADY_REGISTERED`, `INVALID_CREDENTIALS`,
  `INVALID_REFRESH_TOKEN`, `SESSION_REVOKED`, `USER_SUSPENDED`,
  `PASSWORD_TOO_WEAK`.

### Changed

- Pino redaction extended to `accessToken`, `currentPassword`, `newPassword`,
  `passwordHash` (strictly additive).
- CI job environments carry a test-only `JWT_SECRET` (config is fail-closed).

### Security

- Passwords hashed with argon2id; dummy-hash verification hides account
  existence from response timing; refresh tokens never stored or logged in
  plaintext; authorization evaluated live so suspension/revocation take
  effect immediately rather than at token expiry.

## [0.1.0] - 2026-07-12

Platform kernel + catalog (M1).

### Added

- NestJS application kernel executing ADRs 0001–0014: fail-closed Zod env
  config, `AppError` hierarchy + single global exception filter with the
  stable error envelope, Pino structured logging with `x-request-id`
  correlation, Terminus health probes (`/health/live`, `/health/ready`),
  URI versioning under `/api/v1`, helmet hardening, graceful shutdown.
- `catalog` module (read-only, normative reference anatomy):
  `GET /api/v1/hobby-categories`, `GET /api/v1/hobbies` (keyset cursor
  pagination; category/difficulty/free-text filters; wildcard-safe search),
  `GET /api/v1/hobbies/{slugOrId}`.
- Prisma schema + first migration (`catalog_hobby_category`,
  `catalog_hobby`), idempotent seed, ULID `CHAR(26)` app-generated ids
  (ADR-0015), data-driven taxonomy (ADR-0016).
- OpenAPI spec generated from code and committed, with a CI staleness gate;
  multi-stage Docker image with a CI build-and-boot gate; GitHub Actions
  pipeline (lint, typecheck, build, unit, DB-gated integration + e2e,
  OpenAPI check, docker, commitlint) and CodeQL.
- Error codes: `VALIDATION_FAILED`, `INVALID_CURSOR`, `HOBBY_NOT_FOUND`,
  `ROUTE_NOT_FOUND`, `INTERNAL`.

[Unreleased]: https://github.com/Deadhunter27/hobbies_platform_backend/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Deadhunter27/hobbies_platform_backend/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Deadhunter27/hobbies_platform_backend/releases/tag/v0.1.0
