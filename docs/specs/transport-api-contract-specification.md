# Transport and API Contract Specification

## 1. Status, Purpose, Scope, and Authority

- Status: Accepted for planning.
- Cycle: 011 - Transport/API Contract Specification.
- Task: 001 - Map Application Contracts to Versioned Transport, Session, Error, and Idempotency Semantics.
- Scope: documentation-only logical transport contract.
- Technical evidence verified: 2026-08-01.

Transport specification is now appropriate because Cycle 007 defines application intent, Cycles 008 and 009 define presentation and recovery states, and Cycle 010 selects a separately deployable Next.js presentation and authoritative Fastify server. The transport can therefore be fixed without allowing framework defaults or physical persistence to define business behavior.

Authority order:

1. Accepted product scope and ADRs define product, tenancy, financial, security, and architecture decisions.
2. Domain, onboarding, persistence, journey, and logical-model specifications define invariants and canonical facts.
3. [Application Contracts](application-contracts.md) defines commands, queries, authorization, errors, idempotency, and outcomes.
4. [Critical Journey UX](critical-journey-ux-flow.md) and [Low-Fidelity Interaction](low-fidelity-interaction-screen-state-spec.md) define merchant meaning and client states.
5. [Implementation Architecture](implementation-architecture-technology-selection.md) defines the Next.js/Fastify/TypeScript boundary.
6. This specification maps those meanings to HTTP and JSON. If it conflicts with an earlier accepted semantic rule, the earlier rule wins and this contract must be corrected.

This cycle decides transport style, namespace, versioning, serialization, logical route families, methods, status semantics, session and CSRF carriage, Business context, errors, idempotency, recovery, concurrency preconditions, pagination, freshness, caching, and contract governance. It does not implement routes or schemas and does not define physical identifiers, database structures, SQL, transactions, providers, deployment, or UI.

Transport acceptance never makes client input authoritative. DTOs describe untrusted intent; Fastify constructs current authorization context and calls the authoritative application boundary.

## 2. Transport Architectural Principles

| Principle | Transport consequence | Repository authority |
| --- | --- | --- |
| Server authority | Fastify recalculates and revalidates before commit; Next.js displays previews | Application Contracts; ADRs 0016/0017 |
| Explicit tenant intent | Every tenant operation includes Business path scope; path scope is not authorization | ADRs 0006/0012/0013/0024 |
| Current authorization | Session, User, Business, Membership, state, and capability are checked per operation | Domain and Tenancy; Application Contracts |
| Financial exactness | Money is an exact base-10 integer minor-unit string plus `BRL`, never binary floating point | ADR 0005 |
| Date integrity | UTC instant, Business-local date, and applicable IANA time zone are separate values | ADR 0009 |
| Duplicate safety | Required command keys are scoped to authorized actor, Business, operation, and equivalent intent | Application Contracts; ADR 0025 |
| Unknown is not failure | Lost responses enter outcome recovery; only authoritative no-commit enables resubmission | Cycles 007-009; ADR 0025 |
| Historical preservation | Correction uses cancellation, reversal, or replacement operations, not destructive updates | ADR 0008 |
| Canonical authority | Detail and commit results identify canonical facts; projections carry freshness metadata | ADR 0014 |
| External independence | Delivery attempts are post-commit, provider-neutral, and never prove Payment | ADRs 0004/0015 |
| Stable errors | Machine codes are stable and separated from tested Brazilian Portuguese copy | Cycles 007-009; ADR 0022 |
| Least disclosure | Input and output schemas allow only necessary properties and hide cross-Business existence | Privacy specification; OWASP API guidance |
| Client compatibility | Web and supporting mobile semantics are the same, without adding mobile mutations | ADRs 0003/0021 |

## 3. Transport Style and Protocol Selection

### 3.1 Selected approach

Use HTTPS with a deliberately hybrid JSON/HTTP contract:

- Resource-oriented `GET` operations read canonical detail or projection-backed collections.
- `POST` creates resources and explicit command subresources for financial, lifecycle, delivery, and recovery intent.
- `PUT` replaces the selected active-Business session context.
- Conditional `PATCH` is limited to accepted descriptive/current-state edits that do not rewrite financial history.
- Financial records do not expose ordinary `DELETE`; cancellation, reversal, and replacement are named operations.
- Next.js Server Actions may orchestrate presentation but are not the canonical server contract.

This fits separate Next.js and Fastify deployables, preserves standard HTTP method meaning, exposes explicit financial commands, and remains usable by future supporting clients. Resource-only CRUD was rejected because it obscures correction and recovery. RPC-only JSON was not selected because canonical resources and list semantics remain useful. GraphQL and framework-only actions add complexity or client coupling without an accepted requirement.

[RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html) defines HTTP method and status semantics. [ADR 0022](../architecture/decisions/0022-versioned-json-http-explicit-commands.md) records the durable choice.

### 3.2 Trust boundaries

```text
Browser / future client
  -> untrusted HTTP + JSON + cookies/headers
Fastify transport adapter
  -> shape validation, session resolution, CSRF, Business context
Authoritative application boundary
  -> authorization, domain validation, recalculation, idempotency, transaction intent
Ports and adapters
  -> PostgreSQL, projections, audit, delivery, telemetry
```

Transport adapters may translate but never reproduce or bypass domain rules.

## 4. API Namespace, Versioning, and Compatibility

- Canonical initial namespace: `/api/v1`.
- The path version is the Sem Caderno transport major version, not a framework or deployment version.
- Compatible `v1` changes may add optional response properties, operations, error metadata, filters, or enum values only when consumers have a documented unknown-value behavior.
- Breaking changes include removing/renaming fields or operations, changing meaning or requiredness, narrowing accepted input, changing money/date semantics, changing an error's recovery meaning, or making a previously optional field required.
- Breaking changes require a new major namespace and a migration/deprecation plan.
- Clients must ignore unknown response object properties. They must not silently map an unknown enum to a known financial or authorization state; they show a safe unknown state or require upgrade.
- Unknown request properties are rejected for commands and security-sensitive queries. Missing required properties are validation failures. Optional properties are omitted, not fabricated.
- Error codes and command outcome meanings are stable within `v1`.
- Deprecation must identify replacement, consumer impact, final support date, security implications, and in-progress command/recovery behavior.
- Provider-specific extensions remain behind adapters and do not enter `/api/v1` without accepted product responsibility.

OpenAPI 3.2 is the future machine-readable wire description because it is the current published OpenAPI release on the verification date. The application contracts remain semantic authority, and no generator is selected. See the [OpenAPI 3.2 specification](https://spec.openapis.org/oas/v3.2.0.html).

## 5. Serialization Conventions

| Concern | `v1` rule |
| --- | --- |
| Media type | Success and command outcomes use `application/json`; rejections use `application/problem+json` |
| Property names | Lower camel case; stable codes use upper snake case |
| Objects | Explicit allow-list; unknown command properties rejected |
| Required/optional | Required means present; optional means omitted when absent |
| Null | Used only when the contract distinguishes explicit clearing from omission; never a default absence marker |
| Collections | Present as arrays; valid empty result is `[]`, not `null` |
| Boolean | JSON `true`/`false`; no numeric or textual substitutes |
| Identifiers | Opaque JSON strings with no transport promise about UUID, ULID, sequence, or physical form |
| Money | Base-10 integer minor units serialized as a string, for example `"2500"`, plus currency code `"BRL"`; no decimal or binary floating-point authority |
| Quantity | JSON integer for release-one whole-unit quantity; fractional representation is deferred |
| Instants | RFC 3339 UTC string with `Z`, for example `2026-08-01T14:30:00Z` |
| Operational date | `YYYY-MM-DD`, interpreted in returned/validated Business time-zone context |
| Time zone | IANA zone identifier such as `America/Manaus`; offset alone does not replace zone rules |
| Duration | ISO 8601 duration only when a future accepted contract needs one; expiry normally uses an instant |
| Enums | Stable ASCII codes plus separate display labels when needed; unknown codes fail safe |
| Text | Unicode; normalized and bounded at the boundary; merchant text remains Brazilian Portuguese |
| Email/phone | Strings normalized according to the identity/contact contract; Customer values remain optional and non-unique |
| Historical state | Lifecycle code plus safe timestamps/references; current edits never rewrite snapshots |
| Secrets | Omitted after one-time use; never redacted placeholders that imply retrievability |

RFC 3339 provides interoperable timestamps; RFC 9557 explains why named time-zone rules carry information not supplied by an offset. The API keeps the repository's three separate concepts rather than embedding historical policy in one timestamp. See [RFC 3339](https://www.rfc-editor.org/rfc/rfc3339.html) and [RFC 9557](https://www.rfc-editor.org/rfc/rfc9557.html).

### 5.1 Success envelopes

Single-resource/query responses use:

```text
data: logical resource or result
meta: optional pagination, freshness, authorization-safe context, or command metadata
```

Collection responses use `data: []` and `meta.page`. Command results include `meta.command` with `outcome`, `replayed`, and recovery eligibility. Envelope names are logical wire fields, not persistence fields.

## 6. Identity, Authentication, and Session Transport

### 6.1 Public origin and session cookie

Next.js and Fastify remain separately deployable but are exposed through one public origin. The browser accesses `/api/v1` from that origin. Credentialed cross-origin browser access is not enabled by default.

The authenticated browser carries only an opaque session identifier in a host-only production cookie:

- name uses a `__Host-` prefix;
- `Secure`, `HttpOnly`, `SameSite=Lax`, and `Path=/` are mandatory;
- no `Domain` attribute;
- TLS is mandatory outside explicitly isolated local development;
- session material is never placed in URLs, JSON bodies, local storage, or session storage;
- authentication and sensitive transitions rotate session evidence;
- session inspection returns safe User/session facts, never the identifier.

OWASP recommends Secure and HttpOnly cookies, warns against browser storage for session identifiers, and treats SameSite as defense in depth. See the [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

### 6.2 CSRF

Every unsafe authenticated browser operation requires:

1. valid opaque session cookie;
2. session-bound synchronizer CSRF token in `X-CSRF-Token`;
3. allowed `Origin`, or strictly validated `Referer` only when Origin is unavailable;
4. safe Fetch Metadata policy where supported;
5. a non-safe HTTP method for every state change.

Pre-authentication registration, verification, sign-in, and recovery requests use an Origin-validated pre-session CSRF bootstrap token; they do not require an authenticated session. `GET /api/v1/session-bootstrap` returns only that short-lived browser token and safe public contract metadata and performs no domain mutation.

CSRF tokens are kept only in ephemeral client state, rotated with session transitions, omitted from logs, and never accepted in a URL. SameSite alone is insufficient. See the [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

### 6.3 Identity/session operation family

Registration, verification initiation/completion, sign-in, current-session inspection, current-device sign-out, other-session revocation, and accepted recovery operations are global. Responses resist account enumeration. Session invalidation returns no Business detail and clears client Business state. Exact credential method, provider, timeout, physical session store, and one-time-secret format remain deferred.

Authentication proves global User identity. It never embeds authoritative Membership, capability, or Business state. Current tenant authorization is reconstructed for every tenant operation.

## 7. Active Business Context Transport

Tenant-owned operations use `/api/v1/businesses/{businessId}/...`. The identifier expresses intended scope only.

For every request Fastify must:

1. resolve the current session and User;
2. resolve the path Business within authorized scope;
3. require active Business and active Membership;
4. derive current capabilities server-side;
5. resolve all child identifiers inside the same Business;
6. return non-disclosing absence/denial when a more precise response would leak existence.

`PUT /api/v1/session/active-business` replaces the remembered candidate after validation. One accessible Business may be selected automatically only after this operation or equivalent server validation. Multiple Businesses require a valid remembered or explicit choice. The client must remove old Business data before selection and before loading the new path. Tenant responses are `no-store` by default, preventing browser history or caches from reintroducing old data.

Business inactivity, Membership suspension/removal, and capability loss override cached UI state. Last-active-Owner protection is returned only after authoritative invariant validation and is never a client-only rule. [ADR 0024](../architecture/decisions/0024-business-context-in-tenant-paths.md) records this carriage decision.

## 8. Command Contract Model

### 8.1 Command request

An authoritative command consists conceptually of:

- authenticated actor from session, never payload;
- Business path where tenant-owned;
- operation identity from route/method;
- `Idempotency-Key` where required;
- CSRF evidence for browser unsafe requests;
- explicit allowed intent payload;
- optional `If-Match` precondition when the command is based on a previously read mutable resource;
- optional preview facts used only to detect recalculation disagreement, never as authority.

The server derives capability, actor, recorded-at instant, Business ownership, lifecycle, totals, status, allocation, audit context, and idempotency scope.

### 8.2 Command result phases

| Phase | Transport meaning |
| --- | --- |
| Local preparation | No API authority; client preserves input |
| Review | Presentation state; an optional query does not reserve or authorize future commit |
| Confirmation | One explicit unsafe request with required idempotency and preconditions |
| Committing | Client has dispatched; duplicate activation withheld |
| Committed | `201` for first creation or `200` for non-creation command with canonical result |
| Safe replay | `200`, original result, `meta.command.replayed=true`; no new facts |
| Confirmed rejection | Stable 4xx Problem Details; `commitState=notCommitted` |
| Conflict | `409` or `412`; fresh state required; no rejected-command commit |
| Unknown | No response, interrupted response, or explicit `202` unknown result; commit may exist |
| Recovery | Dedicated outcome resolver returns committed, rejected, no-commit, or still unknown |
| Safe resubmission | Available only after authoritative `notCommitted` recovery |

Authoritative financial confirmation recalculates totals and revalidates User, Business, Membership, capability, records, lifecycle, and concurrency inside the application boundary. A preview never reserves state.

## 9. Query Contract Model

- `GET` is safe and does not authoritatively mutate domain state.
- Canonical detail operations identify `meta.source=canonical`.
- Projection results identify `meta.source=projection`, `generatedAt`, `asOf`, `freshness` (`current`, `stale`, `unavailable`), and optional safe refresh guidance.
- Tenant path, current capability, and field-level minimization apply to every query.
- Search and filters are allow-listed. Unknown filters are rejected rather than ignored silently.
- Collections use opaque cursor pagination: `limit`, optional `after`, allowed `sort`, and domain filters. The response returns `meta.page.nextCursor` and `hasMore`.
- Sort order has a stable logical tie-breaker that does not promise a physical identifier. Debt-assistance defaults to oldest eligible operational date, then recorded instant, then stable logical identity; recent activity defaults newest first.
- Deactivated, cancelled, reversed, and replaced records are excluded by default where ordinary lists require active data and included only through explicit lifecycle filters or historical details.
- A valid empty result is `200` with `data: []`; it must not reveal whether a cross-Business identifier exists.
- Canonical financial detail and command outcomes are `no-store`. Projection lists may use private conditional revalidation only after cache policy proves Business/session isolation; initial implementation remains `no-store`.
- Mobile-compatible semantics do not imply new mobile mutation scope.

Offset/page-number pagination was deferred because changing data can duplicate or skip entries. Cursor encoding and limits remain implementation choices.

## 10. Stable Error Contract

### 10.1 Problem Details shape

Rejected 4xx and 5xx responses use RFC 9457 `application/problem+json` with:

- `type`: stable documentation URI for the Sem Caderno problem family;
- `title`: stable developer-safe summary;
- `status`: HTTP status;
- `code`: stable upper-snake machine code;
- `detail`: safe non-technical fallback, with no secrets or internal diagnostics;
- `correlationId`: opaque support reference, distinct from session/idempotency/record identifiers;
- `retry`: `never`, `afterCorrection`, `afterAuthentication`, `afterRefresh`, `afterDelay`, or `recoverOutcome`;
- `commitState`: `notCommitted`, `unknown`, `priorCommitted`, or `notApplicable`;
- `freshStateRequired`: boolean;
- `violations`: optional allow-listed field violations with logical `path`, stable `code`, and safe message key.

RFC 9457 standardizes this representation and media type. See [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html).

Merchant-tested Brazilian Portuguese copy belongs to the presentation content catalogue keyed by machine code. The server may supply a safe Portuguese fallback, but clients must not expose developer detail, raw Zod/Fastify errors, stack traces, SQL, provider responses, or identifiers. Fastify's default validation payload is therefore not the public contract; response allow-listing and a custom mapping are required when implementation begins. See [Fastify validation and serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/).

Cycle 018 leaves the Cycle 016 current-session response unchanged. Missing, malformed, unknown, revoked, expired, or unusable-User session evidence is normalized to the existing anonymous inspection representation without exposing lifecycle detail. A database or adapter failure remains `INTERNAL_FAILURE`, not anonymous. The optional selected-Business identifier remains context only; it does not mean Business, Membership, or capability validation succeeded. Raw credentials, digests, internal session identifiers, revocation timestamps, and persistence details are never public fields. See the [Session Credential Resolution and Lifecycle Specification](session-credential-resolution-lifecycle-specification.md).

### 10.2 Application error mapping matrix

For every row, the presentation content catalogue owns merchant-tested Brazilian Portuguese copy keyed by the stable code; the API supplies only safe fallback detail. Success-state rows such as replay, pending delivery, and stale projection use the same code-to-copy responsibility without converting a non-error result into Problem Details.

| Cycle 007 category | Stable code / HTTP | Retry and fresh state | Commit may exist | Work | Merchant-message, disclosure, and recovery responsibility |
| --- | --- | --- | --- | --- | --- |
| Unauthenticated | `AUTHENTICATION_REQUIRED` / 401 | after authentication; fresh | no | preserve only non-sensitive local work | no tenant detail |
| Session invalid or revoked | `SESSION_INVALID` / 401 | after authentication; fresh | no for undispatched request | clear sensitive state | no tenant detail |
| Email not verified | `EMAIL_VERIFICATION_REQUIRED` / 403 | after verification; fresh | no | preserve safe form | no Invitation detail |
| Business context required | `BUSINESS_CONTEXT_REQUIRED` / 400 | select/validate Business; fresh | no | preserve Business-bound work separately | no target detail |
| Business unavailable or inactive | `BUSINESS_UNAVAILABLE` / 403 | after Business refresh | no | retain safe explanation only | returned only for previously authorized context; otherwise `RESOURCE_NOT_FOUND` 404 |
| Membership unavailable or inactive | `MEMBERSHIP_INACTIVE` / 403 | after accessible-Business refresh | no | clear forbidden data | returned only for safe current context; otherwise `RESOURCE_NOT_FOUND` 404 |
| Capability denied | `CAPABILITY_DENIED` / 403 | another authorized actor; refresh optional | no | preserve safe input if access remains | omit forbidden target detail |
| Resource not found within authorized scope | `RESOURCE_NOT_FOUND` / 404 | after list refresh | no | preserve correctable input | same response for absent/cross-Business |
| Validation failed | `VALIDATION_FAILED` / 422 | after correction; fresh not normally | no | preserve | safe field violations only |
| State conflict | `STATE_CONFLICT` / 409 | after refresh | no | preserve reviewed input | return safe current-state link/metadata |
| Concurrent modification conflict | `CONCURRENT_MODIFICATION` / 412 when precondition fails, otherwise 409 | after refresh and new review | no | preserve | no internal version detail |
| Duplicate command safely replayed | `COMMAND_REPLAYED` / 200 result | no retry | prior commit/rejection | replace with original result | `replayed=true`; not Problem Details |
| Idempotency identity reused with different intent | `IDEMPOTENCY_INTENT_MISMATCH` / 409 | new reviewed intent/key | no new commit | preserve draft | audit-safe correlation only |
| Unknown prior outcome | `COMMAND_OUTCOME_UNKNOWN` / 202 result | recover outcome | yes | lock original intent | outcome resolver only |
| Overpayment rejected | `OVERPAYMENT_REJECTED` / 409 | refresh debt and correct | no | preserve | current authorized maximum only |
| Outstanding debt requires Customer | `CUSTOMER_REQUIRED_FOR_DEBT` / 422 | select/create Customer | no | preserve | no Customer existence detail |
| Invalid allocation context | `INVALID_ALLOCATION_CONTEXT` / 409 | refresh debt | no | preserve | same-Business/Customer only |
| Last-active-Owner protection | `LAST_ACTIVE_OWNER_REQUIRED` / 409 | add/keep Owner; refresh | no | preserve | same authorized Business only |
| Invitation invalid | `INVITATION_INVALID` / 404 | request another | no | preserve identity state | generic; no account/Business detail |
| Invitation expired | `INVITATION_EXPIRED` / 409 | request another | no | preserve identity state | only after safe evidence validation |
| Invitation cancelled | `INVITATION_CANCELLED` / 409 | request another | no | preserve identity state | only after safe evidence validation |
| Invitation already consumed | `INVITATION_CONSUMED` / 409 or replay result for same User/intent | refresh Businesses | prior commit may exist | preserve identity state | no other-User detail |
| Projection unavailable or stale | `PROJECTION_STALE` / 200 metadata; `PROJECTION_UNAVAILABLE` / 503 | refresh/wait; fresh required | no mutation | preserve filters | canonical detail when authorized |
| External delivery pending | `EXTERNAL_DELIVERY_PENDING` / 202 or 200 status resource | poll; retry only when eligible | domain commit exists | preserve Request | minimize destination |
| External delivery failed | `EXTERNAL_DELIVERY_FAILED` / 200 status resource | retry delivery when eligible | domain commit exists | preserve Request | no provider internals |
| Internal failure | `INTERNAL_FAILURE` / 500 | recover if commit not proven absent | possibly | preserve original intent | generic; correlation only |

Transport-only failures are `MALFORMED_REQUEST` (400), `UNSUPPORTED_MEDIA_TYPE` (415), `CSRF_REJECTED` (403), `PRECONDITION_REQUIRED` (428), and `RATE_LIMITED` (429). They do not add domain meaning. Rate limiting is required at sensitive identity and abuse-prone boundaries. The initial ID04 account-keyed policy is now exact in the [Session Issuance and Sign-In Specification](session-issuance-sign-in-specification.md); policies for other operations remain deferred. RFC 6585 defines 428 and 429. See [RFC 6585](https://www.rfc-editor.org/rfc/rfc6585.html).

Multiple independent field violations may be returned in one `violations` array when bounded safely. One primary application code controls recovery; the API does not return a bag of contradictory top-level errors.

## 11. HTTP Semantics

| Operation category | Method and normal success | Rejection/conflict | Retry rule |
| --- | --- | --- | --- |
| Canonical/projection read | `GET` 200; empty collection 200 | 401/403/404/503 | safe to repeat; authorization rechecked |
| Create ordinary resource | `POST` 201 with location/reference | 422/409 | repeat only with required idempotency where specified |
| Explicit command subresource | `POST` 200 or 201 | 409/412/422 | application idempotency governs |
| Replace active-Business context | `PUT` 200 | 403/404 | HTTP-idempotent but revalidated each time |
| Descriptive edit | conditional `PATCH` 200 | 412/422/428 | fetch fresh state and review |
| Current-device sign-out | `DELETE` 204 | still clear local state on absent session | no financial effect |
| Accepted external delivery | `POST` 202 | 409/422/503 | poll status; retry attempt only when eligible |
| Outcome recovery | `POST` 200 final or 202 unresolved | 401/403/404 non-disclosing | safe to repeat with same identity |

`GET`, `HEAD`, and `OPTIONS` never change authoritative domain state. `POST` is not assumed idempotent merely because a client retries it. `201` means a first creation; equivalent-intent replay returns `200` with replay metadata. `204` is used only when no response representation is needed. `422` is shape-valid but semantically invalid input. `409` represents lifecycle/invariant conflict. `412` represents a supplied stale conditional precondition. `428` means a required conditional edit omitted `If-Match`. `202` is non-final and never means a financial commit failed or a delivery proved Payment.

## 12. Idempotency and Safe Replay

### 12.1 Required command families

`Idempotency-Key` is required for first-owner bootstrap, Invitation acceptance, all Sale variants, later Payment, Expense creation, financial cancellation, Payment reversal, financial replacement, Payment Request delivery attempts, and future verified provider reconciliation. It is strongly required for other duplicate-sensitive creates such as Invitation and Payment Request creation; the operation inventory marks the rule.

The key is opaque, bounded, high-entropy client input. Exact syntax and physical identifier are deferred. It is scoped by API major, logical operation, authenticated User, Business where applicable, and canonical intent fingerprint. The server never trusts a client fingerprint; it canonicalizes accepted fields itself.

### 12.2 Outcomes

| Condition | Result |
| --- | --- |
| First equivalent request | execute once; persist outcome evidence with authoritative boundary |
| Same key and equivalent intent, completed commit | 200 original result, `replayed=true`, no new facts |
| Same key and equivalent intent, stable rejection | repeat original safe rejection |
| Same key and equivalent intent, in progress | 202 `COMMAND_OUTCOME_UNKNOWN`, optional `Retry-After` |
| Same key and different intent | 409 `IDEMPOTENCY_INTENT_MISMATCH` |
| Same key under another User/Business/operation | no cross-scope lookup; process or reject within that independent scope |
| Evidence cannot classify result | 202 and outcome recovery; no new intent |

Idempotency is not business uniqueness, optimistic concurrency, or authorization. Safe replay is visibly distinct from first creation. Keys and request fingerprints are not logged raw. Operational retention must cover realistic reconnection, dispute, and reconciliation periods; the duration is deferred to legal/physical persistence work.

The `Idempotency-Key` IETF work was an expired Internet-Draft on 2026-08-01, not an RFC. Sem Caderno uses the field as a versioned project convention and will review a future successor without breaking `v1`. See the [IETF draft history](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/history/) and [ADR 0025](../architecture/decisions/0025-idempotency-key-command-outcome-recovery.md).

## 13. Unknown-Authoritative-Outcome Recovery

### 13.1 Classification

The client enters unknown outcome when an unsafe command was dispatched but no authoritative final response can be trusted, including timeout, connection loss, interrupted response, or explicit 202 unknown result. A generic 500 on a financial command also requires recovery unless its Problem Details proves `commitState=notCommitted`.

Unknown is not rejection. The UI retains the reviewed payload and key, disables creation of a new financial intent, and maps to Cycle 009 `Unknown authoritative outcome` and `Recovery in progress` states.

### 13.2 Recovery operation

- Global: `POST /api/v1/command-outcomes/resolve`.
- Tenant-owned: `POST /api/v1/businesses/{businessId}/command-outcomes/resolve`.
- Header: original `Idempotency-Key`.
- Body: logical operation code and safe recovery context, never a new business intent.
- Cache: `no-store`.

| Recovery outcome | HTTP/result | Client consequence |
| --- | --- | --- |
| Committed result found | 200 `committed`, original canonical result | show recovered success; no resubmit |
| Stable rejection found | 200 `rejected`, embedded stable safe problem reference | restore correction path; no duplicate |
| Authoritative no-commit | 200 `notCommitted`, `retryAllowed=true` | same reviewed intent may be resubmitted safely |
| In progress/still unknown | 202 `unknown`, optional `Retry-After` | continue recovery; no new intent |

Recovery requires the same authorized User/Business scope; session renewal does not change logical command identity. Business switching hides but does not discard pending recovery. Recent activity may link to recovery without exposing the key. Supporting mobile may later display the recovered result but gains no mutation scope. Support receives only the safe correlation identifier.

Only authoritative `notCommitted` enables resubmission. Heuristic absence from a list or recent activity is insufficient.

## 14. Concurrency and Conditional Mutation Semantics

Use strong opaque entity validators in `ETag` for canonical mutable detail. Accepted conditional descriptive edits and high-risk actions based on a current detail require `If-Match`; missing required preconditions return 428 and stale preconditions return 412. The validator is a transport revision token, not a database column or identifier promise.

Multi-record financial commands cannot rely on ETag alone. They re-read all participating canonical state inside the authoritative application consistency boundary. Idempotency prevents duplicate intent; conditional preconditions detect stale review; neither replaces invariant enforcement.

| Race | Transport result |
| --- | --- |
| Product/Customer deactivated after Sale preparation | 409 or 412; preserve line/input, require fresh review; no silent ad hoc conversion |
| Membership/capability changed | 403 non-disclosing; no commit; clear forbidden state |
| Business deactivated | 403/404 non-disclosing; no ordinary commit; unknown only if dispatch result cannot be proven |
| Sale cancellation versus later Payment | one coherent commit; other 409/412 and fresh canonical read |
| Concurrent Payments | one may commit; other 409 overpayment/allocation conflict after current debt read |
| Concurrent Invitation acceptance | one commit; same User/intent replay or 409 consumed |
| Concurrent Owner changes | one may commit; other 409 last-active-Owner/conflict |
| Expense correction/cancellation or Payment reversal race | one commit; stale operation 409/412 |
| Projection version changes | query freshness changes; never authorizes mutation |
| Server total differs from preview | 409 `STATE_CONFLICT` with safe authoritative summary; new review required |

No transport choice specifies database locks, isolation levels, or physical version fields.

## 15. Application-Contract Mapping and Operation Inventory

Legend: `V` means verified session; `A` means authenticated session; `B` means Business path required; `I` means `Idempotency-Key` required; `C` means conditional precondition when based on mutable current state. Capabilities are conceptual and remain server-derived. `canonical` and `projection` identify authority, not storage.

Inventory shorthand is a direct reference to Section 10 codes: `auth errors` means the applicable `AUTHENTICATION_REQUIRED`, `SESSION_INVALID`, `EMAIL_VERIFICATION_REQUIRED`, `BUSINESS_UNAVAILABLE`, `MEMBERSHIP_INACTIVE`, `CAPABILITY_DENIED`, or non-disclosing `RESOURCE_NOT_FOUND`; `validation` means `VALIDATION_FAILED` or the explicitly named domain code; `conflict` means `STATE_CONFLICT`, `CONCURRENT_MODIFICATION`, or an explicitly named invariant code; `unknown` means `COMMAND_OUTCOME_UNKNOWN`; `delivery` means `EXTERNAL_DELIVERY_PENDING` or `EXTERNAL_DELIVERY_FAILED`. This keeps every operation tied to stable codes without repeating the full catalogue in each row. Section 20 sensitive-data rules apply to every operation; row-specific notes narrow them further.

### 15.1 Identity, session, Business, and team

| ID and Cycle 007 contract | Logical operation | Session / Business / capability | Input -> result | Errors / idem / concurrency / source / UX |
| --- | --- | --- | --- | --- |
| ID00 Browser session bootstrap (transport-only) | `GET /api/v1/session-bootstrap` | none / global | none -> short-lived pre-session CSRF token and safe metadata | `no-store`; no identity/Business facts; supports ID01-ID04/ID08-ID09 |
| ID01 Register identity | `POST /api/v1/registrations` | none / global | normalized email and credential proof -> safe verification-required result | validation/internal; rate boundary; global canonical; W1, Editing/validating |
| ID02 Initiate verification | `POST /api/v1/email-verification-requests` | none or A / global | identity evidence -> generic accepted result | validation/rate/internal; enumeration-safe; W1, pending |
| ID03 Verify email | `POST /api/v1/email-verifications` | none or A / global | one-time evidence -> verified continuation | invalid/expired mapped safely; global canonical; W1 |
| ID04 Authenticate | `POST /api/v1/sessions` | none / global | credential proof -> session cookie, CSRF token, safe identity | auth/verification/rate/internal; rotate session; W1/W4/W5 |
| ID05 Revalidate/current session | `GET /api/v1/session` | optional session / global | none -> stable anonymous or authenticated User/session context with optional remembered Business candidate | 200 for missing/unusable evidence; internal failure remains 500; no CSRF token or accessible-Business authorization read; W4-W8 |
| ID06 End current session | `DELETE /api/v1/session` | A if present / global | none -> 204 and cookie expiry | clear local state even if already absent; W51 |
| ID07 Revoke other/lost sessions | `POST /api/v1/session-revocations` | A / global / sensitive-account action | target class or accepted safe device reference -> revocation result | auth/validation; conditional policy; canonical session; W52 |
| ID08 Start recovery | `POST /api/v1/account-recovery-requests` | none / global | normalized identity hint -> generic accepted result | rate/internal; no enumeration; deferred credential adapter |
| ID09 Complete recovery | `POST /api/v1/account-recoveries` | none / global | recovery evidence/new credential proof -> sessions revoked | invalid/expired/internal; global canonical; provider deferred |
| ID10 Read current identity and Businesses | `GET /api/v1/businesses` | A / global | filters none -> authorized active Businesses only | session invalid; canonical Membership/Business; W4-W6 |
| BS01 Bootstrap Business/Owner | `POST /api/v1/businesses/bootstrap` | V / global / I | name, IANA zone, notices -> Business, settings, Owner Membership, readiness | validation/idempotency/unknown; atomic canonical; REC-G; W2/W3 |
| BS02 Select active Business | `PUT /api/v1/session/active-business` | A / global | Business logical identity -> validated remembered context | business/membership unavailable non-disclosing; current auth; W4-W7 |
| BS03 Read readiness | `GET /api/v1/businesses/{businessId}/readiness` | A/B/basic access | none -> readiness facts and missing accepted requirement | auth errors; canonical; W2/W4 |
| BS04 Read settings | `GET /api/v1/businesses/{businessId}/settings` | A/B/settings view | none -> current name, zone, BRL | auth errors; canonical |
| BS05 Update settings | `PATCH /api/v1/businesses/{businessId}/settings` | V/B/settings manage/C | accepted descriptive/current settings -> updated settings | 422/412/428; audit; canonical |
| BS06 Deactivate Business | `POST /api/v1/businesses/{businessId}/deactivations` | V/B/high-risk/I/C | reason and reviewed consequence -> inactive Business | owner/capability/conflict/unknown; canonical; REC-B; W9 |
| BS07 Export Business data | reserved guarded boundary; no `v1` operation yet | deferred | legal/operational rules unresolved | explicitly not scaffoldable |
| TM01 Create Invitation | `POST /api/v1/businesses/{businessId}/invitations` | V/B/members manage/I | normalized email, intended access, expiry -> Invitation and delivery state | validation/conflict/delivery; canonical then external; W10 |
| TM02 Cancel Invitation | `POST /api/v1/businesses/{businessId}/invitations/{invitationId}/cancellations` | V/B/members manage/I/C | optional reason -> cancelled Invitation | consumed/expired/conflict; canonical; W10 |
| TM03 Accept Invitation | `POST /api/v1/invitation-acceptances` | V/global/I | secret evidence, no Business assertion -> Membership result | invalid/expired/cancelled/consumed/mismatch; atomic canonical; REC-G; W11-W13 |
| TM04 List Invitations | `GET /api/v1/businesses/{businessId}/invitations` | A/B/members manage | lifecycle filters/cursor -> safe Invitations | auth errors; projection/canonical; W10 |
| TM05 List Memberships | `GET /api/v1/businesses/{businessId}/memberships` | A/B/team view | lifecycle filters/cursor -> safe team records | auth errors; canonical/list; W14 |
| TM06 Change capability group | `POST /api/v1/businesses/{businessId}/memberships/{membershipId}/capability-changes` | V/B/role assign/I/C | intended group/reason -> current Membership | capability/last Owner/conflict; session revalidation; W14 |
| TM07 Suspend Membership | `POST /api/v1/businesses/{businessId}/memberships/{membershipId}/suspensions` | V/B/members manage/I/C | reason -> suspended Membership | last Owner/conflict; sessions revalidate; W8/W14 |
| TM08 Restore Membership | `POST /api/v1/businesses/{businessId}/memberships/{membershipId}/restorations` | V/B/members manage/I/C | reviewed access -> active Membership | Business/capability/conflict; W8 |
| TM09 Remove Membership | `POST /api/v1/businesses/{businessId}/memberships/{membershipId}/removals` | V/B/members manage/I/C | reason -> removed historical Membership | last Owner/conflict; sessions revalidate; W8/W14 |

Invitation expiration is a lifecycle fact returned by TM04/TM03; no merchant command to force expiration is invented. Invitation states remain Invitation states, not active Membership authorization.

### 15.2 Customers and Products

| ID and Cycle 007 contract | Logical operation | Session / Business / capability | Input -> result | Errors / idem / concurrency / source / UX |
| --- | --- | --- | --- | --- |
| CU01 Create Customer | `POST /api/v1/businesses/{businessId}/customers` | A/B/customers manage | name, optional non-unique phone/email -> Customer plus warnings | 422; duplicate-like warnings non-blocking; canonical; W15/W16 |
| CU02 Create Customer during Sale | part of SL03/SL04 payload, not independent success | A/B/sales record plus customer permission | inline Customer intent -> Customer only if Sale boundary commits | Sale idempotency/unknown; W17 |
| CU03 Update Customer | `PATCH /api/v1/businesses/{businessId}/customers/{customerId}` | A/B/customers manage/C | accepted descriptive/contact changes -> Customer | 404/422/412/428; history unchanged; W15 |
| CU04 Deactivate Customer | `POST /api/v1/businesses/{businessId}/customers/{customerId}/deactivations` | A/B/customers manage/I/C | reviewed reason -> deactivated Customer | conflict/unknown where dispatched; history retained; W48 |
| CU05 Search/list Customers | `GET /api/v1/businesses/{businessId}/customers` | A/B/customers view | search, lifecycle filter, cursor/sort -> minimal Customer list | no cross-Business disclosure; projection; W15-W17 |
| CU06 Read Customer detail | `GET /api/v1/businesses/{businessId}/customers/{customerId}` | A/B/customers view | none -> profile and authorized history links | 404 non-disclosing; canonical; W15/W48/W49 |
| CU07 Read Customer debt | `GET /api/v1/businesses/{businessId}/customers/{customerId}/debt` | A/B/debt view | optional as-of/current -> canonical-derived debt and eligible Sales | 404/projection unavailable; canonical derivation; W34-W37/W44 |
| CU08 Anonymize Customer | reserved guarded boundary; no `v1` operation yet | deferred | legal rules unresolved | historical references mandatory |
| PR01 Create Product | `POST /api/v1/businesses/{businessId}/products` | A/B/products manage | name/current commercial information -> Product plus warnings | 422; no uniqueness/inventory; canonical; W18 |
| PR02 Update Product | `PATCH /api/v1/businesses/{businessId}/products/{productId}` | A/B/products manage/C | current catalog changes -> Product | 404/422/412; snapshots unchanged; W19 |
| PR03 Deactivate Product | `POST /api/v1/businesses/{businessId}/products/{productId}/deactivations` | A/B/products manage/I/C | reason -> inactive Product | conflict/unknown; historical snapshots retained; W20 |
| PR04 Search/list Products | `GET /api/v1/businesses/{businessId}/products` | A/B/products view | search/lifecycle/cursor/sort -> minimal list | projection/canonical; no inventory; W18/W20 |
| PR05 Read Product detail | `GET /api/v1/businesses/{businessId}/products/{productId}` | A/B/products view | none -> current catalog detail | 404 non-disclosing; canonical; W19 |
| PR06 Product-photo intent | reserved adapter boundary; no upload operation until photo workflow is accepted | deferred | metadata/upload semantics unresolved | no provider selected |

### 15.3 Sales, Payments, Requests, and Expenses

| ID and Cycle 007 contract | Logical operation | Session / Business / capability | Input -> result | Errors / idem / concurrency / source / UX |
| --- | --- | --- | --- | --- |
| SL01 Fully paid anonymous Sale | `POST /api/v1/businesses/{businessId}/sales` variant `FULLY_PAID_ANONYMOUS` | V/B/sales record/I | items, Payment intent, date, preview -> Sale+Payment+Allocation result | customer absent, equal amounts; 422/409/unknown; REC-B; W21/W25-W31 |
| SL02 Fully paid identified Sale | same route variant `FULLY_PAID_IDENTIFIED` | V/B/sales record/I | Customer, items, Payment intent/date -> linked result | same-Business Customer; atomic; REC-B; W22 |
| SL03 Partially paid Sale | same route variant `PARTIALLY_PAID` | V/B/sales record/I | Customer or inline Customer, items, initial Payment -> Sale/Payment/Allocation/debt | Customer required; overpayment/conflict; REC-B; W17/W23 |
| SL04 Unpaid Sale | same route variant `UNPAID` | V/B/sales record/I | Customer or inline Customer, items/date -> Sale and full debt | no Payment/Allocation; REC-B; W17/W24 |
| SL05 Read Sale detail/current correction state | `GET /api/v1/businesses/{businessId}/sales/{saleId}` | A/B/sales view | none -> snapshots, lifecycle, active allocations, derived debt, correction links | 404; canonical; W19/W30/W32 |
| SL06 List Sales / sales recorded | `GET /api/v1/businesses/{businessId}/sales` | A/B/sales/report view | period/lifecycle/customer/cursor/sort -> list with freshness | projection; W45-W47 |
| SL07 Descriptive Sale correction | `PATCH /api/v1/businesses/{businessId}/sales/{saleId}` | V/B/financial correct/C | allowed non-financial description -> updated detail | 412/422; audit; canonical |
| SL08 Cancel Sale | `POST /api/v1/businesses/{businessId}/sales/{saleId}/cancellations` | V/B/financial correct/I/C | reason, reviewed impact -> cancellation result | allocation race/conflict/unknown; REC-B; W32/W33 |
| SL09 Replace financial Sale | `POST /api/v1/businesses/{businessId}/sales/{saleId}/replacements` | V/B/financial correct/I/C | reason and new reviewed Sale intent -> linked original/replacement | current allocation rules; REC-B; W32 |
| SL10 Recover Sale/command | REC-B command outcome plus SL05 when committed | V/B | original operation code/key -> final/unknown | no heuristic duplicate; W29-W31 |
| PA01 Record later Payment and Allocations | `POST /api/v1/businesses/{businessId}/payments` | V/B/payments record/I | Customer, amount, method, date, selected Sale, optional Request reference -> Payment, destinations, debt | overpayment/allocation/conflict/unknown; REC-B; W34-W37/W41/W44 |
| PA02 Read Payment detail | `GET /api/v1/businesses/{businessId}/payments/{paymentId}` | A/B/payments view | none -> receipt fact, destinations, reversal links | 404; canonical; W38/W41 |
| PA03 List Payments/received period | `GET /api/v1/businesses/{businessId}/payments` | A/B/payments/report view | period/lifecycle/customer/cursor/sort -> Payment list | projection; Allocations not receipts; W44-W47 |
| PA04 Reverse Payment | `POST /api/v1/businesses/{businessId}/payments/{paymentId}/reversals` | V/B/financial correct/I/C | reason/reviewed impact -> reversal, ineffective allocations, debt | conflict/unknown; REC-B; W38 |
| PA05 Replace/correct Payment | `POST /api/v1/businesses/{businessId}/payments/{paymentId}/replacements` | V/B/financial correct/I/C | reason/new Payment intent -> reversal/replacement links | current debt/overpayment rules; REC-B; W38 |
| RQ01 Create Payment Request | `POST /api/v1/businesses/{businessId}/payment-requests` | A/B/requests manage/I | Customer, optional Sale, amount, provider-neutral destination intent -> Request | validation; no debt effect; W39/W40 |
| RQ02 Request delivery | `POST /api/v1/businesses/{businessId}/payment-requests/{requestId}/delivery-attempts` | A/B/requests deliver/I | channel category/destination reference -> 202 attempt | pending/failed; post-commit; W39/W40 |
| RQ03 Read Request/delivery status | `GET /api/v1/businesses/{businessId}/payment-requests/{requestId}` | A/B/requests view | none -> Request lifecycle and attempt summaries | 404; canonical plus side-effect status; W39-W41 |
| RQ04 Retry delivery | same RQ02 with new attempt identity and Request reference | A/B/requests deliver/I | eligible retry intent -> 202 attempt | dedupe/status; W40 |
| RQ05 Cancel Request | `POST /api/v1/businesses/{businessId}/payment-requests/{requestId}/cancellations` | A/B/requests manage/I/C | reason -> cancelled Request | state conflict; no debt effect; W39 |
| RQ06 Expire Request | lifecycle read; system expiration mechanism deferred | n/a | no merchant operation invented | RQ03 returns expired state |
| RQ07 Reconcile provider outcome | reserved guarded ingress, no `v1` public operation | deferred | provider authentication/dedup unresolved | no financial authority without verification |
| RQ08 Associate verified later Payment | PA01 optional Request reference | V/B/payments record/I | separate Payment intent -> Payment result | Request never proves receipt; W41 |
| EX01 Record Expense | `POST /api/v1/businesses/{businessId}/expenses` | V/B/expenses record/I | amount, date, description/category concept, preview -> Expense | 422/unknown; REC-B; W42 |
| EX02 Read/list Expenses | `GET /api/v1/businesses/{businessId}/expenses` and `GET .../expenses/{expenseId}` | A/B/expenses view | period/lifecycle/cursor/sort or identity -> results | capability/no disclosure; canonical/projection; W42-W47 |
| EX03 Descriptive Expense correction | `PATCH /api/v1/businesses/{businessId}/expenses/{expenseId}` | V/B/expenses correct/C | non-financial description -> detail | 412/422; audit |
| EX04 Replace Expense | `POST /api/v1/businesses/{businessId}/expenses/{expenseId}/replacements` | V/B/expenses correct/I/C | reason/new Expense intent -> linked replacement | conflict/unknown; REC-B; W43 |
| EX05 Cancel Expense | `POST /api/v1/businesses/{businessId}/expenses/{expenseId}/cancellations` | V/B/expenses correct/I/C | reason -> cancelled Expense | conflict/unknown; REC-B; W43 |

### 15.4 Reports and recovery

| ID and Cycle 007 contract | Logical operation | Session / Business / capability | Input -> result | Errors / idem / concurrency / source / UX |
| --- | --- | --- | --- | --- |
| RP01 Daily operational summary | `GET /api/v1/businesses/{businessId}/reports/daily-operational-summary` | A/B/sensitive report as applicable | local date -> Payments, Expenses, result, Sales separately, freshness | projection stale/unavailable; W44-W47/W50 |
| RP02 Sales recorded by period | `GET /api/v1/businesses/{businessId}/reports/sales-recorded` | A/B/report view | local period/cursor/sort -> active/historical semantics | projection; W45-W47 |
| RP03 Payments received by period | `GET /api/v1/businesses/{businessId}/reports/payments-received` | A/B/report view | local period/cursor/sort -> active receipts | projection; W44-W47 |
| RP04 Expenses by period | `GET /api/v1/businesses/{businessId}/reports/expenses` | A/B/expense-sensitive report | local period/cursor/sort -> effective Expenses | projection; W42-W47 |
| RP05 Outstanding Sales | `GET /api/v1/businesses/{businessId}/reports/outstanding-sales` | A/B/debt view | Customer/filter/cursor, oldest order -> derived debt rows | projection/canonical fallback; W34-W37 |
| RP06 Customer outstanding balance | CU07 | A/B/debt view | Customer -> canonical-derived balance | same as CU07 |
| RP07 Recent operational activity | `GET /api/v1/businesses/{businessId}/activity` | A/B/activity view | types/period/cursor -> capability-filtered activity | projection; recovery links safe; W29-W31/W45 |
| RP08 Projection status/reconciliation | `GET /api/v1/businesses/{businessId}/projections/status` | A/B/authorized operational view | projection family -> freshness/reconciliation state | 503 unavailable; no mutation; W46/W47 |
| REC-G Global outcome recovery | `POST /api/v1/command-outcomes/resolve` | A or V/global | operation code plus key header -> committed/rejected/no-commit/unknown | 200/202; no Business leakage; W3/W11-W13 |
| REC-B Tenant outcome recovery | `POST /api/v1/businesses/{businessId}/command-outcomes/resolve` | A/B/current authorization | operation code plus key header -> final/unknown | 200/202/403/404; no new intent; W9/W29-W43 |

Every Cycle 007 accepted command/query family is represented above. Export, Customer anonymization, Product-photo transport, provider reconciliation, and forced Request expiration are explicitly reserved because their application boundaries are future or unresolved; no route is implied for scaffolding.

## 16. Financial Transport Contracts

### 16.1 Sale intent

The Sale payload is a discriminated union of the four accepted intents. It contains allowed item intent, optional Customer or inline Customer intent as applicable, payment-condition intent, current amount received where applicable, payment method category, operational-date intent, and client preview totals. The server ignores no monetary discrepancy: it recalculates line totals, Sale total, Payment, Allocation, and derived debt.

- Fully paid anonymous: Customer absent; Payment and Allocation equal Sale total atomically.
- Fully paid identified: same boundary with same-Business Customer; debt remains zero.
- Partial: Customer required; `0 < Payment < Sale total`; remaining debt derived.
- Unpaid: Customer required; no Payment or Allocation is created.
- Catalog and ad hoc items both produce committed snapshots. Product identifiers are resolved in Business scope, but snapshot name/price facts do not change with later Product edits.

If submitted preview differs from authoritative calculation, no silent financial commit occurs; return conflict with a safe authoritative review summary. A new explicit review precedes resubmission.

### 16.2 Payment, allocation, and debt

Later Payment input identifies Customer, amount, method classification, occurrence date, optional selected Sale, and optional explanatory Request reference. The server allocates selected Sale first, then oldest eligible debt for the same Business and Customer. Allocation results are destinations within one Payment result, never additional receipts.

```text
saleOutstandingMinor = max(0, saleTotalMinor - activeAllocatedToSaleMinor)
customerOutstandingMinor = sum(active saleOutstandingMinor for Customer)
dailyResultMinor = paymentsReceivedTodayMinor - expensesTodayMinor
```

Example transport values:

```text
Sale A outstanding = "3000" (R$ 30,00)
Sale B outstanding = "2000" (R$ 20,00)
Payment received = "3500" (R$ 35,00)
Allocation destinations = "3000" + "500"
Remaining debt = "1500" (R$ 15,00)
```

The receipt is `"3500"` once. Overpayment and Customer credit are rejected. Reversal preserves the Payment, makes effective Allocations inapplicable through history-preserving facts, and causes eligible debt to reappear.

### 16.3 Expenses and reporting

Expense amount/date changes use replacement or cancellation, not destructive edit. Daily summary separately returns Payments received, Expenses, Sales recorded, and `dailyResultMinor`. For `"5000"` Payments and `"1200"` Expenses, result is `"3800"` (R$ 38,00). It is not profit, DRE, bookkeeping, or an accounting result. Payment for old debt counts on the Payment's applicable Business-local operational date; Sale recording does not become receipt.

## 17. Payment Request and External-Delivery Contracts

Payment Request creation commits a provider-neutral collection record. It neither creates Payment nor Allocation nor reduces debt. Delivery initiation creates a post-commit attempt and normally returns 202. Status values distinguish `prepared`, `deliveryPending`, `delivered`, `deliveryFailed`, `cancelled`, and `expired`; financial state remains separately `paymentNotRecorded` unless a later verified Payment is independently committed.

Delivery destination output is minimized and may show only a safe channel category and masked destination. Attempt history uses safe timestamps and statuses, not provider payloads. Retrying delivery creates or reuses deduplicated attempt intent according to adapter policy; it never re-creates the Request or Payment.

Delivery success means delivery only. Unknown delivery outcome may permit adapter reconciliation or retry without blocking unrelated financial recording; it is not the same as unknown financial commit. Provider callbacks, signatures, payloads, and automatic reconciliation remain deferred. Unverified callback data can never create authoritative Payment.

## 18. Projection and Reporting Contracts

| Query | Meaning | Freshness and historical rules |
| --- | --- | --- |
| Daily summary | received Payments minus effective Expenses for one Business-local day; Sales separate | freshness metadata; no false zero; reversed/cancelled effects explicit |
| Sales recorded | Sales by Sale operational date | paid state derived; cancelled/replaced filtered or marked |
| Payments received | effective Payments by Payment occurrence date | Allocations omitted from receipt sum; reversals visible historically |
| Expenses | effective Expenses by occurrence date | sensitive capability; cancellations/replacements linked |
| Outstanding Sales | active derived debt | oldest order for assistance; canonical facts win |
| Customer debt | Customer's active outstanding Sales | Request delivery has no effect |
| Recent activity | capability-filtered Sales, Payments, Requests, Expenses, corrections | recovery link may be included without command key |

Projection responses return source, generation instant, applicable Business-local period and zone, freshness, and optional reconciliation state. `stale` remains usable only when the query's accepted behavior permits an explicit warning; disputed financial totals are withheld and `unavailable` is returned when canonical disagreement prevents trust. Canonical detail remains authoritative. Presentation supplies accessible lists/text alongside tables or charts.

## 19. Caching and Stale-Data Controls

- Session, identity, Business selection, tenant details, financial commands/results, outcome recovery, errors, and sensitive reports return `Cache-Control: no-store`.
- Authenticated responses are never shared-cacheable. A future low-risk projection cache must be `private`, vary on every relevant authorization-safe dimension, and prove tenant isolation before acceptance.
- Business switching clears presentation state first; all in-flight old-Business results are discarded by Business context token, not rendered.
- Session invalidation, Membership/capability changes, and Business deactivation invalidate client-held tenant data; client cache never authorizes.
- Browser back/forward restoration must revalidate session/Business before revealing sensitive content.
- Unknown-outcome recovery and command results are never served from an intermediary or stale client cache.
- Conditional canonical reads may use ETag, but a 304 does not bypass current authorization.
- Shared-device sign-out clears cookies, in-memory CSRF/context, cached tenant data, and protected browser history surfaces.

RFC 9111 defines `no-store` and `private` and warns that cache controls alone do not guarantee privacy. See [RFC 9111](https://www.rfc-editor.org/rfc/rfc9111.html).

## 20. Security and Privacy Implications

- Object and function authorization execute server-side for every operation and identifier. OWASP identifies object-level and function-level authorization as major API risks; identifiers in paths, headers, or payloads never prove access. See the [OWASP API Security Top 10](https://owasp.org/API-Security/editions/2023/en/0x11-t10/).
- Request schemas allow only intended properties; Business ownership, actor, capabilities, lifecycle, totals, audit, and financial state cannot be mass-assigned.
- Response schemas allow-list properties to minimize accidental disclosure.
- Cross-Business absent and inaccessible records are intentionally indistinguishable where needed.
- Cookie, CSRF, same-origin, TLS, security-header, and rate/abuse boundaries require implementation and threat-model tests; this document does not claim configured security.
- Correlation identifiers are opaque, bounded, and independent of User, Customer, record, session, Invitation, and idempotency identifiers.
- Logs, traces, analytics, audit transport, and support messages exclude cookies, CSRF tokens, credentials, Invitation/recovery evidence, raw idempotency keys, Customer contacts, item payloads, full amounts unless operationally essential, and provider payloads.
- Errors return no stack, SQL, schema internals, provider detail, cross-tenant target fact, or unnecessary personal/financial data.
- Shared-device sign-out and lost-device session revocation use global session operations and force tenant revalidation.
- CORS is denied by default because browser access is same-origin. Any later origin must be allow-listed exactly and threat-reviewed.
- Security headers are a public-edge responsibility, but exact deployment configuration remains deferred.

## 21. Accessibility and Plain-Language Implications

Transport semantics support Cycle 009 states without embedding markup:

- `violations.path` lets the web associate field errors and build an error summary.
- stable `code`, `retry`, `freshStateRequired`, and `commitState` determine focus, actions, and announcement priority;
- 202 command/delivery results expose pending status without implying success;
- `replayed=true` supports `Esta operação já tinha sido registrada` instead of a new-success claim;
- unknown/recovery outcomes support `Ainda não sabemos se foi registrado` and withhold duplicate confirmation;
- freshness metadata supports `Valores em atualização` without false zero;
- canonical totals include minor-unit and Business-local date semantics for correct Brazilian formatting/pronunciation;
- entered values remain client-owned after safe rejection and are not echoed unnecessarily in errors;
- merchant-facing Brazilian Portuguese messages are owned by the tested presentation catalogue, while machine codes remain language-neutral;
- no status relies on color, and delivery versus Payment has separate codes.

## 22. Contract Validation and Future Testing Responsibilities

Future implementation must add, without changing semantic authority:

- OpenAPI 3.2 document validation and backward-compatibility checks;
- Zod request/response boundary tests and explicit mapping to application contracts;
- Fastify injection tests for methods, statuses, media types, Problem Details, and response allow-listing;
- Next.js-to-Fastify same-origin cookie and CSRF integration tests;
- authentication, session rotation/revocation, shared/lost-device, Origin, Fetch Metadata, and CSRF tests;
- Business context, active Membership/capability, same-Business child, and cross-Business non-disclosure tests;
- all four Sale variants, exact arithmetic, server recalculation, and historical snapshot tests;
- idempotency first execution, replay, changed intent, in-progress, scope isolation, and retention-boundary tests;
- unknown-outcome committed/rejected/no-commit/still-unknown recovery tests;
- ETag/If-Match, Owner race, Invitation race, Payment race, cancellation/allocation, reversal, and deactivation tests;
- cursor stability, filter allow-list, projection freshness, canonical disagreement, and no-false-zero tests;
- Payment Request delivery pending/failed/retry and Payment independence tests;
- cache-control, browser-back, Business-switch, sensitive-field, log/correlation redaction, and rate-boundary tests;
- web/mobile semantic compatibility and accessibility-state integration tests.

No tests or source schemas are implemented by this cycle.

## 23. Contract Evolution and Governance

- The application-contract specification owns semantic command/query/error meaning.
- This specification and the future OpenAPI artifact own `v1` wire behavior.
- Runtime Zod schemas implement the boundary and must be checked against OpenAPI; they do not own domain rules.
- Contract changes require product/domain/application review when financial meaning, authorization, privacy, merchant copy, or recovery changes.
- Additive fields require safe omission/unknown handling. New enum values require a documented fallback before they are additive.
- Error codes are registered once, never repurposed, and retired only with a major compatibility plan.
- Generated clients, schema registries, and code generation remain future choices; generated output can never be the only reviewed source.
- Provider extensions stay outside canonical resources until accepted; implementation detail does not leak through errors.
- Version retirement must preserve in-progress idempotency, recovery, external attempts, and audit explanation.
- Merchant terminology can evolve independently of machine codes when user validation supports it.

## 24. Decision Matrices

| Decision | Serious candidates | Accepted | Why / rejected alternatives | Risk, mitigation, revisit |
| --- | --- | --- | --- | --- |
| Transport | resource JSON, RPC JSON, GraphQL, Next-only actions, hybrid | hybrid resource/query plus explicit commands | preserves HTTP reads and application intent; avoids GraphQL/framework coupling and generic CRUD | route drift; operation inventory/contract tests; revisit for validated real-time/bulk need |
| Versioning | path, media type, header, unversioned | `/api/v1` path major | visible to clients/proxies/docs; media/header negotiation adds complexity | long-lived versions; deprecation policy |
| Session | opaque cookie, browser bearer token, Next-only session | opaque server session cookie | revocable, HttpOnly, same authority; rejects browser storage and stale self-contained auth | cookie/CSRF config; threat/integration tests |
| CSRF | SameSite only, synchronizer, double submit | synchronizer + Origin/Referer + SameSite defense | session-bound and explicit; SameSite alone insufficient | token lifecycle; rotate and test |
| Business carriage | path, header, payload, session-only | tenant path plus remembered candidate | explicit, testable, cache-separated; never authorization | path treated as trust; mandatory context builder |
| Errors | ad hoc JSON, GraphQL errors, RFC 9457 | RFC 9457 extensions | standard HTTP problem shape plus stable project codes | copy leakage; allow-list and client catalogue |
| Idempotency | payload key, header key, heuristic duplicate | `Idempotency-Key` header | consistent across commands; intent remains payload | IETF draft expired; project versioning and review successor |
| Recovery | list search, retry new key, command outcome resource | scoped POST resolver | keeps key out of URL/cache and proves no-commit | persistence complexity; physical cycle |
| Concurrency | silent last-write, payload version, ETag/If-Match, server-only | ETag/If-Match where useful plus authoritative revalidation | standard conditional HTTP without pretending one token covers multi-record finance | underuse; operation-specific contract tests |
| Pagination | offset/page, cursor, unbounded | opaque cursor | stable under changing activity; no physical ID promise | cursor evolution; version and expiry semantics before code |
| Contract description | prose, OpenAPI, GraphQL SDL, generated-only | prose now, OpenAPI 3.2 wire artifact later | current standard and broad tooling; no generator authority | schema duplication; conformance tests |
| Cache | broad private cache, no-store, public projection | `no-store` initial; conditional private later only with evidence | safest for tenant switching/shared devices | performance; revisit after measurement and isolation tests |

Official evidence used: [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html), [RFC 9111](https://www.rfc-editor.org/rfc/rfc9111.html), [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html), [RFC 6585](https://www.rfc-editor.org/rfc/rfc6585.html), [OpenAPI 3.2](https://spec.openapis.org/oas/v3.2.0.html), [OWASP CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [OWASP API Security](https://owasp.org/API-Security/editions/2023/en/0x11-t10/), [Fastify validation/serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/), and [Next.js authentication guidance](https://nextjs.org/docs/app/guides/authentication). Next.js guidance also states that server actions require their own authorization checks, consistent with Fastify authority.

## 25. ADR Assessment

This cycle creates four durable cross-cutting ADRs:

- [ADR 0022](../architecture/decisions/0022-versioned-json-http-explicit-commands.md): versioned JSON/HTTP with explicit command resources, RFC 9457, and future OpenAPI 3.2 description.
- [ADR 0023](../architecture/decisions/0023-same-origin-cookie-session-csrf.md): same-origin opaque cookie sessions with layered CSRF protection.
- [ADR 0024](../architecture/decisions/0024-business-context-in-tenant-paths.md): explicit Business path scope with authoritative revalidation.
- [ADR 0025](../architecture/decisions/0025-idempotency-key-command-outcome-recovery.md): idempotency header semantics and first-class outcome recovery.

Individual routes, fields, status mappings, and application invariants remain in this specification and do not receive separate ADRs.

## 26. Risks and Revisit Triggers

| Risk | Mitigation | Revisit trigger |
| --- | --- | --- |
| Transport drifts from application meaning | semantic traceability and mapping tests | repeated mapping defects or accepted semantic change |
| Framework behavior becomes canonical | thin Fastify/Next adapters and dependency checks | direct DB/domain authority appears in web/route code |
| Business path is trusted | current context construction on every operation | tenant-isolation test failure |
| Financial command becomes CRUD | explicit command subresources and review | new operation cannot explain history/consequence |
| HTTP idempotency is misunderstood | required application key/evidence | duplicate financial fact or draft/RFC change |
| Unknown is shown as failure | stable 202/recovery contract | merchant test shows retry temptation |
| Error codes drift | registry, compatibility review | client version skew causes wrong recovery |
| Sensitive or cross-Business exposure | response allow-lists, generic 404, no-store | security review or incident |
| CSRF/session weakness | same-origin cookie, synchronizer, Origin, tests | public-origin or client model changes |
| Cache leaks prior Business | no-store and clear-before-load | measured need for authenticated caching |
| Projection treated as canonical | freshness/source metadata and blocked disagreement | reconciliation incident |
| Delivery treated as Payment | separate resources/statuses | provider integration proposal |
| OpenAPI/Zod duplication and dialect mismatch | explicit mapping and conformance checks; OpenAPI is not passed directly to Fastify validation | maintenance cost or tooling evidence justifies a generation direction |
| Mobile scope expands through API | operation responsibility matrix | accepted mobile product decision |
| Technology versions change | major compatibility/security review | support end or framework behavior change |

## 27. Open Questions and Deferred Choices

### 27.1 Product and merchant validation

- Fractional quantities; provisional Sale, debt, correction, reversal, replacement, and role terminology.
- Same-name Customer warning timing, payment-method labels, visible Sale/Payment numbering, SKU/barcode, and durable drafts.
- Expense categories and Staff/Manager Expense/daily-result access.
- Mobile Sale, Payment, Expense, correction, team, and offline mutation scope.
- Product-photo, Payment Request delivery, correction-date presentation, shareable summaries, Home emphasis, and Customer-facing debt language.

### 27.2 Operational, legal, privacy, and security

- Session idle/absolute duration, reauthentication policy, credential/recovery method, and abuse thresholds.
- Retention for sessions, idempotency, audit, financial history, delivery metadata, photos, exports, backups, and rejected security attempts.
- Customer/User anonymization, support/admin access, export after deactivation, contact visibility, shared/lost-device policy, legal collection copy, and fiscal summary wording.
- RPO/RTO, backup custody, restore authorization, screenshot/analytics redaction, accessibility validation, and security threat-model ownership.

### 27.3 Required before scaffolding

- Exact supported patch versions and package names already constrained by Cycle 010.
- Whether OpenAPI is authored first or generated from a reviewed schema source; either path must keep OpenAPI and Zod conformant.
- Exact route parameter names, maximum body/header/page limits, correlation header spelling, and CSRF/session cookie names for local versus production environments.
- Browser support evidence needed to finalize Fetch Metadata fallback and cookie testing matrix.

### 27.4 Deferred to physical persistence

- Physical identifiers, tables, columns, constraints, indexes, migrations, SQL, transaction isolation, locking, RLS reconsideration, and repository queries.
- Session, CSRF, idempotency outcome/fingerprint, audit, revision validator, projection, delivery-attempt, and retention storage.
- Cursor encoding dependencies, backup/restore verification, projection checkpoints, and reconciliation repair.

### 27.5 Deferred to provider integrations

- Credential/email provider; verification and recovery secret exchange.
- Payment Request channel/provider, destination payload, callback authentication, dispute handling, retry policy, and provider reconciliation.
- Product-photo object storage, upload authorization, transformation, and retention.

### 27.6 Deferred to deployment and infrastructure

- Public gateway/reverse proxy, TLS, DNS, CORS allow-list if ever needed, security headers, rate-limiter infrastructure, secrets, hosting, managed PostgreSQL, telemetry backend, queue/worker hosting, CDN, backups, and disaster recovery.

### 27.7 Deferred to implementation

- Fastify route code, Zod schemas, OpenAPI file, client functions, exact TypeScript types, canonicalization algorithm, cookie/token generation, cache implementation, ETag generation, and test code.
- UI components, browser persistence, focus implementation, and merchant-copy catalogue mechanics.

## 28. Implementation Sequence, Acceptance, and Traceability

### 28.1 Sequence implication

The transport now gives web, server, contract tests, and future supporting clients stable external meaning. The next unresolved authority is the PostgreSQL physical model: it must prove tenant relationships, financial atomicity, idempotency/outcome evidence, session revocation, historical corrections, projections, audit, and concurrency without changing this API. Scaffolding before that model would force storage and migration assumptions into code.

Recommended next cycle: **Cycle 012 - Physical Persistence Model Specification**.

Recommended task: **Task 001 - Define the PostgreSQL Schema, Constraints, Transactions, Concurrency, and Migration Strategy for the Critical Journey**.

### 28.2 Acceptance criteria

- [x] Documentation-only scope; no code, schema implementation, dependency, configuration, test, provider, deployment, or commit.
- [x] Repository and current official sources inspected; Cycle 010 authority preserved.
- [x] One coherent versioned JSON/HTTP approach, serialization profile, session/CSRF model, and Business context carriage selected.
- [x] Commands, queries, methods, statuses, stable errors, idempotency, replay, recovery, concurrency, pagination, freshness, and caching defined.
- [x] All 26 Cycle 007 application error categories mapped.
- [x] Every accepted Cycle 007 command/query family mapped, with future guarded boundaries explicitly deferred.
- [x] All 52 Cycle 008 walkthroughs mapped exactly once in Section 29.
- [x] Financial distinctions, history, dates, tenant isolation, non-disclosure, privacy, accessibility, web authority, and supporting-mobile scope preserved.
- [x] Four durable transport decisions recorded in ADRs 0022-0025.
- [x] Physical persistence and implementation details remain deferred.

### 28.3 Traceability

Primary sources:

- [MVP Scope](../product/mvp-scope.md)
- [Architecture](../architecture/architecture.md)
- [Domain and Tenancy](domain-and-tenancy.md)
- [Authentication and Business Onboarding](authentication-and-business-onboarding.md)
- [Data Persistence and Tenant Enforcement](data-persistence-and-tenant-enforcement.md)
- [First Critical User Journey](first-critical-user-journey.md)
- [Logical Data Model](logical-data-model.md)
- [Application Contracts](application-contracts.md)
- [Critical Journey UX](critical-journey-ux-flow.md)
- [Low-Fidelity Interaction](low-fidelity-interaction-screen-state-spec.md)
- [Implementation Architecture](implementation-architecture-technology-selection.md)
- [Privacy and LGPD](../security/privacy-and-lgpd.md)
- [Test Strategy](../quality/test-strategy.md)
- [ADR Index](../architecture/decisions/README.md)

## 29. Critical-Journey Mapping Matrix

Each Cycle 008 walkthrough appears exactly once as a primary row. Operation IDs refer to Section 15; states use Cycle 009 terminology.

| # | Scenario | Entry -> main operation | Success / rejection or conflict | Unknown / recovery | Cycle 009 state; web / mobile responsibility |
| --- | --- | --- | --- | --- | --- |
| 1 | Register and verify | ID01 -> ID02 -> ID03 | verified continuation / generic validation | none | Editing, validating, success; both entry |
| 2 | Create first Business | onboarding -> BS01 | 201 Business/readiness / 422 | 202 -> REC-G | Review, committing, success; web / optional support |
| 3 | Bootstrap timeout after commit | BS01 dispatched | recovered original Business | unknown -> REC-G committed | Unknown, recovery, recovered commit; web / semantic mobile |
| 4 | Returning User with one Business | ID04/ID05 -> ID10 -> BS02 | validated automatic context / unavailable | none | Loading, success; both |
| 5 | Returning User with two Businesses | ID10 -> BS02 | selected validated Business / non-disclosing denial | none | Populated, validating, success; both |
| 6 | Remembered Business unavailable | ID05 -> ID10 | authorized choices / BUSINESS_UNAVAILABLE | none | Business unavailable; both |
| 7 | Switch Businesses | BS02 then target queries | target context / denied with no target data | pending old-Business recovery retained but hidden | Validating, loading; both |
| 8 | Membership suspended while open | next tenant query/command | none / MEMBERSHIP_INACTIVE | recover dispatched financial command if uncertain | Capability denied/interruption; both |
| 9 | Business deactivated during confirmation | financial command | no ordinary commit / BUSINESS_UNAVAILABLE | REC-B if dispatch uncertain | Committing, rejection/unknown; both |
| 10 | Owner invites member | TM01 then delivery status | Invitation created / validation/conflict; delivery separate | delivery pending/failed, not financial recovery | Review, success/delivery; web / mobile admin deferred |
| 11 | Invitation accepted | TM03 -> ID10/BS02 | Membership result / Invitation errors | REC-G for uncertain acceptance | Reviewing, committing, success; both entry |
| 12 | Invitation accepted twice | concurrent TM03 | one 201, same-intent replay or consumed | REC-G if response lost | Safe replay/rejected; both |
| 13 | Invitation email mismatch | TM03 | none / INVITATION_INVALID | stable rejection recovery if keyed | Rejected; both |
| 14 | Last Owner removal | TM09 or TM06 | none / LAST_ACTIVE_OWNER_REQUIRED or conflict | REC-B only if dispatch uncertain | Review, rejected; web |
| 15 | Create Customer | CU01 | Customer / validation | none | Editing, validating, success; web / mobile read |
| 16 | Same-name warning | CU05 plus CU01 | Customer or existing selection / warning is non-blocking | none | Editing, warning; web |
| 17 | Inline Customer | SL03/SL04 inline intent | Customer and Sale atomically / Sale rejection | REC-B | Editing preserved, commit/result; web |
| 18 | Create Product | PR01 | Product / validation | none | Editing, success; web / photo support deferred |
| 19 | Rename Product after Sale | PR02 then SL05 | current Product changed; snapshot unchanged / 412 | none | Success/read-only history; web / history read |
| 20 | Product deactivated after preparation | SL01-SL04 confirmation | none / STATE_CONFLICT or 412 | REC-B if dispatched uncertain | Review, conflict, preserved workspace; web |
| 21 | Fully paid anonymous Sale | SL01 | Sale+Payment+Allocation / validation/conflict | REC-B | Editing, review, commit, result; web / history read |
| 22 | Fully paid identified Sale | SL02 | linked Sale+Payment+Allocation / validation/conflict | REC-B | Review, result; web / history read |
| 23 | Partial Sale | SL03 | Sale+Payment+Allocation+debt / Customer/amount error | REC-B | Review, result/open debt; web / debt read |
| 24 | Unpaid Sale | SL04 | Sale+Items+full debt / Customer error | REC-B | Review, result/full debt; web / debt read |
| 25 | Ad hoc item | SL01-SL04 item variant | snapshot without Product / validation | REC-B with parent Sale | Editing, review, result; web |
| 26 | Sale validation fails | SL01-SL04 | none / VALIDATION_FAILED | no recovery when no commit proven | Invalid/rejected, workspace preserved; web |
| 27 | Duplicate Sale safely replayed | repeat SL01-SL04 same key/intent | 200 original result, replayed / none | REC-B if still unknown | Safe replay; web |
| 28 | Same Sale key with changed items | SL01-SL04 reused key | none / IDEMPOTENCY_INTENT_MISMATCH | no recovery needed unless prior result also requested | Rejected, new review; web |
| 29 | Sale response timeout | SL01-SL04 dispatched | not yet known | REC-B | Unknown; web |
| 30 | Committed Sale recovered | REC-B -> SL05 | original committed Sale | committed recovery | Recovered commit; web / later mobile read |
| 31 | Sale remains unknown | REC-B | none yet | 202 continue REC-B | Recovery, still unknown; both status |
| 32 | Cancel Sale | SL05 -> SL08 | cancellation/history / conflict | REC-B | Review, commit, history/recovery; web |
| 33 | Cancellation races with Payment | SL08 versus PA01 | one commit / other 409/412 | recover uncertain dispatched command | Conflict, fresh details; web |
| 34 | Later Payment to one Sale | CU07 -> PA01 | Payment plus destination / conflict | REC-B | Editing, review, result; web / read support |
| 35 | One Payment covers multiple Sales | CU07 -> PA01 | one Payment, multiple destinations / conflict | REC-B | Preview, result; web / read support |
| 36 | Overpayment | PA01 | none / OVERPAYMENT_REJECTED | no recovery when rejected | Invalid/rejected, values preserved; web |
| 37 | Concurrent Payments | concurrent PA01 | one commit / overpayment or allocation conflict | REC-B per dispatched key | Commit/conflict; web |
| 38 | Reverse Payment | PA02 -> PA04 | reversal/debt reappears / conflict | REC-B | Review, commit, debt/history; web / read support |
| 39 | Request delivered without Payment | RQ01 -> RQ02 -> RQ03 | Request/delivered; no Payment / delivery state | delivery polling, not financial recovery | Pending/delivered; both support |
| 40 | Request delivery fails | RQ03 -> RQ04 | retry attempt accepted / delivery failed | delivery reconciliation only | Delivery failed/retry; both support |
| 41 | Verified Payment later | RQ03/CU07 -> PA01 | separate Payment / financial errors | REC-B | Payment review/result; web / read support |
| 42 | Record Expense | EX01 | Expense / validation/capability | REC-B | Editing, review, result; web / report support |
| 43 | Correct Expense | EX02 -> EX04 or EX05 | linked replacement/cancellation / conflict | REC-B | Review, history; web / report support |
| 44 | Old debt paid today | CU07 -> PA01 -> RP01/RP03 | Payment counts today / conflict | REC-B | Payment result/daily summary; web / mobile report |
| 45 | View daily summary | RP01 | summary / unavailable | none; refresh projection | Loading, populated; both |
| 46 | Projection stale | RP01-RP08 | 200 stale metadata / no false zero | refresh/status query | Projection stale; both |
| 47 | Projection disagrees | RP08/canonical detail | canonical detail where allowed / PROJECTION_UNAVAILABLE | retry/reconciliation | Projection unavailable; both |
| 48 | Deactivate Customer with history | CU06 -> CU04 | deactivated Customer/history / conflict | REC-B if uncertain | Review, success, historical; web / read support |
| 49 | Cross-tenant Customer submitted | CU06/CU07/SL/PA scoped to active Business | none / RESOURCE_NOT_FOUND or non-disclosing denial | none | Not found/denied; both semantics |
| 50 | Web/mobile daily semantics | RP01 on both | same data/freshness/capability | same refresh behavior | Populated/stale equivalently; both |
| 51 | Shared-device sign-out | ID06 | 204, local tenant state cleared | none | Confirming, sign-in; both |
| 52 | Lost mobile session revoked | ID07 | revocation result; lost client gets SESSION_INVALID | none | Review, success/session invalid; both |

## 30. Cycle 015 Executable Contract Profile

Cycle 015 implements the cross-cutting `/api/v1` wire baseline in `@sem-caderno/contracts`. Under [ADR 0033](../architecture/decisions/0033-zod-contract-source-types-openapi-derived.md), reviewed Zod schemas are the executable transport-shape source, TypeScript types are inferred, and future OpenAPI 3.2 output must be derived or mechanically checked. Application and domain contracts retain semantic authority.

### 30.1 Implemented limits and representations

These are transport safety limits, not product rules or persistence types:

| Value | Executable `v1` rule |
| --- | --- |
| API namespace and marker | `/api/v1`; the only accepted major marker is `v1` |
| Opaque identifier | non-empty string, no leading/trailing whitespace, at most 200 code units; no UUID promise |
| Correlation identifier | same opaque rule, at most 128 code units |
| Idempotency key | 1-200 visible ASCII characters; remains opaque and is carried in `Idempotency-Key` |
| Operation code | 1-100 upper-snake ASCII characters |
| Cursor | non-empty opaque string, at most 2,048 code units |
| Page limit | integer from 1 through 100; no coercion |
| Strong entity validator | quoted visible-ASCII ETag, at most 256 code units; weak validators rejected |
| Money | non-negative canonical integer string from `0` through `9223372036854775807`, paired with literal `BRL` |
| Quantity | positive JSON safe integer; release-one remains whole-unit only |
| Instant | calendar-valid RFC 3339 UTC string ending in `Z` |
| Local date | calendar-valid `YYYY-MM-DD` |
| Time-zone identifier | named slash-separated identifier syntax, at most 255 code units; authoritative IANA membership validation remains an application boundary |
| Problem type/title/detail | URL at most 2,048; title at most 200; safe detail at most 1,000 code units |
| Field violations | 1-50 entries; path at most 256; stable code and message key at most 100 code units |

Request context schemas are strict. Response schemas accept additive object properties and return only reviewed fields, so a `v1` consumer can ignore future safe response additions. No schema coerces primitive input, fabricates absent values, interprets `null` as omission, or performs business calculation.

### 30.2 Implemented category mapping

| Cycle 011 category | Executable module | Status and boundary |
| --- | --- | --- |
| Namespace/version | `scalars.ts` | `/api/v1` constant and `v1` marker implemented; no second version |
| JSON-safe values | `scalars.ts` | rejects non-finite numbers, bigint, Date, Map, Set, functions, symbols, and cycles |
| Identifiers, money, quantity, dates | `scalars.ts` | cross-cutting representations and limits implemented |
| ID00/ID04 authentication | `authentication.ts` | strict sign-in input, normalized-password output, additive bootstrap/sign-in responses, and canonical browser-visible CSRF evidence |
| Session and selected Business | `context.ts` | anonymous/authenticated response context and distinct selected-Business context; never authorization |
| Stable errors | `errors.ts` | accepted application categories including `AUTHENTICATION_FAILED` plus five transport-only codes; status/code consistency enforced |
| Success-status codes | `errors.ts` | replay, unknown outcome, stale projection, and delivery states remain non-Problem codes |
| Command result | `commands.ts` | first commit versus replay and unknown outcome represented; confirmed rejection remains Problem Details |
| Outcome recovery | `commands.ts` | committed, rejected, authoritative no-commit, and unknown branches; only no-commit permits retry |
| Conditional mutation | `commands.ts` | strong `If-Match` representation and fresh-state conflict metadata |
| Payment Request status | `delivery.ts` | delivery lifecycle plus separate literal `paymentNotRecorded` financial state |
| Pagination | `queries.ts` | bounded request and cursor/has-more response invariants |
| Canonical/projection source | `queries.ts` | canonical marker/ETag and non-canonical current, stale, unavailable projection metadata |
| Envelopes | `envelopes.ts` | single-resource and data-plus-metadata response composition |
| Public surface | `index.ts` | package-root executable schemas, constants, and inferred types only; no subpaths |

Exact operation request/response DTOs for Business, team, Customer, Product, Sale, Payment, Allocation, Payment Request, Expense, and reports remain deferred. Section 15 specifies their logical input and result but does not close exact fields, requiredness, nullability, or product-text limits. They must be added as reviewed contract slices before their corresponding Fastify route; placeholder DTOs are prohibited. Cycle 024 implements the Cycle 023 ID00/ID04 fields and outcomes in `authentication.ts`; HTTP headers, cookie writing, and route behavior remain server concerns. Correlation-header spelling, domain filter/sort enums, cursor encoding, and OpenAPI generation remain deferred. Cycle 021 fixes the ID05 production/local cookie names and strict extraction behavior in the [HTTP session evidence specification](http-session-evidence-configuration-specification.md).

### 30.3 Cycle 016 current-session inspection mapping

Cycle 016 closes only operation ID05's response body. The operation has no request body. Its successful response is the existing data envelope around the existing session-context union:

- anonymous: `data.state` is `anonymous` and no identity or Business field is present;
- authenticated: `data.state` is `authenticated`, with required `userId` and `expiresAt`;
- selected Business: `data.selectedBusiness` is omitted when absent and, when present, contains only `businessId`.

The response uses the existing additive response policy and existing identifier and UTC-instant limits. It introduces no additional version body field, nullable absence marker, role, capability, Membership, contact, provider, cookie, credential, or persistence field. Selected Business remains context only. Cycle 022 now exposes this unchanged mapping through the server-owned Fastify route; the contract still owns no cookie parsing, session resolution, or authorization behavior.

### 30.4 Cycle 021 ID05 HTTP clarification

Cycle 021 reconciles the older ID05 inventory wording with the stable Cycle 016 body. ID05 accepts an optional session cookie and always returns 200 with anonymous or authenticated session context when evidence is missing or unusable. It does not require prior authentication, return a CSRF token, or list accessible Businesses. ID00 remains the pre-session CSRF bootstrap operation; ID10 remains the accessible-Business authorization read.

Cycle 022 implements `GET /api/v1/session` with production cookie `__Host-sem-caderno-session` or the explicit loopback local profile `sem-caderno-session`. It returns `Cache-Control: no-store`, emits no `Set-Cookie` or ETag, and needs no CSRF token because it is read-only. Configuration fails before application construction; crypto, application, PostgreSQL, decoding, mapping, and unexpected request failures remain safe 500 `INTERNAL_FAILURE` Problem Details rather than anonymous. The public response schema and API version do not change.

### 30.5 Cycle 023/024 ID00 and ID04 profile

Cycle 023 makes ID00 and ID04 authoritative without adding executable schemas. ID00 returns only a short-lived `p1` pre-session CSRF token and expiry. ID04 accepts a strict JSON object containing normalized-email input and password plus the required header/origin CSRF evidence. Successful verification returns 201, the safe authenticated User state, absolute expiry, and an independent in-memory `c1` authenticated CSRF token; the session credential appears only in the configured HttpOnly cookie.

Wrong password, unknown identity, disabled User, and missing credential binding share 401 `AUTHENTICATION_FAILED`. A correct proof for an unverified identity may return `EMAIL_VERIFICATION_REQUIRED`; invalid CSRF, rate limiting, request validation, and internal failures retain their stable categories. Every response is `no-store`, failed issuance writes no cookie, and no response exposes a password, session credential/digest, CSRF digest, internal session identifier, Membership, permission, selected Business, or infrastructure detail.

Cycle 024 implements these reviewed JSON bodies as package-root Zod exports with inferred TypeScript types. ID04 request input is strict, rejects unknown fields and unsupported email/password representations, and returns an NFC-normalized password without lowercasing or trimming it. ID00 and ID04 response schemas follow the additive response policy and strip unknown output fields. Canonical `p1` and `c1` evidence is validated as the exact prefix plus 32-byte canonical unpadded base64url representation. The public package exports no cookie/session credential, digest, HMAC key, password hash, or verifier schema.
