# ADR 0023: Use Same-Origin Opaque Cookie Sessions with Layered CSRF Protection

## Status

Accepted.

## Context

ADR 0020 selects application-owned, revocable server-side sessions represented by opaque client identifiers. The responsive browser client needs secure session carriage, shared-device sign-out, lost-device revocation, and protection for unsafe requests. The separately deployable Next.js and Fastify applications do not require separate public origins.

## Decision

Expose the web presentation and `/api/v1` through one public origin even when Next.js and Fastify are deployed separately behind that boundary.

Carry only an opaque session identifier in a host-only cookie with the `Secure`, `HttpOnly`, `SameSite=Lax`, and `Path=/` requirements; production naming must use the `__Host-` prefix and no `Domain` attribute. Do not place session or credential material in browser local or session storage.

Protect every unsafe authenticated browser request with a session-bound synchronizer CSRF token sent in a custom request header, validated together with allowed `Origin` or safe `Referer` evidence. Pre-authentication registration, verification, sign-in, and recovery use an Origin-validated pre-session CSRF bootstrap token. SameSite and Fetch Metadata checks are defense in depth, not the sole control. Rotate session and CSRF evidence after authentication or privilege-sensitive transitions. Exact token format, lifetime, credential provider, and physical session storage remain deferred.

## Consequences

- Browser requests can use revocable server-side sessions without exposing session identifiers to JavaScript.
- The same-origin public boundary minimizes CORS and cookie complexity while preserving separate deployability.
- Unsafe requests require both valid session and anti-CSRF evidence.
- Non-browser supporting clients need a separately specified authentication profile before use; they do not inherit cookie assumptions silently.

## Alternatives Considered

- Session identifiers in local storage. Rejected because script access increases credential exposure.
- SameSite alone. Rejected because it is defense in depth and does not replace a proper CSRF control for this application.
- Cross-origin browser API with credentialed CORS. Deferred because no accepted deployment need justifies the additional origin, cookie, and CSRF surface.
- Self-contained bearer tokens as authoritative session state. Rejected by ADR 0020 because revocation and current Membership, capability, and Business checks are required.

## Risks and Revisit Triggers

- Risk: proxy or origin configuration weakens cookie or CSRF checks. Mitigate with deployment review and integration tests.
- Risk: authentication links and external entry flows interact poorly with SameSite policy. Mitigate by keeping entry navigation safe and performing state change only after CSRF-protected confirmation.
- Revisit if a separately installed mobile client, partner client, or unavoidable cross-origin deployment is accepted.

## Relationship to Existing Decisions and Specifications

This ADR specializes ADR 0020 and preserves ADR 0012, shared/lost-device UX, server-side authorization, and sensitive-data minimization.

## Follow-up Work

- Specify physical session and CSRF evidence storage, expiry, rotation, and revocation.
- Add threat modeling and browser integration tests before authentication implementation is accepted.
