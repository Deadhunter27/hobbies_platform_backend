# Dependency Update Policy

## Cadence

- **Dependabot runs weekly**, grouped (dev-dependencies batched) to keep PR noise low.
- **Security advisories are handled immediately**, out of band, regardless of cadence.

## Merge rules

| Update type | Rule |
|---|---|
| Patch | Merge on green CI. |
| Minor | Merge on green CI after skimming the changelog. |
| Major | Never auto-merge. Read migration notes; upgrade in a dedicated PR; note breaking impacts. |
| Framework pillars (NestJS, Prisma, Node LTS) | Planned upgrades, one pillar at a time, never bundled. |

## Principles

- **Fewer dependencies beat updated dependencies.** Every new package must justify itself against "could 30 lines of our own code do this?"
- **Pin the pillars:** Node major via `.nvmrc`, package manager via `packageManager`, lockfile always committed and enforced (`--frozen-lockfile`).
- A dependency that is unmaintained (no release/activity ~18 months) gets an issue to replace or vendor it before it becomes an emergency.
