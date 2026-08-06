# Security, Privacy, and LGPD

## Purpose

Sem Caderno handles business records, customer information, payment history, product photos, and user access. Security and LGPD considerations must exist from the beginning, proportionally to a small-business product.

The tenant and financial audit rules accepted in Cycle 002 are defined in [Domain and Tenancy Specification](../specs/domain-and-tenancy.md). Authentication and onboarding rules accepted in Cycle 003 are defined in [Authentication and Business Onboarding Specification](../specs/authentication-and-business-onboarding.md). Persistence and tenant-enforcement rules accepted in Cycle 004 are defined in [Data Persistence and Tenant Enforcement Specification](../specs/data-persistence-and-tenant-enforcement.md). Journey-level security and privacy implications accepted in Cycle 005 are defined in [First Critical User Journey Specification](../specs/first-critical-user-journey.md). Logical record and repository privacy implications accepted in Cycle 006 are defined in [Logical Data Model Specification](../specs/logical-data-model.md). Application command, query, error, audit, and sensitive-data handling implications accepted in Cycle 007 are defined in [Application Contracts Specification](../specs/application-contracts.md). Merchant-facing tenant switching, permission presentation, error copy, unknown-outcome recovery, accessibility, and screen-level minimization accepted in Cycle 008 are defined in [Critical Journey UX Flow Specification](../specs/critical-journey-ux-flow.md). Selected technology-boundary implications accepted in Cycle 010 are defined in [Implementation Architecture and Technology Selection Specification](../specs/implementation-architecture-technology-selection.md). This document describes security and privacy implications; it does not claim legal LGPD compliance.

## Data Categories

Expected data categories include:

- Business profile data.
- User identity and authentication data.
- Business membership and permission data.
- Invitation, session, verification, and credential recovery metadata.
- Customer names and contact details.
- Sales, debts, payments, and expenses.
- Payment allocations and financial correction history.
- Product records and product photos.
- Manual payment request messages or metadata.
- Audit-relevant business events.
- Idempotency, session revocation, recovery, and external side-effect attempt metadata.
- Export, backup, restore, projection, and reconciliation metadata.

## LGPD Considerations

Potential personal data includes user information, customer contact details, purchase history, payment history, and communication metadata. Future specifications must define:

- Purpose for collecting each data category.
- Legal basis for processing.
- Retention expectations.
- Data export needs.
- Correction and deletion request handling.
- Access controls for employees and owners.
- Audit needs that may limit destructive deletion of financial history.
- Legal validation of LGPD obligations.

Deletion and correction behavior must balance privacy rights with financial auditability. Financial records should not be silently erased when they are needed to explain business history.

## Tenant Isolation

Tenant isolation is a baseline security requirement:

- Every operational record must belong to a business.
- Every access path must verify active user membership and required capability in that business.
- Every tenant-owned persistence operation must use explicit, validated Business scope and current authorization context.
- A Business identifier or tenant filter alone is not sufficient authorization.
- Direct lookups, child references, lists, aggregates, exports, background jobs, mobile requests, and future provider callbacks must preserve tenant scope.
- Cross-tenant parameter substitution and object-reference attacks must fail closed without revealing whether another business's record exists.
- Cross-business access must be covered by tests once implementation begins.
- Object storage keys and access policies must prevent cross-business photo access.
- Background jobs, reports, exports, mobile requests, and future provider callbacks must preserve tenant context.
- Suspended or removed memberships must lose business access while preserving historical audit references.
- Business deactivation blocks ordinary tenant operations and requires session revocation or revalidation.
- Business switching must clear, reload, or isolate tenant-specific customer, product, sale, report, and draft state.
- Customer search in the critical journey must not leak records from another Business.
- Repository boundaries for tenant-owned records must require validated Business scope and current authorization context, not just a Business identifier.
- Logical relationships must reject tenant-owned child records whose parent belongs to another Business.
- Application commands and queries must resolve tenant-owned identifiers only inside a validated active Business context.
- Error contracts must avoid revealing whether a rejected identifier belongs to another Business.
- Business switching must remove prior-Business names, amounts, photos, lists, search suggestions, drafts, and browser-visible state before rendering the new context.
- Capability-sensitive loading, empty, denied, and error states must not reveal fields that the User cannot view.

## Authentication and Session Security

The selected architecture uses application-owned, server-side, revocable sessions represented to clients by opaque identifiers. Cycle 011 fixes the browser transport boundary:

- Next.js and `/api/v1` share one public origin even when deployed separately.
- Only an opaque session identifier is carried in a host-only `__Host-` production cookie requiring `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, and no `Domain`.
- Session identifiers and credentials must not enter URLs, JSON payloads, local storage, session storage, logs, analytics, or support messages.
- Unsafe authenticated browser requests require a session-bound synchronizer CSRF token in a custom header; pre-authentication identity requests require a short-lived pre-session token. Both require allowed Origin or strictly validated Referer evidence and SameSite/Fetch Metadata defense in depth.
- Session rotation, revocation, shared-device clearing, and lost-device behavior remain application-owned.

Later specifications and implementation must still decide:

- Session storage.
- Exact cookie/token generation and local-development handling.
- Password policy or passwordless alternatives.
- Account recovery.
- Session expiration.
- Multi-device behavior.
- Concrete CSRF, Origin, Fetch Metadata, security-header, and abuse-control configuration.

The Next.js presentation must not access PostgreSQL directly or treat client-held role, capability, or Business state as authority. The Fastify application boundary resolves session state and revalidates current authorization. Credential and email providers remain adapters and cannot own Business Membership or financial authorization.

Cycle 003 establishes these implementation-independent requirements:

- Normalized email is the MVP conceptual identity channel.
- Email verification is required before active business operations.
- Account enumeration must be avoided in sign-in and recovery flows.
- Signup, sign-in, recovery, and invitation flows require abuse protection.
- Sessions must rotate or renew after authentication and security-sensitive changes.
- Sessions must be revoked or forced to revalidate after membership suspension, removal, role reduction, business deactivation, credential reset, or suspected compromise.
- Client-provided Business identifiers, remembered tenant context, URLs, and deep links are never sufficient authorization.
- Shared counter devices require visible sign-out and bounded session lifetime.

## Authorization

Basic user and business access control is inside the MVP. Cycle 002 defines capability-based authorization grouped initially as Owner, Manager, and Staff, with Manager subject to merchant validation.

Initial authorization concerns:

- Who can view reports?
- Who can record payments?
- Who can record expenses?
- Who can change business settings such as Pix key?
- Who can invite or remove users?
- Which role groups are required in the first release?

## Product Photos

Product photos may include sensitive business context even when they are not directly personal data. Access must be scoped by business. Public, guessable, or long-lived unauthenticated photo URLs should be avoided unless explicitly specified and risk-reviewed.

## Auditability

Audit-relevant events should exist for:

- Sales.
- Payments.
- Expenses.
- Customer debt changes.
- Business membership changes.
- Business settings changes.
- Product photo changes.
- Payment request actions.

Audit records should capture who acted, when, for which business, and which entity was affected. The system should avoid excessive logging of sensitive personal data when references are sufficient.

Ordinary technical logs must not be the source of domain financial history and should avoid sensitive personal data, full customer debt lists, payment details, and report values.

Authentication audit and logs must not include passwords, reset secrets, session secrets, invitation secrets, full authentication tokens, provider secrets, or unnecessary personal data.

## Security Risks

Initial risks include:

- Cross-tenant data exposure.
- Unauthorized employee access to reports or financial history.
- Incorrect or lost payment history.
- Weak session handling.
- Account enumeration or brute-force abuse.
- Invitation replay or leaked invitation secrets.
- Shared-device access left signed in.
- Overly broad photo access.
- Accidental disclosure through WhatsApp collection messages.
- Poor deletion behavior that either removes audit history or keeps personal data without clear purpose.
- Export or provider callback behavior that bypasses tenant checks.
- Mass-assignment that changes protected ownership, role, lifecycle, or financial fields.
- Backup, restore, or support operations that expose data across businesses.
- Development or test fixtures that include real personal or financial data without purpose and protection.
- Ordinary logs that capture sensitive customer, financial, authentication, recovery, invitation, session, or provider-secret data.
- Analytics or diagnostics that capture raw customer names, contact details, debt lists, or full financial payloads unnecessarily.
- Payment Request delivery that exposes debt amount or customer contact data through an external channel before that channel is specified.
- Logical model or API mass assignment that lets clients alter Business ownership, Membership state, capability group, lifecycle state, audit actor, financial amount, or correction references outside approved commands.
- Application-contract errors, retries, unknown-outcome recovery, and side-effect status messages that expose cross-tenant existence, secrets, raw debt lists, or unnecessary personal/financial payloads.
- Shared-device, mobile recent-screen, copied-message, screenshot, and support-guidance exposure of Customer contact, debt, Expense, or report data.
- Stale tenant data briefly appearing during Business switching, session revalidation, projection loading, or browser history navigation.
- UX that labels a delivered Payment Request as paid or invites duplicate financial submission after an unknown outcome.
- Credentialed cross-origin exposure, weak cookie attributes, CSRF checks based only on SameSite, or unsafe state changes reachable by `GET`.
- Cache, browser-history, or in-flight-response leakage of a previous Business after context switching.
- Raw Fastify/Zod, SQL, provider, session, CSRF, idempotency, or correlation internals appearing in public errors.

## Persistence, Backup, and Operational Access

Persistence must protect personal, financial, authorization, session, audit, and backup data proportionally to the product risk.

Requirements for future implementation planning:

- Encrypt data in transit and at rest.
- Use least-privilege database and production access.
- Audit export, restore, sensitive authorization, financial correction, session revocation, and business deactivation actions.
- Keep backup access controlled and separate from ordinary user-facing export.
- Verify tenant isolation after restore before claiming restore readiness.
- Avoid storing secrets or full personal/financial payloads in audit records or ordinary logs when safe references are sufficient.
- Treat product-photo metadata and future object references as tenant-owned; object access must be isolated by Business.
- Authenticate, map, and deduplicate future provider callbacks before accepting them as evidence.
- Treat analytics as operational evidence only; analytics must never become financial authority.
- Preserve visible sign-out and session revalidation behavior for shared counter devices and mobile device loss.
- Treat logical projections as rebuildable and subordinate to canonical records so cached balances or reports cannot rewrite financial truth.
- Preserve idempotency and external side-effect evidence without storing command secrets, provider secrets, or unnecessary raw payloads.
- Rebuild and repair processes must preserve tenant isolation, financial history, audit evidence, and historical time-zone context.
- Application contracts must treat client-provided totals, capabilities, Business context, and side-effect delivery status as untrusted until server-authoritative validation or canonical records prove the outcome.
- Merchant-facing lists, search results, errors, and activity summaries must return only the personal and financial detail required for the authorized task.
- Unknown-outcome support guidance must use safe references and must not include idempotency, session, Invitation, provider, or authentication secrets.
- Tenant-owned transport paths must express intended Business scope, while server-side User, Business, Membership, capability, and same-Business reference validation remains mandatory.
- Authenticated, tenant, financial, recovery, and sensitive report responses must default to `Cache-Control: no-store`; any later private caching requires explicit isolation evidence.
- RFC 9457 error bodies and success schemas must allow-list fields, keep machine codes separate from merchant copy, and suppress cross-Business existence and internal diagnostics.
- Raw idempotency keys, command fingerprints, cookies, CSRF tokens, and recovery evidence must not be used as support or observability correlation identifiers.
- The physical PostgreSQL model uses one restricted application schema, global User identity, explicit `business_id` propagation, and composite tenant foreign keys; those controls complement but never replace current application authorization.
- Session, CSRF, verification, recovery, Invitation, and idempotency bearer values are stored only as keyed digests with version/expiry evidence. Raw bearer values are prohibited in PostgreSQL, audit, logs, traces, analytics, and support tools.
- Customer contact indexes remain Business-scoped and non-unique. Payment Request destinations require encrypted storage plus only a digest and masked hint where lookup/display is necessary.
- Runtime roles cannot ordinarily delete financial history or update append-only audit/correction/outcome evidence. Migration and repair roles are separate, least-privileged, and audited.
- Command outcomes retain safe typed references rather than full request/response payloads. Authoritative recovery never relies on logs, process memory, or personal-data search.
- Transactional external-effect intent and delivery-attempt evidence are provider-neutral and contain no raw provider secret or unnecessary payload.
- Projection rows minimize personal data, remain disposable, and cannot authorize access or replace canonical records.

## Required Future Specifications

- Session/HMAC key rotation, cleanup/retention, logout/revocation implementation, and deployment secret management. Cycle 023 closes initial session/CSRF generation and the fixed 12-hour issuance lifetime.
- Credential reset and support recovery policy.
- Derived or mechanically checked OpenAPI 3.2 output from the accepted Zod contract source when a generator is selected.
- Remaining physical migrations and tenant-enforcement repositories beyond the Cycle 019 identity/session foundation.
- Product photo storage and access control.
- Data retention, export, correction, and deletion handling.
- Future provider callback verification.
- Backup, restore, and incident-repair procedures.
- Critical journey UX flow and copy validation.
- Low-fidelity interaction and screen-state validation based on the accepted UX flow.
- Threat model and implementation validation for cookie/session exchange, CSRF, Origin/Fetch Metadata, caching, rate limits, and security headers.
- Migration runner, executable DDL, repository/transaction implementation, projection consumer, outbox dispatcher, backup exercise, and possible threat-tested RLS design.
- Cycle 014 implements the runtime/package-manager pins, frozen root lockfile, strict peer/cycle/build-script policy, minimum release age with exact reviewed exceptions, environment-file exclusions, and layered structural architecture checks. These controls reduce supply-chain and boundary risk but do not prove application authorization, tenant isolation, financial correctness, privacy compliance, or secure production configuration.

## Executable Scaffold Security Boundary

The Cycle 014 scaffold contains no active environment file, browser-exposed variable, credential, secret, database URL, database connection, provider SDK, telemetry sink, or deployment configuration. Libraries do not read `process.env`; executable-boundary configuration parsing is deferred until a real input is accepted. `.gitignore` excludes real environment-value files while allowing future reviewed examples.

## Executable Contract Security Boundary

Cycle 015 keeps Zod inside the browser-safe contracts package. Schemas reject implicit coercion, non-JSON runtime values, unsupported discriminators, unknown request properties, invalid exact money/date representations, and contradictory command/recovery states. Public Problem Details allow only stable codes and safe metadata; they contain no stack, SQL, provider, credential, session identifier, idempotency fingerprint, or persistence detail.

Session and selected-Business schemas describe transport context only. A client-provided `businessId` never authorizes access; Fastify must still resolve the User and revalidate Business, Membership, capability, lifecycle, and same-Business references. Contract parsing does not prove tenant isolation, authorization, idempotency execution, outcome recovery, financial correctness, privacy compliance, or secure cookie/CSRF behavior.

The root manifest owns development tools only. Exact package versions and a single committed lockfile provide reproducibility. pnpm enforces the Node engine, strict peers, workspace-cycle rejection, registry-source restrictions, a 24-hour minimum release age, and fail-closed dependency build scripts. Exact release-age exceptions are limited to the approved Next.js 16.3.0 and typescript-eslint 8.66.0 package sets because those versions were less than 24 hours old during the verified initial install; no lifecycle-script exception was granted.

Static checks prevent known framework, persistence, browser/server, deep-import, raw-SQL, provider, mobile, projection-worker, and unexpected-workspace boundary violations. They are defense in depth only. Server-side session, Business, Membership, capability, financial, concurrency, and tenant checks still require source implementation and semantic tests.

## Session Inspection Implementation Boundary

Cycle 016 exposes no HTTP operation and stores or resolves no session. The application model distinguishes anonymous from authenticated inspection and contains only a User identifier, an expiry instant, and an optional selected-Business identifier. The transport response reuses the reviewed safe context schemas; it contains no cookie value, bearer secret, credential, contact detail, provider claim, role, capability, or Membership record.

The pure mapper in `apps/server` converts application representation to transport representation without I/O or enrichment. A selected `businessId` remains client/session context and never proves authorization. Future execution must resolve the session and revalidate applicable User, Business, Membership, capability, lifecycle, and same-Business conditions at the authoritative server boundary. Cycle 016 does not claim authentication, authorization, tenant-isolation, cookie, CSRF, persistence, or shared/lost-device behavior is implemented.

## Session Persistence Readiness Boundary

Cycle 017 confirmed that raw session and CSRF bearer values must never be persisted or logged and that PostgreSQL stores only keyed digest evidence. It blocked implementation until the request-scoped source of the opaque session value, digest/key ownership, deterministic expiry evaluation, and inactive-session outcomes were specified. Cycle 018 resolves those gaps in the explicit boundary below. A database failure must not be silently normalized to anonymous.

The optional persisted Business reference is only a remembered candidate. Resolving it cannot authorize tenant data, and a future protected operation must still revalidate User, Business, Membership, capability, lifecycle, and same-Business references. Cycle 017 introduces no credential, secret, environment variable, database connection, SQL, migration, or sensitive fixture.

## Explicit Session Evidence Security Boundary

Cycle 018 resolves the readiness gap without adding production behavior. The browser credential is `v1` plus 32 CSPRNG bytes in canonical unpadded base64url and travels only in the ADR 0023 protected cookie. The server edge validates it and derives a domain-separated HMAC-SHA-256 digest with a server-held key. Raw evidence is transient edge-only data; application, contracts, PostgreSQL, logs, audit, traces, analytics, support tools, and errors must never receive it. Digests and User associations remain security-sensitive and are also excluded from ordinary observability.

PostgreSQL will store only digest version/bytes, User, optional selected-Business candidate, fixed absolute expiry, revocation evidence, and accepted lifecycle metadata. Missing, malformed, unknown, revoked, expired, or unusable-User evidence is indistinguishable in public session inspection. Database failure fails closed as an internal failure rather than anonymous. The server passes time explicitly, eliminating hidden lifecycle clocks and request-global state.

No IP address, user agent, device fingerprint/name, location, login history, revocation narrative, token family, or arbitrary metadata is justified for current-session resolution. Retention, key rotation, issuance duration, CSRF evidence, cookie operations, and incident/support procedures remain reviewed future work. Selected Business remains a candidate only and cannot replace current Membership, capability, Business-state, or same-Business checks.

## Executable Session Resolution Security Boundary

Cycle 019 implements the accepted edge-to-database split without HTTP exposure. The server-only derivation function validates exactly one credential profile, uses Node's built-in HMAC-SHA-256 with the fixed domain label and zero-byte separator, and returns only versioned canonical digest evidence. The raw credential is present only as the function input; it is never returned, persisted, logged, included in errors, or passed to application/contracts. The HMAC key is an explicit server-edge input of at least 32 bytes and never reaches PostgreSQL.

PostgreSQL stores only the authorized digest, User association, nullable selected-Business candidate, fixed expiry, revocation instant, and lifecycle metadata. The adapter uses one parameterized read, returns no database fields beyond the application result, normalizes inactive rows to no active session, and converts connection/query failure to a fixed non-sensitive failure instead of anonymous. No IP address, user agent, device/location evidence, login history, arbitrary metadata, raw bearer value, or telemetry field exists in the schema.

## Composed Session Inspection Security Boundary

Cycle 020 composes the accepted pieces without adding HTTP transport. The server composition validates and copies the HMAC key at construction, accepts raw evidence only as one transient operation input, and immediately reuses the reviewed Cycle 019 parser/digester. Application receives only digest version/value and explicit time; transport receives only the stable anonymous/authenticated result. The composition contains no logging, broad catch, environment read, request-global state, or alternate credential conversion.

Absent or malformed evidence reaches the application short circuit without resolver/database access and exposes only anonymous state. Invalid HMAC configuration fails before operation execution. Crypto, application, persistence, decoding, and mapping failures propagate and cannot fail open as anonymous. No new persisted field, telemetry, IP, user agent, device, location, request history, credential value, digest output, or authorization cache is introduced. Cookie security and production secret injection remain unimplemented and therefore are not claimed.

The real PostgreSQL suite verifies digest length/uniqueness, foreign keys, absolute-expiry equality, revocation, disabled User, selected Business without authorization joins, and fail-closed database behavior. It uses generated test credentials and an ephemeral database; the container and data are removed after each run. Cookie hardening, issuance duration, key rotation, logout/revocation commands, CSRF, rate limiting, production secret injection, retention, and operational access remain unimplemented.

## Executable HTTP Session Evidence Security Boundary

Cycle 022 implements the outer HTTP boundary. Production reads only `__Host-sem-caderno-session`; isolated loopback development uses only `sem-caderno-session`. The configured cookie value remains the exact 46-character Cycle 018 credential. The maintained parser uses identity decoding, and the extractor compares its result to the exact raw value so whitespace trimming, percent decoding, quote removal, padding repair, duplicates, and alternate representations cannot authenticate. No URL, body, authorization header, custom header, or browser-storage fallback is accepted.

The server-local loader requires `SEM_CADERNO_SESSION_HMAC_KEY_V1_BASE64URL`, decoding exactly 32 canonical base64url bytes before application construction. There is no default. Missing or invalid configuration fails closed and never degrades to anonymous. The variable value, decoded key, raw cookie, digest, SQL, database credentials, and persistence rows are prohibited from logs, public errors, contracts, client bundles, audit, telemetry, analytics, and support references.

Read-only `GET /api/v1/session` captures one explicit operation instant and returns `Cache-Control: no-store`. Missing, malformed, duplicate, unknown, revoked, expired, equal-expiry, or disabled-User evidence shares one anonymous 200 result. Crypto, application, PostgreSQL, decoding, mapping, and unexpected failures use safe 500 `INTERNAL_FAILURE` Problem Details with an independent correlation value; they never fail open as anonymous.

ID05 returns no CSRF token and performs no state change, so it does not require a synchronizer token. ADR 0023 remains unchanged for login/bootstrap and every unsafe authenticated operation. Selected Business is returned only as remembered context and cannot replace current User, Business, Membership, capability, lifecycle, or same-Business checks. No IP address, user agent, device data, fingerprint, location, request history, login history, telemetry, arbitrary metadata, or authorization cache is authorized.

## Sign-In and Session Issuance Security Boundary

Cycle 023 selects strict normalized-email/password input and an application-owned verification boundary. The infrastructure verifier stores only Argon2id PHC strings with unique salts and performs equivalent hash work for unknown identities. Wrong password, unknown identity, disabled User, and absent credential binding share the same public `AUTHENTICATION_FAILED` result; correct proof is required before verification-required guidance. Passwords remain transient, are never logged or persisted raw, and never enter browser-safe contracts, audit, support, analytics, or telemetry.

Successful sign-in uses independent CSPRNG calls for session and authenticated CSRF evidence. Only versioned domain-separated HMAC digests are persisted. A fresh session is inserted atomically with User revalidation, pre-session-CSRF consumption, prior presented-session revocation, minimal safe audit evidence, and rate-bucket clearing. The existing cookie is never adopted or repaired, no cookie is written before commit, and configuration, crypto, Argon2, database, transaction, mapping, or serialization failure cannot become invalid credentials or anonymous success.

ID00 supplies a short-lived pre-session CSRF value in browser memory; ID04 requires it plus strict same-origin evidence. ID04 returns the independent authenticated CSRF value only in a no-store body, while the session credential remains only in the HttpOnly cookie. Unsafe authenticated operations must validate session, CSRF digest, Origin/Referer, Fetch Metadata where present, operation authorization, and input independently. CSRF proves neither identity nor Business access.

The minimum future persistence stores credential verifiers, challenge/session/rate-limit digests, lifecycle timestamps, counts, and safe references only. IP address, user agent, device/fingerprint/location data, login or request history, raw bearer/password material, arbitrary metadata, and authorization caches remain prohibited. Session, CSRF, identity-digest, and User associations are security-sensitive even when not directly usable bearer values.

Server tests use only fixed synthetic credential/key bytes and `.invalid` identity fixtures. The focused PostgreSQL HTTP suite uses an ephemeral container and removes its data. The implementation logs neither requests nor errors, emits only allow-listed Problem Details on failure, persists no new field, and introduces no tracking or telemetry.
