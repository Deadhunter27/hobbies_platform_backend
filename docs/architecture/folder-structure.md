# Folder Structure

```
src/
├── main.ts                      # bootstrap (added at implementation time)
├── app.module.ts                # root module wiring (added at implementation time)
│
├── config/                      # typed, validated configuration
│   └── (env schema + typed config provider)
│
├── shared/                      # cross-cutting building blocks reused by modules
│   ├── domain/                  # base Entity, ValueObject, DomainEvent, Result types
│   ├── application/             # base use-case, pagination, common ports
│   ├── errors/                  # error hierarchy + mapping
│   └── utils/
│
├── infrastructure/              # framework/adapter wiring shared across modules
│   ├── database/                # DB client, migrations, base repository
│   ├── cache/                   # Redis client
│   ├── storage/                 # S3-compatible client
│   ├── http/                    # global filters, interceptors, guards
│   └── logging/                 # structured logger
│
└── modules/                     # one folder PER BOUNDED CONTEXT
    └── <context>/
        ├── domain/              # entities, value objects, domain events, rules
        ├── application/         # use cases (commands/queries), ports
        ├── infrastructure/      # repository impls, adapters (implement ports)
        ├── interface/           # controllers, DTOs, validation, presenters
        ├── <context>.module.ts  # NestJS module wiring
        └── index.ts             # PUBLIC surface — the only thing other modules may import
```

## Rules

1. **`modules/<context>/index.ts` is the only public entry point** of a module. Everything else is private to that context.
2. **Dependency direction inside a module:** `interface → application → domain` and `infrastructure → (implements) → domain/application`. The `domain` layer imports nothing from NestJS, TypeORM/Prisma, or HTTP.
3. **`shared/` is for genuinely cross-cutting primitives** — not a dumping ground. If something belongs to one context, it lives in that context.
4. **Path aliases** (`@modules/*`, `@shared/*`, `@infra/*`, `@config/*`) keep imports readable and make boundary violations easy to spot in review.

## Why per-context, not per-technical-layer at the top

A top-level split like `controllers/ services/ repositories/` scatters a single feature across the whole tree and hides boundaries. Splitting by **bounded context first** keeps everything about "communities" in one place, makes ownership obvious, and makes the boundary rule enforceable. Technical layering happens *inside* each context.
