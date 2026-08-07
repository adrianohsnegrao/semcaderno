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
| Abuse control | Fixed-start 15-minute aggregate window; the tenth failed verification closes the window to subsequent attempts | Accepted now |
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

### 6.1 Accepted aggregate algorithm

One account key has at most one fixed-start aggregate window. This is an accepted approximation, not an exact sliding or rolling window. Exact sliding semantics would require per-attempt timestamps or bounded time buckets, which conflict with the accepted minimum aggregate and no-attempt-history boundary.

The persisted state is:

- `account_key_version = 1` and `account_key_digest`, the unique pseudonymous account key;
- `window_started_at`, the instant of the first counted failure in this window;
- `window_ends_at = window_started_at + 15 minutes`;
- `failure_count`, an integer from 1 through 10 inclusive;
- `updated_at`, the instant of the latest failure that changed the aggregate;
- `retention_expires_at = updated_at + 24 hours`;
- positive `version`, incremented for every state-changing record operation.

The active interval is half-open: `window_started_at <= evaluatedAt < window_ends_at`. `check` returns `limited` if and only if that interval is active and `failure_count = 10`; every other valid state returns `allowed`. Equality with `window_ends_at` is expired and verification may resume. An absent row, a row evaluated at or after `window_ends_at`, or a row evaluated at or after `retention_expires_at` is not limited. Reads do not mutate or extend any timestamp.

The first counted failure creates count 1 and the exact derived timestamps. A subsequent counted failure inside the active interval increments the count and `version`, sets `updated_at` to its explicit occurrence instant, and sets `retention_expires_at` to exactly 24 hours after that instant; it does not move `window_started_at` or `window_ends_at`. A failure at or after `window_ends_at` replaces the expired aggregate with a new count-1 window beginning at that failure instant.

The counter saturates at 10. The failure that changes count 9 to count 10 was already admitted for password verification and still returns generic `AUTHENTICATION_FAILED`; recording it makes the account key limited immediately for subsequent checks. A check before the next verification returns `RATE_LIMITED` until `window_ends_at`, exclusively. An in-flight failure admitted concurrently before the threshold may still finish, but a record call that observes count 10 performs no mutation, does not extend the window or retention, and returns the limited post-state. This profile therefore does not claim that no more than ten verifier operations can execute under concurrency.

### 6.2 Counted outcomes and clearing

Only `PasswordVerificationPort` outcome `invalid` is a counted failure. That outcome already covers wrong password, unknown identity, disabled User, and absent password credential through the generic account-existence-safe path. Known and unknown identities therefore use the same account-keyed policy.

`verified` does not record a failure, but verification alone does not clear state. `emailVerificationRequired`, malformed transport input, rejected pre-session CSRF or origin evidence, and a request rejected by the rate check do not record or clear state. Configuration, HMAC, Argon2, PostgreSQL, mapping, serialization, and other infrastructure failures do not record or clear state and remain failures.

Only a fully committed successful sign-in clears the account-key row, as part of the accepted issuance transaction. Clearing an absent row is an idempotent success. A verified proof followed by any issuance failure does not clear state.

### 6.3 Application-owned contract

The future application boundary is one purpose-specific `SignInRateLimitPort` with these conceptual values and operations:

```text
SignInRateLimitAccountKey = {
  digestVersion: 1,
  digestBase64Url: canonical 43-character unpadded base64url
}

SignInRateLimitDecision =
  | { outcome: "allowed" }
  | { outcome: "limited", retryAt: Date }

check({ accountKey, evaluatedAt }) -> SignInRateLimitDecision
recordFailure({ accountKey, occurredAt }) -> SignInRateLimitDecision
clear({ accountKey }) -> void
```

`check` reports whether a new verification may begin. `recordFailure` returns the post-record state for subsequent attempts; it does not reclassify the current invalid proof. Neither operation exposes the internal count. `retryAt` is exactly `window_ends_at`. All operation instants are explicit valid `Date` values and are defensively copied at the boundary. No operation reads an implicit clock or SQL current time.

An operation instant earlier than persisted `updated_at` is an invalid temporal ordering and must reject through the internal failure boundary rather than roll state backward or return `allowed`. Equal instants are permitted so concurrent failures captured from one request-time source can serialize deterministically. Persistence, decoding, connection, and temporal-order failures reject; they are never `allowed`, `limited`, or an authentication failure.

### 6.4 Atomic concurrency contract

Operations for one account key are linearizable:

- absent-state creation and expired-window replacement allow one serialized creator; concurrent recorders then apply to that row in order;
- concurrent failure records increment atomically up to 10, with no lost increment and no value above 10;
- a check ordered before a record may return `allowed`; a check ordered after the threshold-reaching record returns `limited`;
- a record ordered after count 10 is a non-mutating limited result;
- clear and record are serialized. If clear is ordered last, no row remains. If a later failure record is ordered after clear, it creates a fresh count-1 window;
- successful issuance must perform its clear in the same transaction as session creation, so rollback preserves the prior aggregate.

The contract defines observable ordering, not a required SQL locking technique. PostgreSQL tests must force and prove both clear/record orderings rather than assume scheduler order.

### 6.5 Account-key derivation

The server security edge derives the account key only after `normalizePrimaryEmail` has produced the accepted lowercase ASCII `NormalizedEmail`. Version 1 is exactly:

```text
HMAC-SHA-256(
  session_hmac_key_v1,
  UTF8("sem-caderno/sign-in-rate-limit/v1") || 0x00 || UTF8(normalized_email)
)
```

The version participates in the fixed domain label. The normalized-email bytes contain no NUL under the accepted ASCII mailbox profile, so the single zero separator makes framing unambiguous. The complete 32-byte HMAC output is represented at the application boundary as exactly 43 canonical unpadded base64url characters with `digestVersion = 1`, then decoded to the same 32 bytes for persistence. The server-held key remains the accepted version-1 session security key and never enters application, contracts, PostgreSQL, logs, audit, analytics, or support data.

Only version 1 is accepted now. The stored version permits a separately specified future cutover, but no multi-key lookup, fallback, rotation, or strategy registry is authorized. The same normalized email and key deterministically produce the same account key; different normalized emails or domain labels produce different framed HMAC inputs.

### 6.6 Retention and physical deletion

An expired window is logically inactive immediately at `window_ends_at`; it need not remain physically present for sign-in correctness. The row becomes eligible for deletion at that instant and must be physically deleted no later than `retention_expires_at`, exactly 24 hours after the latest state-changing failure. Equality with `retention_expires_at` is outside retention. Encountering a retained but expired row during `recordFailure` replaces it; `check` treats it as allowed without extending it.

The future persistence slice must expose or implement a narrow bounded cleanup operation capable of deleting `retention_expires_at <= evaluatedAt` rows. Scheduling that operation is deployment work, but no production deployment may retain these rows beyond the stated deadline. Cleanup is infrastructure housekeeping and does not enter the browser-safe or sign-in application contract.

### 6.7 Normative examples

For one synthetic account key and `t0 = 2026-08-06T12:00:00Z`:

| Event | Required result and state |
| --- | --- |
| First invalid proof at `t0` | Current response remains `AUTHENTICATION_FAILED`; store count 1, window `[12:00, 12:15)`, updated `12:00`, retention `2026-08-07T12:00:00Z`. |
| Failures 2 through 9 before `12:15` | Increment atomically; keep the same window; each failure moves `updated_at` and retention by exactly 24 hours. |
| Tenth invalid proof at `12:09` | Store count 10; current response remains `AUTHENTICATION_FAILED`; post-state is limited with retry `12:15`; retention is `2026-08-07T12:09:00Z`. |
| Check at `12:09:01` | `limited`, retry `12:15`; do not call the verifier and do not mutate the row. |
| Check at exactly `12:15` | `allowed`; equality is expired. |
| Invalid proof at exactly `12:15` | Replace with count 1 and window `[12:15, 12:30)`. |
| Fully committed sign-in | Delete the row atomically with issuance. |
| Clear with no row | Succeed without creating state. |
| Eight concurrent records from count 7 | Exactly three state changes produce counts 8, 9, and 10; the other five observe the saturated limited state without mutation. |
| Concurrent clear and record | The linearized last operation wins: clear-last leaves no row; record-last creates a fresh count-1 row. |
| Retention equality | A row with retention `2026-08-07T12:09:00Z` must not exist after that instant and is logically absent at equality. |
| Same normalized email | Repeated derivation with the same key and exact framing returns the same version-1 digest. |
| Different identity or domain | The framed HMAC input differs before cryptographic evaluation. |
| PostgreSQL/HMAC/temporal failure | Reject as internal failure; never return `allowed`, `limited`, or generic invalid proof. |

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

`IssueSessionInput` carries only `userId`, `issuedAt`, `expiresAt`, the versioned session/pre-session-CSRF/authenticated-CSRF digests, the versioned `SignInRateLimitAccountKey`, and the optional prior-session credential digest. The server derives the account key from the already-normalized email before calling the transaction. Application and persistence receive no raw or normalized email and must not attempt to derive the key from User or session rows.

One transaction must perform these steps in order:

1. acquire the same transaction-scoped per-account advisory serialization used by `SignInRateLimitPort` for the supplied complete account-key digest;
2. lock/revalidate the verified User as existing, enabled, and email-verified;
3. revalidate and consume the pre-session CSRF challenge at `issuedAt`;
4. revoke the exact prior active session represented by the strictly parsed incoming configured cookie, when present;
5. insert the fresh session with both digest pairs, User, null selected Business, explicit timestamps, and version 1;
6. insert exactly one minimal `session_issued`/`succeeded` audit row at `issuedAt`;
7. delete the supplied rate-limit account-key row;
8. commit.

The account advisory-lock identity is the signed big-endian 64-bit value from the first eight bytes of the complete decoded account-key digest, matching the Cycle 028 adapter. Advisory collisions may serialize unrelated keys but never merge them because deletion still matches the complete version and 32-byte digest. This lock is acquired before User/challenge/session locks, making rate `recordFailure` versus issuance clear linearizable without a second lock protocol.

The new session never reuses, adopts, updates, or derives from an incoming credential. A missing or malformed incoming cookie supplies no prior digest. A supplied prior digest revokes that exact active row when found; no matching active row is an idempotent no-op. Ordinary sign-in revokes only the session presented by this browser; other device sessions remain active. `expiresAt` must equal `issuedAt + 43,200 seconds`; invalid or non-finite instants are internal input failure, not an expected result.

The new session starts with `selected_business_id = NULL`. ID10 and BS02 own accessible-Business discovery and validated selection. No Membership or capability is cached during issuance.

### 7.5 Issuance results and rollback

`SessionIssuanceTransactionPort.issue()` returns exactly one discriminated `SessionIssuanceResult`:

| Outcome | Meaning | Transaction effect | Later orchestration |
| --- | --- | --- | --- |
| `issued` with User and expiry | Every step committed | All seven writes/checks above are authoritative | Return success evidence and cookie |
| `userRejected` | Locked User is missing, disabled, or no longer email-verified | Roll back; no challenge consumption, revocation, insertion, audit, or rate clear | Generic authentication failure; no account-state disclosure |
| `preSessionChallengeRejected` | Challenge is unknown, expired including equality, or already consumed | Roll back with the three states deliberately indistinguishable | `CSRF_REJECTED`; no cookie/token |
| `digestCollision` | The new session credential digest or authenticated-CSRF digest conflicts with its named uniqueness constraint | Roll back every transaction effect | Discard both raw values and retry with two fresh values |

Only those two new-digest uniqueness conflicts produce `digestCollision`. Classification uses structured PostgreSQL error code plus reviewed constraint identity, never error-message text. The server edge owns retry because only it owns raw evidence and generation: one initial attempt plus at most two retries, three total. Every collision discards and regenerates both raw values even if only one digest collided. User/challenge rejection is not retried. Collision exhaustion and every connection, query, transaction, decoding, timestamp, audit, foreign-key, check, or unexpected uniqueness failure reject as internal failure.

An expected result is returned only after its transaction has rolled back successfully. If rollback itself fails, the promise rejects as infrastructure failure. No result other than `issued` permits public session or authenticated-CSRF evidence.

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
- `sessions`: nullable `authenticated_csrf_digest_version smallint` and `authenticated_csrf_digest bytea` columns introduced as an all-null or complete pair, with supported version 1, exact 32-byte length, and uniqueness among complete pairs;
- `sign_in_rate_limits`: unique versioned account-key digest, fixed window start/end, saturated failure count, last state-changing update, exact retention deadline, and positive version; aggregate only, not attempt history.
- `audit_events`: the first executable profile contains only UUIDv7 `id`, restrictive non-null `actor_user_id`, fixed `action_code = 'session_issued'`, fixed `outcome_code = 'succeeded'`, and non-null `occurred_at`.

The issuance migration is additive and supplies no default or backfill for authenticated-CSRF evidence. Existing sessions remain `NULL`/`NULL`; they stay valid for current-session inspection and other read-only authentication until ordinary expiry or revocation, but absence of the binding rejects every unsafe authenticated operation with `CSRF_REJECTED`. It also rejects authenticated-CSRF replenishment: the browser must establish a newly issued session rather than adopting fabricated evidence. Every Cycle 031 issuance insert must supply a complete non-null pair. The current reader ignores the new columns, so the additive schema may precede the writer and remains compatible with rollback to the current inspection runtime.

The migration creates one partial unique index over authenticated-CSRF version/digest where the version is non-null. A later separately reviewed contract migration may validate that no null pairs remain and set both columns non-null only after all legacy sessions have expired, been revoked, or been removed and every writer requires the pair. It must not fabricate, derive, or backfill raw authenticated-CSRF evidence for historical sessions.

The minimal audit row is inserted in the issuance transaction with `actor_user_id = userId` and `occurred_at = issuedAt`; its two codes are migration-constrained constants. It has no session reference, Business, correlation, metadata, reason, IP, agent, device, email, password, bearer, digest, or key. The issuance adapter exposes insert only; update/delete and a general audit/event framework remain unauthorized. Retention policy for this new security audit category requires later operational/legal authority and does not permit ordinary runtime deletion now.

The existing session credential columns and constraints remain authoritative. Raw password, raw session credential, raw CSRF value, HMAC key, IP, user agent, device, location, login history, arbitrary metadata, and authorization cache are prohibited.

## 11. Failure and Logging Boundary

Invalid proof is an expected authentication outcome. CSRF rejection, rate limiting, email-verification requirement, validation failure, and internal failure remain distinct. No broad catch may turn configuration, CSPRNG, HMAC, Argon2, PostgreSQL, transaction, mapping, or serialization failure into 401, 201, or anonymous success.

Within issuance, `userRejected` maps to the same generic authentication failure as other unusable-User proof paths, and `preSessionChallengeRejected` maps to `CSRF_REJECTED`. `digestCollision` is internal retry control and never a public error identity. Rejected infrastructure remains a safe `INTERNAL_FAILURE` if it reaches HTTP.

Public failures expose only allow-listed Problem Details and an independent correlation identifier. They never expose email existence, disabled state, verifier/hash/parameters, password, session/CSRF evidence, HMAC input/key/digest, SQL, constraint, retry counter, stack, provider detail, or transaction state.

The initial mandatory security audit records only committed sign-in success using the exact Cycle 030 row. Broader suspicious-failure audit, correlation, metadata, and additional categories remain deferred until their security value and retention are accepted. It is not login history. Passwords, hashes, raw or digested bearer evidence, normalized-email rate keys, request bodies, IPs, user agents, and device metadata are excluded.

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
- fixed-start abuse threshold/window, known/unknown parity, half-open expiry, exact retention, successful clear, linearizable record/clear behavior, and no raw identity retention;
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

## 19. Cycle 024 Implementation Profile

Cycle 024 implements the reviewed inner contract/application boundary without infrastructure. `@sem-caderno/contracts` now owns strict ID04 request validation, NFC password normalization, additive ID00/ID04 response validation, canonical browser-visible `p1`/`c1` evidence, inferred types, exact limits, and stable 401 `AUTHENTICATION_FAILED`. It exports no server credential, digest, HMAC key, password hash, or verifier shape.

`@sem-caderno/application` now owns deterministic accepted-ASCII primary-email validation and complete-address lowercase normalization, a nominal normalized-email type, the three-outcome `PasswordVerificationPort`, and `SessionIssuanceTransactionPort`. Issuance input contains only User identity, explicit issuance/expiry dates, and versioned session/pre-session-CSRF/authenticated-CSRF digests plus an optional prior-session digest. It has no raw bearer, selected Business, transport, Fastify, crypto, Argon2, PostgreSQL, or authorization type.

Focused tests prove valid/invalid/boundary transport behavior, additive/strict policies, normalization determinism, non-mutation, serialization, generic error identity, verifier failure separation, digest-only issuance, and public-export safety. No adapter, orchestration, database change, credential generation, HMAC, route, cookie, or CSRF enforcement is added.

## 20. Cycle 025 Password Verification Persistence Profile

Cycle 025 selects exact `argon2` 0.45.1 in `@sem-caderno/persistence-postgres`. Its reviewed Node-API native install is explicitly allowlisted; no Argon2 or Node runtime type enters application or contracts. The adapter accepts the existing normalized-email/password input, runs one parameterized lookup, validates standard Argon2id PHC version 19 with at least the accepted memory/time/parallelism, 16-byte salt, and 32-byte output, then performs exactly one real-or-fixed-dummy verification operation.

Correct proof for a usable verified User returns verified; correct proof for an email-unverified User returns email-verification-required. Wrong password, unknown email, disabled User, and absent credential binding return invalid after verifier work. PostgreSQL, row, PHC decoder, and Argon verifier failures reject with fixed internal messages and never become invalid.

The ordered credential migration stores one restrictive User-owned Argon2id PHC verifier, timestamps, and positive version. It stores no raw password, algorithm column, password history, provider value, session/CSRF evidence, Business/Membership fact, device/request data, or telemetry. Real PostgreSQL 18.4 tests prove this narrow persistence and adapter boundary. Production password creation/rehashing, sign-in orchestration, challenge/session issuance, HTTP, and cookie behavior remain absent.

## 21. Cycle 026 Pre-Session Challenge Persistence Profile

Cycle 026 implements the application-owned `PreSessionChallengePort` and a creation use case that calculates `expiresAt = createdAt + 600 seconds` from one explicit instant. The server edge validates canonical `p1` evidence and uses the accepted version-1 HMAC key with UTF-8 `sem-caderno/session-csrf/v1`, one zero byte, and the exact 32 evidence bytes. It returns only a purpose-branded 43-character digest; no CSPRNG, route, or raw-value persistence is added.

The ordered migration creates only UUIDv7 identity, digest version/bytes, creation, expiry, nullable consumption, and positive version. One direct PostgreSQL adapter inserts that state and consumes it with a parameterized atomic update requiring an active half-open lifetime. Unknown, expired, equal-expiry, and replayed evidence return one negative internal result. Database and decoding failures reject. Real PostgreSQL 18.4 tests prove migration integrity, digest-only storage, constraints, replay rejection, and exactly one winner under concurrent consumption.

This standalone lifecycle boundary does not replace the accepted atomic issuance requirement. A future `SessionIssuanceTransactionPort` adapter must perform the same challenge predicate inside the transaction that revalidates User, revokes prior presented session, inserts the fresh session, records safe audit evidence, and clears rate state.

## 22. Cycle 027 Rate-Limit Semantics Closure Profile

Cycle 027 closes the previously blocked rate-limit authority without production code. It selects an explicit fixed-start aggregate window instead of inaccurately calling the minimal state an exact rolling window; defines threshold, counted outcomes, read/record/clear results, temporal ordering, retention, and concurrency; and fixes the version-1 normalized-email HMAC framing. No application port, server digester, adapter, SQL, migration, dependency, or PostgreSQL test is added by this specification closure.

## 23. Cycle 028 Rate-Limit Persistence Implementation Profile

Cycle 028 implements `SignInRateLimitPort`, the exact server-owned version-1 account-key HMAC derivation, and `PostgresSignInRateLimitAdapter`. The adapter validates canonical digest-only input, uses explicit times, and serializes each key with a transaction-scoped advisory lock plus row locking. It creates, increments, saturates without mutation, replaces expired windows, checks, and clears exactly as specified; infrastructure and temporal-order faults reject.

The sixth ordered migration creates only the compound-keyed aggregate, exact lifecycle/count constraints, positive version, and retention cleanup index. Bounded cleanup accepts explicit time and limit but has no scheduler. Focused real PostgreSQL tests prove migration integrity, equality boundaries, no lost increments, cap 10, atomic expiry replacement, and both forced clear/record orderings. No sign-in coordinator, CSPRNG evidence generation, session insertion, authenticated-CSRF persistence, HTTP, cookie, or authorization behavior is added.

## 24. Cycle 029 Evidence Generation Implementation Profile

Cycle 029 adds one server-owned generator that performs separate Node `crypto.randomBytes(32)` calls for the session credential and authenticated-CSRF evidence. It emits only canonical `v1.` and `c1.` representations, privately copies the construction-owned version-1 HMAC key, and reuses the accepted session-lookup and session-CSRF digest derivations. Application receives only its existing purpose-branded version-1 full digests.

An optional direct byte source makes exact framing and independence deterministic in tests without introducing a generic random-service abstraction. Invalid source output, CSPRNG failure, and derivation failure reject with no raw evidence or secret detail. There is no persistence, migration, collision retry, sign-in transaction, route, cookie, selected-Business, authorization, or product behavior.

## 25. Cycle 031 Issuance Persistence Implementation Profile

Cycle 031 adds the ordered `20260806000400-add-session-issuance-foundation` migration and fulfills `SessionIssuanceTransactionPort` with `PostgresSessionIssuanceAdapter`. The additive schema leaves historical authenticated-CSRF pairs null, requires complete version-1 32-byte pairs for new issuance, creates only the partial uniqueness index and minimal success-audit table, and fabricates no historical evidence.

One transaction uses the accepted rate-key advisory lock and exact operation order. Real PostgreSQL evidence proves committed success, expected rejection rollback, both named digest collisions, unrelated and late infrastructure failure rollback, absent-row no-ops, one challenge winner, and both rate-record/issuance-clear linearization orders. The adapter owns no raw evidence, key, CSPRNG, retry loop, coordinator, HTTP, or cookie behavior.

## 26. Cycle 032 Sign-In Orchestration Implementation Profile

Cycle 032 adds one internal server-owned operation. Its input is the accepted email and NFC-normalized password, purpose-branded pre-session and optional prior-session digests prepared by the server edge, and one explicit issuance instant. Construction validates and copies the HMAC key. Execution normalizes email, derives the version-1 rate key, checks the aggregate before verification, and records only verifier outcome `invalid` at the same instant. A limited check prevents verifier work; the tenth admitted invalid proof remains the current generic authentication failure even when recording returns a limited post-state.

Verified proof derives the exact 12-hour expiry and generates independent session/authenticated-CSRF evidence for each transaction attempt. `issued`, `userRejected`, and `preSessionChallengeRejected` terminate immediately with their safe coordinator result. Only `digestCollision` causes another complete generation, up to three total attempts; exhaustion and every unknown result or infrastructure failure reject. The operation publishes raw generated evidence only with an exact committed User/expiry match and exposes no digest, key, password, PostgreSQL detail, selected Business, Membership, authorization, HTTP, or cookie behavior.

## 27. Recommended Next Cycle

**Cycle 033 - Pre-Session Bootstrap HTTP Foundation**

**Task 001 - Implement Independent Pre-Session CSRF Generation and `GET /api/v1/session-bootstrap`**

Objective: generate one fresh canonical `p1` value with the accepted CSPRNG, persist only its purpose-separated digest and exact ten-minute lifecycle through the existing boundary, and expose the stable no-store ID00 response through Fastify without sign-in POST or cookie writing.

Explicit non-goals: no ID04 route, sign-in cookie, authenticated-CSRF enforcement, authorization, product UI, provider, deployment, or merchant testing.
