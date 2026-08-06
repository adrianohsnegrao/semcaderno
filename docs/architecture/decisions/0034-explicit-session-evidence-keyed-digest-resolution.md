# ADR 0034: Use Explicit Session Evidence with Keyed Digest Resolution

## Status

Accepted.

## Context

ADR 0020 selects application-owned revocable server-side sessions, and ADR 0023 carries one opaque identifier in a protected same-origin cookie. Cycle 016 introduced a no-input `CurrentSessionStatePort`; Cycle 017 proved that a PostgreSQL adapter cannot determine which session is current without an authoritative request-scoped lookup identity. Keeping the no-input shape would require hidden request context, per-request service construction, or framework state. Digest ownership, time input, and inactive-session outcomes were also unclear.

## Decision

Session evidence flows explicitly from the server request edge into the application use case. The no-input `CurrentSessionStatePort` will be replaced by a parameterized application-owned session-resolution boundary in the next implementation cycle.

The Fastify/server edge is responsible for extracting and canonically validating the opaque cookie credential, deriving a versioned HMAC-SHA-256 lookup digest with a server-held secret, discarding the raw credential, and supplying the normalized lookup key plus one explicit evaluation instant. Application and persistence never receive the raw credential. The PostgreSQL adapter receives only normalized digest evidence and time, performs a parameterized active-session lookup, and knows nothing about Fastify or cookies.

The initial credential contains 32 CSPRNG bytes in a versioned canonical unpadded-base64url form. PostgreSQL stores only the 32-byte digest with its version. The first lifecycle profile uses fixed absolute expiry; a session is active only before its expiry, while unrevoked, and while its referenced User has no `disabled_at` instant. Missing, malformed, unknown, revoked, expired, or disabled-User evidence produces the same anonymous inspection outcome. Infrastructure failure propagates and never degrades to anonymous.

Selected Business remains an optional remembered candidate and is not revalidated as authorization during session resolution. Every protected tenant operation independently validates User, verified identity where required, Business, Membership, capability, lifecycle, and same-Business references.

Request-global mutable state, AsyncLocalStorage, service locators, generic session/credential frameworks, and authorization joins inside the resolver are not selected.

## Consequences

- Security-sensitive dependencies and deterministic time are visible in signatures and tests.
- Application remains independent of Fastify, cookies, Node crypto, contracts, and PostgreSQL.
- Persistence receives a directly queryable value without receiving bearer evidence.
- The Cycle 016 application interfaces must change, while its public transport response and pure output mapper can remain stable.
- A server-held HMAC key becomes required before executable session resolution; production secret injection and rotation remain deployment/authentication work.
- Fixed absolute expiry avoids read-time mutation and sliding-expiry races in the first slice.
- Anonymous normalization reduces credential-state disclosure, while infrastructure failures remain observable failures.
- Returning a remembered Business candidate does not authorize tenant data and may require a separate accessible-Business refresh in presentation work.

## Alternatives Considered

- Keep the no-input port behind AsyncLocalStorage or mutable request context. Rejected because the session dependency becomes implicit and concurrent request isolation becomes harder to prove.
- Construct a complete adapter per request with a captured cookie. Rejected because it disguises the same hidden input and couples construction to browser transport.
- Pass the raw credential into application or persistence. Rejected because it broadens bearer-secret exposure and violates data minimization.
- Store the raw credential or reversible ciphertext. Rejected because a database disclosure would expose immediately reusable browser credentials.
- Use an unkeyed fast hash. Rejected because a keyed digest better separates database disclosure from browser credential validity at minimal current complexity.
- Use self-contained JWT/session claims. Rejected because current revocation and authorization state remain server-authoritative.
- Add idle/sliding expiration immediately. Deferred because no current requirement justifies read-time writes, additional timestamps, and concurrency behavior.
- Resolve Business/Membership authorization during session lookup. Rejected because session context and tenant authorization are separate accepted concerns.

## Risks and Revisit Triggers

- HMAC key loss invalidates lookup capability; backup and secret-rotation procedures must be specified before production operation.
- Stale selected-Business context could be mistaken for access; transport naming, authorization tests, and presentation refresh must preserve its candidate-only meaning.
- A future need for idle timeout, device management, multiple credential versions, or non-browser clients requires explicit additive specification.
- Revisit the credential profile if platform cryptographic guidance changes, the public-origin topology changes, or measured browser constraints make the representation unsuitable.
- Static architecture checks cannot prove redaction, lifecycle predicates, database failure behavior, or tenant authorization; semantic and PostgreSQL tests remain mandatory.

## Relationship to Existing Decisions and Specifications

This decision specializes ADRs 0016, 0018, 0020, 0023, 0026, 0030, and 0032. It preserves ADR 0012 by keeping selected Business non-authoritative and ADR 0033 by leaving the public transport contract unchanged. The [Session Credential Resolution and Lifecycle Specification](../../specs/session-credential-resolution-lifecycle-specification.md) defines the exact credential, lifecycle, persistence, threat, and future-test profile.

## Follow-up Work

- Replace the no-input Cycle 016 application port with explicit evidence and time input.
- Implement the narrow server parser/digester without HTTP route exposure.
- Create the minimum `users`, `businesses`, and `sessions` migration foundation required by session foreign keys, plus the PostgreSQL adapter.
- Prove the active predicate, failure boundary, constraints, and query against real PostgreSQL 18.4.
- Specify issuance duration, cookie operations, CSRF, login/logout, key rotation, retention, and HTTP integration in their own accepted cycles.
