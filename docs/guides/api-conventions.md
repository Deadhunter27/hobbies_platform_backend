# API Conventions

These rules apply to every endpoint. Consistency here is what lets the mobile client and Claude Code work without surprises.

## Style & versioning

- **REST over HTTPS**, JSON bodies.
- All routes are versioned: `/{API_PREFIX}/{API_VERSION}/...` → e.g. `/api/v1/hobbies`.
- The version increments only on **breaking** changes. Additive changes stay within the current version.

## Resource naming

- Plural, kebab-case nouns: `/communities`, `/discussion-threads`.
- Nest only one level for clear ownership: `/communities/{id}/members`. Avoid deep nesting; prefer top-level resources with filters.

## Methods & status codes

| Action | Method | Success |
|---|---|---|
| List | GET | 200 |
| Read one | GET | 200 (404 if absent) |
| Create | POST | 201 + resource |
| Full update | PUT | 200 |
| Partial update | PATCH | 200 |
| Delete | DELETE | 204 |

## Request validation

Every inbound payload is validated at the controller boundary before reaching application logic. Reject invalid input with `400` and a structured error. Never trust client data.

## Pagination, filtering, sorting

- **Cursor-based pagination** for feeds/lists (stable under inserts): `?limit=20&cursor=<opaque>`.
- Filtering via explicit query params; sorting via `?sort=field` / `?sort=-field`.
- List responses return `{ data: [...], page: { nextCursor, hasMore } }`.

## Error format

A single consistent shape:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Human-readable, non-sensitive description.",
    "details": []
  }
}
```

- `code` is a stable, machine-readable string the client can branch on.
- `message` never leaks internals, stack traces, or secrets.

## Authentication & authorization

- Auth via bearer tokens (short-lived access + refresh). Details in the identity ADR/guide when implemented.
- **Authorization is checked explicitly at each protected operation** and is **relationship-scoped**: a user's permission depends on their role *relative to the specific resource* (e.g. admin of community A, member of community B), not a global role.

## Idempotency & timestamps

- Mutating endpoints that may be retried accept an `Idempotency-Key` header where appropriate.
- Timestamps are UTC, ISO-8601, named `createdAt` / `updatedAt`.

## Contract stability

A published endpoint's shape is a contract. Breaking it requires a new API version and a note in the PR/changelog.
