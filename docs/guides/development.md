# Development Guide

## Prerequisites

- **Node.js** — the version pinned in `.nvmrc` (run `nvm use`).
- **pnpm** — enable via `corepack enable`.
- **Docker** (recommended) for local PostgreSQL + PostGIS, Redis, and an S3-compatible store (e.g. MinIO).

## First-time setup

```bash
git clone <repo-url>
cd companion-backend

nvm use              # match pinned Node version
corepack enable      # enable pnpm
pnpm install         # install tooling (app deps added during implementation)

cp .env.example .env # create local env — NEVER commit .env
# then fill in local values
```

## Local infrastructure

```bash
docker compose up -d     # PostGIS (5432), Redis (6379), MinIO (9000/9001)
docker compose ps        # verify all healthy
```
Credentials match `.env.example` out of the box. Data persists in named volumes; `docker compose down -v` resets everything.

## Everyday commands

```bash
pnpm format          # auto-format
pnpm format:check    # verify formatting (runs in CI)
pnpm lint            # lint (zero warnings allowed)
pnpm typecheck       # strict TypeScript check
pnpm test            # run tests
pnpm build           # compile
```

## Making a change

1. Branch off `main`: `git switch -c feat/<scope>-<short-desc>`.
2. Keep the change inside one bounded context; respect module boundaries.
3. Record any architectural decision as an ADR.
4. Commit using Conventional Commits.
5. Open a PR; fill the template; ensure CI is green.
6. Squash-merge with a valid Conventional Commit subject.

## Where things live

- Decisions → `docs/adr/`
- How the system is shaped → `docs/architecture/`
- API rules → `docs/guides/api-conventions.md`
- The AI-agent contract → `CLAUDE.md`
