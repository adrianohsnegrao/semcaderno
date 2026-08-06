# ADR 0006: Use Business as the Tenant Boundary

## Status

Accepted.

## Context

Sem Caderno serves small establishments that own their customers, products, sales, payments, expenses, reports, photos, and audit history. Users may help one or more businesses, but operational records must never mix across establishments.

## Decision

Use `Business` as the tenant boundary. Every operational record belongs to exactly one business, except global user identity records and system configuration that contains no tenant operational data. A user may access business data only through an active membership with the required capability.

## Consequences

- Tenant isolation becomes a domain invariant, not only a persistence detail.
- Every business-scoped operation must validate business context, active membership, capabilities, and same-business references.
- The likely MVP implementation direction is a single PostgreSQL database with explicit business identifiers, application-enforced scoping, and tenant isolation tests.
- PostgreSQL Row-Level Security remains a deferred defense-in-depth option.

## Alternatives Considered

- User-owned data. Rejected because business records belong to the establishment, not to an individual user.
- Schema-per-tenant. Deferred because it adds operational complexity before the MVP needs it.
- Database-per-tenant. Rejected for MVP because it is excessive for small-business validation.

## Follow-up Work

- Authentication and business onboarding were specified in Cycle 003.
- Persistence boundaries, tenant-enforcement invariants, and future tenant isolation tests were specified in Cycle 004.
- Row-Level Security remains deferred as a future defense-in-depth implementation decision.
