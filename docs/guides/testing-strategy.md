# Testing Strategy

## Philosophy

Tests exist to let a tiny team change this system fearlessly for years. We follow the testing **pyramid**: many fast unit tests, fewer integration tests, few end-to-end tests. We test **behavior and contracts**, not implementation details.

## Levels

1. **Unit tests (most)** — the `domain` and `application` layers in isolation, no database or network. These are fast and encode the actual product rules. Co-located with source: `*.spec.ts`.
2. **Integration tests (some)** — a module against real infrastructure (Postgres/Redis) using **ephemeral containers** (e.g. Testcontainers) so tests are hermetic and reproducible. Verify repositories, queries (including PostGIS), and module wiring.
3. **End-to-end tests (few)** — full HTTP requests against the running app for critical user journeys. Live in `test/`.

## Rules

- **The domain layer must be unit-testable with zero mocks of infrastructure** — if it isn't, the layering is wrong.
- **No shared mutable state between tests.** Each test sets up and tears down its own data.
- **Test the contract, not the internals.** Refactoring internals should not break tests; changing behavior should.
- **CI runs the full suite on every PR.** A red suite blocks merge.
- **Coverage is a signal, not a target.** We require meaningful tests on domain logic and public contracts rather than chasing a percentage.

## Tooling

Jest is the default runner (NestJS-native, well-supported by Claude Code). Test data builders/factories live alongside tests to keep setup readable. Specific tooling choices are finalized when the first module is implemented.
