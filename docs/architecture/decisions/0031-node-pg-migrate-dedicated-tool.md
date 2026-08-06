# ADR 0031: Use node-pg-migrate in a Dedicated Database Tool Workspace

## Status

Accepted.

## Context

Cycle 012 requires ordered, immutable, expand-and-contract, roll-forward PostgreSQL migrations but deliberately deferred the runner. ADR 0018 selects node-postgres and rejects an ORM as persistence authority. Migration execution needs ordering, history, transaction defaults, single-runner protection, environment safety, and drift evidence without adding a second data-access model to the Fastify runtime.

## Decision

Use `node-pg-migrate` through the private `tools/database` workspace named `@sem-caderno/database-migrations`. The tool owns migration files, runner configuration, schema-history responsibility, checksums, ordering validation, advisory-lock behavior, and environment safeguards. It depends directly on node-postgres and is not imported by application runtime packages.

Migrations are TypeScript source, ordered by UTC timestamp filenames, transactional by default, immutable after application, and roll-forward by production policy. Non-transactional migrations require isolated approval and rehearsal. No executable migration or SQL is created by this ADR.

## Consequences

- Migration dependencies and privileges remain outside the server runtime.
- Existing transaction, ordering, and advisory-lock behavior is reused instead of hand-written.
- The runner remains compatible with explicit node-postgres access.
- A reviewed wrapper and checksum ledger are still required.
- Migration authors must understand PostgreSQL and cannot rely on ORM model generation.

## Alternatives Considered

- Repository-owned custom runner. Rejected because it would duplicate mature ordering, history, transaction, and lock behavior.
- `dbmate`. Rejected because an external SQL-first binary would add a second toolchain with less direct TypeScript/node-postgres integration.
- ORM-owned migrations. Rejected because no ORM is selected and generated models could become accidental persistence authority.
- Run migrations from the Fastify application package. Rejected because it couples runtime startup, privileges, and schema evolution.

## Risks and Revisit Triggers

- Runner upgrades can change TypeScript loading or migration semantics; rehearse every major upgrade.
- Advisory locking does not replace deployment serialization and environment checks.
- Revisit only if the runner cannot express a required supported PostgreSQL change or a deployment boundary requires a separately packaged audited binary.

## Relationship to Existing Decisions and Specifications

This decision implements ADR 0018 and the migration policy in the Cycle 012 physical persistence specification. It does not alter PostgreSQL schema, transaction, or rollback semantics.

## Follow-up Work

- Scaffold the isolated tool boundary without migrations in Cycle 014.
- Implement the first migration, history/checksum behavior, and empty-database rehearsal in a later migration cycle.
