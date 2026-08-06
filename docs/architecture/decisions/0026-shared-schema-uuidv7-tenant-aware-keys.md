# ADR 0026: Use a Shared Schema with UUIDv7 and Tenant-Aware Relational Keys

## Status

Accepted.

## Context

Business is the tenant root, User identity is global, one User may belong to multiple Businesses, and every tenant child must be prevented from referencing another Business. ADR 0018 selects PostgreSQL 18 and explicit repositories but leaves physical identifiers, schema organization, keys, and RLS open.

## Decision

Use one application-owned PostgreSQL schema, `sem_caderno`, in one database. Use PostgreSQL-generated UUIDv7 values as primary keys. Every tenant-owned row carries non-null `business_id`; every tenant-owned parent exposes unique `(business_id, id)`, and tenant child relationships use composite foreign keys that repeat the Business key.

Use scoped application repositories and current server authorization as the primary access control. Keep PostgreSQL RLS deferred defense in depth until pooled connection context, table-owner bypass, worker/repair roles, policy testing, and operational failure modes are threat-reviewed. Restrict runtime schema privileges and schema-qualify queries.

## Consequences

- Cross-Business child references fail physically even though record IDs are globally unique.
- One global User can participate in multiple Businesses without tenant schemas or duplicate identities.
- UUIDv7 avoids exposed numeric counters and provides better insertion locality than random UUIDv4, while remaining opaque transport identity.
- Composite tenant keys add columns and indexes, but make isolation reviewable.
- RLS cannot be cited as implemented or used to replace application authorization.

## Alternatives Considered

- Schema per Business. Rejected because shared identity, migrations, reporting operations, and a small-team MVP would incur disproportionate complexity.
- Database per Business. Rejected for the same operational reasons and ADR 0006.
- Global UUID plus repository filters only. Rejected because it cannot physically reject a cross-Business child reference.
- Numeric sequence identifiers. Not selected because exposed values are enumerable and PostgreSQL 18 supplies native UUIDv7.
- Mandatory RLS now. Deferred because policy/role/pooling behavior needs implementation threat modeling; table owners and bypass roles can evade it.

## Risks and Revisit Triggers

- Risk: developers treat composite keys or Business paths as authorization. Mitigate with current authorization-context construction and tenant tests.
- Risk: RLS deferral leaves one less defense layer. Mitigate with restricted roles, tenant-aware FKs, scoped repositories, and pre-production security review.
- Revisit RLS before production if threat analysis or isolation tests show application/FK controls are insufficient.
- Revisit identifier generation if PostgreSQL support, index measurements, or external interoperability materially changes.

## Relationship to Existing Decisions and Specifications

This ADR specializes ADRs 0006, 0010, 0012, 0013, 0018, and 0024. Domain/application authorization and non-disclosure remain authoritative.

## Follow-up Work

- Implement the documented keys and privileges in versioned migrations.
- Test direct, child, aggregate, background, and repair isolation against real PostgreSQL.
