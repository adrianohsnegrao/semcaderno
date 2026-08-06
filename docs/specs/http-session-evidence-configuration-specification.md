# HTTP Session Evidence and Configuration Specification

## 1. Status, Purpose, Scope, and Authority

- Status: Accepted and implemented by Cycle 022.
- Cycle: 021 - HTTP Session Evidence and Configuration Specification.
- Task: 001 - Define Cookie Extraction, HMAC Secret Loading, Request-Time Capture, and Safe Fastify Session Inspection Exposure.
- Scope: documentation and architecture clarification only.

Cycles 016 through 020 provide a stable current-session response, an application-owned inspection use case and resolver port, version 1 credential digesting, a PostgreSQL-backed resolver, and one internal server composition. This specification closes the HTTP and executable-configuration decisions required to expose that composition safely. It does not implement an HTTP route, cookie parser, configuration reader, listener, login, logout, credential issuance, CSRF token, authorization, or product behavior.

Authority order remains:

1. Accepted product, domain, identity, tenancy, security, privacy, and architecture decisions.
2. [Transport and API Contract Specification](transport-api-contract-specification.md).
3. [Session Credential Resolution and Lifecycle Specification](session-credential-resolution-lifecycle-specification.md) and [ADR 0034](../architecture/decisions/0034-explicit-session-evidence-keyed-digest-resolution.md).
4. Executable Cycle 019 and Cycle 020 source and tests.
5. This specification for the HTTP extraction, configuration, time-capture, Fastify, cache, and public-failure boundary.

If implementation evidence contradicts this authority, the affected implementation must stop. Framework defaults do not silently redefine session or security semantics.

## 2. Verified Checkpoint and Lifecycle Evidence

Repository inspection confirms:

- `apps/server` owns `deriveSessionLookupKey`, the internal current-session composition, and the application-to-transport mapper.
- `@sem-caderno/application` owns `InspectCurrentSession`, `InspectCurrentSessionInput`, `SessionLookupKey`, and `SessionResolutionPort` without Fastify, cookies, crypto, contracts, or PostgreSQL.
- `@sem-caderno/persistence-postgres` owns the parameterized active-session query and row mapping.
- `@sem-caderno/contracts` owns the stable anonymous/authenticated response and Problem Details schema without first-party or Node-only dependencies.
- No Fastify route, hook, middleware, cookie parser, environment reader, listener, login, logout, issuance, authorization, or HTTP error mapper exists.

The real PostgreSQL 18.4 suite proves the lifecycle predicate that HTTP composition must not reinterpret:

- revoked sessions resolve to no active session;
- sessions before or at their absolute expiry resolve to no active session;
- equality between `evaluatedAt` and `expiresAt` is expired;
- a session whose User has non-null `disabled_at` resolves to no active session;
- database failure rejects instead of becoming anonymous.

Cycle 021 adds no lifecycle state and no duplicate lifecycle test requirement at the composition layer.

## 3. Specification-Authority Matrix

| Concern | Authority before Cycle 021 | Cycle 021 decision | Status |
| --- | --- | --- | --- |
| HTTP evidence source | ADR 0023; ADR 0034 | One named value from the incoming HTTP `Cookie` header | Accepted now |
| Cookie ownership | ADRs 0016, 0017, 0034 | Fastify/server HTTP adapter only | Accepted now |
| Production cookie name | ADR 0023 required `__Host-` but deferred exact name | `__Host-sem-caderno-session` | Accepted now |
| Local cookie name | Cycle 011 and Cycle 018 deferred local naming | `sem-caderno-session`, only for isolated loopback local development and tests | Accepted now |
| Cookie profile selection | Executable-boundary configuration allowed by Cycle 014 | Required non-secret `SEM_CADERNO_SESSION_COOKIE_PROFILE`: `production` or `local-development`; tests inject construction values | Accepted now |
| Credential representation | Cycle 018 / ADR 0034 | Exact 46-character `v1.` plus 43-character canonical unpadded base64url value | Already authoritative |
| Missing cookie | Cycle 018 outcome matrix | Anonymous 200; no derivation or persistence | Already authoritative |
| Malformed cookie | Cycle 018/Cycle 020 | Anonymous 200; no persistence; no detail | Already authoritative |
| Duplicate configured cookie | RFC 6265 ambiguity; no earlier rule | Treat as malformed and anonymous; never select first or last | Accepted now |
| Decoding and normalization | Cycle 018 forbids repair | Identity decoding only; no percent decoding, trimming, case change, padding, Unicode normalization, or alternate carrier | Accepted now |
| HMAC key source | ADR 0034 deferred production injection | Required server environment variable `SEM_CADERNO_SESSION_HMAC_KEY_V1_BASE64URL` | Accepted now |
| HMAC key representation | Cycle 018 requires at least 32 bytes | Canonical unpadded base64url encoding of exactly 32 bytes for the first executable profile | Accepted now |
| HMAC startup failure | Cycle 020 construction already fails invalid key | Missing, empty, malformed, non-canonical, or wrong-length configuration prevents server construction/listening | Accepted now |
| Secret rotation | Cycle 018 deferred | No rotation or multiple-key acceptance in the first HTTP slice | Deliberately deferred |
| Request time | ADR 0034 requires one explicit instant | Capture one `Date` at route-handler entry and pass that same value through Cycle 020 | Accepted now |
| Fastify boundary | ADRs 0016/0017; Cycle 011 ID05 | Direct `GET /api/v1/session` route; no authentication hook or generic middleware | Accepted now |
| Cookie parser | Fastify core has no cookie object | Future server dependency on official `@fastify/cookie`, with identity decode and duplicate check against the raw header | Accepted now |
| Composition lifetime | Cycle 020 construction model | One composition per Fastify application instance/process | Directly derivable |
| PostgreSQL adapter lifetime | ADR 0018; Cycle 019 | One adapter over the process-owned pool, supplied through the application port | Directly derivable |
| Success status/body | Cycle 011 ID05; Cycle 016 schema | 200 with unchanged `CurrentSessionInspectionResponse` | Already authoritative |
| Cache behavior | Cycle 011; privacy baseline | `Cache-Control: no-store` on success and Problem Details; no ETag or 304 | Accepted now |
| Public internal failure | Cycle 011 Problem Details | Safe 500 `INTERNAL_FAILURE`; never anonymous; no internal message | Accepted now |
| Correlation evidence | Cycle 011 requires an opaque independent ID | Server-generated Fastify request ID using Node `randomUUID`; never accept cookie/session evidence as correlation | Accepted now |
| CSRF | ADR 0023; Cycle 011 | No CSRF token required for read-only ID05; unsafe operations retain full CSRF requirements | Accepted now |
| Selected Business | ADR 0012; Cycles 016-020 | Optional remembered context only; no authorization or accessible-Business claim | Already authoritative |
| HTTP integration tests | Test strategy; Cycle 019 Testcontainers | Fastify injection plus one focused real PostgreSQL 18.4 route-composition path owned by server integration tests | Accepted now |

No matrix item blocks the next narrow HTTP implementation slice.

## 4. HTTP Session-Evidence Boundary

The only browser session-evidence carrier is the configured session cookie in the incoming `Cookie` header. The Fastify HTTP adapter owns:

- reading the raw header;
- identifying zero, one, or multiple occurrences of the configured cookie name;
- parsing cookie syntax without changing the credential value;
- classifying missing, malformed, and duplicate evidence;
- capturing the operation instant;
- calling the existing Cycle 020 composition;
- selecting the HTTP status, content type, cache headers, and safe error body.

Raw credential evidence may be passed only from this adapter to the existing Cycle 020 composition. It must not enter request decoration shared with unrelated routes, application models, persistence, contracts, domain code, logs, metrics, traces, audit records, support references, error messages, or response fields.

No fallback carrier is accepted. The route must ignore and never authenticate from query parameters, path parameters, JSON bodies, form bodies, `Authorization`, custom session headers, local storage, or session storage.

## 5. Cookie Profile

### 5.1 Names and attributes

| Profile | Exact name | Transport conditions | Issuance attributes when issuance is later implemented |
| --- | --- | --- | --- |
| Production | `__Host-sem-caderno-session` | Same public origin; HTTPS required | Host-only; `Secure`; `HttpOnly`; `SameSite=Lax`; `Path=/`; no `Domain` |
| Local development | `sem-caderno-session` | Explicitly isolated loopback HTTP development only | `HttpOnly`; `SameSite=Lax`; `Path=/`; no `Domain`; `Secure` when local TLS is used |

`SEM_CADERNO_SESSION_COOKIE_PROFILE` is a required server-only, non-secret configuration value with exactly `production` or `local-development`. It selects one fixed cookie name; arbitrary names are not configurable. Tests pass the selected name directly and do not mutate the process environment.

The local profile must never be accepted for a non-loopback or production listener. Listener and reverse-proxy deployment checks remain deployment work, but the future server startup must not silently default to the local profile.

Cycle 021 does not define `Max-Age`, `Expires`, issuance duration, write, clear, renewal, or rotation behavior. Those attributes must match the later accepted absolute session duration and login/logout behavior. Inspection never emits `Set-Cookie`.

### 5.2 Exact value and parsing

The configured cookie value must be exactly the existing version 1 evidence:

```text
v1.<43 canonical unpadded base64url characters>
```

The complete value is 46 ASCII characters and decodes to exactly 32 credential bytes after the literal `v1.` marker. Parsing rules are:

- no percent decoding;
- no URL decoding;
- no whitespace trimming inside or around the extracted value;
- no quote removal;
- no case conversion;
- no Unicode normalization;
- no padding repair;
- no conversion through JSON, hexadecimal, standard base64, or another encoding;
- no acceptance of another version.

Normal cookie-pair separators and optional HTTP whitespace are handled only to locate cookie pairs. They do not modify the value presented to the existing derivation function.

The future implementation uses the official [`@fastify/cookie`](https://github.com/fastify/fastify-cookie) integration because Fastify core does not expose parsed cookies. The plugin must be registered before the route, with identity decoding instead of its dependency's default percent-decoding behavior. Its cookie-signing feature is not used: Sem Caderno's opaque credential and HMAC lookup construction remain the only session identity profile.

The adapter must inspect the raw `Cookie` header for duplicate occurrences of the configured name before relying on the parsed object. RFC 6265 warns servers not to rely on ordering when same-name cookies appear. Zero occurrences is missing. Exactly one may proceed. More than one is malformed/ambiguous and normalizes to anonymous without derivation or persistence. Duplicate unrelated cookie names do not create session authority.

An HTTP header rejected by Node/Fastify before route dispatch, including an over-limit header, remains an HTTP parsing failure. The route adds no custom large-header policy and never tries to repair it.

## 6. HMAC Secret Configuration

The version 1 lookup HMAC key is loaded only by the server executable/configuration edge from:

```text
SEM_CADERNO_SESSION_HMAC_KEY_V1_BASE64URL
```

The value has no default. The first executable profile requires exactly 43 canonical unpadded base64url characters decoding to exactly 32 bytes. Validation must decode, verify byte length, re-encode, and require byte-for-byte equality with the supplied representation. Whitespace, padding, alternate base64 alphabets, empty strings, and extra bytes are rejected rather than repaired.

Startup order is:

1. read the two session configuration variables once;
2. validate the cookie profile and derive its fixed cookie name;
3. decode and validate the HMAC key;
4. construct the PostgreSQL adapter, application use case, Cycle 020 composition, Fastify application, and route;
5. listen only after all construction succeeds.

Missing or invalid configuration throws a server-configuration error before listening and causes the executable to exit non-zero. It must never yield an anonymous session response, a production fallback key, a generated replacement key, or a partially constructed server. The error may identify the configuration variable and validation category but must not contain its value, decoded bytes, length-derived material beyond the public required shape, or a digest.

The decoded key remains an in-memory server-owned `Uint8Array` supplied only at composition construction. It is not an operation input, Fastify request decoration, application dependency, contract field, persistence value, database column, client bundle value, log field, or public export. Cycle 020 copies it again into the composition closure.

The implementation should use one direct server-local parser, not Zod from the contracts package and not a generic configuration framework. Tests inject a synthetic environment map and synthetic key. Secret-manager integration, production injection mechanics, key rotation, dual-key lookup, rekeying, and incident cutover remain deliberately deferred.

## 7. Request-Time Semantics

The `GET /api/v1/session` handler captures exactly one operation instant at handler entry using one explicit `new Date()` call. That `Date` is supplied unchanged as `evaluatedAt` to the Cycle 020 composition and then to application and persistence.

The route must not call `Date.now()` or construct another current `Date`; the composition, application, and persistence boundaries retain their existing prohibition on ambient time. SQL must not use `now()` or `CURRENT_TIMESTAMP` for lifecycle evaluation. Equality with `expiresAt` remains expired because the persistence predicate is `evaluatedAt < expiresAt`.

The route does not need a clock interface. Future tests use Vitest's existing fake-time support to fix system time, assert one captured value reaches the resolver, and verify that input `Date` values are not mutated.

## 8. Fastify Exposure

The future HTTP operation is:

| Concern | Decision |
| --- | --- |
| Method | `GET` |
| Path | `/api/v1/session` |
| Request body | None; a supplied body has no contract authority |
| Query/path parameters | None |
| Success | 200 `application/json` with the unchanged Cycle 016 response |
| Cache | `Cache-Control: no-store`; no ETag, conditional response, or 304 |
| Cookie writes | None |
| CSRF | Not required for this safe read |

Use one direct operation-specific route registered in `apps/server`. Do not introduce an authentication hook, session middleware, request context, decorator, handler framework, or generic pipeline. The cookie parser may use its maintained Fastify plugin hook, but session classification and composition invocation remain inside the ID05 route boundary.

Construction ownership is:

```text
server executable/configuration edge
  -> process-owned PostgreSQL Pool
  -> PostgresSessionResolutionAdapter
  -> InspectCurrentSession
  -> Cycle 020 current-session composition with server HMAC key
  -> Fastify application and GET /api/v1/session registration
```

The pool, adapter, use case, composition, and validated configuration are constructed once per Fastify application/process. Only extracted optional evidence and the captured `Date` are request-scoped. The route receives the existing composition rather than a raw Pool, SQL client, migration runner, environment map, or HMAC string.

`buildApp` may evolve to accept this narrow route dependency. It must not load environment variables, open a database connection, or listen at import time. A production process entrypoint may perform the explicit construction above in the implementation cycle, but deployment-provider and listener configuration remain outside Cycle 021.

## 9. Outcomes and Public Failure Behavior

| Condition | Persistence call | Public result |
| --- | --- | --- |
| Cookie absent | No | 200 anonymous response |
| Cookie duplicate or malformed | No | 200 anonymous response |
| Canonical but unknown evidence | Yes | 200 anonymous response |
| Revoked session | Yes | 200 anonymous response |
| Expired or equal-expiry session | Yes | 200 anonymous response |
| Disabled or missing User | Yes | 200 anonymous response |
| Active usable session | Yes | 200 authenticated response |
| Invalid/missing startup configuration | Server does not listen | No HTTP response; startup failure |
| Crypto/application/PostgreSQL/decoding/mapping/unexpected failure | Attempt may have begun | 500 safe Problem Details |

The future Fastify error boundary maps unexpected ID05 execution failures to the existing Problem Details contract without checking error-message text and without exposing internal data:

```text
type: about:blank
title: Internal failure
status: 500
code: INTERNAL_FAILURE
detail: The request could not be completed.
correlationId: server-generated request correlation value
retry: afterDelay
commitState: notApplicable
freshStateRequired: false
```

The response media type is `application/problem+json` and also carries `Cache-Control: no-store`. It contains no `violations`. The correlation value is a server-generated Node `randomUUID` captured by Fastify request-ID configuration; incoming correlation values are not trusted in this first slice. No correlation response header is introduced in Cycle 021.

Fastify's default error shape is not permitted because it can expose implementation messages and does not match the accepted contract. A narrow safe error handler may map uncategorized route failures to the body above. It must not convert any unexpected failure to anonymous, and operational logging must exclude request headers, cookie values, HMAC material, digests, SQL, connection strings, rows, and exception fields that contain sensitive input.

## 10. Stable Public Contract and Business Context

The Cycle 016 body remains unchanged:

- anonymous: `{ "data": { "state": "anonymous" } }`;
- authenticated: `data.state`, `data.userId`, and `data.expiresAt`;
- selected Business, when present: `data.selectedBusiness.businessId`;
- no body version marker, CSRF token, cookie, digest, lookup version, internal session ID, revocation detail, database field, role, Membership, capability, Business lifecycle, or authorization claim.

ID05 inspects identity/session state. It does not return an accessible-Business list. ID10 remains the authoritative operation for current accessible Businesses, and protected tenant operations continue to revalidate current User, verified identity where required, Business, Membership, capability, lifecycle, and same-Business references.

`selectedBusiness` is remembered navigation context only. Returning it does not prove Business existence, active state, Membership, capability, ownership, or tenant access.

## 11. CSRF Assessment

ID05 is a safe, read-only `GET`. It performs no session renewal, last-active update, cookie write, Business selection, authorization mutation, or domain mutation. It therefore does not require a synchronizer CSRF token, Origin validation, or a custom CSRF header merely to inspect the session.

This does not weaken ADR 0023:

- login and credential issuance remain unsafe/pre-authentication flows requiring the accepted Origin-validated bootstrap design;
- logout and revocation are state-changing operations and require their separately specified protection;
- every unsafe authenticated browser operation still requires the session-bound synchronizer token, allowed Origin or safe Referer evidence, and Fetch Metadata defense in depth;
- SameSite remains defense in depth and never replaces CSRF controls for unsafe operations;
- `GET` must never be used to issue, renew, revoke, switch Business, or perform another state change.

Cycle 011 ID05 wording that mentioned a returned CSRF token is refined by the later stable Cycle 016 contract: ID05 returns no CSRF token. ID00 owns pre-session CSRF bootstrap, while authenticated CSRF token issuance/rotation remains for the later login/session-issuance specification and implementation.

## 12. Architecture and Dependency Direction

```text
HTTP Cookie header
  -> apps/server exact cookie extraction and one request-time capture
  -> existing apps/server Cycle 020 composition with server-held HMAC key
  -> packages/application InspectCurrentSession
  -> packages/application SessionResolutionPort
  <- packages/persistence-postgres PostgresSessionResolutionAdapter
  -> PostgreSQL

application result
  -> existing apps/server mapper
  -> packages/contracts response
  -> Fastify HTTP response
```

Rules:

- domain remains independent;
- contracts remains browser-safe and has no first-party or Node dependency;
- application receives only optional `SessionLookupKey` and explicit `evaluatedAt`;
- persistence receives only lookup key and time and knows nothing about Fastify/cookies;
- server owns HTTP, cookie name/parsing, raw evidence, HMAC key/configuration, request time, composition, transport mapping, cache headers, and public error translation;
- web receives only the stable public contract and never the session cookie value;
- no environment read or database connection occurs at module import;
- no hidden request-global state, AsyncLocalStorage, service locator, or dependency cycle is authorized.

The server runtime dependency on `@fastify/cookie` 11.1.2 is operation-edge infrastructure. Cycle 022 reverified and installed that exact version. Because the package's 11.1.2 declaration types `parseOptions` as serialization options even though the documented runtime API accepts `decode`, the implementation uses one narrow public-type intersection rather than disabling identity decoding or weakening TypeScript.

## 13. Security Review

| Threat | Required mitigation | Deferred boundary |
| --- | --- | --- |
| Raw credential disclosure | Read only configured cookie; identity decode; immediate Cycle 020 derivation; no logs/errors/response | Browser/deployment verification |
| Cookie tossing or duplicate ambiguity | Production `__Host-` name, host-only issuance, raw-header duplicate rejection | Issuance implementation |
| Percent/normalization confusion | Identity decode and exact existing 46-character parser; no repair | None |
| Cookie theft/replay | Secure/HttpOnly/SameSite plus server revocation and fixed expiry | TLS deployment, issuance, logout, abuse controls |
| HMAC key disclosure | Server-only environment load; strict decode; no default/log/client/database | Secret manager and rotation |
| Missing/invalid key fail-open | Startup fails before listen | None |
| Session-state oracle | Missing, malformed, unknown, revoked, expired, and unusable User share anonymous 200 | Abuse/rate policy |
| Database or crypto failure fail-open | Safe 500; never anonymous | Operational alerting |
| Public diagnostic leakage | Allow-listed Problem Details; generic detail; independent correlation ID | Correlation header and support tooling |
| Cache disclosure | `Cache-Control: no-store`; no ETag/304 | Deployment cache verification |
| Hidden request context | Direct handler input and explicit `Date`; no global/ALS context | None |
| Selected Business authorization confusion | Candidate-only wording and no authorization join | Protected-operation authorization |

The specification does not claim resistance to stolen-cookie replay beyond HTTPS/cookie controls, server revocation, expiry, and future abuse protections. It does not claim login, session fixation rotation, logout, or CSRF token implementation.

## 14. Privacy Review

Session inspection remains data-minimal. The route reads one cookie and returns only the existing safe identity/session context. It creates no persistence and authorizes no new retained data.

The future HTTP boundary must not collect or persist IP address, user agent, device name, fingerprint, geolocation, request history, navigation history, login history, behavioral telemetry, arbitrary metadata, raw credentials, or authorization caches. Fastify request objects and headers are not audit payloads. Session digests and User/Business associations remain security-sensitive even though they are not bearer credentials.

No analytics, telemetry, or provider integration is authorized.

## 15. Implemented Test Boundary

### 15.1 Configuration and extraction unit tests

Tests must prove:

- both fixed cookie profiles and rejection of unknown/missing profiles;
- canonical HMAC configuration decoding and rejection of missing, empty, padded, non-base64url, non-canonical, short, or long values;
- no error includes the supplied key;
- no percent decoding, whitespace repair, quote removal, padding repair, or alternate carrier;
- missing configured cookie, one canonical cookie, malformed configured cookie, and duplicate configured cookie;
- unrelated cookies do not become session evidence;
- duplicate configured evidence never invokes Cycle 020 or persistence.

### 15.2 Fastify route tests

Fastify injection tests owned by `apps/server` must prove:

- 200 anonymous for missing, malformed, duplicate, unknown, inactive, and disabled-User outcomes without exposing reason;
- 200 authenticated with and without selected Business context;
- one captured fixed `evaluatedAt` reaches composition unchanged;
- no input mutation;
- `application/json` success, `application/problem+json` failure, and `Cache-Control: no-store` on both;
- no `Set-Cookie`, ETag, digest, raw evidence, secret, SQL, or internal exception detail;
- configuration failures prevent application construction;
- crypto, application, persistence, decoding, and mapping failures become the safe `INTERNAL_FAILURE` body, never anonymous;
- request correlation is independent of cookie evidence;
- request/header logging is disabled or redacted for the route.

Vitest fake timers provide deterministic request time. No generic clock or mocking framework is needed.

### 15.3 Focused real PostgreSQL HTTP path

One focused server integration test should prove:

```text
Fastify Cookie header
  -> Cycle 020 composition
  -> application
  -> real PostgreSQL 18.4
  -> stable HTTP response
```

The test belongs under `apps/server/test` because that package owns the outer composition. It may use the already accepted exact `pg`, `@types/pg`, and `@testcontainers/postgresql` versions as server test-only dependencies after manifest/architecture review. It must apply the real migrations, insert synthetic parent/session rows, derive the stored digest from the same synthetic evidence, prove one active authenticated response, one unknown anonymous response, one inactive anonymous response, and one closed-pool 500 response, then close Fastify, Pool, and container.

This test does not replace the 12-case persistence lifecycle suite and does not duplicate its complete matrix. Cycle 022 executes this path against PostgreSQL 18.4 and cleans the Fastify application, Pool, container, and synthetic data.

## 16. Alternatives, Risks, and Revisit Triggers

| Decision | Alternative rejected or deferred | Reason and revisit trigger |
| --- | --- | --- |
| Direct ID05 route | Generic auth middleware or session provider | Anonymous inspection is operation-specific; revisit only after multiple accepted HTTP operations prove one identical edge contract |
| Official cookie parser plus narrow duplicate check | Handwritten general cookie parser | Maintained parsing reduces protocol risk; raw duplicate check preserves strict security semantics |
| Identity decode | Default percent decode | Accepted credential has one canonical representation; no alternate encoding is needed |
| Two fixed cookie profiles | Arbitrary configured names | Fixed names reduce ambiguity and preserve `__Host-` production guarantees |
| Environment-loaded base64url key | Plaintext default, file/provider framework | Smallest current executable config; revisit for production secret manager and rotation |
| Exactly 32-byte first key | Variable-length first profile | Meets the accepted minimum with one testable canonical representation; revisit only with rotation/cryptographic review |
| One route-entry `Date` | Clock interface or hidden ambient time | Deterministic with fake timers and explicit inward propagation |
| Safe generic 500 | Default Fastify error body or anonymous fallback | Preserves contract and fail-closed behavior |
| `about:blank` problem type | Deployment-specific documentation host | Avoids inventing a public domain; revisit when stable public problem documentation exists |

## 17. Deliberate Deferrals and Non-Goals

Not blockers for the next route implementation:

- login, logout, registration, password, verification, recovery, credential issuance, renewal, and rotation;
- absolute session duration and matching cookie `Max-Age`/`Expires`;
- HMAC key rotation, dual-version cutover, secret-manager provider, and incident procedure;
- session retention and cleanup;
- CSRF token generation, storage, delivery, rotation, and unsafe-operation checks;
- Origin/Referer and Fetch Metadata implementation for unsafe operations;
- Business switching, Membership/capability authorization, and protected tenant routes;
- rate limiting and abuse policy;
- correlation response-header spelling and public problem-documentation hosting;
- reverse-proxy, TLS, listener, production database URL, deployment, telemetry, and operational logging configuration;
- product API/UI, mobile, providers, OpenAPI, generated clients, CI, backup, browser journeys, accessibility conformance, and merchant user testing.

## 18. Overengineering Audit

Concepts accepted because the next HTTP slice requires them now:

- two fixed cookie names selected by one narrow profile;
- one exact server-only HMAC environment value;
- one operation-specific cookie extraction function;
- one direct Fastify route;
- one safe server error mapping;
- one handler-entry time capture;
- one focused HTTP/PostgreSQL integration test.

Rejected because no current consumer requires them:

- generic authentication/session provider;
- request-context or AsyncLocalStorage framework;
- DI container, service locator, handler framework, or middleware pipeline;
- generic configuration framework or secret-provider interface;
- signed-cookie layer in addition to the accepted HMAC lookup design;
- hash strategy registry, generic clock, result monad, or error registry;
- generic repository, Unit of Work, transaction framework, policy engine, event bus, or audit framework;
- refresh tokens, session families, alternate credential carriers, device tracking, or telemetry.

## 19. Implemented Slice

Implemented cycle: **Cycle 022 - Fastify Current-Session HTTP Exposure**.

Implemented task: **Task 001 - Implement Strict Cookie Evidence Extraction, Server Session Configuration, and the Current-Session Route**.

Result: the exact server-local configuration parser, strict cookie extraction, one request-time capture, direct `GET /api/v1/session` route, safe cache/error behavior, Fastify injection tests, and focused real PostgreSQL HTTP composition test reuse all Cycle 020 boundaries.

The implementation provides executable evidence for the credential transport and failure boundary without adding login, issuance, authorization, or product behavior.

Explicit non-goals: no credential issuance, login/logout, CSRF token implementation, authorization/Membership, Business switching, product API/UI, mobile, provider, OpenAPI generation, telemetry, CI/deployment, backup, browser journey, accessibility conformance, or merchant user testing.

## 20. Acceptance Review

- [x] Cycles 010-020 and the Cycle 020 lifecycle evidence gate are verified.
- [x] HTTP evidence, exact cookie names, strict parsing, duplicate behavior, and missing/malformed outcomes are explicit.
- [x] Server-only HMAC loading, representation, validation, startup failure, and rotation deferral are explicit.
- [x] One request-time capture and deterministic testing are explicit.
- [x] Fastify route, construction lifetime, status, body, cache, and failure behavior are explicit.
- [x] The Cycle 016 public contract remains stable and selected Business remains non-authorizing context.
- [x] ID05 CSRF/access-context wording is reconciled without weakening unsafe-operation CSRF requirements.
- [x] Future unit, Fastify, and real PostgreSQL HTTP test ownership is explicit.
- [x] Security, privacy, alternatives, risks, deferrals, and overengineering are reviewed.
- [x] No production code, dependency, lockfile, migration, SQL, database, route, cookie, authentication, authorization, product behavior, commit, push, branch, or pull request is introduced.
