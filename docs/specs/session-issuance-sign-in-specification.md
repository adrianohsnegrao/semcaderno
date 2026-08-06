# Session Issuance and Sign-In Specification

- Status: Accepted.
- Cycle: 023 - Session Issuance and Sign-In Specification.
- Task: 001 - Define Credential Verification, Session Issuance, Cookie Lifetime, and Authenticated CSRF Token Lifecycle.
- Scope: documentation and architecture decisions only.
- Repository evidence inspected: 2026-08-05.
- External security guidance reverified: 2026-08-05.

## 1. Purpose and Authority

Cycle 022 exposes safe current-session inspection but cannot create the cookie it reads. This specification closes the minimum credential-verification, session-issuance, cookie-writing, and CSRF decisions required before sign-in implementation. It does not implement registration, sign-in, password hashing, session insertion, cookie writing, CSRF validation, authorization, or UI.

Authority remains:

1. Product, identity, tenancy, and application specifications own User, Business, Membership, and authorization meaning.
2. ADRs 0020, 0023, and 0034 own revocable server-side sessions, same-origin cookie carriage, explicit evidence, keyed lookup, and lifecycle resolution.
3. The transport specification owns `/api/v1`, Problem Details, ID00, ID04, and stable public behavior.
4. The physical persistence specification owns PostgreSQL and migration boundaries.
5. This specification specializes only initial email/password verification, issuance, cookie writing, and CSRF lifecycle.

The public Cycle 016/022 `GET /api/v1/session` contract remains unchanged.

## 2. Decision Matrix

| Concern | Decision | Status |
| --- | --- | --- |
| Initial sign-in method | Normalized primary email plus password | Accepted now |
| Request | Strict JSON `{ email, password }`; pre-session CSRF is a header, never a body field | Accepted now |
| Credential authority | Application-owned password-verification port; PostgreSQL/Argon2id adapter owns hash access and comparison | Accepted now |
| Unknown/invalid/disabled identity | Same generic authentication failure after equivalent verifier work | Accepted now |
| Unverified identity | Correct password may return verification-required guidance; no session is issued | Accepted now |
| Session credential | Fresh `v1.` plus 32 CSPRNG bytes; existing HMAC lookup derivation | Already authoritative |
| CSRF evidence | Independent pre-session and authenticated 32-byte CSPRNG values with distinct prefixes and keyed digests | Accepted now |
| Session duration | Fixed 12-hour absolute lifetime; no idle/sliding renewal | Accepted now |
| Fixation | Never adopt an incoming cookie; atomically revoke the presented prior session and insert a fresh session | Accepted now |
| Cookie | Existing production/local names and attributes; `Max-Age=43200`; matching `Expires` | Accepted now |
| Selected Business | New session starts with no selected Business | Accepted now |
| Authorization | Authentication creates global identity context only | Already authoritative |
| Failure | Invalid proof is expected failure; configuration, crypto, Argon2, PostgreSQL, mapping, and unexpected failures propagate | Accepted now |
| Abuse control | Ten failed attempts per normalized identity in 15 minutes; aggregate keyed state only | Accepted now |
| Provider, MFA, passkeys, OAuth | Not in the initial profile | Deferred |

No item blocks the next implementation slice.

## 3. Credential Classes

These values are distinct and must never be represented by a generic token abstraction:

| Value | Purpose | Browser visibility | Server/persistence treatment |
| --- | --- | --- | --- |
| Password | Prove knowledge for one User identity | Entered in the sign-in body only | Transient verifier input; Argon2id PHC hash persisted; raw value never retained |
| Session credential | Authenticate later requests | HttpOnly cookie; unavailable to JavaScript | Raw value transient at server edge; existing HMAC digest persisted |
| Session lookup digest | Find a session row | Never public | Version and 32 digest bytes only |
| Authenticated session cookie | Carry the session credential automatically | Browser-managed, HttpOnly | Existing strict names/profiles; never parsed inward as HTTP state |
| Pre-session CSRF token | Protect sign-in and other unauthenticated unsafe identity operations | Ephemeral JavaScript memory and `X-CSRF-Token` | Keyed digest, expiry, and consumption evidence only |
| Authenticated CSRF token | Prove intentional same-origin unsafe action for one session | Ephemeral JavaScript memory and `X-CSRF-Token` | Independent keyed digest bound to one session |

Possession of any CSRF token does not authenticate. Possession of a session cookie authenticates only after server resolution and does not authorize a Business operation.

## 4. Sign-In HTTP Contract

### 4.1 Operation

| Property | Value |
| --- | --- |
| Operation | ID04 Authenticate |
| Method/path | `POST /api/v1/sessions` |
| Request media type | `application/json` |
| Request body | Strict object with only `email` and `password` |
| CSRF | Exact `X-CSRF-Token` pre-session evidence plus allowed `Origin`, or strict `Referer` fallback |
| Success | 201 JSON, one session cookie, authenticated CSRF token, `Cache-Control: no-store` |
| Failure | RFC 9457 Problem Details, `Cache-Control: no-store`, no cookie or CSRF issuance |

No query or path parameter, alternate credential carrier, Basic authentication, Authorization header, form encoding, URL credential, or existing-session shortcut is accepted.

### 4.2 Request fields

`email` is an ASCII MVP mailbox string. The transport accepts 3 through 254 bytes, rejects controls and any whitespace, requires one unquoted local part and one DNS-style domain, and rejects leading/trailing/consecutive local-part dots and invalid domain labels. The application normalizer applies Unicode NFC as a no-op for the accepted ASCII profile and locale-independent lowercase to the complete address. The same normalizer must own registration, sign-in, recovery, and invitation identity matching. Internationalized and quoted mailbox forms are deferred rather than normalized inconsistently.

`password` is a JSON string containing 1 through 128 Unicode scalar values and at most 512 UTF-8 bytes after NFC normalization. The server applies NFC only; it never trims, changes case, removes whitespace, repairs encoding, or logs the value. Sign-in accepts the full range so future password-policy changes do not disclose account state through shape validation.

Future password creation and reset must require at least 15 Unicode scalar values, permit at least 128, reject known-compromised/common values through an offline or privacy-reviewed blocklist, permit paste/password managers, and impose no composition or periodic-change rule. This creation policy is not implemented in this cycle.

Malformed JSON, wrong primitive types, unknown properties, or field-bound violations return the existing safe request errors. Violations may name `email` or `password` but never echo their values.

### 4.3 Pre-session CSRF

ID00 `GET /api/v1/session-bootstrap` returns a no-store data envelope containing:

```text
csrfToken: p1.<43 canonical unpadded base64url characters>
expiresAt: RFC 3339 UTC instant
```

The token contains 32 CSPRNG bytes, expires exactly 10 minutes after one explicit issuance instant, grants no identity fact, and is retained only in browser memory. PostgreSQL stores only its versioned keyed digest and lifecycle timestamps. It may cover corrected sign-in attempts until expiry; a successful issuance transaction consumes it. Expired, malformed, unknown, or consumed evidence returns `CSRF_REJECTED` without further identity disclosure.

The sign-in request requires the token in `X-CSRF-Token`, an exact configured public `Origin`, or an exact same-origin `Referer` only when `Origin` is absent. Missing, `null`, cross-origin, ambiguous proxy-derived, or mismatched origin evidence fails closed. Fetch Metadata rejects cross-site unsafe requests when present; it is defense in depth and does not replace the token and origin check.

## 5. Credential Verification

### 5.1 Ownership

The application owns one narrow password-verification port. Conceptually it accepts normalized email and the transient normalized password and returns one of:

- verified usable User identity;
- verified but email-unverified identity;
- invalid authentication proof.

The port throws or rejects on PostgreSQL, hash-decoder, Argon2 runtime, configuration, or other infrastructure failure. It does not return Membership, Business, capability, session, transport, cookie, or provider types.

The initial adapter belongs to PostgreSQL infrastructure and uses a maintained Argon2id implementation. It reads only the User and password-verifier fields required for comparison. The exact package and version require registry, engine, lifecycle-script, native-build, and Node 24 review in the implementation cycle.

### 5.2 Password verifier

Persist password verifiers as standard Argon2id PHC strings with a unique 16-byte-or-longer CSPRNG salt and at least a 32-byte output. The initial minimum parameters are memory 19,456 KiB, iterations 2, and parallelism 1. An implementation may select a stronger measured configuration before production, but tests and persisted PHC values must make the parameters explicit. Plaintext, reversible encryption, fast hashes, unsalted hashes, and a separate algorithm column are prohibited. No pepper is introduced in the first profile because no accepted operational rotation boundary exists.

The adapter performs equivalent Argon2id work against a fixed non-secret dummy PHC verifier when no User/password credential exists. Wrong password, unknown email, missing credential binding, disabled User, and unusable credential state all produce the same internal invalid-proof result and public response. Correct password for an unverified identity may produce the separate verification-required result because control of the credential was proven.

Argon2 comparison and persistence errors are infrastructure failures, not invalid credentials. Password verifier upgrades may occur only after a successful comparison and must not be required for the first sign-in implementation.

### 5.3 Public outcomes

| Condition | Public result | Session/cookie/CSRF effect |
| --- | --- | --- |
| Valid request and usable verified User | 201 success | Fresh session and CSRF evidence issued |
| Wrong password, unknown email, disabled User, or missing credential | 401 `AUTHENTICATION_FAILED` | None |
| Correct password, email not verified | 403 `EMAIL_VERIFICATION_REQUIRED` | None; safe verification continuation may be shown |
| Request shape invalid | Existing 400/415/422 request error | None |
| Pre-session CSRF or origin invalid | 403 `CSRF_REJECTED` | None |
| Rate boundary reached | 429 `RATE_LIMITED` with safe retry guidance | None |
| Configuration, crypto, verifier, database, transaction, mapping, or unexpected failure | 500 `INTERNAL_FAILURE` | None; correlation only |

`AUTHENTICATION_FAILED` is a new stable transport code to add with the future ID04 schemas. Its title/detail are generic and do not identify the failed factor or account state. Response shape, status, body size class, cache policy, and externally observable verifier path must not reveal whether the identity exists.

## 6. Abuse Boundary

One normalized identity may accumulate at most 10 failed verification outcomes in a rolling 15-minute window. The next attempt during the active limit returns `RATE_LIMITED`. A fully committed successful sign-in clears the aggregate bucket. Unknown and known identities follow the same policy.

Shared multi-process enforcement stores only a versioned HMAC digest of the normalized email, window timestamps, count, and expiry. It stores no raw email, password, IP address, user agent, device identifier, or attempt history. State expires no later than 24 hours after its last update. The HMAC uses the server-held session security key with a distinct `sem-caderno/sign-in-rate-limit/v1` domain label; the digest never becomes a correlation or public value.

This account-keyed minimum does not claim comprehensive denial-of-service or distributed credential-stuffing protection. Reverse-proxy/global controls require later deployment evidence, but their absence must not weaken this application limit.

## 7. Session and CSRF Issuance

### 7.1 Explicit time and verified identity

The HTTP edge captures one `issuedAt` `Date` after request/CSRF validation and before credential verification. The same logical instant governs the rate-limit decision, session `created_at`, session `updated_at`, CSRF creation, audit occurrence, and expiry calculation. No SQL `now()`, `CURRENT_TIMESTAMP`, hidden clock, or second request-time read is authoritative.

Credential verification returns only a User identifier and verification/usability outcome. Before commit, issuance revalidates that the User still exists, is not disabled, and remains email-verified. Membership and Business state are not part of sign-in issuance.

### 7.2 Fresh evidence

After successful verification, the server security edge independently generates:

- session credential: `v1.` plus exactly 32 CSPRNG bytes in 43-character canonical unpadded base64url;
- authenticated CSRF token: `c1.` plus exactly 32 independently generated CSPRNG bytes in the same encoding.

Use Node `crypto.randomBytes(32)` or an equivalent accepted platform primitive. The two byte arrays must come from separate generator calls. No identifier, time, email, User, Business, password, digest, or predictable counter enters either value.

The existing Cycle 018 HMAC derivation produces the session lookup digest. The CSRF digest uses the same server-held version-1 HMAC key only with the distinct UTF-8 label `sem-caderno/session-csrf/v1`, one zero byte, and the exact 32 CSRF bytes. It produces a complete 32-byte HMAC-SHA-256 digest. Domain separation does not make session and CSRF evidence interchangeable.

Raw values remain only in transient server variables needed to construct the response. Application and persistence receive only digest version/bytes and explicit times. A digest uniqueness conflict discards both raw values and retries fresh independent generation, at most three issuance attempts. Exhaustion becomes `INTERNAL_FAILURE`.

### 7.3 Absolute lifetime

The initial session lifetime is exactly 12 hours:

```text
expiresAt = issuedAt + 43,200 seconds
```

This is the existing fixed absolute expiry. Equality with `expiresAt` is expired. There is no idle timeout, sliding expiry, read-time renewal, remember-me option, or refresh token. The authenticated CSRF token expires and becomes unusable with the session even if its row remains for retention.

### 7.4 Atomic persistence and fixation resistance

One transaction must:

1. lock/revalidate the verified User as usable and email-verified;
2. revalidate and consume the pre-session CSRF challenge;
3. revoke the exact prior active session represented by the strictly parsed incoming configured cookie, when present;
4. insert the fresh session with session digest, authenticated CSRF digest, User, null selected Business, explicit timestamps, and version 1;
5. complete minimal sign-in success audit evidence without any bearer or password material;
6. clear the rate-limit bucket.

The new session never reuses, adopts, updates, or derives from an incoming credential. A missing or malformed incoming cookie supplies no prior digest. Ordinary sign-in revokes only the session presented by this browser; other device sessions remain active. If any transaction step fails, no new session is authoritative, no pre-session challenge is consumed, no prior session is revoked, and no cookie or authenticated CSRF token is returned.

The new session starts with `selected_business_id = NULL`. ID10 and BS02 own accessible-Business discovery and validated selection. No Membership or capability is cached during issuance.

## 8. Cookie Writing

Only a committed 201 response writes the configured session cookie. Its value is the fresh raw session credential.

| Attribute | Production | Local development |
| --- | --- | --- |
| Name | `__Host-sem-caderno-session` | `sem-caderno-session` |
| `Secure` | Required | False only on explicit isolated loopback HTTP; true with local TLS |
| `HttpOnly` | Required | Required |
| `SameSite` | `Lax` | `Lax` |
| `Path` | `/` | `/` |
| `Domain` | Prohibited | Prohibited |
| `Max-Age` | `43200` | `43200` |
| `Expires` | Exact session `expiresAt` HTTP-date | Exact session `expiresAt` HTTP-date |

The response also uses `Cache-Control: no-store`, no ETag, and no session credential in JSON or headers other than `Set-Cookie`. Failed verification, validation, CSRF, rate, infrastructure, transaction, or serialization writes no cookie and does not clear or repair an existing cookie.

## 9. Authenticated CSRF Lifecycle

The successful ID04 body contains safe identity facts and the raw `c1` token:

```text
data.state: authenticated
data.userId: opaque User identifier
data.expiresAt: session absolute expiry
data.csrfToken: c1.<43 canonical unpadded base64url characters>
```

No session credential, digest, session ID, selected Business, Membership, role, capability, credential method, or verifier state appears. The browser keeps `csrfToken` only in in-memory application state and sends it only as `X-CSRF-Token` on unsafe authenticated requests. It must not enter a cookie, URL, local storage, session storage, logs, analytics, error reporting, rendered HTML, or support data.

Every unsafe authenticated operation validates all of:

1. current active session cookie;
2. exact canonical `c1` header syntax;
3. keyed CSRF digest match for that session using timing-safe byte comparison;
4. exact allowed Origin or strict same-origin Referer fallback;
5. Fetch Metadata cross-site denial when supplied;
6. operation-specific authentication, authorization, and input rules.

The token rotates whenever a new session is issued and after accepted privilege-sensitive transitions. Revocation, expiry, or replacement of the session invalidates it. There is no per-request rotation.

A full page reload loses in-memory CSRF evidence. A later operation-specific `POST /api/v1/session/csrf-tokens` may rotate and return a replacement only for an active session after exact Origin/Referer checks and a valid pre-session `p1` token. It writes no session cookie and cannot extend session expiry. This replenishment operation must be implemented with the CSRF boundary, not as a generic token endpoint. ID05 remains unchanged and never returns a CSRF token.

## 10. Persistence Implications for a Future Cycle

No migration is created now. Future implementation is authorized to add only the minimum reviewed structures:

- `user_password_credentials`: one row per User with Argon2id PHC verifier, timestamps, and positive version; restrictive User foreign key;
- `pre_session_challenges`: keyed digest/version, creation, expiry, optional consumed instant, and positive version; no identity or Business required;
- `sessions`: authenticated CSRF digest/version columns, both required for newly issued sessions under an expand-and-contract rollout;
- `sign_in_rate_limits`: keyed normalized-identity digest, rolling-window timestamps/count, expiry, and positive version; aggregate only, not attempt history.

The existing session credential columns and constraints remain authoritative. Migration order, compatibility for existing Cycle 019 test rows, backfill/default strategy, exact index names, and credential-library dependency version must be reviewed in the implementation cycle. Raw password, raw session credential, raw CSRF value, HMAC key, IP, user agent, device, location, login history, arbitrary metadata, and authorization cache are prohibited.

## 11. Failure and Logging Boundary

Invalid proof is an expected authentication outcome. CSRF rejection, rate limiting, email-verification requirement, validation failure, and internal failure remain distinct. No broad catch may turn configuration, CSPRNG, HMAC, Argon2, PostgreSQL, transaction, mapping, or serialization failure into 401, 201, or anonymous success.

Public failures expose only allow-listed Problem Details and an independent correlation identifier. They never expose email existence, disabled state, verifier/hash/parameters, password, session/CSRF evidence, HMAC input/key/digest, SQL, constraint, retry counter, stack, provider detail, or transaction state.

Minimal security audit may record sign-in success and aggregate suspicious failure state using User reference only when known safely, timestamp, outcome category, and correlation reference. It is not login history. Passwords, hashes, raw or digested bearer evidence, normalized-email rate keys, request bodies, IPs, user agents, and device metadata are excluded.

## 12. Authorization Boundary

Successful sign-in proves only a usable verified global User at issuance time. It does not prove or cache:

- Business existence or lifecycle;
- Membership existence or active state;
- role group, capability, ownership, or tenant access;
- authorization for any protected operation;
- validity of remembered selected-Business context.

The new session starts with no selected Business. ID10 and BS02 perform their own current reads. Every protected tenant operation continues to validate User, Business, Membership, capability, lifecycle, and same-Business references independently.

## 13. Security and Privacy Review

| Threat | Required mitigation |
| --- | --- |
| Account enumeration | Generic invalid-proof outcome, dummy Argon2 work, equivalent external shape, keyed aggregate rate state |
| Password disclosure | TLS, transient handling, Argon2id PHC only, no logs/audit/errors |
| Database credential compromise | Salted memory-hard verifier; no plaintext or reversible password |
| Session guessing/replay | Independent 256-bit CSPRNG credential, absolute expiry, revocation; no broader replay claim |
| Session fixation | Fresh independent credential; prior presented session revoked atomically; incoming value never adopted |
| CSRF | Pre-session and session-bound tokens, exact origin fallback, SameSite, Fetch Metadata defense |
| XSS token theft | HttpOnly session cookie; CSRF only ephemeral; CSP/security headers remain public-edge work |
| Fail-open behavior | Infrastructure/configuration failures remain 500 with no cookie or partial success |
| Authorization confusion | Null selected Business and mandatory later revalidation |
| Excess collection | No IP, agent, device, location, attempt/login history, analytics, or telemetry |

Password verifiers, credential associations, rate-limit digests, session digests, CSRF digests, and User links are security-sensitive personal data. Access must be least-privileged and excluded from routine observability and support tools.

Current guidance used: [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), and [NIST SP 800-63B](https://pages.nist.gov/800-63-4/sp800-63b.html).

## 14. Future Test Requirements

The implementation cycle must add focused deterministic evidence for:

- strict ID00/ID04 request, media type, email normalization, password bounds, and unknown-key behavior;
- successful, wrong, unknown, disabled, missing-credential, and verified-but-unverified outcomes without enumeration differences;
- dummy-hash path and propagation of hash decoder/Argon2/database failures;
- abuse threshold/window, known/unknown parity, expiry, successful clear, and no raw identity retention;
- independent CSPRNG calls and exact token shapes without asserting random bytes;
- existing session HMAC derivation reuse and exact distinct CSRF/rate domain separation;
- transaction atomicity, fresh session insertion, prior-presented-session revocation, null selected Business, and collision retry limit;
- exact 12-hour expiry and equality behavior using one explicit time;
- production/local `Set-Cookie` attributes, no-store, no ETag, and no cookie on every failure;
- authenticated CSRF issue, digest-only storage, unsafe-request validation, rotation, expiry/revocation, reload replenishment, and Origin/Referer/Fetch Metadata behavior;
- safe Problem Details, correlation, no credential/hash/key/SQL leakage, and no log/audit leakage;
- authentication versus Business/Membership/capability separation;
- real PostgreSQL migration, constraints, verifier lookup, issuance transaction, fixation revocation, digest-only rows, rollback on failure, and cleanup;
- Fastify HTTP through application and real PostgreSQL for one success, generic invalid proof, CSRF rejection, prior-session replacement, and infrastructure failure.

Existing Cycle 019-022 lifecycle matrices remain regression evidence and must not be duplicated merely to increase test count. Randomness tests validate shape, independence through injected deterministic byte sources at the server edge, collision handling, and absence of raw persistence; they do not use statistical or brittle exact-random assertions.

## 15. Rejected and Deferred Alternatives

Rejected for the initial profile:

- JWT/self-contained authorization, refresh tokens, OAuth, social login, passkeys, MFA, magic links, or a generic credential framework;
- plaintext, reversible, fast-hash, or unsalted password storage;
- session or CSRF evidence in browser storage, URLs, logs, or JSON cookies;
- double-submit cookie or SameSite-only CSRF protection;
- preserving/adopting an incoming session credential after authentication;
- idle/sliding expiry, remember-me, read-time renewal, session families, device tracking, and login history;
- Membership/Business lookup during credential verification or session issuance.

Deliberately deferred:

- exact Argon2 package/version and native supply-chain handling;
- registration, verification delivery, recovery, credential reset, sign-out, and revocation commands;
- session/HMAC/CSRF key rotation and production secret-manager integration;
- retention cleanup and operational security-event review;
- global/distributed gateway abuse controls beyond the accepted identity bucket;
- authenticated CSRF implementation for protected product operations;
- browser UI, copy, accessibility, and merchant validation;
- non-browser client authentication.

## 16. Overengineering Audit

The next implementation needs only two application responsibilities: verify password credentials and issue a session from digest-only evidence. It needs no generic authentication provider, token hierarchy, strategy registry, DI container, request context, session family, refresh framework, generic CSRF middleware, repository base, Unit of Work, event bus, policy engine, or device model.

The separate pre-session/session/CSRF/rate evidence exists because each solves a current accepted security requirement. Provider pluggability, multiple algorithms, multiple token versions, and key rotation remain prose constraints until a real second implementation exists.

## 17. ADR Assessment

[ADR 0035](../architecture/decisions/0035-local-email-password-session-csrf-issuance.md) records the durable cross-cutting choice of local email/password verification behind an application port and split server-edge session/CSRF issuance. Individual fields, durations, failure mappings, persistence implications, and tests remain in this specification.

## 18. Acceptance Review

- [x] Credential classes and ownership are distinct.
- [x] Exact ID00/ID04 request, success, and failure semantics are defined.
- [x] Password verification ownership and Argon2id profile are defined.
- [x] Account-enumeration and minimum abuse behavior are defined.
- [x] Session/CSRF generation, digest, atomic issuance, fixation, and expiry are defined.
- [x] Production/local cookie writing and failure behavior are defined.
- [x] Authenticated CSRF issuance, validation, rotation, expiry, and reload replenishment are defined.
- [x] Persistence implications are explicit without a migration.
- [x] Authentication remains separate from Business authorization.
- [x] Security, privacy, testing, alternatives, deferrals, and overengineering are reviewed.
- [x] No production code, dependency, lockfile, migration, SQL, route, cookie write, credential verification, session insertion, CSRF behavior, commit, push, branch, or pull request is introduced.

## 19. Recommended Next Cycle

**Cycle 024 - Sign-In Contract and Application Boundary Implementation**

**Task 001 - Implement ID00/ID04 Transport Schemas, Email Normalization, Password-Verification Port, and Digest-Only Session-Issuance Ports**

Objective: implement only browser-safe ID00/ID04 schemas and the framework-independent application boundaries for credential verification and digest-only issuance, with deterministic unit/contract tests, before adding Argon2/PostgreSQL migrations or Fastify cookie writing.

Explicit non-goals: no Argon2 adapter, password table/migration, session insertion, cookie writing, Fastify sign-in route, CSRF enforcement, registration, recovery, logout, authorization, Business selection, UI, provider, deployment, or merchant testing.
