# ADR 0024: Carry Business Context in Tenant-Scoped API Paths and Revalidate It

## Status

Accepted.

## Context

Business is the tenant boundary. ADRs 0012 and 0013 require explicit Business scope and current authorization for every tenant-owned operation. The transport must make intended scope visible without allowing a client-selected identifier or remembered Business to become authorization.

## Decision

Carry intended Business context in the path of every tenant-owned operation under `/api/v1/businesses/{businessId}/...`. Global identity, session, accessible-Business listing, first-Business bootstrap, and Invitation acceptance remain outside a tenant path until an active Membership exists.

The Fastify application boundary resolves the authenticated User and revalidates the path Business, active Business state, active Membership, current capability, and every same-Business record reference on each authoritative operation. A session may remember a selected Business for usability, but the path remains explicit and the remembered value is only a candidate context.

Cross-Business missing, inaccessible, and substituted record identifiers use non-disclosing responses. Business switching replaces remembered context and requires the web client to clear prior-Business state before requesting or rendering the new Business.

## Consequences

- Tenant scope is explicit in operation contracts, logs can be safely correlated without names, and cache keys naturally separate Business paths.
- A path identifier never proves access and never replaces application authorization.
- Global and tenant-owned operations have visibly different trust boundaries.
- Client caches and browser history still require explicit clearing and `no-store` controls for sensitive content.

## Alternatives Considered

- Implicit session-only Business context. Rejected because deep links, retries, diagnostics, and cross-client contracts would hide intended scope.
- A custom Business header. Not selected because path scoping is easier to inspect, document, test, and include in cache identity.
- Business identifier in payload only. Rejected because query and canonical resource scope would be inconsistent.
- Trusting a selected Business after one validation. Rejected by ADR 0012 because authorization can change while a session remains active.

## Risks and Revisit Triggers

- Risk: developers treat the path as authorization. Mitigate with mandatory application-context construction and tenant-isolation tests.
- Risk: identifiers appear in access logs. Mitigate with opaque logical identifiers, no names or personal data in paths, and redacted logging policy.
- Revisit only if a future transport cannot express hierarchical tenant scope; server revalidation remains mandatory regardless of carriage.

## Relationship to Existing Decisions and Specifications

This ADR transports ADRs 0006, 0010, 0012, and 0013 and the tenant rules in the Domain, Persistence, Logical Data Model, and Application Contracts specifications.

## Follow-up Work

- Implement one authorization-context builder for all tenant routes after scaffolding.
- Add direct, child-reference, aggregate, cache, and Business-switch isolation tests.
