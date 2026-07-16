# OpenAPI artifacts

`openapi.json` is generated from the NestJS code by `pnpm openapi:generate` (see docs/guides/openapi.md) and committed; CI fails if the committed spec differs from a regeneration. It is the single source of truth for the API contract; the mobile repository generates its TypeScript types from it (ADR-0005).

Current surface (v0.2.0): health probes, the public catalog endpoints (M1), and the auth/identity endpoints with a bearer security scheme (M2).
