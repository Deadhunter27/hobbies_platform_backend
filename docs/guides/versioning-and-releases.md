# Versioning & Release Strategy

## Two versions, don't conflate them

- **API version** — the public HTTP contract, in the URL (`/api/v1`). Increments only on **breaking** changes to the API surface.
- **Release version** — the deployable artifact, following **Semantic Versioning** (`MAJOR.MINOR.PATCH`).

## Semantic Versioning

- **MAJOR** — incompatible/breaking change.
- **MINOR** — backward-compatible new capability.
- **PATCH** — backward-compatible fix.

Because commits follow Conventional Commits, the next version can be derived automatically: `fix:` → patch, `feat:` → minor, `BREAKING CHANGE:` → major.

## Release flow

1. Merges to `main` accumulate as the next release.
2. A release is cut by **tagging** `main` with `vX.Y.Z`.
3. The **CHANGELOG** is generated from Conventional Commit history (candidate tool: `changesets` or `semantic-release`; finalized when a deploy target exists).
4. A tag triggers the release workflow (build → package → deploy), added when infrastructure is chosen.

## Pre-1.0

While under `0.y.z`, the API is considered unstable and may change between minors. We reach `1.0.0` when the first production launch surface is stable.

## Branching relationship

`main` is always releasable. There are no release branches; we tag `main` directly. Hotfixes are ordinary short-lived branches merged via PR, then tagged.
