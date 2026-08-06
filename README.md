# Sem Caderno

Sem Caderno is a simple management system for small Brazilian businesses such as bars, small grocery stores, neighborhood shops, and similar establishments that currently use notebooks or informal records to track sales, customer debts, expenses, and payments.

The product is not a smaller ERP. It is a digital replacement for the notebook, designed for merchants who may not be comfortable with technology.

Suggested tagline:

> Vendas, fiados e despesas sem papel e sem confusão.

## Current Status

This repository has completed Cycle 001: SDD Foundation through Cycle 016: First Vertical Contract and Application Slice. Cycle 017: Revocable Session Resolution and Persistence Slice is accepted as partially complete because its authority audit stopped before inventing request-scoped session identity. Cycle 018 resolved that blocker, Cycle 019 implemented the explicit application and PostgreSQL boundary, Cycle 020 composed those internal boundaries, Cycle 021 specified the HTTP/configuration edge, and Cycle 022 implemented strict current-session HTTP inspection. Cycle 023 specifies local email/password verification, digest-only session issuance, a 12-hour absolute lifetime, fixation-resistant cookie writing, and pre-session/authenticated CSRF lifecycles. Cycle 024 implements browser-safe ID00/ID04 schemas, deterministic primary-email normalization, an application-owned password-verification port, and digest-only issuance transaction types. Cycle 025 implements that password-verification port with a narrow PostgreSQL/Argon2id adapter and the minimum hash-only User credential table. Cycle 026 now adds the application-owned ten-minute pre-session challenge boundary, server-edge `p1` HMAC derivation, digest-only PostgreSQL challenge state, and atomic one-time consumption. The executable baseline is 81 contract tests, 25 application tests, 71 server tests including a focused real PostgreSQL HTTP path, 30 persistence integration tests, and the architecture-validator self-test. No complete sign-in/session transaction, pre-session challenge HTTP route or CSPRNG generation, cookie writing, CSRF enforcement, authorization engine, product UI, provider integration, mobile application, CI, deployment, or production infrastructure has been implemented.

## Product Principles

- The interface must use everyday Brazilian Portuguese.
- Accounting and technical terminology must be avoided when simpler expressions exist.
- Common operations must require very few steps.
- Reports must answer practical questions instead of merely displaying charts.
- Accessibility and ease of use are more important than visual sophistication.
- The MVP must remain deliberately small.
- Security, privacy, auditability, and LGPD considerations must exist from the beginning.
- Domain rules must not depend directly on UI frameworks or third-party providers.
- Web and mobile clients may share contracts and domain concepts, but not necessarily UI components.
- New features must not enter the MVP without an explicit specification and scope decision.

## Documentation Map

- Product vision: [docs/product/vision.md](docs/product/vision.md)
- MVP scope: [docs/product/mvp-scope.md](docs/product/mvp-scope.md)
- Personas: [docs/product/personas.md](docs/product/personas.md)
- UX principles: [docs/product/ux-principles.md](docs/product/ux-principles.md)
- Domain and tenancy specification: [docs/specs/domain-and-tenancy.md](docs/specs/domain-and-tenancy.md)
- Authentication and business onboarding specification: [docs/specs/authentication-and-business-onboarding.md](docs/specs/authentication-and-business-onboarding.md)
- Data persistence and tenant enforcement specification: [docs/specs/data-persistence-and-tenant-enforcement.md](docs/specs/data-persistence-and-tenant-enforcement.md)
- First critical user journey specification: [docs/specs/first-critical-user-journey.md](docs/specs/first-critical-user-journey.md)
- Logical data model specification: [docs/specs/logical-data-model.md](docs/specs/logical-data-model.md)
- Application contracts specification: [docs/specs/application-contracts.md](docs/specs/application-contracts.md)
- Critical journey UX flow specification: [docs/specs/critical-journey-ux-flow.md](docs/specs/critical-journey-ux-flow.md)
- Low-fidelity interaction and screen-state specification: [docs/specs/low-fidelity-interaction-screen-state-spec.md](docs/specs/low-fidelity-interaction-screen-state-spec.md)
- Implementation architecture and technology selection specification: [docs/specs/implementation-architecture-technology-selection.md](docs/specs/implementation-architecture-technology-selection.md)
- Transport and API contract specification: [docs/specs/transport-api-contract-specification.md](docs/specs/transport-api-contract-specification.md)
- Physical persistence model specification: [docs/specs/physical-persistence-model-specification.md](docs/specs/physical-persistence-model-specification.md)
- Workspace scaffolding and tooling specification: [docs/specs/workspace-scaffolding-tooling-specification.md](docs/specs/workspace-scaffolding-tooling-specification.md)
- Session credential resolution and lifecycle specification: [docs/specs/session-credential-resolution-lifecycle-specification.md](docs/specs/session-credential-resolution-lifecycle-specification.md)
- HTTP session evidence and configuration specification: [docs/specs/http-session-evidence-configuration-specification.md](docs/specs/http-session-evidence-configuration-specification.md)
- Session issuance and sign-in specification: [docs/specs/session-issuance-sign-in-specification.md](docs/specs/session-issuance-sign-in-specification.md)
- Architecture baseline: [docs/architecture/architecture.md](docs/architecture/architecture.md)
- Domain model baseline: [docs/architecture/domain-model.md](docs/architecture/domain-model.md)
- Architecture decisions: [docs/architecture/decisions/README.md](docs/architecture/decisions/README.md)
- Test strategy: [docs/quality/test-strategy.md](docs/quality/test-strategy.md)
- Security, privacy, and LGPD: [docs/security/privacy-and-lgpd.md](docs/security/privacy-and-lgpd.md)
- Task plan: [docs/tasks.md](docs/tasks.md)

## Traceability

Future delivery must preserve traceability from product requirement to specification, task, implementation, and validation:

1. Product requirement or problem statement.
2. Approved specification or ADR when needed.
3. Task entry with objective, scope, non-goals, and acceptance criteria.
4. Implementation changes linked to the task.
5. Validation evidence from tests, inspections, or manual checks actually performed.

## Selected Initial Technical Direction

Cycle 010 selects the implementation baseline without creating it:

- Topology: modular monolith authoritative server with a separately deployable web presentation.
- Language and runtime: TypeScript on Node.js 24 LTS.
- Web: Next.js 16 App Router with React.
- Server edge: Fastify 5; domain and application behavior remain framework-independent.
- Validation: Zod 4 at untrusted contract boundaries.
- Persistence: PostgreSQL 18 current minor through explicit `node-postgres` repository adapters.
- Sessions: application-owned, server-side, revocable sessions; credential/provider selection remains deferred.
- Mobile: responsive web is the initial supporting-mobile delivery; no separate mobile application is selected yet.
- Workspace: pnpm workspaces without Turborepo or Nx initially.
- Tests: Vitest, React Testing Library, Playwright, axe-core integration, and real PostgreSQL integration through Testcontainers when implementation begins.

Cycle 011 adds the transport baseline without implementing it:

- API: versioned JSON over HTTP under `/api/v1`, with resource queries and explicit financial/lifecycle commands.
- Sessions: same-origin opaque Secure/HttpOnly cookie sessions with layered CSRF protection.
- Tenant context: Business scope is explicit in tenant paths and is revalidated server-side on every operation.
- Errors: RFC 9457 Problem Details with stable machine codes and separate Brazilian Portuguese presentation copy.
- Reliability: required `Idempotency-Key`, visibly safe replay, and first-class unknown-outcome recovery.
- Contracts: OpenAPI 3.2 is the future wire description; Zod is the runtime boundary validator, not domain authority.

Cycle 012 adds the physical persistence baseline without creating it:

- Organization: one application-owned `sem_caderno` PostgreSQL schema with PostgreSQL-generated UUIDv7 primary keys.
- Tenancy: every tenant record repeats `business_id`, and tenant children use composite foreign keys to prevent cross-Business references.
- Financial storage: BRL integer minor units, immutable Sale Item snapshots, explicit Payment Allocations, and append-only correction/reversal evidence.
- Reliability: durable command execution/outcome evidence, first-class unknown-outcome recovery, transactional external-effect intent, and rebuildable projection checkpoints.
- Concurrency: `READ COMMITTED` baseline with optimistic versions and invariant-specific row locking; RLS remains deferred defense in depth.
- Evolution: ordered expand-and-contract migrations with roll-forward as the production default.

Cycle 013 closes the workspace and tooling baseline without creating it:

- Workspace: seven private members for web, server, domain, application, contracts, PostgreSQL adapters, and database migrations; mobile, provider adapters, shared test support, and a projection worker remain deferred.
- Baseline: Node.js 24.19.0, pnpm 11.20.0, TypeScript 6.0.3, ESM, explicit package exports, project references, and one frozen root lockfile are the initial scaffold direction.
- Enforcement: pnpm, TypeScript, ESLint, dependency-cruiser, package exports, and a narrow repository validator enforce structural boundaries without replacing semantic tests.
- Database tooling: `node-pg-migrate` 9 in an isolated database-tool workspace; PostgreSQL 18.4 Testcontainers are reserved for real integration tests.
- Delivery: ordered validation gates and an explicit Cycle 014 file plan bound the first executable scaffold.

Cycle 014 implements the bounded scaffold, Cycle 015 adds the cross-cutting executable contract baseline, and Cycle 016 adds the first vertical contract/application boundary:

- Runtime: `.nvmrc`, root engine policy, and `packageManager` pin Node.js 24.19.0 and pnpm 11.20.0; Corepack 0.35.0 was used to activate pnpm.
- Workspace: exactly the seven approved private members exist, with first-party dependencies declared through `workspace:*`.
- Boundaries: ESM, strict TypeScript, project references, explicit package exports, ESLint restrictions, dependency-cruiser, and a narrow structural validator enforce the approved dependency direction.
- Applications: the Fastify edge only constructs an empty application, and the Next.js App Router only renders a neutral technical scaffold page.
- Database: `tools/database` isolates node-pg-migrate configuration and preserves an empty migrations directory; there is no migration, SQL, connection, PostgreSQL process, container, or Testcontainers harness.
- Contracts: Zod 4.4.3 is declared only by `@sem-caderno/contracts`; reviewed schemas own runtime wire validation, TypeScript types are inferred, and future OpenAPI must be derived or mechanically checked rather than handwritten separately.
- Coverage: `v1` scalars, JSON safety, money, dates, session/selected-Business context, Problem Details codes, command/replay/recovery state, concurrency validators, cursor metadata, projection freshness, and response envelopes are implemented. Exact resource DTOs remain deferred until their accepted fields are closed.
- Session inspection: `@sem-caderno/contracts` owns the exact response envelope, `@sem-caderno/application` owns its own anonymous/authenticated model and `CurrentSessionStatePort`, and `apps/server` owns the pure application-to-transport mapper without registering a route.
- Boundaries: selected Business is optional session context only; the mapper performs no authentication, authorization, Membership/capability lookup, persistence access, cookie handling, or enrichment.
- Validation: formatting, documentation, lint, type-check, architecture checks, 54 contract tests, 4 application tests, 5 mapper tests, package/server/tool/web production builds, and static migration checks run from root. PostgreSQL, routes, authentication, product behavior, browser journeys, mobile, provider, and deployment gates remain deferred.

Cycle 018 selects explicit request evidence rather than hidden request context. Cycle 019 applies it: `InspectCurrentSession` accepts optional normalized lookup evidence and one `evaluatedAt` instant, `SessionResolutionPort` owns the inward application boundary, the server edge validates and digests the raw credential with Node HMAC-SHA-256, and `PostgresSessionResolutionAdapter` receives only digest evidence and time. Three ordered TypeScript migrations create only the authorized identity/session parent foundation. Real PostgreSQL 18.4 tests migrate from zero and prove digest constraints, foreign keys, active/revoked/expired/equality behavior, disabled-User handling, selected-Business context, and fail-closed database errors.

The Cycle 016 public response remains unchanged. Cycle 020 adds one internal server composition that validates HMAC configuration at construction, reuses the Cycle 019 credential derivation, passes only lookup evidence and the original evaluation instant to `InspectCurrentSession`, and maps the result through the existing transport mapper. Missing or malformed evidence becomes anonymous without resolver access; configuration, crypto, application, mapping, and PostgreSQL failures propagate. Selected Business remains context, never authorization.

Cycle 021 selects `GET /api/v1/session`, production cookie `__Host-sem-caderno-session`, loopback-only local cookie `sem-caderno-session`, exact no-decoding/duplicate-rejection behavior, server-only `SEM_CADERNO_SESSION_HMAC_KEY_V1_BASE64URL`, one handler-entry evaluation instant, `Cache-Control: no-store`, and safe `INTERNAL_FAILURE` Problem Details. Cycle 022 implements that boundary with `@fastify/cookie` 11.1.2, preserves the stable ID05 contract, and proves active, unknown, revoked, and database-failure behavior through Fastify and real PostgreSQL 18.4. Cycle 023 selects the initial local normalized-email/password verifier behind an application port, independent 256-bit session/CSRF evidence, a fixed 12-hour session, atomic presented-session replacement, strict cookie writing, and digest-only CSRF/rate persistence. Cycle 024 implements the strict ID00/ID04 transport shapes and inferred types plus the framework-independent normalization, verifier, and issuance-port boundary. Cycle 025 adds `argon2` 0.45.1 only to PostgreSQL infrastructure, one hash-only credential table, and a parameterized adapter that performs actual or fixed-dummy Argon2id verification while keeping database/verifier failures distinct from invalid proof. Cycle 026 reuses the accepted server HMAC key with the CSRF-specific domain label, persists only the 32-byte digest and explicit lifecycle state, and uses one guarded PostgreSQL update so only one concurrent consume succeeds before expiry. Application receives no raw pre-session evidence, HMAC key, PostgreSQL type, or authorization claim. See the [sign-in specification](docs/specs/session-issuance-sign-in-specification.md), [HTTP session evidence specification](docs/specs/http-session-evidence-configuration-specification.md), [session credential specification](docs/specs/session-credential-resolution-lifecycle-specification.md), [application contracts](docs/specs/application-contracts.md), [authentication specification](docs/specs/authentication-and-business-onboarding.md), [transport specification](docs/specs/transport-api-contract-specification.md), [physical persistence specification](docs/specs/physical-persistence-model-specification.md), and [ADRs](docs/architecture/decisions/README.md).
