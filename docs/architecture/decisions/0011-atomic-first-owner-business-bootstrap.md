# ADR 0011: Require Atomic First-Owner Business Bootstrap

## Status

Accepted.

## Context

An active business must always have at least one active Owner. During first signup, the system creates a global identity, a Business, and the initial Owner Membership. Partial creation could leave a Business without an accountable owner or a membership pointing to an unusable Business.

## Decision

Business creation and the initial Owner Membership must be atomic as a domain invariant. An active Business cannot exist without its initial active Owner Membership, and an initial Owner Membership cannot become active without its Business.

## Consequences

- The bootstrap flow needs idempotent retry behavior.
- Partial identity creation may remain global, but it must not grant tenant access.
- Persistence and API specifications must preserve the last-owner invariant.
- Failures must be auditable without exposing secrets.

## Alternatives Considered

- Create Business first and add Owner later. Rejected because it can create ownerless active businesses.
- Create Membership first and attach Business later. Rejected because it creates invalid tenant authorization.
- Allow support cleanup for broken bootstrap as normal behavior. Rejected because support processes are not specified and should not be required for the happy path.

## Follow-up Work

- Specify persistence transaction or equivalent atomicity behavior later.
- Add tests for duplicate bootstrap submission and partial failure once implementation begins.
