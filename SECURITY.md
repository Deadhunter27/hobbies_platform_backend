# Security Policy

## Reporting a vulnerability

**Do not open a public issue for security vulnerabilities.**

Report privately via GitHub's [security advisory](https://github.com/hobbies-platform/hobbies_platform_backend/security/advisories/new) flow, or email the maintainers at `security@` the project domain.

Please include: a description, reproduction steps, affected component/module, and potential impact. We aim to acknowledge within **72 hours** and to provide a remediation timeline after triage.

## Supported versions

Until the first production release, only the `main` branch is supported. Post-1.0, the current minor and the one prior receive security fixes.

## Baseline security practices (enforced by convention)

These are non-negotiable engineering standards for this codebase:

- **Secrets never enter the repository.** All configuration comes from environment variables, validated at boot. `.env` is git-ignored; only `.env.example` (with placeholder values) is committed.
- **Fail-closed configuration.** The application refuses to start if any required secret/config is missing or invalid.
- **Input is untrusted by default.** Every inbound payload is validated and typed at the boundary before entering application logic.
- **Authorization is checked at the boundary of every protected operation** — never assumed from prior context. Access is relationship-scoped (see the authorization ADR when written).
- **Least privilege** for database roles, storage credentials, and CI tokens.
- **Dependencies are monitored** (Dependabot) and **code is scanned** (CodeQL) on every PR and weekly.
- **No secrets or real user data in logs.** Logs are structured and redact sensitive fields.

## Handling of user data

The platform facilitates real-world, in-person meetups. Location and identity data are therefore sensitive. Any feature touching precise location, contact information, or minors' data requires an explicit privacy/security review recorded as an ADR before implementation.
