# Environment Variable Strategy

## Principles (12-factor)

1. **Config lives in the environment, not the code.** No environment-specific values are hardcoded.
2. **Secrets never enter git.** `.env` is ignored; only `.env.example` (placeholders) is committed.
3. **Validate at boot, fail closed.** On startup the app parses and validates every variable against a schema. If anything required is missing or malformed, the app **refuses to start** with a clear error — better a loud failure now than a subtle one in production.
4. **Single access point.** Application code never reads `process.env` directly. It reads a typed config object provided by `src/config`. This gives autocomplete, type safety, and one place to see every setting.

## How it works

- `.env.example` is the canonical list of every variable, documented with comments and safe placeholder values.
- `src/config` defines a schema (validated with a library such as Zod), parses the environment once, and exposes a typed, frozen config object.
- Adding a new variable is a three-step contract: add it to the schema, add it to `.env.example`, consume it via the typed config — never inline.

## Environments

- `development` — local, permissive logging, local infra.
- `test` — isolated, ephemeral infra, deterministic.
- `production` — secrets injected by the host/orchestrator (never from a file in the image); strict logging; fail-closed.

## Secret handling

- Generate strong, unique secrets per environment; never reuse dev secrets in production.
- In production, secrets come from the platform's secret manager, injected as environment variables at runtime.
- Rotating a secret must not require a code change.
