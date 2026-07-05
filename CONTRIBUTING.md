# Contributing to Hobbies Platform Backend

This guide is the contract for how changes enter this repository. It applies to every contributor — human or AI (Claude Code). The goal is a codebase that stays comprehensible and safe to change for years, by a very small team.

## Golden rules

1. **Every change serves real-world hobby participation.** If a change doesn't advance the core objective (directly or as enabling infrastructure), question whether it belongs.
2. **Respect module boundaries.** A change should live inside one bounded context. Reaching across boundaries requires an explicit, documented contract — never a direct import into another module's internals.
3. **Decisions are written down.** If you make an architectural choice, record it as an ADR. Code without a recorded "why" rots.
4. **Small, reviewable PRs.** One concern per PR. If you can't describe it in one sentence, split it.

## Branch strategy

We use **trunk-based development** with short-lived branches.

- `main` is always releasable and is **protected** (no direct pushes; PR + green CI required).
- Branch off `main`, name it `type/short-description`:
  - `feat/catalog-hobby-model`
  - `fix/identity-token-refresh`
  - `docs/adr-geo-search`
  - `chore/upgrade-eslint`
- Keep branches short-lived (hours to a couple of days). Rebase on `main` rather than letting branches drift.
- **No `develop` branch, no GitFlow.** For a small team this adds ceremony without benefit. Feature flags — not long-lived branches — gate unfinished work.

## Commit convention — Conventional Commits

Format: `type(scope): subject`

- **type**: `feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore` `revert`
- **scope**: the module/area in kebab-case (`catalog`, `identity`, `community`)
- **subject**: imperative mood, lowercase, no trailing period (`add hobby taxonomy schema`)

Breaking changes: add `!` after the scope **and** a `BREAKING CHANGE:` footer.

```
feat(catalog)!: replace flat categories with hierarchical taxonomy

BREAKING CHANGE: /v1/hobbies response shape changed; see api-conventions.md
```

Why enforce this: commit history becomes a changelog, release automation can derive the next SemVer bump, and every change is self-describing. `commitlint` enforces it in CI.

## Pull request flow

1. Open a PR against `main`; fill in the template honestly.
2. CI must pass: format, lint, typecheck, test, build, commitlint.
3. At least one approving review (see CODEOWNERS). Even when working solo, open the PR so CI gates the merge and the history stays clean.
4. **Squash-merge.** The squash subject must be a valid Conventional Commit — this keeps `main` history linear and readable.

## Definition of Done

- [ ] Behavior covered by tests at the appropriate level
- [ ] Public contracts (API/DB/events) documented or unchanged
- [ ] An ADR exists for any non-trivial decision
- [ ] No secrets or real user data
- [ ] Lint/typecheck/tests green locally before pushing

## Working with Claude Code

Claude Code is a first-class contributor here. Before implementing, it must read [`CLAUDE.md`](CLAUDE.md) and the relevant ADRs. Ambiguity is resolved by writing a doc, not by guessing.
