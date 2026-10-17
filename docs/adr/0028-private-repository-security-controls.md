# ADR-0028: Private repository and replacement security controls

- **Status:** Accepted
- **Date:** 2026-10-17
- **Deciders:** Founder
- **Amends:** ADR-0007 (the CodeQL required check)

## Context

The founder decided on 2026-10-17 that both Wayfinder repositories must be private. Until now the backend was public, which is what made several GitHub security features free.

On a free personal GitHub account, a private repository loses:

- **Code scanning (CodeQL)** — ADR-0007 lists it as a required PR check.
- **Secret scanning and push protection.**
- **Branch protection / rulesets** — so "green CI is the merge gate" can no longer be enforced by GitHub.

An audit on the same day also found that:

- Dependabot was described in `SECURITY.md` but no `dependabot.yml` existed and alerts were disabled.
- `pnpm audit --prod` reported 19 advisories, including a critical `proxy-addr` issue (fixed in a separate PR).
- The free Supabase staging database auto-pauses after about a week without traffic, which took production login down on 2026-10-17.

## Decision

Make the repository private and replace each lost control with a free, pinned equivalent in `.github/workflows/security.yml`:

| Lost or missing control | Replacement | Gate |
| --- | --- | --- |
| CodeQL | Semgrep CE, `typescript` + `javascript` rules from `semgrep/semgrep-rules` pinned to one commit, scanning `src/` | Fails on any ERROR/WARNING finding |
| Secret scanning | gitleaks, pinned and checksum-verified, scanning the full git history | Fails on any finding |
| Dependabot (missing) | `dependabot.yml` (npm weekly, Actions and Docker monthly) + Dependabot alerts and security updates enabled in settings | PRs, not a gate |
| — | `pnpm audit --prod` | Fails on critical; high and below are reported |
| Branch protection | Not replaceable for free. Merges go through PRs with all CI and Security checks green, by convention | Convention |

Reviewed false positives are suppressed inline as `// nosemgrep: <rule> -- <reason>` so the reason sits next to the code.

A `Staging keep-alive` workflow calls `/health/ready` every three days. That endpoint runs a real PostgreSQL and Redis check, which counts as database activity. This keeps staging free while only the founder is testing.

## Consequences

- Security coverage on PRs is equal to or broader than before: secrets and dependencies were not gated before.
- Results are reproducible: the same pinned rules and tool versions can be run locally.
- Semgrep CE rules are less deep than CodeQL's data-flow analysis. This is accepted at Alpha scale; revisit if the repository moves to a paid plan or an organization.
- Without branch protection, a direct push to `main` is technically possible. Every Vercel production deploy comes from `main`, so the PR-only convention matters more than before.
- High-severity advisories without a non-major fix (currently `deepmerge-ts` via Prisma 6) stay visible in every run instead of blocking all work.
- The keep-alive adds about 10 GitHub Actions minutes per month to the private-repo quota.

## Alternatives considered

- **Keep the backend public.** Rejected by the founder: architecture, ADRs and product plans should not be public.
- **GitHub Pro or GitHub Code Security.** Restores CodeQL and branch protection, but is a paid commitment before the product has external users. Rejected for now.
- **Gate dependency audit on high.** Would block every PR on `deepmerge-ts`, which needs a Prisma 7 migration. Rejected; revisit after that upgrade.
- **Upgrade Supabase to a paid plan to stop auto-pause.** Rejected by the founder while testing is personal.
