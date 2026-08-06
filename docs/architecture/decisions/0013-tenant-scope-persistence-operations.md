# ADR 0013: Require Tenant Scope in Tenant-Owned Persistence Operations

## Status

Accepted.

## Context

ADR 0006 defines Business as the tenant boundary, and ADR 0012 requires server validation of active Business context. Persistence must preserve those decisions for reads, writes, aggregates, exports, background work, and future provider callbacks.

## Decision

Every tenant-owned persistence operation must require explicit, validated Business scope and current authorization context. Filtering by a Business identifier alone is not complete authorization. Cross-tenant reads, writes, child references, aggregates, and exports must be rejected.

## Consequences

- Repository and query specifications must include tenant scope as a mandatory invariant.
- Bulk operations and reports must carry the same tenant guarantees as single-record operations.
- Client-provided identifiers, URLs, cached values, and remembered tenant context remain untrusted.
- Future support or administrative access requires a separate specification.

## Alternatives Considered

- Rely on client-provided Business identifiers. Rejected because identifiers can be stale or tampered with.
- Filter by Business identifier without authorization context. Rejected because tenant scoping and authorization are separate requirements.
- Implement Row-Level Security now. Deferred because RLS is not accepted as an MVP implementation dependency.

## Follow-up Work

- Specify logical data model and repository contracts with tenant-scope requirements.
- Add future tests for cross-tenant direct lookups, child references, aggregates, exports, and background jobs.
