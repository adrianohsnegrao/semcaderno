# ADR 0010: Use Global User Identity with Tenant-Scoped Memberships

## Status

Accepted.

## Context

Sem Caderno uses `Business` as the tenant boundary. A person may help more than one establishment, but operational data and authorization must remain scoped to each business.

## Decision

Use a global `User` identity and tenant-scoped `Business Membership` records. A User may belong to multiple Businesses through separate memberships. A User without an active membership cannot access tenant-owned operational data.

## Consequences

- Identity verification and recovery can be global.
- Role, status, and capabilities remain business-specific.
- Historical actions can keep references to the User and Membership even after suspension or removal.
- Cross-business membership never implies cross-business data access.

## Alternatives Considered

- Tenant-owned user identities. Rejected because the same person may work with multiple businesses and should not need unrelated duplicate identities.
- User-owned business data. Rejected by ADR 0006 because operational data belongs to the establishment.
- Access without membership after sign-in. Rejected because it violates tenant isolation.

## Follow-up Work

- Specify persistence representation for User, Membership, and invitation identity matching.
- Define exact normalization rules for sign-in identifiers before implementation.
