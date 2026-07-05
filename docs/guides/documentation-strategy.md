# Documentation Strategy

## Principle: docs live with the code

Documentation is version-controlled in this repository, reviewed in the same PRs as the code it describes, and treated as part of "done." Docs that live elsewhere drift; docs in the repo change with the code.

## The layers of documentation

| Layer | Lives in | Answers | Audience |
|---|---|---|---|
| **Decisions** | `docs/adr/` | Why is it this way? | Future maintainers, Claude Code |
| **Architecture** | `docs/architecture/` | How is the system shaped? | Engineers onboarding |
| **Guides** | `docs/guides/` | How do I work in it? | Contributors |
| **Agent contract** | `CLAUDE.md` | What rules must Claude Code follow? | Claude Code |
| **API reference** | generated (later) | What are the exact endpoints? | Mobile client, integrators |
| **Inline** | code comments | Why is this specific line non-obvious? | Whoever reads the code |

## Rules

- **A change that alters a decision updates or adds an ADR** in the same PR.
- **A change to a public contract updates the relevant guide** (or generated API reference) in the same PR.
- **Prefer generated API docs** (e.g. OpenAPI emitted from the code) over hand-written endpoint lists, so reference docs can't drift from reality. Added when the first endpoints exist.
- **Comment the *why*, not the *what*.** The code says what it does; comments explain non-obvious reasons.
- **Docs are for humans and for Claude Code.** Write them so an AI agent can act on them without guessing.

## Onboarding path (human or AI)

`README.md` → `docs/architecture/overview.md` → relevant ADRs → `docs/guides/*` → `CLAUDE.md`.
