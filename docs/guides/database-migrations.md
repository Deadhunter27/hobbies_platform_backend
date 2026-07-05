# Database Migration Strategy

Governing decisions: ADR-0003 (every change is a migration), ADR-0004 (Prisma Migrate).

## Rules

1. **The schema changes only via committed migrations.** `prisma migrate dev` locally, `prisma migrate deploy` in CI/production. `db push` / implicit sync is forbidden in every environment, including local (it desynchronizes migration history).
2. **Migrations are immutable once merged to `main`.** A wrong migration is corrected by a *new* migration, never by editing history — other environments may already have applied it.
3. **Migrations are reviewed as SQL.** Prisma generates SQL files; the PR review examines the SQL, not just `schema.prisma` — especially for locks, index builds, and data backfills.
4. **Expand → migrate → contract for zero-downtime changes.** Never rename/drop a column the running code still reads. Sequence: add new (expand) → deploy code using new → backfill → remove old (contract), across separate releases.
5. **Large-table index creation uses `CREATE INDEX CONCURRENTLY`** (hand-edited into the generated migration when needed) to avoid write locks.
6. **PostGIS objects** (geometry columns, GIST indexes) are introduced via raw SQL inside migrations (Prisma limitation, accepted in ADR-0004) and documented inline.
7. **Data migrations** (backfills) are separate, idempotent scripts run deliberately — not hidden inside schema migrations.
8. **Rollback stance:** roll *forward*. Down-migrations are unreliable with data involved; incidents are fixed by a corrective forward migration. Backups + point-in-time recovery (ops guide, post-deploy-target) are the true safety net.

## Local workflow

```bash
docker compose up -d postgres      # local PostGIS
# edit prisma/schema.prisma (Phase 2+)
pnpm prisma migrate dev --name add_xyz
# review the generated SQL before committing
```

## CI

CI applies all migrations to a fresh PostGIS container and runs integration tests against the result — proving the migration chain reproduces the schema from zero on every PR.
