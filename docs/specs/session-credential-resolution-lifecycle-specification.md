# Session Credential Resolution and Lifecycle Specification

- Status: Accepted.
- Cycle: 018 - Session Credential Resolution and Lifecycle Specification.
- Task: 001 - Define Request-Scoped Session Evidence, Digesting, Active-State Evaluation, Inspection Outcomes, and Reassess the CurrentSessionStatePort Boundary.
- Repository evidence inspected: 2026-08-05.
- External technical evidence verified: 2026-08-05.

## 1. Purpose, Scope, and Authority

Cycle 016 proved a framework-independent current-session inspection use case and a pure server-edge transport mapper. Cycle 017 then proved that its no-input `CurrentSessionStatePort` cannot be implemented honestly: neither the application port nor another accepted boundary explains how the opaque credential from one request becomes the lookup identity for PostgreSQL. Digest ownership, active-state evaluation, deterministic time, inactive-session outcomes, and selected-Business treatment were also unresolved.

This specification resolves those blockers without implementing authentication, HTTP handling, persistence, or authorization. It defines the minimum future flow from a same-origin cookie to explicit application evidence and a narrow PostgreSQL resolver. It refines the Cycle 016 implementation profile; it does not change the public session-inspection transport response.

Authority remains, in descending semantic order:

1. [MVP Scope](../product/mvp-scope.md), [Domain and Tenancy](domain-and-tenancy.md), and [Authentication and Business Onboarding](authentication-and-business-onboarding.md) define product, identity, tenancy, and session intent.
2. [Application Contracts](application-contracts.md) define application and authorization semantics.
3. [Implementation Architecture](implementation-architecture-technology-selection.md), ADRs 0016, 0018, 0020, and 0023 define the server, persistence, session, and cookie boundaries.
4. [Transport Contract](transport-api-contract-specification.md) and ADR 0033 define public wire behavior.
5. [Physical Persistence Model](physical-persistence-model-specification.md), ADRs 0026 and 0031 define PostgreSQL and migration ownership.
6. Cycle 016 source proves the current application/transport split; Cycle 017 evidence identifies the implementation blockers this specification resolves.

Database structure and transport DTOs remain subordinate to application and security semantics. This cycle introduces no production TypeScript, dependency, environment variable, migration, SQL, route, cookie, session issuance, or PostgreSQL execution.

## 2. Decisions at a Glance

| Concern | Accepted Cycle 018 decision |
| --- | --- |
| Request evidence | The Fastify/server edge accepts session evidence only from the approved host-only cookie and validates its canonical syntax. |
| Application boundary | Replace the no-input `CurrentSessionStatePort` with an explicit, parameterized session-resolution boundary in the next implementation cycle. |
| Hidden context | Request-global mutable state, AsyncLocalStorage, service locators, and implicit current-session state are rejected. |
| Browser credential | One meaningless opaque credential: `v1.` plus 32 CSPRNG bytes encoded as canonical unpadded base64url. |
| Raw credential | Exists only in the browser cookie and transient server-edge memory; never enters application models, contracts, persistence, logs, audit, analytics, or support data. |
| Lookup derivation | The server security edge derives HMAC-SHA-256 over a domain-separated credential value with a server-held 32-byte-or-stronger secret key. |
| Normalized evidence | Application receives an optional opaque lookup key containing digest version `1` and a canonical 32-byte digest representation, plus an explicit evaluation instant. |
| PostgreSQL lookup | Persistence receives only the normalized lookup key and evaluation instant; it knows neither cookies nor Fastify. |
| Expiry | First slice uses fixed absolute expiry only. Idle/sliding expiry and read-time writes are deferred. |
| Active predicate | Digest matches, `revoked_at` is null, evaluation instant is strictly before `expires_at`, and the referenced User exists with no `disabled_at` instant. |
| Anonymous outcomes | Missing, malformed, unknown, revoked, expired, or unusable-User evidence produces the same anonymous inspection result. |
| Failure | Database/infrastructure failure propagates as an internal failure and never degrades to anonymous. |
| Selected Business | A nullable remembered candidate is returned as context without Business or Membership authorization checks. |
| Contract | The Cycle 016 public anonymous/authenticated response remains sufficient and unchanged. |

## 3. Cycle 017 Decision-Gap Matrix

| Cycle 017 gap | Decision | Classification after Cycle 018 |
| --- | --- | --- |
| Source of the current-session lookup identity | Only the approved session cookie supplies raw evidence; the server edge parses and digests it before application invocation. | Resolved. |
| No-input port obtains per-request state | It does not. The no-input port is replaced by explicit input; hidden request context is prohibited. | Resolved. |
| Raw-token-to-digest ownership | A narrow server-owned credential parser/digester uses Node's platform crypto; persistence never receives raw evidence. | Resolved. |
| Digest algorithm and representation | Version 1 is HMAC-SHA-256; raw and digest values use canonical unpadded base64url at internal string boundaries; PostgreSQL stores 32 digest bytes in `bytea`. | Resolved. |
| Digest key/version handling | Server configuration owns a secret key for version 1. The credential prefix selects the accepted version; unknown versions are malformed. Multiple-version rotation is deferred until required. | Resolved for first slice. |
| Effective expiry | `expiresAt` is the fixed absolute `expires_at`; idle expiry is not in the first slice. | Resolved. |
| Clock ownership | The server composition edge captures one UTC instant and passes it explicitly; application and persistence do not call an implicit clock for evaluation. | Resolved. |
| Active row predicate | Unique digest match, not revoked, `evaluatedAt < expires_at`, and User with null `disabled_at`. | Resolved. |
| Missing credential | Anonymous without a database lookup. | Resolved. |
| Malformed credential | Rejected as usable evidence at the edge and normalized to anonymous for inspection; no lookup. | Resolved. |
| Unknown/revoked/expired credential | Same anonymous inspection result without exposing the cause. | Resolved. |
| Disabled or missing User | Same anonymous inspection result; verified-email status remains a separate operation precondition. | Resolved. |
| Database failure | Propagated as infrastructure failure; future HTTP mapping uses safe `INTERNAL_FAILURE`, never anonymous. | Resolved. |
| Selected Business revalidation | Return the stored candidate without authorization; protected operations and Business-selection use cases revalidate independently. | Resolved by separating inspection from authorization. |
| Adapter owner | `@sem-caderno/persistence-postgres` implements the application-owned parameterized resolver. | Previously accepted and confirmed. |
| Construction owner | `apps/server` owns composition and the future request edge. | Previously accepted and confirmed. |
| First migration readiness | Minimum row, constraints, lookup index, query semantics, and tests are specified below. | Resolved for the next implementation slice. |
| Session duration | Operational duration is not required to read an already-issued row; issuance remains deferred and must choose a reviewed duration before login implementation. | Deliberate non-blocking deferral. |

## 4. Boundary Reassessment

### 4.1 Model A: explicit evidence flows inward

Conceptual flow:

```text
HTTP cookie
  -> server-edge extraction and canonical validation
  -> server-edge HMAC derivation
  -> InspectCurrentSession(input: lookup evidence or absence, evaluatedAt)
  -> SessionResolutionPort.resolve(lookup evidence, evaluatedAt)
  -> PostgreSQL adapter
  -> application session result
  -> pure server-edge transport mapper
```

Advantages:

- Every security-sensitive input is visible in a function signature.
- Application tests supply deterministic evidence and time without Fastify or global state.
- Persistence receives exactly the digest it can query and remains ignorant of browser transport.
- Missing evidence can short-circuit without opening a database connection.
- Parallel requests cannot contaminate one another through mutable context.

Cost: the Cycle 016 use-case and port signatures must change in the next implementation cycle. That is a justified correction, not a compatibility failure; neither interface is public transport.

### 4.2 Model B: request context behind a no-input port

Keeping `readCurrentSession()` with no input would require a per-request closure, AsyncLocalStorage, mutable request context, service location, or framework-bound adapter construction. These mechanisms hide the credential dependency, complicate concurrent tests, and risk request-state leakage. Constructing an entire persistence adapter per request would only disguise the hidden input.

Model B is rejected. The repository has no current consumer that needs ambient request context, and Cycle 017 demonstrated its concrete cost.

### 4.3 Selected future boundary

The no-input `CurrentSessionStatePort` does **not** survive. The next implementation cycle will replace it with one application-owned `SessionResolutionPort` and explicit use-case input. Names may be adjusted mechanically, but the semantic shape is fixed:

```text
InspectCurrentSessionInput = {
  sessionLookup: SessionLookupKey | absent,
  evaluatedAt: Date
}

SessionLookupKey = {
  digestVersion: 1,
  digestBase64Url: canonical 43-character unpadded base64url
}

SessionResolutionPort.resolve({ sessionLookup, evaluatedAt })
  -> authenticated application session or no matching active session
```

`SessionLookupKey` is application-owned security evidence, not a transport DTO and not a bearer credential. Its string representation is chosen to remain framework- and Node-type-independent. Implementations must treat it as opaque after application-boundary validation.

The use case returns the existing application anonymous/authenticated result. A resolver miss becomes anonymous; a rejected Promise or equivalent infrastructure failure propagates. No generic result/error framework is introduced.

## 5. Session Credential and Request Evidence

### 5.1 Browser credential

The browser holds one server-generated, meaningless opaque credential in the cookie selected by ADR 0023. Version 1 has this canonical form:

```text
v1.<43 unpadded base64url characters encoding exactly 32 random bytes>
```

The 32 random bytes provide 256 bits of entropy and must come from Node's cryptographically secure `crypto.randomBytes()` or an equivalent accepted platform primitive. Issuance must reject accidental collisions before commit even though collision probability is negligible. The value contains no User, Business, expiry, role, provider, database ID, or authorization claim.

The exact cookie name is configuration owned by the server executable. Production must use a reviewed `__Host-`-prefixed name and ADR 0023's `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, and no-`Domain` rules. Local non-TLS development may use a clearly local unprefixed name only in a later HTTP implementation profile; it cannot weaken production configuration. Cookie issuance, clearing, `Max-Age`/`Expires`, and CSRF behavior remain later HTTP/authentication work.

No URL, query, request-body, local-storage, session-storage, or Authorization-header fallback is accepted for browser session evidence. Accepting alternate carriers would increase fixation and leakage risk.

### 5.2 Edge normalization

The future Fastify/server edge:

1. extracts only the configured cookie;
2. treats absence as no session evidence;
3. validates the exact version, alphabet, length, canonical base64url encoding, and decoded byte length without coercion or repair;
4. rejects unknown versions and malformed encodings as unusable evidence;
5. derives the lookup digest;
6. immediately discards references to the raw value after invocation setup;
7. passes only lookup evidence and one captured evaluation instant to application code.

Malformed evidence produces anonymous current-session inspection and no database lookup. A future protected operation may map the same condition to the generic accepted `SESSION_INVALID` response, but it must not expose syntax, version, lookup, or lifecycle detail. This difference is operation policy, not a second credential parser.

Cookie parsing and Fastify integration remain for a later HTTP cycle. Cycle 018 fixes their ownership and normalized output only.

## 6. Digest and Lookup Semantics

### 6.1 Version 1 derivation

The server security edge derives the lookup digest with HMAC-SHA-256 using:

- a server-held secret key of at least 32 uniformly random bytes;
- the fixed UTF-8 domain-separation label `sem-caderno/session-lookup/v1`;
- one zero byte separator;
- the exact 32 decoded credential bytes;
- the complete 32-byte HMAC output without truncation.

Conceptually:

```text
HMAC-SHA-256(key_v1, UTF8("sem-caderno/session-lookup/v1") || 0x00 || credential_bytes)
```

At the application boundary the digest is canonical unpadded base64url: exactly 43 characters from the RFC 4648 URL-safe alphabet. At the PostgreSQL boundary it becomes the exact 32 bytes and is stored as `bytea`. Implementations must reject non-canonical encodings instead of accepting alternate text for the same bytes.

The secret key belongs to server-only startup configuration and is never stored in the `sessions` table, passed to application/persistence models, logged, exported, or placed in browser configuration. The narrow server parser/digester may use Node's built-in `node:crypto`; no cryptography dependency or pluggable hashing framework is required.

### 6.2 Versioning and rotation boundary

Credential prefix `v1` and persisted `digest_version = 1` identify the derivation profile. The first implementation supports exactly version 1. Unknown versions are malformed evidence.

The schema carries a version because digest key/algorithm migration would otherwise require treating every old session as indistinguishable. A future key-rotation task must explicitly define overlapping read versions, issuance cutover, revocation/expiration of old sessions, and secret retirement. Cycle 018 does not specify a general strategy registry, fallback keys, or silent trial of every key.

### 6.3 Disclosure and equality

- Raw credentials are bearer secrets and prohibited in application/domain/contract models, persistence rows, logs, audit events, traces, analytics, metrics labels, errors, support references, test reports, and crash reports.
- Digests and their User association are security-sensitive even though the digest alone is not accepted by the browser edge. They are prohibited in ordinary observability and support output.
- PostgreSQL performs equality through the unique `(digest_version, credential_digest)` lookup. Application code does not need a timing-sensitive raw-secret comparison.
- Parameterized query values carry the digest bytes. SQL string interpolation is prohibited.
- Correlation uses an independent request correlation identifier, never raw or digested session evidence.

Official evidence: Node 24 exposes CSPRNG and HMAC through [`crypto.randomBytes()` and `crypto.createHmac()`](https://nodejs.org/docs/latest-v24.x/api/crypto.html); [RFC 2104](https://www.rfc-editor.org/rfc/rfc2104.html) defines HMAC; [RFC 4648](https://www.rfc-editor.org/rfc/rfc4648.html) defines canonical base64url; the [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) requires meaningless, unpredictable session identifiers, secure cookie carriage, server-side state, and exclusion of session IDs from logs.

## 7. Session Lifecycle and Inspection Outcomes

### 7.1 Active predicate

A persisted session resolves as authenticated at `evaluatedAt` only when all conditions hold:

1. exactly one row matches `digest_version` and `credential_digest`;
2. `revoked_at IS NULL`;
3. `evaluatedAt < expires_at`;
4. the referenced User row exists;
5. the User has no `disabled_at` instant.

Email verification is not part of current-session existence. It remains a precondition for active Business operations where accepted. Membership, capability, Business lifecycle, and same-Business references are not part of the session-active predicate.

### 7.2 Outcome matrix

| Evidence or persisted state | Persistence call | Application inspection | Future public inspection | Notes |
| --- | --- | --- | --- | --- |
| Cookie absent | No | Anonymous | Existing anonymous success | Expected unauthenticated state. |
| Cookie malformed/unknown version | No | Anonymous | Existing anonymous success | Do not reveal parser detail. |
| No matching digest | Yes | Anonymous | Existing anonymous success | Do not reveal whether a session ever existed. |
| Active row and usable User | Yes | Authenticated | Existing authenticated success | Returns User, absolute expiry, optional Business candidate. |
| `revoked_at` present | Yes | Anonymous | Existing anonymous success | No revocation detail exposed. |
| `evaluatedAt >= expires_at` | Yes | Anonymous | Existing anonymous success | Equality is expired. |
| Missing User | Yes | Anonymous | Existing anonymous success | Foreign key should prevent ordinary occurrence; restore/repair inconsistency fails closed. |
| User has `disabled_at` | Yes | Anonymous | Existing anonymous success | Implements the already accepted disabled-identity condition without adding other account states. |
| Database/adapter failure | Attempted | Failure propagates | Safe `INTERNAL_FAILURE` when HTTP is implemented | Never anonymous and never exposes PostgreSQL detail. |
| Inconsistent row mapping | Attempted | Failure propagates | Safe `INTERNAL_FAILURE` | Treat as integrity/implementation failure, not unauthenticated evidence. |

Anonymous normalization limits credential-validity oracles while keeping the current global inspection useful before login. A future protected operation may return `AUTHENTICATION_REQUIRED` for no evidence and `SESSION_INVALID` for unusable evidence only when that distinction is available without leaking sensitive lifecycle detail; Cycle 018 does not add that HTTP implementation.

Expired and revoked rows remain stored according to a later retention policy. Inspection never reactivates, extends, rotates, or deletes them.

## 8. Expiration and Time Ownership

### 8.1 Absolute expiry only in the first slice

The first persisted session slice has one fixed `expires_at` instant. It is selected during future session issuance from a reviewed server policy and never changes during inspection. The existing application and transport `expiresAt` field means exactly this absolute expiry.

Idle expiry, `last_seen_at`, sliding expiration, renewal-on-read, and read-time writes are deferred. No accepted current requirement justifies the added write amplification, race handling, privacy data, or ambiguity. Shared-device and lost-device behavior are already covered by explicit revocation and fixed expiry.

The operational duration remains an authentication-issuance decision and does not block the read adapter: tests use explicit persisted expiry instants. Login/session issuance cannot be implemented until the duration and cookie lifetime are reviewed together.

### 8.2 Deterministic evaluation

The server composition/request edge captures one current instant per inspection and passes an application-owned `Date` as `evaluatedAt`. The use case and adapter do not call `Date.now()`, `new Date()`, PostgreSQL `now()`, or another hidden clock for the lifecycle decision.

All persisted lifecycle instants use PostgreSQL `timestamptz` and represent UTC instants. At the exact boundary where `evaluatedAt` equals `expires_at`, the session is expired. Tests use fixed instants immediately before, equal to, and after expiry.

This explicit input is sufficient; no general `Clock`, time service, or dependency-injection framework is selected. Future session issuance may justify its own narrow time input but cannot silently redefine inspection.

## 9. Selected Business and Authorization

`selected_business_id` is a nullable remembered candidate on the session. Absence is SQL `NULL`, an absent optional application property, and an omitted transport property. It is never an empty string or sentinel UUID.

Current-session resolution returns the stored candidate unchanged when the session and User are active. It does not join Business or Membership, clear the candidate, or determine capabilities. This narrows Cycle 007 ID05 to global session inspection and corrects any wording that implied its response is already an authorization context.

The following remain authoritative for every protected tenant operation:

- validate the authenticated User and verified identity where required;
- validate the path/request Business independently of the remembered candidate;
- validate Business lifecycle;
- validate active Membership in that same Business;
- derive current capabilities;
- validate every tenant-owned reference against the same Business;
- suppress cross-Business existence disclosure.

A separate Business selection or switching operation validates the candidate before storing it. If Membership or Business state later changes, the remembered identifier may still be returned by inspection but grants no access; presentation must use an accessible-Business query before treating it as active. This design prevents session lookup from becoming an authorization engine.

## 10. User Lifecycle Boundary

The session resolver checks only that the global User exists and `users.disabled_at IS NULL`. A non-null `disabled_at` is the minimum physical representation of the already accepted “User identity is disabled” condition and fails closed to anonymous. It does not replace email verification, credential recovery, compromise handling, or future legal anonymization. Verification status does not destroy the authenticated session; application operations may return `EMAIL_VERIFICATION_REQUIRED` where accepted.

Cycle 018 does not add lockout, ban, profile-completeness, deletion, suspension, recovery-restricted, or compromise states. Those concerns either revoke sessions through their accepted command boundary or require a later explicit lifecycle decision. If future product/security work changes User lifecycle vocabulary, the active-session predicate must be revisited explicitly. Membership state remains outside this resolver.

## 11. Minimum Persistence Model

The next implementation slice may create only the following `sem_caderno.sessions` fields.

| Field | PostgreSQL representation | Nullability | Concrete requirement | First slice |
| --- | --- | --- | --- | --- |
| `id` | UUIDv7 `uuid` | Not null, primary key | Internal stable row identity and accepted identifier policy; not bearer evidence. | Required. |
| `digest_version` | `smallint` | Not null | Selects the one accepted credential derivation profile and supports explicit future migration. | Required; value `1`. |
| `credential_digest` | 32-byte `bytea` | Not null | Unique lookup without persisting raw credential. | Required. |
| `user_id` | `uuid` | Not null | Associates the global authenticated User. | Required FK, no cascade delete. |
| `selected_business_id` | `uuid` | Nullable | Remembers optional context without granting authorization. | Required nullable FK, no cascade delete. |
| `created_at` | `timestamptz` | Not null | Issuance/audit boundary and lifecycle constraint. | Required. |
| `expires_at` | `timestamptz` | Not null | Fixed absolute expiry and public `expiresAt`. | Required. |
| `revoked_at` | `timestamptz` | Nullable | Durable current-/other-device invalidation evidence. | Required. |
| `updated_at` | `timestamptz` | Not null | Accepted mutable-row convention for revocation or selected-Business replacement. | Required by Cycle 012 convention. |
| `version` | positive `bigint` | Not null | Accepted optimistic-version convention for later revocation/context mutation. | Required by Cycle 012 convention. |

Required semantics:

- unique `(digest_version, credential_digest)`;
- digest length exactly 32 bytes;
- `digest_version = 1` in the first migration, represented by text-plus-check policy rather than a PostgreSQL enum equivalent;
- `expires_at > created_at`;
- `updated_at >= created_at`;
- `revoked_at IS NULL OR revoked_at >= created_at`;
- `version > 0`;
- User and Business references use accepted global FK behavior and prohibit cascading historical deletion;
- the unique lookup constraint supplies the current-inspection access path; no duplicate lookup index is added.

Explicitly excluded from the first session persistence slice:

- raw credential, cookie value, HMAC key, or recoverable encryption of the bearer value;
- idle expiry, `last_seen_at`, sliding lifetime, or read counters;
- IP address, user agent, device name, geolocation, or browser fingerprint;
- revocation reason/actor, login history, arbitrary metadata, or security-event payload;
- session family, parent/predecessor, refresh token, rotation chain, or provider identity;
- CSRF digest/state, which belongs to the first unsafe authenticated HTTP/session-issuance slice;
- audit payload duplication, telemetry identifiers, or support-facing digest;
- Business/Membership/capability snapshots.

These exclusions refine the broader Cycle 012 catalogue to the smallest current-inspection migration. Later additive migrations may introduce independently justified evidence without altering this predicate silently.

### 11.1 Parent-table prerequisites

The repository currently has no executable PostgreSQL tables. Referential integrity therefore makes `users` and `businesses` migration prerequisites, not assumptions. The next implementation cycle may create the smallest accepted identity/session foundation in one ordered migration sequence:

| Parent | Minimum fields needed by this slice | Existing authority | Deliberate boundary |
| --- | --- | --- | --- |
| `users` | UUIDv7 `id`; original and normalized primary email; nullable `email_verified_at`; nullable `disabled_at`; `created_at`; `updated_at`; positive `version` | Cycle 006 User identity; Cycle 012 `users`; accepted verified/disabled identity semantics | Email normalization algorithm and credential/provider records remain later identity work. Normalized email is non-empty and globally unique; tests use reserved synthetic addresses. |
| `businesses` | UUIDv7 `id`; `state` constrained to accepted `active` or `deactivated`; creation actor User; nullable deactivation instant; `created_at`; `updated_at`; positive `version` | Cycles 003/006/012 Business lifecycle and tenant root | Business settings/name/time zone remain in the later accepted settings-version table. Session lookup does not inspect Business state. |

These parent rows are canonical foundations, not test-only substitutes. The next cycle must not create Membership, capability, settings, credential-provider, verification-challenge, or product tables merely for symmetry. If executable migration review finds an unresolved required field or constraint in either parent, it must stop that affected migration rather than weakening foreign keys. Session implementation tests may seed only the minimum synthetic parent values and must not imply registration or Business bootstrap exists.

## 12. PostgreSQL, Query, and Migration Implications

The future migrations are owned by `@sem-caderno/database-migrations`; the adapter and parameterized query are owned by `@sem-caderno/persistence-postgres`; construction remains in `apps/server`. Migration order is `users`, then `businesses`, then `sessions`, with foreign keys added only after their parents exist. This is the minimum honest starting schema because the repository currently contains no executable tables.

The lookup query must:

- receive digest version, 32 digest bytes, and `evaluatedAt` as parameters;
- select only User ID, absolute expiry, and nullable selected-Business ID needed by the application result;
- join the referenced User and require `disabled_at IS NULL`;
- apply the active predicate in one consistent statement;
- return zero or one row because the digest pair is unique;
- perform no Business or Membership authorization join;
- perform no mutation, expiry extension, cleanup, or implicit revocation;
- avoid a transaction because one read statement has one PostgreSQL statement snapshot and no multi-write invariant.

The adapter maps a row to the application authenticated result and maps zero rows to no active session. It must distinguish query/connection/mapping failure from zero rows. Row types and `pg` errors cannot escape the persistence package.

PostgreSQL 18 documents [`bytea` as binary-octet storage](https://www.postgresql.org/docs/18/datatype-binary.html), [`timestamptz` as an instant-capable timestamp type](https://www.postgresql.org/docs/18/datatype-datetime.html), and multicolumn [unique indexes](https://www.postgresql.org/docs/18/indexes-unique.html). These capabilities support the selected physical representation; they do not define session semantics.

Cycle 018 creates no SQL, migration, schema-history row, repository, connection, container, database, or Testcontainers harness.

## 13. Contracts Impact

The Cycle 016 public contract remains stable:

- anonymous: `{ state: "anonymous" }`;
- authenticated: safe User identifier, absolute UTC `expiresAt`, and optional selected-Business context;
- no raw credential, digest, internal session ID, revocation time, database state, or internal failure reason.

The application model changes internally only by receiving explicit lookup evidence and time and by replacing the no-input port. The existing output and pure server-edge mapper remain valid. No Zod schema, transport error code, API path, cookie schema, or OpenAPI artifact changes in Cycle 018.

## 14. Security Analysis

| Threat | Decision and mitigation | Deferred boundary |
| --- | --- | --- |
| Guessing | 256 CSPRNG bits; fixed canonical format; rate limiting at later HTTP/auth boundaries. | Exact rate policy. |
| Raw credential disclosure | HttpOnly/Secure host-only cookie; transient edge-only handling; no alternate carrier; strict logging prohibition. | Browser integration tests and deployment TLS. |
| Database compromise | Store keyed HMAC digest only; keep HMAC key outside PostgreSQL; raw credential cannot be recovered from the row. | Secret injection/rotation implementation. |
| Credential logging | Raw and digest values excluded from logs, audit, traces, metrics, support, and error detail. | Automated redaction tests. |
| Session replay after browser theft | Server-side revocation and fixed expiry; cookie protection. | Logout/lost-device UI and revocation commands. |
| Session fixation | Server issues only accepted random credentials and browser edge accepts only cookie carriage; rotate after authentication/security-sensitive transitions as ADR 0023 requires. | Issuance and rotation implementation. |
| Revoked/expired reuse | Active predicate excludes revoked and boundary-expired rows on every resolution. | Cleanup/retention. |
| Timing/equality oracle | Database indexes digest equality; public inspection normalizes inactive causes to anonymous. | Abuse monitoring without credential logging. |
| Business authorization confusion | Selected Business is a candidate only; every protected operation performs independent authorization. | Authorization-context implementation. |
| Database failure fail-open | Infrastructure failure propagates and maps to generic internal failure, never anonymous or authenticated. | HTTP mapping. |
| Hidden request state | Explicit input; no AsyncLocalStorage, singleton, mutable global, or service locator. | None for this slice. |
| Internal lifecycle disclosure | Public contract exposes only anonymous/authenticated and expiry for active sessions. | Support tooling requires separate authorization and design. |

The HMAC key protects database-only disclosure better than an unkeyed fast hash. It is not a substitute for cookie confidentiality, TLS, revocation, expiry, or application authorization.

## 15. Privacy Analysis

The minimum row retains a User association, optional Business candidate, digest, and lifecycle timestamps. All are security-sensitive; User/Business association can reveal account relationships even without personal names.

Data minimization rules:

- do not retain IP address, user agent, location, device fingerprint, device label, navigation history, or login history for current-session resolution;
- do not copy session evidence into audit payloads or observability;
- use independent redacted correlation identifiers for operational diagnosis;
- restrict session-row access to the authentication/session adapter and narrowly authorized revocation/support operations;
- include session rows and digest keys in backup protection and restore consistency checks;
- never place the HMAC secret in database backups;
- define retention and expired/revoked cleanup after legal, security, shared-device, incident, and restore requirements are reviewed; Cycle 018 invents no period;
- deletion/anonymization must not reactivate credentials or break required security audit evidence.

No telemetry or tracking field is introduced.

## 16. Architecture and Dependency Direction

```text
browser cookie
  -> apps/server request evidence parser + Node crypto digester
  -> packages/application InspectCurrentSession(input)
  -> packages/application SessionResolutionPort
  <- packages/persistence-postgres adapter using pg
  -> PostgreSQL sem_caderno.sessions + users

packages/application result
  -> apps/server pure mapper
  -> packages/contracts response schema
```

Rules:

- domain depends on none of these outer concerns;
- contracts remains browser-safe and has no first-party dependency;
- application owns the use case, lookup-evidence abstraction, lifecycle semantics, and resolver port, with no Fastify, cookie, crypto, PostgreSQL, or contract type;
- server owns cookie parsing, HMAC derivation, explicit current time capture, composition, and transport mapping;
- persistence implements only the application resolver and owns `pg`, SQL, row mapping, and database-error containment;
- raw credential never crosses from server edge into application or persistence;
- selected Business never turns a session resolver into an authorization resolver;
- no generic repository, request-context, credential-provider, clock, mapper, or DI framework is created.

## 17. Future Validation Responsibilities

The next executable slice must test:

- pure parser acceptance/rejection of the exact credential format;
- deterministic HMAC derivation from synthetic credentials and a synthetic test key;
- absence and malformed evidence short-circuit without persistence;
- explicit fixed `evaluatedAt` propagation;
- application anonymous/authenticated/failure behavior;
- migration bootstrap and all documented constraints against real PostgreSQL 18.4;
- unique lookup, active, revoked, before/equal/after expiry, missing/disabled User, and nullable Business candidate cases;
- parameterized query behavior and zero-or-one cardinality;
- database failure remains failure;
- no Membership/Business authorization implication;
- no raw/digest leakage through outputs, errors, logs, or fixtures;
- existing contract, mapper, architecture, package, server, web, migration-boundary, and aggregate gates.

Real PostgreSQL execution is required before claiming adapter integration. Mocks can prove orchestration but cannot prove schema, query, timestamp, or constraint behavior.

## 18. Alternatives and Revisit Triggers

| Decision | Alternatives rejected/deferred | Risk and mitigation | Revisit trigger |
| --- | --- | --- | --- |
| Explicit input | No-input request context, per-request service construction | More signature plumbing; offsets hidden-state risk. | Only if a demonstrated cross-cutting request context has multiple accepted consumers and isolation tests. |
| HMAC-SHA-256 digest | Raw credential; reversible encryption; unkeyed hash | Secret rotation requires care; version field and explicit future cutover. | Cryptographic guidance changes or incident/rotation requirements. |
| 32 random bytes | Shorter token; structured/JWT token | Cookie length is modest; avoids guessability and client authority. | Browser constraints prove material or platform-issued opaque credentials are accepted. |
| Absolute expiry only | Idle/sliding expiry | Fixed duration may require reauthentication; avoids read writes/races. | Merchant/security evidence requires idle timeout or longer-lived sessions. |
| Candidate Business without joins | Session-time Membership/Business authorization | UI may receive stale candidate; accessible-Business query must validate before use. | A proven operation requires session inspection itself to return only validated active Business and specifies clearing semantics. |
| Minimal session row | Device/IP/history/security metadata | Less incident detail; minimizes privacy and scope. | Accepted threat model or merchant-facing device management requires a specific field. |

Technology or framework version churn alone does not change these semantics. Revisit Node crypto APIs when the Node major changes, PostgreSQL representation when the database major changes, and cookie attributes when browser standards or deployment origin topology change.

## 19. Open Questions and Deliberate Deferrals

Not blockers for the next adapter/migration slice:

- production absolute session duration and matching cookie persistence attributes;
- key rotation/cutover and old-session retirement procedure;
- expired/revoked session retention and cleanup schedule;
- all-device revocation command and index once that command is implemented;
- CSRF token storage, synchronizer exchange, and rotation;
- session issuance, login, logout, recovery, credential provider, and password policy;
- audit event vocabulary for issuance/revocation without bearer material;
- production secret injection and deployment configuration;
- optional merchant-visible device management, which remains outside MVP;
- future non-browser supporting-client authentication profile.

There is no remaining specification blocker for implementing the narrow read migration, explicit application boundary, parser/digester, PostgreSQL adapter, and real integration tests. HTTP route exposure remains a later cycle.

## 20. Overengineering Audit

Concepts accepted because Cycle 017 directly requires them:

- one explicit lookup input to replace hidden current-session state;
- one canonical opaque credential profile;
- one keyed digest profile and version;
- one application resolver port already demanded by the use case;
- one explicit evaluation instant;
- one minimal session row and one unique lookup path.

Rejected or deferred because no current consumer requires them:

- request-context/AsyncLocalStorage framework;
- generic credential, hashing, session-provider, repository, DAO, Unit of Work, transaction, clock, mapper, DI, command-bus, query-bus, or audit framework;
- refresh tokens, session families, key-strategy registries, device intelligence, idle renewal, rotation history, and security metadata;
- Business/Membership authorization joins in session resolution;
- a new public transport shape.

## 21. Implementation Sequence and Next Cycle

Recommended next cycle: **Cycle 019 - Explicit Session Resolution and PostgreSQL Foundation Implementation**.

Recommended task: **Task 001 - Replace the No-Input Session Port and Implement the Minimal Identity/Session Migrations, Adapter, and PostgreSQL Tests**.

Objective: apply this specification by evolving the Cycle 016 application boundary, implementing the server-owned parser/digester without HTTP exposure, creating only the minimum `users`, `businesses`, and `sessions` migration foundation required for referential integrity, adding the parameterized `pg` adapter, and proving active/anonymous/failure behavior against real PostgreSQL 18.4.

Why next: Cycle 018 closes every authority gap that blocked Cycle 017 and identifies the parent-table ordering required by the repository's current empty schema. Implementing the boundary and persistence evidence before adding a route preserves explicit ownership and gives later HTTP work a real, tested session resolver.

Explicit non-goals: no login/logout/issuance, Fastify route or hook, cookie read/write integration, CSRF, authorization engine, Business switching, product workflow/UI, provider, OpenAPI/client generation, mobile, telemetry, CI/deployment, backup implementation, or product/user testing.

## 22. Acceptance Review

- [x] Cycle 017 lookup-identity, digest, lifecycle, time, outcome, User, Business-candidate, and migration-readiness blockers are resolved.
- [x] Explicit request evidence replaces hidden request-global state; the no-input port is scheduled for replacement.
- [x] Raw credential, digest ownership, canonical representation, HMAC profile, and persistence input are explicit.
- [x] Active, revoked, expired, missing, unknown, malformed, unusable-User, and infrastructure-failure outcomes are explicit.
- [x] Fixed absolute expiry, exact comparison, `expiresAt`, and deterministic time ownership are explicit.
- [x] Selected Business remains nullable context and not authorization.
- [x] Every minimum persistence field has a concrete requirement; speculative metadata is excluded.
- [x] Public contracts remain unchanged and free of persistence/security internals.
- [x] Focused security, privacy, PostgreSQL, future-test, alternatives, risk, and overengineering reviews are complete.
- [x] No production code, dependency, lockfile, migration, SQL, database, Fastify behavior, authentication, authorization, UI, provider, mobile, infrastructure, commit, push, branch, or pull request is introduced.

## 23. Cycle 019 Implementation Profile

Cycle 019 implements this specification without changing its semantics or the public transport contract:

- `CurrentSessionStatePort` is removed. Application now owns `SessionLookupKey`, explicit inspection/resolution inputs, and `SessionResolutionPort`; absent evidence short-circuits to anonymous and resolver failure propagates.
- `apps/server` implements the exact version 1 credential parser and domain-separated HMAC-SHA-256 derivation with Node crypto. It has no cookie, Fastify request, route, hook, environment reader, or implicit clock.
- `@sem-caderno/database-migrations` creates only the authorized minimum `users`, `businesses`, and `sessions` tables. The runner owns ordered execution, fail-fast advisory locking, `schema_migrations`, and a SHA-256 checksum ledger.
- `@sem-caderno/persistence-postgres` implements one parameterized lookup over `sessions` and usable `users`. It receives only canonical digest evidence and explicit time, returns selected Business without authorization joins, and contains PostgreSQL failures behind one safe message.
- Real PostgreSQL 18.4 tests migrate from zero and prove the documented constraints, active predicate, expiry equality, revocation, disabled User, nullable/deactivated selected-Business context, and failure boundary.

The implementation deliberately adds no raw-credential column, HMAC-key persistence, idle/renewal state, Membership table, authorization join, generic repository, transaction abstraction, request context, clock service, hashing strategy, route, cookie integration, issuance, login, or logout. The next boundary is server composition for already-extracted optional evidence; credential transport and product behavior remain separate later work.

## 24. Cycle 020 Composition Profile

Cycle 020 implements one internal server composition without changing this specification or the Cycle 016 public contract. Construction receives the server-held HMAC key and an `InspectCurrentSession` use case. It validates and privately copies the key once. Operation input contains only optional already-extracted evidence and the caller-captured evaluation `Date`.

The composition reuses the exact Cycle 019 derivation function. Missing or malformed evidence becomes absent application lookup evidence; `InspectCurrentSession` then returns anonymous without invoking `SessionResolutionPort`. Valid evidence becomes the accepted version 1 lookup key and reaches the application use case with the same `Date` object. The existing server mapper produces the stable transport envelope. The composition neither calls persistence directly nor bypasses application semantics.

There is no catch block. Invalid HMAC configuration fails at construction, and unexpected crypto, application, PostgreSQL, decoding, mapping, or composition failures propagate. No raw credential, HMAC key, lookup digest, persistence state, lifecycle rejection reason, or authorization claim enters the transport result. Selected Business remains optional remembered context only.

No new migration, SQL, column, dependency, lockfile entry, route, cookie parser, hook, middleware, request handler, environment reader, startup wiring, login/logout, issuance, CSRF, authorization, UI, provider, mobile, telemetry, CI, or deployment behavior is added. HTTP extraction and production configuration need a focused specification before exposure.

## 25. Cycle 021 HTTP and Configuration Profile

Cycle 021 closes the deferred HTTP/configuration questions in the separate [HTTP Session Evidence and Configuration Specification](http-session-evidence-configuration-specification.md) without changing this lifecycle model or adding production code.

The future server route reads only production cookie `__Host-sem-caderno-session` or the explicit loopback local profile `sem-caderno-session`. Cookie parsing uses identity decoding, rejects duplicate configured names, and applies no repair. The server executable requires `SEM_CADERNO_SESSION_HMAC_KEY_V1_BASE64URL` as exactly 32 canonical base64url bytes and must fail before listening when configuration is absent or invalid. One `Date` captured at route entry remains the single lifecycle instant.

The route is `GET /api/v1/session`, returns the stable Cycle 016 response with `Cache-Control: no-store`, and emits no cookie, CSRF token, accessible-Business list, or authorization fact. Missing/unusable evidence stays anonymous; infrastructure failures become safe 500 Problem Details. ID05 is a safe read and needs no CSRF token, while all unsafe browser operations retain ADR 0023 protection.

At the Cycle 021 checkpoint, cookie issuance duration, write/clear behavior, key rotation, login/logout, CSRF token lifecycle, authorization, retention, deployment secret management, and production listener configuration remained deliberate later work. Cycle 023 closes only the issuance duration, successful cookie write, and CSRF lifecycle in the following profile; the other items remain deferred.

## 26. Cycle 023 Issuance Profile

Cycle 023 closes the issuance-side authority in the separate [Session Issuance and Sign-In Specification](session-issuance-sign-in-specification.md) without changing current-session resolution. A successful ID04 operation creates a fresh version 1 credential, persists only its existing HMAC lookup representation, and uses one explicit issuance instant to establish a fixed 12-hour absolute expiry. It never adopts the incoming credential and atomically revokes only the prior session represented by the strictly parsed configured cookie.

New sessions start with no selected Business. Independent authenticated CSRF evidence is bound to the new session by a distinct keyed digest and expires with it. The current-session resolver still receives only lookup evidence and `evaluatedAt`; it does not verify passwords, generate evidence, authorize Business access, or return CSRF material. No production issuance, migration, cookie write, or CSRF enforcement is implemented by Cycle 023.
