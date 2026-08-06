# ADR 0020: Use Application-Owned Revocable Server-Side Sessions

## Status

Accepted.

## Context

Sem Caderno has global User identity, tenant-scoped Membership, current capability checks, shared-device sign-out, lost-device response, credential recovery, Business deactivation, and immediate or bounded authorization invalidation. Client-cached Business or role information cannot authorize operations.

## Decision

Use application-owned, server-side, revocable sessions represented to clients by opaque identifiers. Session state resolves to global identity but never replaces current Business, Membership, Business-state, Membership-state, and capability validation at authoritative operations.

Credential proof, email verification, recovery, and delivery may use reviewed libraries or managed providers behind adapters. No provider owns Business Membership, tenant authorization, or financial authority. The exact credential method, session exchange, library/provider, physical session store, timeout durations, and anti-CSRF mechanics remain deferred to security and transport work.

## Consequences

- Sessions can be revoked for sign-out, lost devices, compromise, credential reset, Membership changes, capability reduction, and Business deactivation.
- Future web and mobile clients share one session and authorization authority.
- Client session material carries no authoritative role, capability, or Business state.
- The application owns session lifecycle security and requires explicit operational policy and tests.
- Managed credential services remain possible without tenant lock-in.

## Alternatives Considered

- Self-contained client-authoritative authorization tokens. Rejected because role, Membership, and Business state can change before token expiry.
- A managed identity provider owning authorization. Rejected because tenant and financial authorization are Sem Caderno domain responsibilities.
- Next.js-only sessions. Rejected because the Fastify application server and future supporting clients require one server authority.

## Risks and Revisit Triggers

- Risk: session security is complex. Mitigate by selecting maintained security primitives later, threat modeling, rotation/revocation tests, and OWASP-aligned configuration.
- Risk: server-side session storage adds operational state. Mitigate by keeping the physical form deferred until availability and recovery needs are defined.
- Revisit provider choice after credential, legal, support, and operational requirements are validated, provided application authorization remains authoritative.

## Relationship to Existing Decisions and Specifications

This ADR implements ADR 0010 and ADR 0012 and preserves the Authentication and Business Onboarding Specification, Application Contracts Specification, and Cycle 008/009 shared/lost-device behavior.

## Follow-up Work

- Specify session transport, CSRF, credential, recovery, timeout, rotation, storage, and audit behavior.
- Test session revocation and current Membership/capability/Business revalidation.
