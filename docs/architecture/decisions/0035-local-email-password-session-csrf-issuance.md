# ADR 0035: Use Local Email-Password Verification with Split Session and CSRF Issuance

## Status

Accepted.

## Context

ADRs 0020, 0023, and 0034 establish application-owned revocable sessions, protected same-origin cookie carriage, explicit request evidence, and server-owned keyed digesting. Cycle 022 can inspect but cannot create an authenticated session. The repository still deferred the initial credential method, verifier owner, session duration, fixation behavior, and authenticated CSRF lifecycle.

The first implementation must not make Fastify, PostgreSQL rows, Argon2, cookies, raw session evidence, or CSRF evidence application authority. It also must not add a generic identity provider framework for one accepted credential method.

## Decision

Use normalized primary email plus a locally verified password as the initial MVP sign-in method. The application owns narrow password-verification and session-issuance boundaries. A PostgreSQL infrastructure adapter owns User/password-verifier access and Argon2id comparison; provider, Membership, Business, and authorization types do not enter that boundary.

After successful verification, the server security edge independently generates fresh opaque session and authenticated CSRF evidence, derives only versioned keyed digests, and passes digest-only issuance intent plus one explicit instant inward. One application-owned transaction port revalidates the User, consumes pre-session CSRF evidence, revokes only the prior session presented by this browser, inserts the new 12-hour session with no selected Business, records minimal safe audit evidence, and clears aggregate rate state. Raw session evidence exists only in the protected cookie; raw CSRF evidence exists only in ephemeral browser memory and the custom header.

The issuance intent includes the already-derived purpose-branded sign-in rate-limit account key so persistence can clear that digest-only aggregate in the same transaction without receiving or reconstructing normalized identity. The transaction returns a closed application result: issued, unusable User revalidation, rejected pre-session challenge, or retryable issuance-digest collision. Only named uniqueness conflicts for the new session credential digest or authenticated-CSRF digest are retryable; the server edge that owns raw evidence regenerates both values for at most three total issuance attempts. PostgreSQL, transaction, decoding, and every other constraint failure remain rejected infrastructure failures.

The first issuance migration follows expand-and-contract. It adds nullable authenticated-CSRF digest/version columns as an all-null or complete version-1 pair, a partial uniqueness guarantee for complete pairs, and one minimal append-only sign-in-success audit table. Historical sessions remain inspectable until ordinary expiry or revocation but have no authenticated-CSRF authority for unsafe operations; no historical token is fabricated. Every newly issued session supplies the complete pair. A later reviewed contract migration may require non-null columns only after legacy null rows are gone and every writer enforces the pair.

Password verification uses reviewed Argon2id PHC verifiers and equivalent dummy work for unknown identities. Invalid proof and disabled/unknown identity are publicly generic; infrastructure failure remains failure. Authentication proves global User identity only and performs no Business or Membership authorization.

Sign-in abuse state uses a pseudonymous account key and one fixed-start 15-minute aggregate window with a counter capped at 10. It is explicitly not an exact sliding window: preserving exact sliding semantics would require per-attempt timestamps or buckets that violate the accepted minimum-data boundary. The server derives the account key with the version-1 session HMAC key, the distinct sign-in-rate domain, one zero separator, and the normalized-email UTF-8 bytes; application and persistence receive only the versioned digest.

## Consequences

- Initial sign-in does not depend on an external identity provider, OAuth, JWT, refresh token, or browser-readable session credential.
- Application signatures expose verification and issuance semantics but contain no Fastify, cookie, Node crypto, Argon2, PostgreSQL, or raw session/CSRF evidence.
- Password and session persistence require later reviewed migrations and an Argon2 dependency; this ADR does not add either.
- Successful authentication always replaces the browser's presented session with independent evidence, preventing credential adoption/fixation.
- A fixed 12-hour absolute session avoids idle/sliding write complexity in the first profile.
- Authenticated CSRF remains a distinct session-bound synchronizer value and cannot become authentication or authorization evidence.
- Expected challenge or User revalidation rejection rolls back without issuance; digest collision has one narrow typed retry path; infrastructure failure never enters either expected result.
- Sign-in success audit is one User reference, fixed action/outcome codes, and the issuance instant only; it is not login history or a generic event payload.
- The tenth admitted invalid proof closes its fixed window to later verification attempts; equality with the window end reopens verification, and only committed issuance clears the row.
- Local password verification creates breach-response and hashing-parameter obligations that must be reviewed operationally before production.

## Alternatives Considered

- Managed identity provider first. Deferred because no accepted provider exists and provider integration would add subject, callback, recovery, availability, and vendor-policy decisions before the MVP needs them.
- Passwordless email links. Not selected because delivery, one-time evidence, mailbox availability, and recovery are not implemented, while returning-user password sign-in is already the conceptual MVP direction.
- JWT or self-contained browser bearer token. Rejected by ADR 0020 because revocation and current authorization remain server-authoritative.
- Put credential verification in Fastify. Rejected because use-case semantics and infrastructure failures would become transport-owned.
- Pass raw session/CSRF evidence through application or persistence. Rejected because it expands bearer-secret exposure.
- Reuse the incoming session credential after authentication. Rejected because it permits fixation and fails to create an independent authenticated transition.
- Generic credential strategies or token framework. Rejected because only one current variation exists.
- Exact sliding-window history. Rejected because per-attempt timestamps or bounded buckets add identity-linked history beyond the accepted aggregate minimum; the fixed-start approximation is named honestly and must be revisited if measured abuse requires stronger controls.

## Risks and Revisit Triggers

- Risk: password database compromise. Mitigate with salted Argon2id, least privilege, verifier exclusion from logs/audit, and future parameter review.
- Risk: account enumeration and brute force. Mitigate with generic outcomes, dummy verifier work, keyed aggregate rate state, and later deployment-level controls.
- Risk: XSS can read CSRF evidence. Mitigate through HttpOnly session cookies, ephemeral CSRF storage, CSP/security headers, output safety, and no bearer evidence in browser storage.
- Risk: 12 hours may not fit validated shared-device use. Revisit with merchant evidence before changing expiry; do not add sliding behavior silently.
- Revisit when a managed provider, passkeys/MFA, non-browser clients, key rotation, or measured Argon2 constraints become accepted requirements.

## Relationship to Existing Decisions and Specifications

This ADR specializes ADRs 0020, 0023, 0034, and the identity/session operation family in ADR 0022. It preserves ADR 0012 by creating no Business authorization and ADR 0033 by requiring reviewed schemas before HTTP implementation. Exact wire fields, password profile, session/CSRF formats, persistence implications, failure mapping, and test requirements are defined in the [Session Issuance and Sign-In Specification](../../specs/session-issuance-sign-in-specification.md).

## Follow-up Work

- Implement ID00/ID04 contract schemas and application-owned verification/issuance boundaries.
- Select and audit the exact Argon2 package/version before adding it.
- Add the reviewed session-CSRF compatibility and minimal sign-in-success audit migration, then implement the atomic issuance transaction.
- Implement Fastify sign-in/cookie writing and authenticated CSRF enforcement only after the inner boundaries are green.
