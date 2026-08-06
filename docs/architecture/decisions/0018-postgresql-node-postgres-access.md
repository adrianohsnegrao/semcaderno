# ADR 0018: Use PostgreSQL with Explicit node-postgres Repository Adapters

## Status

Accepted.

## Context

PostgreSQL is already the accepted database direction. The implementation needs all-or-nothing financial operations, tenant-scoped relationships, history preservation, durable idempotency and audit evidence, projection rebuilding, and explicit concurrency-sensitive checks. The physical model is not yet specified.

## Decision

Use PostgreSQL 18 on its current supported minor release as the initial relational engine. Access PostgreSQL through `node-postgres` behind explicit repository and transaction adapters.

Repositories must require validated Business scope for tenant-owned work, use parameterized queries, map persistence data explicitly, and participate in application-defined consistency boundaries. `node-postgres` and SQL remain infrastructure details; domain and application modules depend on ports rather than the driver.

No ORM, schema generator, migration tool, physical identifier, table, constraint, index, isolation level, lock, query, or RLS policy is selected by this ADR.

## Consequences

- PostgreSQL behavior remains visible for financial transaction and tenant-isolation review.
- No ORM schema becomes a competing domain or logical-model authority.
- Repository code carries explicit mapping and query responsibilities.
- Real PostgreSQL integration and concurrency tests are mandatory because mocks cannot prove transaction behavior.
- The physical persistence cycle must select migration tooling and defense-in-depth constraints.

## Alternatives Considered

- Prisma. Not selected because its generated client, declarative schema, and integrated migration model would preempt physical-model decisions and add an abstraction over concurrency-sensitive work.
- Drizzle. Not selected because its TypeScript schema/query layer likewise belongs after the physical model, and its PostgreSQL release status must be rechecked if reconsidered.
- A document database. Rejected because the accepted data model is relational and transaction-sensitive.
- Raw driver use without repositories. Rejected because tenant scope and mapping must be mandatory and reviewable.

## Risks and Revisit Triggers

- Risk: less compile-time query safety. Mitigate with narrow repositories, explicit mapping, parameterization, integration tests, and review.
- Risk: developers omit tenant scope. Mitigate by exporting only scoped tenant repository contracts and testing every boundary.
- Risk: direct SQL raises learning burden. Mitigate with documented patterns and focused persistence ownership.
- Revisit if measured mapping defects or maintenance cost outweigh explicit control after the physical model is stable.

## Relationship to Existing Decisions and Specifications

This ADR specializes ADR 0013 and preserves ADR 0005, ADR 0006, ADR 0007, ADR 0008, ADR 0009, ADR 0014, the Data Persistence and Tenant Enforcement Specification, and the Logical Data Model Specification.

## Follow-up Work

- Specify the physical PostgreSQL model, migration strategy, transactions, constraints, concurrency controls, backup, restore, and possible RLS defense in depth.
- Add real PostgreSQL tenant, transaction, projection, and recovery tests after implementation begins.
