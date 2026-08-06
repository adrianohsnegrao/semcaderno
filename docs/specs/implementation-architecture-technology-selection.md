# Implementation Architecture and Technology Selection Specification

## 1. Status and Metadata

- Status: Accepted for planning.
- Cycle: 010 - Implementation Architecture and Technology Selection Specification.
- Task: 001 - Select the Initial Application Architecture, Technology Stack, and Workspace Boundaries.
- Scope: Documentation and architecture decisions only.
- Technology evidence verified: 2026-08-01.
- Product language: merchant-facing content remains Brazilian Portuguese; this architecture document is English.

## 2. Purpose, Scope, and Authority

Cycles 001 through 009 established the product boundary, domain and tenancy rules, authentication and onboarding behavior, persistence invariants, critical journey, logical data model, application contracts, behavioral UX, and low-fidelity interaction states. Technology selection is now appropriate because implementation boundaries can be evaluated against stable behavior instead of allowing tools to invent behavior.

This specification selects the minimum implementation topology, runtime, languages, framework boundaries, persistence access, session architecture, supporting-mobile delivery, workspace organization, validation approach, test architecture, and governance needed to unblock later specifications. It does not implement them.

Authority remains, in descending order of behavioral specificity:

1. [MVP Scope](../product/mvp-scope.md) and accepted product decisions.
2. [Domain and Tenancy Specification](domain-and-tenancy.md), [Authentication and Business Onboarding Specification](authentication-and-business-onboarding.md), and [Data Persistence and Tenant Enforcement Specification](data-persistence-and-tenant-enforcement.md).
3. [First Critical User Journey Specification](first-critical-user-journey.md) and [Logical Data Model Specification](logical-data-model.md).
4. [Application Contracts Specification](application-contracts.md).
5. [Critical Journey UX Flow Specification](critical-journey-ux-flow.md) and [Low-Fidelity Interaction and Screen-State Specification](low-fidelity-interaction-screen-state-spec.md).
6. Accepted [ADRs](../architecture/decisions/README.md).
7. This specification for technology and implementation boundaries.

If a selected tool appears to conflict with an accepted business rule, the business rule wins and the technology decision must be revisited. Later transport/API, physical-persistence, scaffolding, authentication-integration, provider, and deployment cycles must consume this specification without treating deferred mechanics as decided.

### Decided here

- A modular monolith application server with a separately deployable web presentation application.
- TypeScript as the primary implementation language.
- Node.js 24 LTS as the initial runtime baseline.
- Next.js 16 App Router with React for the responsive web application.
- Fastify 5 for the authoritative server transport adapter and composition boundary.
- Zod 4 for runtime validation of untrusted data at contract boundaries.
- PostgreSQL 18, on its current supported minor release, as the relational engine baseline.
- `node-postgres` as the initial low-level PostgreSQL driver behind explicit repository adapters.
- Server-side, revocable, opaque sessions owned by the application; credential and delivery providers remain adapters.
- Responsive web as the initial supporting-mobile delivery; no separate mobile application in the initial workspace.
- A pnpm workspace without Turborepo or Nx initially.
- The initial test and observability technology categories.

### Not decided here

- Transport style, routes, methods, status codes, DTOs, serialization, or versioning mechanism.
- Physical records, tables, columns, identifiers, indexes, constraints, SQL, migrations, transaction isolation, locking, or RLS policies.
- Concrete session exchange, credential mechanism, password policy, authentication library, identity provider, email provider, or session-store representation.
- Queue, outbox, worker deployment, projection storage, cache, object storage, analytics, hosted observability, cloud, or deployment manifests.
- UI components, CSS, visual design, or final browser persistence.

Unresolved product questions such as fractional quantity, Manager exposure, Staff expense visibility, mobile mutation scope, and correction-date presentation remain product decisions. Technology must accommodate later accepted answers without deciding them silently.

## 3. Architectural Drivers

| Driver | Required architectural response | Repository source |
| --- | --- | --- |
| Practical use by small merchants | Fast, accessible, form-oriented responsive web with low operational complexity | [Vision](../product/vision.md), [UX Flow](critical-journey-ux-flow.md) |
| Complete web journey | Web presentation supports every accepted operation but does not become financial authority | [ADR 0003](../architecture/decisions/0003-web-primary-mobile-supporting-client.md), [Low-Fidelity Specification](low-fidelity-interaction-screen-state-spec.md) |
| Supporting mobile | Same server semantics and reports; no unaccepted mobile mutation scope | [ADR 0003](../architecture/decisions/0003-web-primary-mobile-supporting-client.md), [UX Flow](critical-journey-ux-flow.md) |
| Brazilian Portuguese and accessibility | Semantic HTML, explicit focus/status control, reflow, keyboard operation, and manual accessibility review | [UX Principles](../product/ux-principles.md), [Low-Fidelity Specification](low-fidelity-interaction-screen-state-spec.md) |
| Global User plus Business Membership | Global identity boundary separated from tenant authorization and operational records | [ADR 0010](../architecture/decisions/0010-global-user-tenant-memberships.md) |
| Business tenancy | Tenant context is mandatory in application and repository calls; a selected Business is never authorization | [ADR 0006](../architecture/decisions/0006-business-as-tenant-boundary.md), [ADR 0012](../architecture/decisions/0012-server-validated-active-business-context.md), [ADR 0013](../architecture/decisions/0013-tenant-scope-persistence-operations.md) |
| Current authorization | Server revalidates User, session, Business, Membership, state, and capability at authoritative operations | [Application Contracts](application-contracts.md) |
| Last active Owner and Business deactivation | Concurrency-sensitive invariants remain inside an authoritative transaction boundary | [Authentication Specification](authentication-and-business-onboarding.md), [Logical Data Model](logical-data-model.md) |
| Financial authority | Server-side domain/application layers recalculate and commit canonical facts transactionally | [ADR 0005](../architecture/decisions/0005-safe-money-representation.md), [ADR 0014](../architecture/decisions/0014-canonical-records-derived-projections.md) |
| Safe money | BRL integer minor units; no binary floating-point authority | [ADR 0005](../architecture/decisions/0005-safe-money-representation.md) |
| Business-local dates | UTC instants, operational dates, IANA time-zone context, and historical context remain distinct | [ADR 0009](../architecture/decisions/0009-business-time-zone-operational-reporting.md) |
| Payment and debt semantics | Payment and Allocation remain separate; Sale state and debt are derived | [ADR 0007](../architecture/decisions/0007-explicit-payment-allocations.md), [Logical Data Model](logical-data-model.md) |
| Idempotency and unknown outcomes | Durable command evidence, safe replay, and authoritative result rediscovery | [Application Contracts](application-contracts.md), [Low-Fidelity Specification](low-fidelity-interaction-screen-state-spec.md) |
| History-preserving corrections | Explicit cancellation, reversal, replacement, and audit references; no ordinary hard deletion | [ADR 0008](../architecture/decisions/0008-financial-history-cancellation-reversal.md) |
| Rebuildable projections | Canonical records remain authoritative; read models expose freshness and can be rebuilt | [ADR 0014](../architecture/decisions/0014-canonical-records-derived-projections.md) |
| External delivery independence | Post-commit retry and deduplication without treating delivery as Payment | [ADR 0004](../architecture/decisions/0004-payment-provider-domain-boundary.md), [ADR 0015](../architecture/decisions/0015-external-side-effects-after-commit.md) |
| Sensitive-data minimization | Central redaction, least-data queries, secure sessions, and provider isolation | [Privacy and LGPD](../security/privacy-and-lgpd.md) |
| Unstable connectivity and shared/lost devices | Revocable sessions, idempotent commands, recoverable outcomes, and no client-only authority | [UX Flow](critical-journey-ux-flow.md), [Application Contracts](application-contracts.md) |
| Small-team maintainability | One language, one authoritative server, one relational database, few build layers, replaceable adapters | [MVP Scope](../product/mvp-scope.md), [ADR 0002](../architecture/decisions/0002-keep-mvp-deliberately-small.md) |

No quantitative throughput, tenant count, availability target, RPO, or RTO is assumed because the repository has not accepted one.

## 4. Constraints and Non-Functional Requirements

The implementation must support:

- Application-enforced tenant isolation for reads, writes, references, aggregates, exports, callbacks, repair, and projection rebuilding.
- Server-side authorization independent of UI visibility and client Business selection.
- Multi-record all-or-nothing financial operations and concurrency-sensitive invariant checks.
- Durable idempotency results and retrieval after timeouts or interrupted connectivity.
- Append-preserving financial history and historical actor references.
- Recalculation of Sale totals, Allocations, debt, and daily result from canonical records.
- BRL integer minor-unit arithmetic and explicit overflow/negative/rounding validation.
- UTC instants plus Business-local dates and historically applicable time-zone context.
- Rebuildable projections with explicit freshness and reconciliation behavior.
- Post-commit external attempts that can retry and deduplicate without reversing valid financial commits.
- Privacy-oriented minimization across storage adapters, logs, telemetry, errors, tests, and support evidence.
- Semantic, keyboard-operable, screen-reader-compatible responsive interaction.
- Local development and deterministic tests without live external providers.
- Reproducible dependency resolution, supported runtime lines, explicit security updates, and reviewable upgrades.
- Operation by a small team without a service mesh, distributed transactions, or multiple persistence engines.

PostgreSQL Row-Level Security remains deferred and unimplemented. Application-level tenant scoping remains mandatory whether RLS is later adopted or not.

### Accepted behavior preserved by the selected architecture

The stack changes no accepted product or domain responsibility:

- Web owns the complete accepted operational journey. Responsive web is the initial supporting-mobile delivery, and no mobile mutation scope is added.
- The active Business remains globally visible. Business switching removes previous-Business names, records, amounts, drafts, suggestions, photos, and cached view state before target-Business data appears.
- A selected or remembered Business is contextual input, never authorization. Suspended or removed Membership cannot authorize; Business deactivation blocks ordinary operations; current capability is revalidated at authoritative confirmation.
- Last-active-Owner protection remains a server-side, concurrency-safe invariant inside the authoritative mutation boundary.
- Anonymous Sales remain limited to fully paid counter Sales. Partial and unpaid Sales require a Customer.
- Customer phone and email remain optional and non-unique; same-name Customers remain valid.
- Product edits cannot rewrite Sale Item snapshots. Catalog and ad hoc Sale Items remain supported, and inventory remains outside the MVP.
- Client totals remain previews. The server recalculates canonical totals; Sale state and debt remain derived.
- Payment is the cash-receipt fact. Allocation is only the destination of received money and is not another receipt.
- Payment Requests do not reduce debt, and request delivery never proves Payment.
- Overpayment and Customer credit remain outside the MVP.
- Cancellation, reversal, correction, and replacement preserve history; financial records are not ordinarily hard-deleted.
- Safe replay does not duplicate a financial record. An unknown outcome remains recoverable and is not treated as confirmed failure.
- UTC instants, Business-local dates, and historical time-zone context remain distinct. Projection freshness remains visible and projections remain rebuildable.
- Daily operational result remains `paymentsReceivedTodayMinor - expensesTodayMinor`; it is not profit, DRE, bookkeeping, or an accounting result.
- External attempts remain outside authoritative financial commits. Delivery state is not internal financial authority.
- Sensitive-data minimization, cross-Business non-disclosure, responsive parity, and accessibility obligations apply across every selected boundary.

## 5. Candidate Evaluation Method

Selections use qualitative gates rather than manufactured scores.

### Mandatory criteria

- Preserves accepted domain, authorization, financial, idempotency, recovery, privacy, and UX behavior.
- Is actively supported and has primary documentation.
- Supports transactional PostgreSQL work and deterministic tests.
- Keeps client input outside authoritative financial and authorization decisions.
- Can be operated locally and deployed without mandatory proprietary infrastructure.
- Does not require microservices, event sourcing, CQRS, or provider lock-in.

### Strongly preferred criteria

- End-to-end TypeScript where it reduces contract drift.
- Mature accessibility and browser-testing ecosystem.
- Explicit dependency direction and replaceable infrastructure adapters.
- Small-team productivity, readable code, stable ecosystem, and good security maintenance.
- Portable deployment and standard PostgreSQL compatibility.
- Low conceptual overhead for a portfolio-quality implementation.

### Optional criteria

- Build caching, code generation, native mobile reuse, edge execution, serverless optimization, and hosted platform integrations.

Optional benefits never compensate for failing a mandatory criterion. A candidate can be rejected because it adds responsibility that the MVP does not need, even when technically capable.

## 6. Overall Implementation Topology

### Selected topology

Use a modular monolith application server and PostgreSQL, with a separately deployable Next.js web presentation application.

Conceptually:

```text
Responsive web presentation (Next.js)
                 |
      future transport contract
                 |
Authoritative modular server (Fastify composition boundary)
  | domain | application | authorization | idempotency |
  | repositories | projections | integration adapters |
                 |
           PostgreSQL 18

Post-commit worker entrypoint (same codebase and application modules)
                 |
       external provider adapters
```

This diagram defines trust and dependency boundaries, not processes, routes, queue topology, or deployment infrastructure.

### Authority and trust boundaries

- The browser and Next.js presentation layer are untrusted callers. Client calculations are previews.
- The Next.js server runtime may render and mediate presentation concerns but must not connect directly to PostgreSQL or implement authoritative financial commands.
- The Fastify server composes the authoritative application boundary. Domain and application services revalidate session, User, Business, Membership, Business state, capability, resources, current state, and invariants.
- PostgreSQL is the authoritative persistence engine for canonical records and consistency evidence.
- Projection data is derived and replaceable. It never overrides canonical facts.
- External integrations receive post-commit intent through adapters. Provider state is not financial authority.
- A future mobile client calls the same authoritative server boundary and receives the same semantics.

### Alternatives

- Full-stack Next.js with direct database access was rejected because framework server actions and presentation caching could obscure the single authoritative boundary and encourage web-only contracts.
- Separate web and API microservices by domain were rejected because the MVP does not justify distributed consistency, deployment, and observability costs.
- Service-oriented architecture was reserved for evidence of independent scaling, ownership, or release needs.

The modular server can be decomposed later because domain and application packages do not depend on Fastify, PostgreSQL, or provider SDKs.

## 7. Web Technology Selection

### Selection

Use Next.js 16 App Router with React and TypeScript for the responsive web application.

The web application owns all accepted operational screens. It uses server rendering where useful for initial read surfaces and Client Components only where browser state, events, focus management, progressive forms, or recovery interactions require them. All tenant-owned reads and commands still cross the authoritative server boundary; Server Components are not a persistence shortcut.

### Fit

- React supports the form-heavy, state-rich flows specified in Cycles 008 and 009.
- Next.js provides a maintained rendering and build model, TypeScript integration, server/client composition, and portable Node.js deployment.
- App Router supports presentation shells and loading/error boundaries, but these framework states must map to the stable application/UX state catalogue rather than replace it.
- The selected browser baseline is initially Next.js 16's official default: Chrome 111+, Edge 111+, Firefox 111+, and Safari 16.4+. Merchant device research is an acceptance gate; evidence of older browsers triggers a support-policy review.
- Business switching must key all presentation state by validated Business context and clear prior-Business data before target data renders. Framework caches cannot retain tenant data across a switch.
- Session invalidation and capability changes are authoritative server results, not inferred from rendered controls.

Official evidence: [Next.js 16 requirements and browser baseline](https://nextjs.org/docs/app/guides/upgrading/version-16), [App Router getting started](https://nextjs.org/docs/app/getting-started), and [portable Node.js deployment](https://nextjs.org/docs/app/getting-started/deploying).

### Alternatives

- React Router 7 with Vite was credible and gives more explicit client architecture. It was not selected because Sem Caderno benefits from an integrated rendering/build baseline and server-rendered entry surfaces, while the separate authoritative server prevents Next.js from owning business behavior. [React Router supports declarative, data, and framework modes](https://reactrouter.com/routers/home), which adds a choice the project does not need initially.
- A static single-page application was not selected because initial-session, Business-context, resilient loading, and deployable rendering needs benefit from a server-capable web boundary.
- Vue, Angular, Svelte, and other capable frameworks were not evaluated as token alternatives; no accepted requirement distinguishes them enough to displace the TypeScript/React ecosystem selected for web and testing.

## 8. Server and Application Runtime Selection

### Selection

- Runtime: Node.js 24 LTS, pinned to the latest supported patch during scaffolding.
- Language: TypeScript for web, server, domain, application, contracts, adapters, and tests.
- Server framework: Fastify 5 at the transport/composition edge only.
- Runtime validation: Zod 4 for untrusted application/contract inputs and adapter outputs.

Node.js recommends production use of Active or Maintenance LTS lines; Node.js 24 is LTS on the verification date. Next.js 16 requires Node.js 20.9 or later, Fastify 5 requires Node.js 20 or later, Vitest 4 requires Node.js 20 or later, and `node-postgres` documents compatibility with Node.js 24. The selected baseline is therefore compatible according to official sources. See [Node.js releases](https://nodejs.org/en/about/previous-releases), [Next.js 16 requirements](https://nextjs.org/docs/app/guides/upgrading/version-16), [Fastify 5 migration requirements](https://fastify.dev/docs/v5.0.x/Guides/Migration-Guide-V5/), [Vitest requirements](https://vitest.dev/guide/), and [`node-postgres` compatibility](https://node-postgres.com/).

### Application organization

- Domain modules contain financial, lifecycle, date, role/capability, and relationship rules without framework imports.
- Application modules implement commands, queries, authorization orchestration, transaction intent, idempotency, audit obligations, and post-commit intent.
- Fastify adapters translate future transport input into application contracts and translate stable application errors outward. They do not contain domain rules.
- Zod validates untrusted shape and allowed values. It does not replace domain invariants, tenant authorization, database constraints, or concurrency control.
- A composition root wires repositories, clocks, identity/session authority, audit, idempotency, projections, and external adapters.

Fastify was selected over NestJS because the accepted architecture already defines its own modules and dependency direction. Fastify supplies a small, testable edge and built-in request injection without imposing a second application model. NestJS remains capable, supports Node.js 20+, TypeScript, Express, and Fastify, but its module/decorator/DI conventions add abstraction not required for this modular monolith. See [Fastify testing](https://fastify.dev/docs/latest/Guides/Testing/), [Fastify validation](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/), and [NestJS first steps](https://docs.nestjs.com/first-steps).

[Zod 4](https://zod.dev/) is selected because it provides TypeScript-first runtime validation with no provider or framework dependency. Schema parsing remains at boundaries; authoritative recalculation and authorization remain application/domain work.

## 9. Persistence Technology Boundary

### Selection

- Relational engine: PostgreSQL 18, kept on its current supported minor release.
- Access technology: `node-postgres` (`pg`) behind explicit tenant-aware repository adapters.
- Migrations: required later, but the migration technology and physical migration plan are deferred to the physical persistence cycle.
- RLS: deferred and not implemented.

PostgreSQL fits atomic financial mutations, same-Business reference integrity, historical records, idempotency evidence, audit evidence, projections, reconciliation, and local integration testing. PostgreSQL documents transactions as all-or-nothing operations whose intermediate changes are not visible, matching accepted consistency boundaries. PostgreSQL 18 is supported through November 2030 on the verification date; the project must use supported minor releases and plan major upgrades. See [PostgreSQL transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html) and [versioning policy](https://www.postgresql.org/support/versioning/).

`node-postgres` is selected because it exposes PostgreSQL transactions and queries without requiring an ORM schema or generated model to become a competing source of domain truth. Its low-level nature is deliberate: repository adapters must own parameterized queries, row mapping, tenant scope, and transaction participation. Transaction helpers must guarantee one database client across a consistency boundary, as required by the [official transaction guidance](https://node-postgres.com/features/transactions).

### Tradeoffs and mitigations

- Direct access provides less compile-time query safety than an ORM. Mitigate with small repositories, explicit mapping, Zod validation at adapter boundaries where appropriate, integration tests against real PostgreSQL, code review, and physical-schema contract tests.
- SQL knowledge is required. That is acceptable because financial consistency and tenant scoping require deliberate relational behavior regardless of access library.
- Prisma was not selected because its generated client, declarative schema, and migration system would make a tool-specific model central before the physical model is specified. Prisma remains a revisit option if mapping burden exceeds the value of explicit control. [Prisma's official overview](https://www.prisma.io/docs/orm) confirms those integrated responsibilities.
- Drizzle was not selected because it also couples TypeScript schema/query definitions to physical design, and its official PostgreSQL guide was still showing release-candidate packages on the verification date. It remains a revisit option after the physical model if it can preserve repository and transaction boundaries. See [Drizzle PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql).
- A document database was rejected because the accepted model is relationship-heavy, transaction-sensitive, and requires cross-record invariants and rebuildable reporting.

No physical table, identifier, index, constraint, lock, isolation level, or query is selected here.

## 10. Authentication and Session Architecture

### Selection

Use application-owned, server-side, revocable sessions represented to clients by an opaque session identifier. The authoritative server resolves session state and revalidates current User, verified identity, Business, Membership, Business state, Membership state, and capability for every protected application operation.

The session architecture must support:

- Current-session termination and revocation of other sessions.
- Revocation or bounded revalidation after credential reset, suspected compromise, Membership suspension/removal, capability reduction, and Business deactivation.
- Shared-device sign-out and lost-device response.
- Rotation after authentication or privilege changes.
- Idle and absolute expiration policies once operational research sets durations.
- No role, capability, Business authorization, personal data, or financial data encoded as client-authoritative session content.
- No raw session identifier in logs, audit, analytics, diagnostics, or support evidence.

This direction aligns with OWASP guidance that the client-side session identifier be meaningless while application logic remains server-side, and that expiration/logout invalidate server state. See the [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

The exact credential mechanism, password policy, account-recovery mechanism, authentication library, email-verification provider, session exchange attributes, anti-CSRF design, and physical session store remain deferred. They must fit this boundary and cannot weaken server-side revocation. A managed identity provider may handle credential proof only through an adapter; it does not own Business Membership, capability, financial authorization, or tenant context.

Alternatives rejected now:

- Self-contained client-authoritative role or Business tokens, because current Membership/capability/Business state must be revalidated.
- A mandatory managed identity vendor, because no repository evidence justifies lock-in before credential and operational requirements are validated.
- Next.js-only session authority, because the supporting mobile client and authoritative Fastify server require one application session source.

## 11. Supporting Mobile Strategy

The initial supporting-mobile delivery is the responsive Next.js web application in a mobile browser. No separate native, cross-platform, thin-shell, or installable application is selected or created in the initial workspace.

This choice preserves scope:

- Web still owns the complete journey.
- Supporting mobile can expose authorized Home summaries, reports, Sales/Payment history, Customer debt, recent activity, Business switching, and session security through responsive surfaces already specified.
- Payment Request and product-photo support remain capability and merchant-validation questions; browser support may be evaluated without selecting a provider or native API.
- Mobile Sale, Payment, Expense, correction, team administration, offline mutation, and synchronization remain unaccepted.
- Unknown outcomes and subsequently recovered results use the same server semantics on every screen size.

Revisit a dedicated mobile client only when merchant research demonstrates material value that responsive web cannot provide, such as reliable photo capture, operating-system sharing, device security, notifications, or constrained connectivity. A later client must consume the same transport and application contracts and cannot duplicate domain authority.

## 12. Workspace and Module Boundaries

Use a pnpm workspace. The following names are proposed conceptual boundaries for the scaffolding cycle and may be adjusted without changing the dependency rules:

| Boundary | Responsibility | May depend on |
| --- | --- | --- |
| `apps/web` | Next.js presentation, responsive interaction, focus/state behavior, transport client | public contracts and web-only presentation utilities |
| `apps/server` | Fastify adapter, composition root, process entrypoints | application, contracts, and infrastructure adapters |
| `packages/domain` | Framework-independent entities, value rules, calculations, lifecycle invariants | standard language facilities only |
| `packages/application` | Commands, queries, authorization orchestration, transaction intent, idempotency/audit obligations | domain and application-facing ports |
| `packages/contracts` | Transport-neutral application intent/result/error schemas and validation | Zod and dependency-free semantic types; never web or persistence |
| `packages/persistence-postgres` | PostgreSQL repositories, row mapping, transaction adapter, projection persistence | application ports, domain mapping types, `node-postgres` |
| `packages/integration-adapters` | Email, message, photo, analytics, and future payment-provider adapters | application ports; provider SDKs only inside adapters |
| `packages/test-support` | Builders, clocks, fakes, database lifecycle, contract fixtures | only packages under test; never production packages depend on it |
| `docs` | Specifications, ADRs, tasks, and validation evidence | no runtime dependency |

These boundaries do not authorize creating all packages on day one. Scaffolding should create only those needed by the first implementation slice while preserving the same dependency direction.

Rules:

- Domain imports no framework, transport, persistence, session, logging, or provider package.
- Application imports domain and ports, not Fastify, Next.js, PostgreSQL, or provider SDKs.
- Web imports only public contract semantics; it never imports server repositories or domain internals to make authoritative decisions.
- Infrastructure adapters implement application ports and are wired at the server composition root.
- Tenant-owned repository operations require an explicit validated Business/authorization context by construction; no unscoped tenant repository is exported.
- Cross-package cycles fail static checks.
- Shared code means shared semantics, not shared UI components or infrastructure internals.

Projection processing and post-commit work begin as modules and alternate entrypoints in the same server codebase. Separate services or workspace applications require evidence of independent scaling, reliability, or deployment needs.

## 13. Package, Build, and Repository Tooling

### Selected strategy

- pnpm workspaces and one committed lockfile for reproducible dependency resolution.
- The pnpm `workspace:` protocol for internal package dependencies so local packages cannot silently resolve from a registry. See [pnpm workspace protocol](https://pnpm.io/workspaces).
- Next.js 16 built-in development/build tooling for `apps/web`.
- TypeScript compiler checks for server and shared packages.
- ESLint for semantic linting and architectural import restrictions.
- Prettier for formatting.
- Native pnpm recursive/filter execution for workspace tasks.
- Dependency audit and update review in CI; exact automation provider is deferred.

No Turborepo or Nx is selected initially. pnpm already supplies the workspace and task-selection behavior needed at this scale. Add a build orchestrator only after measured CI duration, task-graph complexity, or remote-cache value justifies another configuration and upgrade surface.

Official tooling evidence confirms that current [ESLint supports Node.js 24](https://eslint.org/docs/latest/use/getting-started), [Prettier supports TypeScript and the selected document formats](https://prettier.io/docs/), and [TypeScript publishes maintained language and module guidance](https://www.typescriptlang.org/docs/). Exact compatible versions remain a scaffolding lock decision.

Reproducibility requirements for the future scaffold:

- Pin the Node.js LTS line and package-manager version.
- Commit manifests, lockfile, compiler/linter/formatter/test configuration, and documented local commands.
- Use exact lockfile resolution in CI.
- Fail unsupported runtime versions early.
- Review security advisories and release notes before dependency upgrades.
- Keep generated artifacts out of source control unless a later tool requires reviewable generation.

No manifest or configuration is created in this cycle.

## 14. Testing Architecture

| Test level | Selected technology or boundary | Required focus |
| --- | --- | --- |
| Domain unit | Vitest 4 | Money, totals, debt, states, dates, role/capability and lifecycle rules |
| Application contract | Vitest 4 with in-memory ports/fakes | Authorization order, idempotency, unknown outcomes, audit and post-commit intent |
| Server adapter | Vitest 4 plus `fastify.inject()` | Transport adapter mapping after the transport cycle, without a listening socket |
| PostgreSQL integration | Vitest 4 plus Testcontainers for Node.js and PostgreSQL 18 | Transactions, tenant scope, concurrency, mapping, projection rebuild, backup/restore test hooks |
| Web interaction | React Testing Library with Vitest DOM environment | Forms, errors, focus, preservation, permission-sensitive presentation |
| Browser and responsive E2E | Playwright | Critical journeys, Business switching, retries, unknown recovery, supported browsers and viewport behavior |
| Automated accessibility | axe-core integration in Playwright plus semantic assertions | Detectable accessibility failures; never a substitute for manual review |
| Manual accessibility/usability | Keyboard, screen reader, zoom/reflow, reduced motion, merchant sessions | Cycle 008/009 acceptance and terminology evidence |
| External adapter contracts | Vitest with provider fakes and recorded provider-independent fixtures | Retry, deduplication, callback verification, redaction, no financial authority |
| Supporting mobile | Playwright mobile-browser projects and real-device checks when defined | Same report, Business, session, freshness, and privacy semantics |

Official evidence: [Vitest requirements](https://vitest.dev/guide/), [Fastify request injection](https://fastify.dev/docs/latest/Guides/Testing/), [Playwright browser coverage](https://playwright.dev/docs/browsers), [Playwright accessibility guidance](https://playwright.dev/docs/accessibility-testing), [React Testing Library principles](https://testing-library.com/docs/react-testing-library/intro/), and [Testcontainers PostgreSQL module](https://node.testcontainers.org/modules/postgresql/).

Testcontainers introduces a local/CI container-runtime requirement; if the target CI cannot run containers, the persistence cycle must define an equivalent isolated PostgreSQL test service. Tests must not rely on SQLite or mocks as proof of PostgreSQL transaction behavior.

## 15. Security and Privacy Implications

- The Fastify application boundary, not Next.js controls, performs authoritative authentication, tenant authorization, capability checks, recalculation, and state validation.
- Every tenant-owned repository and projection operation requires explicit Business scope and rejects cross-Business references without existence leakage.
- Next.js data caching, browser storage, and navigation state must be designed so Business switching removes previous-Business data before loading target data. Concrete cache/storage mechanics are deferred.
- Server-side sessions support revocation and contain no client-authoritative role or Business claim.
- PostgreSQL credentials, provider secrets, session identifiers, invitation/recovery secrets, and callback verification material remain server-only.
- Zod rejects malformed untrusted structures but is not a mass-assignment defense by itself; transport contracts must allow-list command information and application handlers must map explicitly.
- Direct SQL access must always use parameterization, reviewed tenant predicates, and repository tests. Physical constraints later provide defense in depth.
- Dependency risk is constrained by one runtime ecosystem, a lockfile, supported versions, audit review, minimal packages, and update ownership. Audit output is evidence to review, not proof of safety.
- Logs, traces, metrics, errors, audit, idempotency evidence, and provider attempts must carry correlation identifiers and safe categories rather than raw personal or financial payloads.
- Backups and restores must preserve tenant isolation and encrypted secret handling; infrastructure choices remain deferred.
- RLS remains a future defense-in-depth decision and is not represented as active protection.

This architecture supports privacy and security requirements but does not claim LGPD compliance or secure deployment before implementation, configuration, threat review, and operational validation.

## 16. Accessibility Implications

Next.js and React can emit semantic HTML and support explicit focus and live-region behavior, but neither guarantees accessibility. The web implementation must preserve Cycle 008 and 009 requirements through:

- Native semantic elements before custom interaction patterns.
- Programmatic labels, instructions, error association, headings, landmarks, and page titles.
- Explicit focus movement after navigation, validation, confirmation, conflict, recovery, and session interruption.
- Status announcements for loading, commit, safe replay, rejection, unknown outcome, recovered result, projection freshness, and external delivery.
- Keyboard parity, visible focus, no traps, non-color state indicators, text enlargement, reflow, reduced motion, and accessible table alternatives.
- Brazilian currency/date text that screen readers can understand.
- React Testing Library queries that favor accessible roles/names, Playwright browser checks, axe-core automation, and manual assistive-technology review.

Automated tools detect only some issues. No certification or conformance claim is made. The target standard version, screen-reader/browser matrix, and acceptance threshold remain operational questions that must be resolved before public release.

## 17. Observability and Operational Boundaries

The architecture requires structured, redacted server logs; metrics; and distributed correlation. OpenTelemetry-compatible traces and metrics are selected as the portability boundary, while a hosted backend is deferred. OpenTelemetry JavaScript documents stable traces and metrics but developing log support on the verification date, so structured application logs remain independent and may later correlate with traces. See [OpenTelemetry JavaScript status](https://opentelemetry.io/docs/languages/js/).

Minimum future signals:

| Category | Safe purpose |
| --- | --- |
| Financial command correlation | Follow a command through validation, commit result, replay, and recovery without logging amounts/items by default |
| Idempotency | Observe first execution, replay, changed-intent rejection, in-progress, and unknown result categories |
| Unknown outcomes | Detect unresolved duration, recovery attempts, and recovered outcome |
| External attempts | Observe queued/pending/succeeded/failed/retried status without message body or contact secret |
| Projection health | Lag, rebuild, disagreement, reconciliation, and unavailable state by safe tenant pseudonym where required |
| Authorization | Aggregate denial categories and suspicious patterns without leaking resource existence |
| Business switching | Diagnose context replacement and stale-data prevention without logging Business names |
| Session lifecycle | Creation, rotation, revocation, expiration, and invalid use using non-secret correlation |
| Support investigation | Correlate audit, command, session, and attempt evidence through access-controlled references |

Browser telemetry is minimized because OpenTelemetry browser instrumentation is experimental and client data is particularly exposed. Analytics cannot receive secrets, raw debt/payment details, contact data, or screen/form payloads. Sampling, retention, support access, and hosted tooling remain operational decisions.

## 18. Technology Decision Matrix

| Category | Serious candidates | Accepted | Why accepted | Why alternatives were not selected | Risks and mitigations | Revisit trigger | Official evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Topology | Modular server plus separate web; Next.js full-stack; microservices | Modular server plus separate web | One authoritative boundary with portable clients and no distributed domain | Full-stack risks web coupling; microservices add unsupported complexity | Two deployables require contract discipline; mitigate with semantic contract tests | Independent scaling/ownership or deployment evidence | Repository contracts and ADRs 0002/0003 |
| Web | Next.js 16; React Router 7/Vite | Next.js 16 App Router | Integrated rendering/build, TypeScript, maintained React baseline, portable Node deployment | React Router is credible but requires more rendering/build choices | Framework caching/magic; forbid direct DB/domain authority and test Business switching | Framework support change, unsupported merchant browsers, or recurring boundary leakage | [Next.js 16](https://nextjs.org/docs/app/guides/upgrading/version-16), [React Router](https://reactrouter.com/routers/home) |
| Runtime/language | Node/TypeScript; Java/Kotlin; .NET | Node.js 24 LTS and TypeScript | One language across web/server/contracts, supported ecosystem, low team burden | Other runtimes are capable but add language/toolchain cost without a requirement benefit | Dependency churn; pin LTS and review upgrades | Runtime EOL, material correctness/operations issue | [Node releases](https://nodejs.org/en/about/previous-releases) |
| Server | Fastify 5; NestJS; Next.js-only server | Fastify 5 | Small transport edge, test injection, no competing application module system | Nest adds DI/decorator/module conventions; Next-only weakens client-independent authority | More architecture discipline required; enforce package boundaries and tests | Composition becomes repetitive or team scale needs stronger framework conventions | [Fastify](https://fastify.dev/docs/latest/), [NestJS](https://docs.nestjs.com/first-steps) |
| Validation | Zod 4; JSON Schema/Ajv; framework DTO decorators | Zod 4 for contract boundaries | TypeScript-first runtime schemas, framework-neutral, reusable semantic contracts | Ajv remains Fastify transport option later; decorators couple contracts to framework | Schema/domain duplication; define schema as shape validation only | Performance or standards-driven transport need | [Zod](https://zod.dev/), [Fastify validation](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/) |
| Database | PostgreSQL; document database | PostgreSQL 18 current minor | Existing accepted direction, transactions, relations, history and reporting | Document storage weakens relationship/transaction fit | Major upgrades and operations; supported minors and backup tests | Operational provider constraint or unsupported engine line | [PostgreSQL support](https://www.postgresql.org/support/versioning/) |
| Data access | `node-postgres`; Prisma; Drizzle | `node-postgres` | Explicit transaction/query/tenant behavior without preempting physical model | Prisma/Drizzle add schema and query abstractions before physical design | Less compile-time query safety; mapping and real PostgreSQL tests | Mapping defects/productivity cost outweigh explicitness | [`node-postgres`](https://node-postgres.com/), [Prisma](https://www.prisma.io/docs/orm), [Drizzle](https://orm.drizzle.team/docs/overview) |
| Sessions | Application-owned revocable sessions; managed identity authority; self-contained authorization token | Application-owned revocable sessions with credential adapter | Current revocation and Business authorization stay server-authoritative | Vendor authority creates lock-in; self-contained claims become stale | Security implementation burden; use reviewed primitives/libraries later | Security review shows managed provider better fits while preserving authority | [OWASP sessions](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) |
| Mobile | Responsive web; installable web; cross-platform/native app | Responsive web initially | Meets accepted supporting scope with least complexity | Dedicated app has no validated need; installability adds lifecycle claims | Browser photo/share constraints; validate with merchants/devices | Validated device capability or offline need | ADR 0003 and Cycle 008/009 |
| Workspace | pnpm workspaces; pnpm plus Turborepo; Nx | pnpm workspaces only | Internal linking and filtered tasks with minimal configuration | Orchestrators solve unmeasured build-scale problems | Later CI slowdown; add only with measurements | Material CI/task-graph/caching pain | [pnpm workspaces](https://pnpm.io/workspaces) |
| Tests | Vitest/Playwright/Testcontainers; Jest/Cypress; Node test runner only | Vitest, Playwright, Testing Library, axe-core, Testcontainers | Coverage from pure domain to real browser and PostgreSQL behavior | Alternatives are capable but duplicate selected responsibilities | Several dev dependencies; install only with test level needing them | Maintenance or runtime incompatibility | Official links in Section 14 |
| Observability | OpenTelemetry-compatible; hosted vendor SDK; logs only | OTel-compatible traces/metrics plus structured logs | Provider portability and correlation categories | Vendor SDK locks backend; logs alone cannot model lag/latency well | Browser/log maturity varies; server-first, redact, defer backend | Operational evidence or standard support changes | [OpenTelemetry JS](https://opentelemetry.io/docs/languages/js/) |

## 19. Selected Stack Summary and ADR Plan

### Selected now

- Modular monolith authoritative server with separate Next.js web presentation.
- TypeScript; Node.js 24 LTS.
- Next.js 16 App Router and React.
- Fastify 5 server edge.
- Zod 4 boundary validation.
- PostgreSQL 18 current minor and `node-postgres` repository adapters.
- Server-side revocable opaque sessions; application owns authorization.
- Responsive web as initial mobile delivery.
- pnpm workspace; no build orchestrator initially.
- ESLint, Prettier, Vitest, React Testing Library, Playwright, axe-core, Testcontainers, and OpenTelemetry-compatible server telemetry boundaries.

### Constrained but deferred

- Transport/API semantics, concrete session exchange, credential implementation, migrations, physical schema, transaction mechanics, projection persistence, and durable post-commit handoff.
- Hosted observability, cloud, deployment, object storage, analytics, communication, and payment providers.

### Explicitly rejected for the MVP

- Microservices, distributed transactions, event sourcing, CQRS, client financial authority, client authorization authority, document database, direct web-to-database access, independent mobile domain logic, and mandatory proprietary infrastructure.

### Reserved for evidence-based reconsideration

- Prisma or Drizzle, Turborepo or Nx, dedicated mobile client, managed credential provider, RLS, cache, broker, separate worker deployment, and installable-web features.

Durable decisions are recorded in:

- [ADR 0016](../architecture/decisions/0016-modular-server-separate-web.md): modular authoritative server with separate web presentation.
- [ADR 0017](../architecture/decisions/0017-typescript-nextjs-fastify-stack.md): TypeScript, Node.js 24 LTS, Next.js 16, and Fastify 5.
- [ADR 0018](../architecture/decisions/0018-postgresql-node-postgres-access.md): PostgreSQL 18 and explicit `node-postgres` adapters.
- [ADR 0019](../architecture/decisions/0019-pnpm-workspace-module-boundaries.md): pnpm workspace and dependency boundaries without an initial orchestrator.
- [ADR 0020](../architecture/decisions/0020-application-owned-revocable-sessions.md): application-owned revocable sessions and provider adapter boundary.
- [ADR 0021](../architecture/decisions/0021-responsive-web-initial-mobile-delivery.md): responsive web as initial supporting-mobile delivery.

## 20. Risks and Revisit Triggers

| Risk | Control now | Revisit trigger |
| --- | --- | --- |
| Next.js server features obscure authority | No direct DB access; all tenant operations cross Fastify application boundary | Repeated business logic or persistence imports in web reviews |
| Framework coupling reaches domain | Static package boundaries and domain tests | Domain requires framework types or decorators |
| Direct SQL causes mapping or tenant-scope defects | Small explicit repositories, integration tests, query review | Defect rate or maintenance cost exceeds benefits |
| Shared package becomes a dumping ground | Narrow responsibilities and one-way dependencies | Cycles, infrastructure leakage, or large catch-all package |
| Authentication implementation is underestimated | Provider/library adapter and security specification before integration | Credential/security review cannot meet revocation needs affordably |
| Responsive web is inadequate for supporting mobile | Device and merchant validation | Photo, share, notification, security, or connectivity evidence |
| Dependency churn | LTS runtime, lockfile, minimal dependencies, scheduled upgrades | Unsupported major, security advisory, or incompatible peer ranges |
| PostgreSQL major choice ages | Current minor policy and upgrade planning | Support window no longer covers planned operation |
| Accessibility regresses | Semantic implementation, automated checks, manual AT review | Failed acceptance, merchant study, or framework upgrade regression |
| Background work becomes unreliable | Durable handoff requirement retained; implementation deferred | Delivery volume/reliability requires independent worker or broker |
| Portfolio overengineering | No orchestrator, broker, cache, native app, or services without evidence | Measured problem justifies added system |
| Technology becomes unsupported | Support-status review before scaffold and each major upgrade | EOL announcement or maintainers stop security support |

## 21. Open Questions and Deferred Choices

### Product and merchant-validation questions

- Fractional quantity and rounding; provisional Sale/debt/correction/role terminology; same-name Customer warnings; payment-method labels; visible numbering; SKU/barcode; durable drafts; Expense categories; Staff and Manager exposure; mobile mutation scope; product-photo and Payment Request journeys; correction-date presentation; shareable summaries; Home emphasis; and Customer-facing debt language.

### Operational, legal, and security questions

- Session idle/absolute durations; credential and recovery policy; supported browser/device matrix; accessibility target and validation process; retention and anonymization; export after deactivation; support/admin access; audit/idempotency/communication metadata retention; backup custody, RPO/RTO, and restore authorization; provider disputes; debt-collection wording; product-photo retention; and telemetry/screenshot redaction.

### Technology questions required before scaffolding

- Exact supported patch versions and compatibility lock for Node.js, Next.js, Fastify, TypeScript, Zod, pnpm, and development tools.
- Exact workspace boundary names and which minimum packages are created in the first scaffold.
- ESM/module-resolution baseline and import-boundary enforcement rules.
- Local PostgreSQL provisioning approach and container availability for developers/CI.
- Browser support evidence from intended merchant devices; whether Next.js defaults require adjustment.

These are scaffolding details, not competing architecture stacks.

### Deferred to transport/API specification

- Protocol, routes, methods, status/error mapping, serialization, DTOs, pagination representation, command identity carriage, session exchange, CSRF boundary, compatibility/versioning mechanism, upload/download transport, and external callback ingress.

### Deferred to physical persistence specification

- Physical identifiers, table/column names and types, constraints, indexes, migration tool and ordering, transaction isolation, locking/concurrency pattern, session/idempotency/audit/outbox representation, projection structures, RLS decision, retention mechanics, and backup/restore verification design.

### Deferred to deployment or provider-integration cycles

- Cloud/provider selection, network topology, secrets platform, managed PostgreSQL, object storage, email/message/Pix providers, queue/worker hosting, telemetry backend, alerting, CDN, domains/TLS, environment promotion, production backup, and disaster recovery.

## 22. Implementation Sequence Implications

This cycle enables the next specifications in this order:

1. Transport/API contract specification maps Cycle 007 semantic commands, queries, errors, idempotency, sessions, and projection freshness onto the selected web/server boundary.
2. Physical persistence specification maps Cycle 006 logical records and accepted transactions onto PostgreSQL and the selected repository boundary.
3. Workspace scaffolding creates only the selected applications, packages, tooling, and architecture checks.
4. Authentication integration specifies and implements credential/session mechanics against the accepted session boundary.
5. External delivery and projection cycles define durable post-commit handling and provider adapters.
6. Deployment architecture selects infrastructure from actual runtime, data, backup, and operational needs.

### Recommended next cycle

Cycle 011 - Transport/API Contract Specification.

Task 001 - Map Application Contracts to Versioned Transport, Session, Error, and Idempotency Semantics.

Objective: define how the selected Next.js web boundary and future supporting clients invoke the Fastify application boundary while preserving stable command/query meaning, authorization revalidation, safe errors, idempotency, unknown-outcome recovery, projection freshness, and compatibility.

Why next: Cycle 007 already defines semantic application contracts, Cycles 008 and 009 define client states, and Cycle 010 now fixes the web/server boundary. Transport mapping is the next shared dependency for web implementation, future mobile compatibility, authentication exchange, and integration tests. The physical persistence model remains independent and follows without dictating client-facing semantics.

Explicit non-goals: no implementation, routes in running code, controllers, generated API artifacts, physical schema, migration, provider integration, deployment, or scaffolding.

## 23. Acceptance Criteria

- [x] Cycle 010 remains documentation-only.
- [x] All authoritative repository sources and ADRs were inspected.
- [x] Time-sensitive technology claims were checked against official sources on 2026-08-01.
- [x] Architectural drivers trace to repository evidence.
- [x] Candidate criteria and serious alternatives are explicit.
- [x] One coherent topology and authoritative server boundary are selected.
- [x] Web, runtime, language, server, validation, persistence, session, mobile, workspace, build, test, and observability boundaries are selected at the permitted level.
- [x] Client calculations and selected Business context remain non-authoritative.
- [x] Tenant isolation, idempotency, safe replay, unknown-outcome recovery, history, dates, projections, and external side-effect separation remain implementable.
- [x] Security, privacy, accessibility, operational, and upgrade implications are explicit.
- [x] Durable decisions have accepted ADRs with alternatives and revisit triggers.
- [x] Transport and physical persistence details remain deferred.
- [x] Existing specifications remain internally consistent.
- [x] Exactly one evidence-based next cycle is recommended.
- [x] No code, scaffold, dependency, configuration, test implementation, provider integration, or commit was introduced.

## 24. Traceability

| Decision | Primary accepted source | ADR | Future evidence |
| --- | --- | --- | --- |
| Separate web and authoritative modular server | Application Contracts; ADRs 0002, 0003, 0012 | ADR 0016 | Architecture dependency tests and contract tests |
| TypeScript/Next.js/Fastify | Cycle 008/009 web behavior and Cycle 007 boundary | ADR 0017 | Build, browser, accessibility, and adapter tests |
| PostgreSQL and explicit access | Data Persistence; Logical Data Model; ADRs 0013/0014 | ADR 0018 | Physical model and PostgreSQL integration/concurrency tests |
| pnpm workspace boundaries | Framework-independent domain and shared contracts | ADR 0019 | Static import/cycle checks and reproducible build evidence |
| Revocable server-side sessions | Authentication Specification; ADRs 0010/0012 | ADR 0020 | Session, revocation, shared/lost-device, and security tests |
| Responsive web initial mobile | ADR 0003; UX/low-fidelity specifications | ADR 0021 | Merchant/device validation and semantic consistency tests |
| Zod boundary validation | Application Contracts error/validation model | ADR 0017 | Contract-shape and explicit mapping tests |
| Rebuildable projections and post-commit adapters | ADRs 0014/0015 | Existing ADRs | Rebuild, reconciliation, retry, and deduplication tests |
