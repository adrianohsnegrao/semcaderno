# ADR 0012: Server-Validate Active Business Context for Sessions and Requests

## Status

Accepted.

## Context

Cycle 002 requires every tenant-owned operation to validate Business context, active membership, and capability. Cycle 003 adds sessions and remembered active Business selection. A remembered or client-provided Business identifier improves usability but can become stale or maliciously modified.

## Decision

Sessions may remember a selected active Business, but every tenant-owned request must be server-side validated against the current User, active Business, active Membership, Business status, and required capability. Client-provided Business identifiers, remembered tenant context, URLs, and deep links are never sufficient authorization.

## Consequences

- Tenant switching must replace or rotate tenant-scoped session context.
- Membership suspension, removal, role reduction, or business deactivation must revoke or force revalidation of affected sessions.
- Web and mobile clients share the same tenant validation invariants.
- Persistence and API specifications must include tests for stale context and cross-tenant identifier substitution.

## Alternatives Considered

- Trust a Business identifier stored on the client. Rejected because it can be stale or tampered with.
- Validate membership only at sign-in. Rejected because membership and business status can change while sessions remain active.
- Encode all authorization permanently into session state. Rejected because stale capabilities could grant continued access after role changes.

## Follow-up Work

- Specify concrete session storage, freshness, and revocation mechanisms later.
- Add API integration tests for tenant selection, switching, stale membership, and cross-tenant denial.
