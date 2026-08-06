# Architecture Baseline

## Purpose

This document defines the initial architecture direction for Sem Caderno without implementing application features. It separates confirmed decisions from assumptions and open decisions.

The domain and tenancy rules accepted in Cycle 002 are defined in [Domain and Tenancy Specification](../specs/domain-and-tenancy.md). Authentication and onboarding rules accepted in Cycle 003 are defined in [Authentication and Business Onboarding Specification](../specs/authentication-and-business-onboarding.md). Persistence and tenant-enforcement rules accepted in Cycle 004 are defined in [Data Persistence and Tenant Enforcement Specification](../specs/data-persistence-and-tenant-enforcement.md). The first merchant-facing journey accepted in Cycle 005 is defined in [First Critical User Journey Specification](../specs/first-critical-user-journey.md). The logical record model accepted in Cycle 006 is defined in [Logical Data Model Specification](../specs/logical-data-model.md). Technology-independent command, query, authorization-context, error, idempotency, and read-model contracts accepted in Cycle 007 are defined in [Application Contracts Specification](../specs/application-contracts.md). Merchant-facing flow, copy, states, recovery, responsive responsibility, accessibility, and sensitive-data behavior accepted in Cycle 008 are defined in [Critical Journey UX Flow Specification](../specs/critical-journey-ux-flow.md). Conceptual screen structures, interaction sequences, state transitions, coverage, and low-fidelity validation responsibilities accepted in Cycle 009 are defined in [Low-Fidelity Interaction and Screen-State Specification](../specs/low-fidelity-interaction-screen-state-spec.md). Initial implementation technology, topology, workspace, session, persistence-access, test, and operational boundaries accepted in Cycle 010 are defined in [Implementation Architecture and Technology Selection Specification](../specs/implementation-architecture-technology-selection.md). Versioned HTTP/JSON, session/CSRF, Business-context, errors, idempotency, recovery, query, cache, and compatibility semantics accepted in Cycle 011 are defined in [Transport and API Contract Specification](../specs/transport-api-contract-specification.md). Physical PostgreSQL tables, tenant keys, constraints, transactions, concurrency, durable outcomes, outbox, projections, migration, and recovery decisions accepted in Cycle 012 are defined in [Physical Persistence Model Specification](../specs/physical-persistence-model-specification.md). Exact workspace members, version baselines, ESM/TypeScript rules, architecture checks, migration tooling, Testcontainers boundaries, and validation gates accepted in Cycle 013 are defined in [Workspace Scaffolding and Tooling Specification](../specs/workspace-scaffolding-tooling-specification.md). Explicit request-scoped session evidence, credential digest ownership, active-state evaluation, deterministic time, inspection outcomes, and minimum session persistence accepted in Cycle 018 are defined in [Session Credential Resolution and Lifecycle Specification](../specs/session-credential-resolution-lifecycle-specification.md). When this baseline and those specifications overlap, the specifications are the more detailed source.

## Confirmed Architecture Principles

- Domain rules must be independent from UI frameworks and third-party providers.
- Web and mobile clients may share contracts and domain concepts, but do not need to share UI components.
- Security, privacy, auditability, and LGPD considerations must be included from the beginning.
- Payment provider integration must stay behind a domain boundary.
- Monetary values must not use binary floating point.
- Financial records should preserve history through append-only events or explicit adjustments rather than silent mutation.
- Business is the tenant boundary for operational data.
- Customer payments use explicit payment allocations to preserve payment history and sale-level balances.
- Business-local report periods use the business time zone and stored business dates.
- User identity is global, while role and access are tenant-scoped through Business Memberships.
- First-owner Business bootstrap must atomically create an active Business and initial active Owner Membership.
- Sessions may remember an active Business, but every tenant-owned request must be server-side validated against current membership and capability.
- Canonical domain records are authoritative; derived balances and report projections are rebuildable.
- Every tenant-owned persistence operation requires explicit, validated Business scope and current authorization context.
- External side effects must happen after authoritative commits or through an equivalent retryable post-commit boundary.
- The first operational journey must allow a merchant to start without a Product catalog by using ad hoc Sale Items with preserved snapshots.
- Fully paid counter Sales may be anonymous; partially paid and unpaid Sales require a Customer.
- Logical records do not imply physical tables, columns, identifiers, indexes, ORM models, or API payloads.
- Repository boundaries for tenant-owned records must require validated Business scope and must not allow callers to forget tenant context.
- Application contracts express semantic commands and queries, not transport routes, DTOs, framework handlers, or physical persistence models.
- The application boundary must revalidate caller, active Business, Membership, capability, idempotency, and current state before authoritative tenant-owned commits.
- Stable error categories must guide safe retry, reauthentication, fresh-state reload, and unknown-outcome recovery without leaking cross-tenant existence.
- Merchant-facing financial flows must distinguish editable preview, authoritative confirmation, committed result, confirmed rejection, conflict, and unknown outcome.
- Business switching must remove prior-Business data before showing the newly validated context.
- Accessibility, plain Brazilian Portuguese, and capability-sensitive presentation are requirements across every critical state, not presentation-only enhancements.
- Low-fidelity screen regions and transitions are behavioral responsibilities, not framework components, final layouts, or authorization controls.
- The public web/server contract uses versioned JSON over HTTP with resource reads and explicit intent-named command resources.
- Tenant-owned routes carry explicit Business path scope, but Fastify still revalidates current User, Business, Membership, state, capability, and same-Business references.
- Browser sessions use opaque server-side identifiers in secure host-only cookies with layered CSRF protection; Next.js never owns session or authorization authority.
- Duplicate-sensitive commands require scoped idempotency keys, safe replay metadata, and first-class authoritative outcome recovery.
- Transport errors use stable machine codes and RFC 9457 semantics; merchant-facing Brazilian Portuguese copy remains presentation-owned.
- PostgreSQL uses one application schema, UUIDv7 identities, explicit Business-key propagation, and tenant-aware composite foreign keys; these controls do not replace authorization.
- Financial commands use exact `bigint` minor units, immutable snapshots/correction evidence, explicit transactions, deterministic locking, and durable command outcomes.
- External effects use transactional intent and post-commit attempts; projection tables remain rebuildable and expose checkpoints/freshness.

## Selected System Shape

The initial topology is a modular monolith application server with a separately deployable responsive web presentation and one PostgreSQL persistence engine:

- TypeScript on Node.js 24 LTS is the primary implementation language and runtime baseline.
- `apps/web` is the Next.js 16 presentation boundary. It has no direct PostgreSQL access and no authoritative financial or authorization behavior.
- `apps/server` is the Fastify 5 composition and transport edge for the authoritative application boundary.
- Zod 4 validates untrusted contract shapes at framework-neutral boundaries but does not replace domain, authorization, persistence, or concurrency rules.
- Framework-independent domain and application packages own rules, commands, queries, authorization orchestration, idempotency, audit obligations, and post-commit intent.
- Explicit `node-postgres` repositories adapt PostgreSQL 18 behind tenant-aware application ports.
- External providers remain adapters invoked from a retryable post-commit boundary.
- Projection and worker responsibilities begin as modules or alternate entrypoints in the same server codebase; they are not separate services initially.
- A pnpm 11 workspace manages seven private members without Turborepo or Nx initially: web, server, domain, application, contracts, PostgreSQL adapters, and database migrations.
- First-party packages use ESM, strict TypeScript project references where buildable, explicit exports, and enforceable dependency direction.
- Database migrations are owned by an isolated `node-pg-migrate` tool; real persistence tests use PostgreSQL 18 through Testcontainers when those tests are implemented.

Cycle 014 scaffolds these boundaries as seven private pnpm members. Cycle 015 makes reviewed Zod schemas in `@sem-caderno/contracts` the executable wire-shape source, infers TypeScript transport types, and keeps package-root exports as the only supported consumer surface. Cycle 016 adds the first vertical boundary: application-owned current-session models and a `CurrentSessionStatePort`, plus a pure application-to-transport mapper owned by `apps/server`. The repository still contains no authentication implementation, authorization decision, product route, database connection or migration, product UI, provider adapter, mobile workspace, CI, or deployment implementation.

Cycle 017 audited whether `@sem-caderno/persistence-postgres` could implement `CurrentSessionStatePort`. The persistence model authorized `sem_caderno.sessions`, keyed token digests, revocation/expiry evidence, and an optional remembered Business candidate, but the no-input port had no accepted request-scoped lookup evidence. It correctly left the adapter, migration, and composition binding unimplemented. Cycle 018 now resolves those request-evidence, digest, lifecycle, time, outcome, User, selected-Business, and migration-readiness gaps in the explicit boundary below.

## Primary Clients

### Web

The web application is the primary operational interface. It must support responsive use because the merchant may not have a desktop computer at the counter.

### Mobile

Responsive web in mobile browsers is the initial supporting-mobile delivery. A separate native, cross-platform, thin-shell, or installable mobile application is not selected initially.

Cycle 005 keeps mobile Sale, Payment, Expense, and correction recording deferred. Supporting mobile report consultation, Business switching, session security, Payment Request assistance, and future photo validation must use the same tenant, authorization, financial, recovery, privacy, and audit rules as desktop web.

## API and Domain Boundary

The accepted transport API adapts to the semantic application contracts rather than defining business behavior itself. Application commands and queries orchestrate use cases, persistence, authentication, authorization, idempotency, audit evidence, read models, and external-side-effect handoff. Domain rules such as sale totals, payment application, customer balance calculation, and audit-relevant event creation live outside framework-specific controllers or UI components.

Cycle 007 defines application contracts for identity, sessions, Business selection, bootstrap, Memberships, Invitations, Customers, Products, Sales, Payments, Allocations, Payment Requests, Expenses, reports, idempotency, concurrency, audit, external side effects, sensitive-data handling, and contract evolution.

Cycle 010 selects Fastify 5 as the server edge and Next.js 16 as the web presentation. Cycle 011 maps the semantic contracts to `/api/v1` JSON over HTTP, explicit command resources, opaque cookie sessions, CSRF requirements, Business-scoped paths, RFC 9457 errors, cursor pagination, freshness metadata, idempotency-key carriage, and outcome recovery. Cycle 015 implements the cross-cutting `v1` wire schemas without connecting either framework. Cycle 016 implements the global current-session response and a framework-independent inspection port without HTTP exposure. The server edge may import both application and contracts to map the application result into the wire envelope; application never imports contracts, and the mapper has no Fastify, cookie, persistence, or provider dependency. OpenAPI 3.2 remains a future derived or mechanically checked description under ADR 0033, never a competing handwritten authority.

Provider-specific integrations, such as object storage and future Pix providers, must be adapted at the boundary. Domain concepts should not depend on SDK objects from a bank, payment provider, cloud provider, or UI framework.

## Data and Tenancy

Sem Caderno is expected to serve multiple businesses. Tenant isolation is therefore a baseline concern.

Accepted model:

- A `Business` or establishment owns operational data.
- A `User` may have membership in one or more businesses.
- Every customer, product, sale, payment, payment allocation, expense, product photo, payment request, and audit-relevant business event must belong to exactly one business.
- Authorization checks must verify active business membership and required capability before access.
- Queries must be scoped by business to avoid cross-tenant data exposure.
- Tenant scoping by business identifier alone is not complete authorization; the current user, membership, business state, and capability must also be validated.
- Tenant-owned child records must belong to the same business as their parent.
- Cross-tenant reads, writes, child references, aggregates, exports, background work, and provider callbacks must fail closed.

The selected MVP implementation direction is PostgreSQL 18 on a supported minor release with one `sem_caderno` schema, PostgreSQL-generated UUIDv7 keys, explicit Business scope, composite tenant-aware foreign keys, application-enforced authorization/scoping, `node-postgres` repository adapters, and tenant-isolation tests. PostgreSQL Row-Level Security remains deferred as defense in depth. Schema-per-tenant and database-per-tenant are not selected for the MVP.

Cycle 012 selects the documented physical tables, type conventions, constraints, mapped indexes, `READ COMMITTED` baseline, invariant-specific row locks, optimistic versions, durable command execution/outcome records, transactional external-effect intent, projection tables/checkpoints, and expand-and-contract migration policy. Cycle 014 creates only the isolated node-pg-migrate workspace and empty migration boundary. Executable DDL, migration files, repository SQL, database configuration, connections, and migration execution remain unimplemented.

Cycle 006 defines logical records, relationships, conceptual uniqueness, repository responsibilities, consistency boundaries, idempotency evidence, audit evidence, projection responsibilities, and retention expectations. Those logical definitions are planning inputs for later API contracts and physical persistence design; they are not a database schema.

## Money, Dates, and Time Zones

Money:

- Monetary values must use integer minor units, such as centavos, or a safe decimal representation.
- Binary floating point must not be used for monetary values.
- The MVP canonical currency is BRL.
- The Cycle 002 canonical representation is integer minor units, where R$ 1.00 is `100`.

Dates and time:

- Business events should store UTC instants.
- Financial records should also store the business-local date and the business time-zone identifier used at event time.
- Report cutoffs use the stored business-local date.
- Historical business-local dates should not shift if the business time zone changes later.

## Audit and History

Financial behavior must preserve history:

- A sale may be paid immediately, partially paid, or unpaid.
- A customer may make multiple payments toward an outstanding balance.
- Payment history must not be destroyed when the current balance changes.
- Payments reduce sale debt through explicit payment allocations.
- Corrections use cancellation, reversal, and replacement rather than silent mutation.
- Financial records are not hard-deleted during normal operation.
- Financial stored facts must be separated from derived report and balance projections.
- Sale and Sale Item snapshots are canonical for sale totals; Product edits must not rewrite historical Sale Items.
- Payment and Payment Allocation changes must preserve allocation limits, same-Business references, and overpayment rejection inside the authoritative mutation boundary.
- External notifications, provider calls, exports, and object-storage actions must not create partial authoritative financial state.
- The first critical journey records fully paid Sales atomically with Payment and Allocation, partially paid Sales atomically with initial Payment and remaining debt, and unpaid Sales without Payment or Allocation.
- Daily result uses Payments received minus Expenses for the Business-local day and must not be labeled as formal accounting.

Audit-relevant business events should capture who performed an action, when it happened, which business it affected, and the domain object involved.

## Security Baseline

The selected authentication architecture uses application-owned, server-side, revocable sessions with opaque client identifiers. Authorization remains business-scoped and current-state validated. Sensitive business data, customer records, payment history, and product photos require proportional controls for a small-business product.

Authentication and onboarding baseline:

- Normalized email is the MVP conceptual identity channel.
- Email verification is required before active business operations.
- A User without an active membership cannot access tenant-owned operational data.
- Session authorization must revalidate after membership suspension, removal, role reduction, business deactivation, credential reset, or suspected compromise.
- Client-provided Business identifiers, remembered tenant context, URLs, and deep links are not sufficient authorization.

See [Privacy and LGPD](../security/privacy-and-lgpd.md) for security and privacy planning.

## Open Implementation Decisions

Cycles 010 through 014 close the topology, language, runtime, web, server, validation, database, data-access, session-authority, supporting-mobile, workspace, module, test-technology, transport, physical persistence, migration-tooling, scaffold-gate, and executable static-workspace direction. These mechanics remain open:

- Exact object storage provider for product photos.
- Deployment target and production infrastructure.
- PostgreSQL Row-Level Security remains deferred defense in depth; adoption and implementation mechanics require later threat-tested evidence.
- Merchant-visible Sale/Payment numbering remains unresolved; physical primary identifiers are UUIDv7.
- Remaining executable DDL, tenant repositories, transaction helper, and retry implementation beyond the Cycle 019 identity/session foundation.
- Cache, queue/broker, transactional-outbox dispatcher, and derived-projection consumer implementation.
- Backup vendor, restore procedure, and operational recovery targets.
- Fractional quantity scale and rounding mode if fractional quantities are required.
- Future mobile Sale, Payment, Expense, and correction scope.
- Customer duplicate-warning presentation; phone and email remain non-unique by accepted rule.
- Business-local visible sale/payment numbering.
- Future Argon2 parameter upgrades and credential-rehash policy after measured production evidence.
- Email delivery provider.
- Session/HMAC key rotation/cutover, cleanup/retention, login/logout/revocation commands, and deployment secret management.
- Sign-in/session/CSRF implementation, protected-operation authorization, and Business switching remain separate from the implemented ID05 read boundary.
- Exact remaining resource DTOs, OpenAPI generator selection, protected-operation CSRF enforcement, and correlation-header spelling.
- Final responsive layouts, visual system, and concrete accessibility tooling.
- Production migration environment safeguards, statement/lock timeouts, and backfill execution controls beyond the implemented history/checksum and advisory-lock baseline.

Each significant remaining decision should be recorded in an ADR before implementation depends on it.

## Explicit Session Resolution Boundary

Cycle 018 rejects hidden request-global current-session state. The future server edge extracts only the approved protected cookie, validates the versioned opaque credential, derives a keyed HMAC-SHA-256 lookup digest, discards the raw value, and invokes application code with explicit digest evidence plus one evaluation instant. The no-input `CurrentSessionStatePort` is therefore an implementation profile to replace, not a durable interface.

Application owns the inspection use case and a parameterized resolution port without Fastify, cookies, Node crypto, contracts, PostgreSQL, or ambient time. `@sem-caderno/persistence-postgres` receives only digest evidence and time, performs one parameterized lookup against `sessions` and `users`, and contains row/database details. Missing, malformed, unknown, revoked, expired, or disabled-User evidence becomes anonymous; database failure propagates. Fixed absolute expiry is the first profile, and equality with expiry is expired.

The nullable selected-Business value remains a remembered candidate. Session inspection returns it without Business/Membership joins or authorization. Protected tenant operations still revalidate User, verified identity where required, Business, Membership, capability, lifecycle, and same-Business references independently.

## Executable Session Persistence Foundation

Cycle 019 replaces `CurrentSessionStatePort` with application-owned `SessionResolutionPort`. `InspectCurrentSession` now receives optional canonical lookup evidence plus one explicit `evaluatedAt` instant, short-circuits absent evidence, maps a resolver miss to anonymous, and propagates infrastructure failure. Application and domain remain independent of contracts, Fastify, Node crypto, `pg`, and SQL.

`apps/server` owns a pure version 1 parser/digester using Node HMAC-SHA-256 with the exact Cycle 018 domain-separated byte sequence. The raw credential and HMAC key do not cross into application, contracts, or persistence. No HTTP request, cookie parser, hook, route, or implicit clock was introduced.

`@sem-caderno/database-migrations` owns three ordered migrations for the authorized minimum `users`, `businesses`, and `sessions` foundation. The migration wrapper uses node-pg-migrate ordering and transactional execution, a fail-fast advisory lock, `sem_caderno.schema_migrations`, and a SHA-256 checksum ledger. `@sem-caderno/persistence-postgres` owns one parameterized active-session query and row mapping. It joins only the User usability predicate; selected Business is returned without Business or Membership authorization.

## Executable Session Inspection Composition

Cycle 020 adds one internal `apps/server` composition boundary. Construction receives a server-held HMAC key and the application-owned `InspectCurrentSession` use case; construction validates and privately copies the key. Each execution receives only optional already-extracted string evidence and one explicit `Date`, reuses the Cycle 019 derivation function, invokes the application use case, and reuses the Cycle 016 transport mapper. The composition is not exported from the server package root and has no Fastify request/reply, cookie, header, environment, Pool, SQL, route, hook, middleware, listener, or hidden request context.

Missing and malformed evidence invoke application inspection without lookup evidence, so the application-owned short circuit returns anonymous without resolver or PostgreSQL access. Valid evidence supplies only the canonical lookup key and original evaluation instant. The composition has no catch block: invalid HMAC configuration fails at construction, while crypto, application, persistence, decoding, mapping, and unexpected failures propagate. The public contract remains unchanged and selected Business remains non-authorizing context.

The PostgreSQL integration suite uses the immutable accepted PostgreSQL 18.4 image digest, migrates an empty database, reruns the wrapper, and verifies constraints plus active/inactive/failure behavior. These tests prove this narrow persistence boundary only; they do not prove login, cookie transport, authorization, tenant-operation isolation, or product behavior.

## Executable HTTP Session Inspection Boundary

Cycle 022 implements the Cycle 021 HTTP/configuration authority as the direct `apps/server` route `GET /api/v1/session`. The server alone reads the `Cookie` header, accepts production cookie `__Host-sem-caderno-session` or the explicit loopback local profile `sem-caderno-session`, rejects duplicate configured names as ambiguous, and applies no percent decoding or credential repair. The maintained Fastify parser uses identity decoding; the narrow extractor additionally requires the parsed value to equal the raw value exactly so parser whitespace handling cannot repair evidence. Missing, malformed, unknown, revoked, expired, equal-expiry, or disabled-User evidence returns the same stable anonymous 200 response.

The server-local configuration loader accepts only the two fixed cookie profiles and `SEM_CADERNO_SESSION_HMAC_KEY_V1_BASE64URL` as exactly 32 canonical base64url bytes. It has no default and fails before application construction when configuration is missing or invalid. `buildApp` receives validated configuration plus the application-owned resolution port; it does not read environment variables, create a Pool, connect, or listen. Crypto, application, persistence, decoding, mapping, and unexpected execution failures map to safe 500 `INTERNAL_FAILURE` Problem Details rather than anonymous. The HMAC value remains server-only and the raw credential remains transient at the HTTP/composition edge.

The handler captures one `Date` at entry and passes that same `evaluatedAt` inward. Success and failure responses are `Cache-Control: no-store`; ID05 emits no cookie, CSRF token, accessible-Business list, ETag, or authorization claim. Read-only inspection needs no CSRF token, while ADR 0023 remains mandatory for every unsafe authenticated operation. The [HTTP session evidence specification](../specs/http-session-evidence-configuration-specification.md) owns exact parsing, configuration, route, failure, test, and deferral details.

Server injection tests prove strict configuration and evidence behavior, no-resolution malformed paths, stable responses, one explicit time, safe error redaction, and no cache/cookie leakage. A server-owned Testcontainers suite migrates PostgreSQL 18.4 from zero and proves active, unknown, revoked, and closed-pool behavior through the complete HTTP-to-adapter path. Raw SQL remains prohibited from server production code; only filename-scoped `apps/server/test/*.postgres.test.ts` fixture setup is allowed.

## Session Issuance and Sign-In Architecture

Cycle 023 selects local normalized-email/password verification for the initial MVP behind an application-owned verification port. PostgreSQL infrastructure owns Argon2id PHC retrieval and comparison; the application owns verification and issuance semantics but receives no HTTP, cookie, HMAC key, raw session evidence, or persistence row. Unknown identity, wrong password, disabled User, and missing credential binding remain one generic invalid-proof outcome; verifier and database failures remain infrastructure failures.

The server security edge independently generates fresh opaque session, pre-session CSRF, and authenticated CSRF evidence with the accepted platform CSPRNG. Only raw session and CSRF values required by browser transport remain transient at that edge. Application and persistence receive versioned keyed digests and explicit times. One atomic issuance transaction revalidates the User, consumes the pre-session challenge, revokes only the prior presented session, inserts a fixed 12-hour session with null selected Business, records minimal safe audit evidence, and clears the aggregate rate bucket before any cookie is written.

Cycle 024 implements the browser-safe ID00/ID04 schemas and inferred transport types without a route. ID04 input remains a strict email/password object; its parsed password is NFC-normalized, while primary-email normalization remains application-owned. Responses are additive and expose only pre-session/authenticated CSRF evidence, safe User identity, and expiry where accepted. `AUTHENTICATION_FAILED` is now a stable 401 Problem Details code.

Application owns a branded normalized-email value, one deterministic ASCII mailbox normalizer, the three-outcome password-verification port, and one digest-only issuance transaction port. The issuance input contains explicit User/time values plus session, pre-session-CSRF, authenticated-CSRF, and optional prior-session digests; it contains no raw session/CSRF evidence, selected Business, HTTP, cookie, HMAC key, Argon2, PostgreSQL, or transport type.

Cycle 025 implements only the verification adapter in `@sem-caderno/persistence-postgres`. It performs one parameterized lookup by the existing normalized primary email, validates the stored Argon2id PHC profile, and invokes `argon2` 0.45.1 once with either the persisted verifier or a fixed non-secret dummy verifier. Correct proof returns verified or email-verification-required according to existing User evidence; wrong, unknown, disabled, or missing-credential cases return invalid. Database, row, PHC-decoder, native verifier, and unexpected verifier failures reject and never become invalid proof.

Cycle 026 adds one application-owned `PreSessionChallengePort` and creation use case. The use case derives the fixed ten-minute expiry from one explicit creation instant and passes only a purpose-branded digest plus cloned lifecycle instants inward. The server edge parses canonical `p1` evidence and derives the digest with the accepted version-1 CSRF HMAC domain; raw evidence and the HMAC key never enter application or persistence.

`PostgresPreSessionChallengeAdapter` implements direct digest-only creation and guarded consumption. Its single parameterized `UPDATE` requires matching version/digest, no prior consumption, and `created_at <= consumedAt < expires_at`; PostgreSQL row locking and predicate re-evaluation permit exactly one concurrent winner. Unknown, expired, already-consumed, and otherwise unusable evidence returns the same negative internal result, while decoding, connection, query, and mapping faults reject. The future `SessionIssuanceTransactionPort` remains responsible for embedding challenge consumption in the complete atomic sign-in transaction; Cycle 026 does not compose or expose sign-in.

Cycle 027 closes rate-limit semantics without executable code. The future application owns a purpose-specific check/record/clear port receiving only a versioned account-key digest and explicit instants. The server edge derives that key from the accepted normalized email with HMAC-SHA-256 over the fixed rate domain, one zero byte, and the normalized-email UTF-8 bytes. PostgreSQL will own one linearizable fixed-start 15-minute aggregate per key, with a counter capped at 10, half-open expiry, exact 24-hour post-update retention deadline, and no attempt ledger. The tenth admitted invalid proof remains `AUTHENTICATION_FAILED` but closes subsequent checks until the window end; infrastructure and temporal-order failures reject.

The fourth migration adds only `user_password_credentials`: one restrictive User-owned row containing the Argon2id PHC verifier, creation/update instants, and positive version. The primary key is the User foreign key, so no extra identifier or lookup index is introduced. Password hashing/creation, verifier upgrades, sign-in orchestration, challenge/session issuance, and HTTP remain absent.

ID00/ID04 HTTP exposure and issuance infrastructure remain future executable boundaries. ID04 will write the existing profile cookie only after commit and return the independent authenticated CSRF value in a no-store body. Session creation authenticates only global User identity; future protected operations still revalidate Business, Membership, capability, lifecycle, and same-Business references. [ADR 0035](decisions/0035-local-email-password-session-csrf-issuance.md) and the [Session Issuance and Sign-In Specification](../specs/session-issuance-sign-in-specification.md) own the exact profile.

## Current Executable Baseline Non-Goals

- No merchant-facing application feature implementation.
- No migration outside the authorized identity/session foundation.
- No provider integrations.
- No mobile, CI, or deployment implementation.
