# Modules — Bounded Contexts

Each folder here is **one bounded context** and the only unit of the domain that owns its data and rules. This is the heart of the modular monolith.

## Anatomy of a module

```
<context>/
├── domain/          # entities, value objects, domain events, business rules
│                    #   imports NOTHING framework-specific (no NestJS, no SQL)
├── application/     # use cases (command/query handlers), ports (interfaces)
├── infrastructure/  # repository & adapter implementations of the ports above
├── interface/       # HTTP controllers, DTOs, request validation, presenters
├── <context>.module.ts   # NestJS wiring
└── index.ts         # PUBLIC surface — the ONLY file other modules may import
```

## The two hard rules

1. **Never import another module's internals.** Import only from its `index.ts`. If you need something that isn't exported there, either it shouldn't be reached, or the owning module should publish it deliberately.
2. **Dependencies point inward.** `interface → application → domain`; `infrastructure` implements interfaces defined further in. The `domain` layer is pure.

## Cross-module collaboration

- **Synchronous:** call the other module's exported service (from its `index.ts`).
- **Asynchronous / decoupled:** publish a **domain event**; interested modules subscribe. Prefer this when the caller shouldn't depend on the callee's outcome.

Implemented contexts: **catalog** (M1 — the normative reference for this anatomy), **identity** and **access** (M2 — access declares ports that identity implements; the composition root binds them, see ADR-0018). When a task adds a context, it follows this anatomy exactly.
