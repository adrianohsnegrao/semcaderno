# Tasks

This file tracks cycle-based delivery for Sem Caderno. Each cycle should preserve traceability from product requirement to specification, task, implementation, and validation.

## Cycle 001: SDD Foundation

### Task 001: Product, Scope, and Architecture Baseline

Status: Complete.

Objective:

Create the initial Spec-Driven Development foundation for Sem Caderno without implementing application features.

Scope:

- Establish product vision and MVP boundaries.
- Document initial personas and UX principles.
- Document architecture and domain model baselines.
- Record justified architecture decisions.
- Define test strategy and security, privacy, and LGPD planning.
- Create agent instructions for future work.
- Create task structure and recommended next cycle.

Deliverables:

- `AGENTS.md`
- `README.md`
- `docs/product/vision.md`
- `docs/product/mvp-scope.md`
- `docs/product/personas.md`
- `docs/product/ux-principles.md`
- `docs/architecture/architecture.md`
- `docs/architecture/domain-model.md`
- `docs/architecture/decisions/README.md`
- Initial ADRs for supported decisions.
- `docs/quality/test-strategy.md`
- `docs/security/privacy-and-lgpd.md`
- `docs/tasks.md`

Acceptance criteria:

- Every required document exists.
- Documentation is written in clear professional English.
- Intended UI terminology is preserved in Brazilian Portuguese where relevant.
- Product boundaries clearly separate MVP, exclusions, and future possibilities.
- Confirmed decisions, assumptions, open questions, and future possibilities are separated.
- Domain concepts are evaluated without creating a database schema or migrations.
- Tenant isolation, money representation, dates, time zones, and audit/history concerns are addressed.
- Security and LGPD risks are addressed proportionally to the product.
- Test strategy covers domain, API, web, mobile, and critical E2E flows.
- Future agents are instructed not to silently expand scope or skip specifications.
- No application feature implementation or dependency installation is introduced.

Explicit non-goals:

- No web, mobile, or API implementation.
- No generated application scaffold.
- No database migrations.
- No dependency installation.
- No provider integration.
- No final decision on NestJS versus Fastify.
- No final decision on Prisma versus Drizzle.
- No authentication implementation.

Validation evidence:

- Required file existence: completed during Cycle 001 validation.
- Internal Markdown link check: completed during Cycle 001 validation.
- Search for unfinished draft markers: completed during Cycle 001 validation.
- Search for contradictory MVP claims: completed during Cycle 001 validation.
- Terminology consistency review: completed during Cycle 001 validation.
- Git diff and status inspection: completed during Cycle 001 validation.
- No implementation or dependency installation inspection: completed during Cycle 001 validation.

Recommended next cycle:

Cycle 002: Domain and Tenancy Specification.

Recommended next task:

Task 001: Specify Business Tenancy, Core Financial Records, and Audit Boundaries.

Why this should come next:

Domain and tenancy decisions sit underneath authentication, onboarding, sales, payments, reports, and mobile support. If business ownership, membership, data isolation, money representation, payment history, and audit behavior are unclear, later feature specifications may conflict or require rework.

Non-goals for the recommended next cycle:

- No UI implementation.
- No API implementation.
- No database migration.
- No authentication implementation.
- No payment provider integration.
- No expansion of MVP scope.

## Cycle 002: Domain and Tenancy Specification

### Task 001: Specify Business Tenancy, Core Financial Records, and Audit Boundaries

Status: Complete.

Objective:

Define a coherent, implementation-independent domain specification for business ownership, membership, tenant isolation, roles, customers, products, sales, payments, allocations, balances, expenses, corrections, auditability, money, dates, timestamps, and business time zones.

Scope:

- Define Business as the tenant boundary.
- Define active membership as required for business data access.
- Define minimum role groups and capability-based authorization responsibilities.
- Define core domain concepts and relationships without a physical schema.
- Define sale status, sale items, product snapshots, and cancellation behavior.
- Define payment history, explicit payment allocations, balance formulas, and overpayment rejection.
- Define basic expense rules.
- Define financial correction, reversal, cancellation, and deletion restrictions.
- Define audit-relevant business events.
- Define BRL minor-unit money representation, timestamps, business-local dates, and business time-zone rules.
- Align architecture, domain model, security, quality, ADR index, README, and task tracking.

Deliverables:

- `docs/specs/domain-and-tenancy.md`
- `docs/architecture/decisions/0006-business-as-tenant-boundary.md`
- `docs/architecture/decisions/0007-explicit-payment-allocations.md`
- `docs/architecture/decisions/0008-financial-history-cancellation-reversal.md`
- `docs/architecture/decisions/0009-business-time-zone-operational-reporting.md`
- Updated `README.md`
- Updated `docs/architecture/architecture.md`
- Updated `docs/architecture/domain-model.md`
- Updated `docs/architecture/decisions/README.md`
- Updated `docs/security/privacy-and-lgpd.md`
- Updated `docs/quality/test-strategy.md`
- Updated `docs/tasks.md`

Acceptance criteria:

- A single coherent tenant boundary is defined.
- Cross-tenant isolation invariants are explicit.
- Membership and minimum authorization responsibilities are documented.
- Core domain concepts and relationships are defined without a physical schema.
- Paid, partial, and unpaid sale behavior is unambiguous.
- Payment history and allocation behavior are unambiguous.
- Balance formulas are defined.
- Overpayment behavior is defined.
- Corrections, reversals, cancellations, and deletion restrictions are defined.
- Audit boundaries are explicit without introducing unnecessary event sourcing.
- Expense behavior is defined.
- Money and rounding rules are defined.
- Date and time-zone behavior is defined.
- Security and privacy documentation is aligned with the tenant and financial model.
- Open questions are separated from decisions.
- Existing documentation is updated consistently.
- No application code, dependency, scaffold, migration, or integration is introduced.

Explicit non-goals:

- No application code.
- No package manifest or dependency installation.
- No pnpm, Turborepo, Next.js, React Native, Expo, NestJS, or Fastify initialization.
- No database schema or migration.
- No tenant filter, Row-Level Security, authentication, or session implementation.
- No onboarding implementation.
- No API endpoint or UI screen implementation.
- No Pix, WhatsApp, storage, or provider integration.
- No expansion of the accepted MVP scope.
- No commit, push, or pull request.

Decisions made:

- Business is the tenant boundary.
- Users access business data only through active memberships.
- Authorization should use capabilities grouped by Owner, Manager, and Staff role groups.
- Tenant-owned records must belong to exactly one business.
- Normal business deletion is deactivation and retention, not hard deletion.
- The likely MVP tenancy implementation direction is a single PostgreSQL database with explicit business identifiers and application-enforced scoping; Row-Level Security is deferred as defense in depth.
- Payments use explicit allocations to one or more sales.
- MVP payment allocation is automatic by selected sale or oldest outstanding sales first.
- Customer credit from overpayment is outside the MVP; attempted overpayment is rejected.
- Payment requests do not reduce debt and are not payment confirmations.
- Financial corrections preserve history through cancellation, reversal, and replacement.
- BRL minor units are the MVP canonical money representation.
- Financial records use UTC instants plus stored business-local dates based on the business time zone.

Remaining questions:

- Are Owner and Staff sufficient, or is Manager required in the first release?
- May Staff record expenses?
- May Staff view sensitive financial reports such as "Quanto sobrou este mês"?
- Which payment methods besides cash, manual Pix, card, and other should appear in the first UI?
- Are fractional quantities required for the first target segment?
- Which default time zone should onboarding suggest?
- What export format is needed first?
- What retention, anonymization, and deletion rules are legally and operationally appropriate?

Validation evidence:

- Repository state inspected before editing with `git status --short --branch --untracked-files=all` and file listing.
- Relevant Cycle 001 documents and ADRs read before editing.
- Required file existence verified with `find` and explicit file checks.
- Internal Markdown links checked with a local link extraction command; no missing local links were reported.
- Draft marker search with `rg` for common unfinished markers returned no matches.
- Contradiction-oriented searches reviewed for tenant, membership, payment request, payment allocation, balance, overpayment, deletion, correction, sales recorded, payments received, and DRE terminology.
- Financial examples checked with integer shell arithmetic.
- `git diff --check` executed.
- Additional whitespace inspection for untracked Markdown files executed with `git diff --no-index --check`.
- Non-Markdown file search confirmed no application code, dependency file, package manifest, scaffold, migration, or integration file was introduced.
- Final Git status inspected with `git status --short --branch --untracked-files=all`.

Recommended next cycle:

Cycle 003: Authentication and Business Onboarding Specification.

Recommended next task:

Task 001: Specify Owner Signup, Business Creation, Membership Lifecycle, Session Boundaries, and Tenant Selection.

Why this should come next:

Cycle 002 defines that access to all business data depends on active membership, capabilities, business status, and selected tenant context. Authentication and onboarding must specify how the first owner, business, membership, tenant selection, and member lifecycle are created before sales, payments, reports, or persistence work can be implemented safely.

Non-goals for the recommended next cycle:

- No application implementation.
- No database migration.
- No UI screen implementation.
- No payment provider integration.
- No product photo storage implementation.
- No expansion of MVP scope.

## Cycle 003: Authentication and Business Onboarding Specification

### Task 001: Specify Owner Signup, Business Creation, Membership Lifecycle, Session Boundaries, and Tenant Selection

Status: Complete.

Objective:

Define an implementation-independent authentication, onboarding, membership, authorization, session, and tenant-selection specification covering global user identity, first-owner signup, business bootstrap, sign-in, session boundaries, active business selection, invitations, access revocation, recovery, audit, and security expectations.

Scope:

- Define global User identity versus tenant-owned Business Membership.
- Define first-owner signup and atomic Business bootstrap.
- Define identity verification expectations.
- Define returning-user sign-in outcomes by membership state.
- Define conceptual session contents, renewal, revocation, and tenant context.
- Define tenant selection, switching, remembered Business revalidation, and deep-link validation.
- Define membership lifecycle states and transitions.
- Define invitation creation, delivery boundary, acceptance, expiration, cancellation, replay, and concurrency behavior.
- Define capability-oriented authorization aligned with Cycle 002.
- Define Business lifecycle behavior during onboarding and deactivation.
- Define recovery and credential-sensitive operations.
- Define audit boundaries for identity, session, invitation, membership, and Business events.
- Align README, architecture, domain model, ADR index, security, quality, and task tracking.

Deliverables:

- `docs/specs/authentication-and-business-onboarding.md`
- `docs/architecture/decisions/0010-global-user-tenant-memberships.md`
- `docs/architecture/decisions/0011-atomic-first-owner-business-bootstrap.md`
- `docs/architecture/decisions/0012-server-validated-active-business-context.md`
- Updated `README.md`
- Updated `docs/architecture/architecture.md`
- Updated `docs/architecture/domain-model.md`
- Updated `docs/architecture/decisions/README.md`
- Updated `docs/security/privacy-and-lgpd.md`
- Updated `docs/quality/test-strategy.md`
- Updated `docs/tasks.md`

Acceptance criteria:

- Global User identity and tenant-owned Membership are clearly separated.
- First-owner signup and Business bootstrap are unambiguous.
- Initial Owner Membership and last-owner invariant are defined.
- Partial bootstrap failure behavior is defined.
- Returning-user sign-in behavior is defined for relevant membership states.
- Session boundaries are implementation-independent and explicit.
- Active tenant selection and switching are defined.
- Every tenant-owned request requires server-side membership validation.
- Remembered tenant context is never trusted without revalidation.
- Membership states and transitions are explicit.
- Invitation behavior and replay protection requirements are explicit.
- Suspension, removal, role change, and Business deactivation consequences are explicit.
- Capability-oriented authorization is aligned with Cycle 002.
- Manager exposure is handled without contradicting merchant-validation requirement.
- Staff access to expenses and sensitive reports is isolated as merchant-validation questions.
- Recovery and credential-sensitive operations are addressed.
- Audit boundaries are defined without exposing secrets.
- Security and privacy implications are aligned.
- Concurrency and idempotency expectations are defined.
- User-facing Brazilian Portuguese terminology is documented.
- Future test targets are documented.
- Open questions are separated from accepted decisions.
- Existing documents are updated consistently.
- No code, dependency, package manifest, schema, migration, scaffold, UI, API, or integration is introduced.

Explicit non-goals:

- No application code.
- No package manifest or dependency installation.
- No pnpm, Turborepo, Next.js, React Native, Expo, NestJS, or Fastify initialization.
- No database schema or migration.
- No authentication, password storage, session, or authorization implementation.
- No tenant filter or Row-Level Security implementation.
- No signup, sign-in, invitation, recovery, or onboarding implementation.
- No API endpoint or contract.
- No UI screen or wireframe.
- No email, SMS, Pix, WhatsApp, storage, or provider integration.
- No billing, subscription, plan, or trial feature.
- No social login beyond deferred/rejected discussion.
- No MVP scope expansion.
- No commit, push, or pull request.

Decisions made:

- User identity is global while Business Membership is tenant-owned.
- Normalized email is the MVP conceptual identity channel.
- Email verification is required before active business operations.
- A User may exist without a Business but cannot access tenant-owned operational data without an active Membership.
- First-owner Business bootstrap must atomically create an active Business and initial active Owner Membership.
- An active Business cannot have zero active Owners.
- Ownership transfer is deferred.
- Returning-user sign-in must handle one, many, none, suspended, removed, deactivated, and invited membership states.
- Sessions may remember an active Business, but every tenant-owned request must validate current Business, active Membership, Business status, and required capability server-side.
- Client-provided Business identifiers, remembered tenant context, URLs, and deep links are not sufficient authorization.
- Membership states are `invited`, `active`, `suspended`, `removed`, and `invitation_expired`.
- Only `active` Membership authorizes tenant-owned access.
- Suspended and removed memberships deny current access but remain historically referenceable.
- Invitations are matched by normalized email, require verified identity for acceptance, and must reject replay, mismatch, expiration, cancellation, and deactivated Business cases.
- Manager remains a defined capability group, but release-one exposure is pending merchant validation.
- Staff does not receive expenses, sensitive financial reports, exports, member management, or financial correction by default.
- Credential reset and compromise response require affected session revocation or revalidation.
- Authentication audit must not include passwords, reset secrets, session secrets, invitation secrets, full tokens, or provider secrets.
- Business deactivation immediately blocks ordinary tenant-owned operations and requires session revalidation or revocation.

Remaining questions:

- Should release one expose Manager, or only Owner and Staff?
- Should Staff be allowed to record expenses?
- Should Staff view "Quanto sobrou este mês" or only operational views?
- Which user-facing terms are clearest for Owner and Staff?
- What session duration is acceptable on shared counter devices?
- Do early merchants expect phone-based recovery?
- Which authentication library, credential method, email provider, session storage, ORM, API framework, rate-limiting method, and audit storage approach should be used?

Validation evidence:

- Repository state inspected before editing with `git status --short --branch --untracked-files=all` and file listing.
- `AGENTS.md`, product docs, architecture docs, ADRs, security, quality, task tracking, and `docs/specs/domain-and-tenancy.md` read before editing.
- Required file existence verified with `find` and explicit file checks.
- All changed files inspected with `sed` and targeted `rg` searches.
- Internal Markdown links checked with a local link extraction command; no missing local links were reported.
- Draft marker search with `rg` for common unfinished markers returned no matches.
- Contradiction-oriented searches reviewed for global identity, Business tenancy, active memberships, Owner/Manager/Staff, capabilities, tenant selection, session behavior, invitation state, suspension, removal, Business deactivation, last-owner behavior, client-provided Business identifiers, historical references, hard deletion, and secret logging.
- Search for implementation-specific authentication technology confirmed no provider, library, token format, cookie name, or hashing implementation was selected.
- `git diff --check` executed.
- Additional whitespace inspection for untracked Markdown files executed with `git diff --no-index --check`; an extra final blank line was fixed, then the check passed.
- Non-Markdown and implementation-file searches confirmed no application code, dependency file, package manifest, scaffold, migration, API, UI, or provider integration file was introduced.
- Final Git status inspected with `git status --short --branch --untracked-files=all`.

Recommended next cycle:

Cycle 004: Data Persistence and Tenant Enforcement Specification.

Recommended next task:

Task 001: Specify Persistence Boundaries, Tenant Enforcement, Transactional Invariants, and Audit Storage.

Why this should come next:

Cycles 002 and 003 define tenant ownership, financial invariants, membership states, session revalidation, last-owner rules, invitation replay rules, and bootstrap atomicity. Persistence must specify how these invariants are represented and enforced before API, UI, or feature implementation begins.

Non-goals for the recommended next cycle:

- No application implementation.
- No database migration.
- No ORM installation or package manifest.
- No API endpoint implementation.
- No UI implementation.
- No provider integration.
- No MVP scope expansion.

## Cycle 004: Data Persistence and Tenant Enforcement Specification

### Task 001: Specify Persistence Boundaries, Tenant Enforcement, Transactional Invariants, and Audit Storage

Status: Complete.

Objective:

Define an implementation-independent persistence specification covering global identity versus tenant-owned data, tenant enforcement, membership authorization context, atomic Business bootstrap, last-active-Owner invariants, session revocation, financial records, transaction boundaries, concurrency, idempotency, audit storage, retention, time-zone preservation, failure recovery, backup, restore, and data-integrity expectations.

Scope:

- Define persistence sources of truth and the relationship between canonical records, derived projections, session state, audit history, technical logs, external-provider evidence, and temporary client state.
- Classify global identity data, tenant-owned authorization data, tenant-owned operational data, session/security state, and derived data.
- Define mandatory tenant scope and server-side authorization requirements for tenant-owned reads, writes, child references, lists, aggregates, exports, background work, and provider callbacks.
- Define logical identity, reference integrity, and conceptual uniqueness behavior without a physical schema.
- Define atomic persistence boundaries for first-owner bootstrap and sensitive Membership, Invitation, session, and financial mutations.
- Define persistence behavior for Sales, Sale Items, Payments, Payment Allocations, Payment Requests, Expenses, corrections, reversals, cancellations, and replacements.
- Define balance/report derivation, BRL minor-unit money rules, Business-local dates, time-zone context preservation, retention, deletion, anonymization, audit, concurrency, idempotency, side effects, backup, restore, failure, and repair behavior.
- Align README, architecture, domain model, ADR index, security, quality, and task tracking.

Deliverables:

- `docs/specs/data-persistence-and-tenant-enforcement.md`
- `docs/architecture/decisions/0013-tenant-scope-persistence-operations.md`
- `docs/architecture/decisions/0014-canonical-records-derived-projections.md`
- `docs/architecture/decisions/0015-external-side-effects-after-commit.md`
- Updated `README.md`
- Updated `docs/architecture/architecture.md`
- Updated `docs/architecture/domain-model.md`
- Updated `docs/architecture/decisions/README.md`
- Updated `docs/security/privacy-and-lgpd.md`
- Updated `docs/quality/test-strategy.md`
- Updated `docs/tasks.md`

Acceptance criteria:

- Global identity data and tenant-owned data have explicit persistence boundaries.
- Every tenant-owned persistence operation requires explicit, validated Business scope.
- Cross-tenant references, reads, writes, aggregates, and exports are explicitly rejected.
- Logical identities and historical references are defined without a physical schema.
- Required uniqueness behavior is defined conceptually.
- First-owner Business bootstrap has an atomic persistence boundary.
- The last-active-Owner invariant is protected under concurrency.
- Membership and Invitation lifecycle persistence is unambiguous.
- Invitation acceptance and replay protection are defined.
- Session revocation and authorization revalidation have an authoritative conceptual basis.
- Financial stored facts and derived values are clearly separated.
- Sale and Sale Item persistence preserves historical snapshots.
- Payment and Allocation transaction boundaries are explicit.
- Overpayment remains rejected.
- Concurrent financial mutation behavior is defined.
- Cancellation, reversal, correction, and replacement rules preserve history.
- Balance and report derivation sources are explicit.
- Sales recorded and Payments received remain distinct financial events.
- BRL minor-unit and rounding rules are preserved.
- Business-local date and historical time-zone context are preserved.
- Deactivation, retention, deletion, and anonymization terminology is consistent.
- Financial records are protected from ordinary hard deletion.
- Audit persistence boundaries are explicit without introducing event sourcing.
- Idempotency and replay requirements are explicit.
- External side effects are separated from authoritative commit boundaries.
- Backup, restore, and integrity expectations are documented.
- Failure and repair behavior fails safely.
- Security and privacy documentation is aligned.
- Future persistence and concurrency test targets are documented.
- Open questions are separated from accepted decisions.
- Existing documentation is internally consistent.
- No application code, dependency, manifest, physical schema, migration, ORM, API, UI, session implementation, provider integration, or scaffold is introduced.

Explicit non-goals:

- No application code.
- No package manifest or dependency installation.
- No pnpm, Turborepo, Next.js, React Native, Expo, NestJS, or Fastify initialization.
- No SQL, physical database schema, migration, ORM model, database client, or repository implementation.
- No tenant filter, Row-Level Security, transaction helper, authentication, session, authorization, API, UI, or audit-storage implementation.
- No email, SMS, Pix, WhatsApp, object storage, cache, queue, backup, restore, deployment, or provider integration.
- No billing, subscription, plan, or trial feature.
- No event sourcing, CQRS, distributed transaction, microservice, or speculative enterprise architecture.
- No MVP scope expansion.
- No commit, push, or pull request.

Decisions made:

- Canonical records are the persistence authority; derived balances, payment status, reports, and cached projections are rebuildable and subordinate.
- Every tenant-owned persistence operation requires explicit, validated Business scope and current authorization context.
- Filtering by Business identifier alone is not complete authorization.
- Tenant-owned child records must belong to the same Business as their parents.
- Cross-tenant reads, writes, references, aggregates, exports, background work, and provider callbacks must fail closed.
- Physical schema, identifier type, index definitions, ORM models, lock syntax, and isolation configuration remain deferred.
- First-owner bootstrap commits Business, initial Owner Membership, required settings, audit evidence, and idempotency evidence in one authoritative transaction.
- Last-active-Owner checks must be re-evaluated inside the authoritative mutation boundary.
- Membership removal preserves Membership identity; role changes update current authorization state and create audit history.
- Invitation acceptance atomically consumes the invitation and activates the correct Membership; replay, mismatch, expiration, cancellation, and deactivated-Business cases are rejected.
- Session validity/revocation or revalidation state must have an authoritative basis; cached authorization cannot preserve access after sensitive changes.
- Sale totals derive from immutable or append-only Sale Item snapshots and accepted adjustments; a persisted total snapshot may be added only with reconciliation.
- Payments and Payment Allocations are created, reversed, and corrected inside consistency boundaries that reject overpayment and cross-Business or cross-Customer allocation.
- Payment Requests remain separate from Payments and have no balance effect.
- Cancellation, reversal, replacement, and descriptive edits are distinct correction mechanisms; financial records are not hard-deleted during ordinary operation.
- Reports derive from canonical records and keep Sales recorded, Payments received, Allocations, Payment Requests, and Expenses distinct.
- BRL integer minor units remain the financial authority; zero-value financial records are invalid for the MVP.
- Historical Business-local operational dates and time-zone context are preserved.
- External side effects occur after authoritative commits or through an equivalent retryable post-commit boundary.
- Backup, restore, projection rebuild, and repair must preserve tenant isolation, financial history, audit evidence, and last-owner invariants.

Remaining questions:

- Are fractional quantities required in release one?
- Are business-local visible sale or payment numbers needed?
- Should product SKU/barcode uniqueness exist in the MVP?
- Should customer phone/email uniqueness be suggested, warned, or ignored?
- What legal retention periods apply to financial, identity, audit, backup, and product-photo data?
- What anonymization policy is appropriate for Customers and Users with historical records?
- What backup recovery point, recovery time, and restore testing cadence are acceptable?
- What support/admin access model, if any, should exist?
- Which ORM, API framework, migration tooling, identifier type, lock/isolation strategy, cache/queue/outbox, backup vendor, storage provider, payment provider, email provider, WhatsApp provider, cloud provider, and Row-Level Security adoption decision should be selected later?

Validation evidence:

- Repository state inspected before editing with `git status --short --branch --untracked-files=all` and file listing.
- `AGENTS.md`, product docs, architecture docs, ADRs 0006 through 0012, security, quality, task tracking, `docs/specs/domain-and-tenancy.md`, and `docs/specs/authentication-and-business-onboarding.md` were read before or during editing.
- Required file existence verified with explicit `test -f` checks.
- All files in the documentation-only repository were listed with `find`.
- Changed files inspected with `sed` after editing.
- Internal Markdown links checked with a local link extraction command; no missing local links were reported.
- Draft marker search with `rg` for common unfinished-marker terms returned no matches before this evidence entry was written.
- Contradiction-oriented searches reviewed global identity, Business tenancy, active Membership, tenant authorization, client-provided Business identifiers, suspended and removed Memberships, Business deactivation, Payment Requests, Payment Allocations, overpayment, Sales recorded, Payments received, hard deletion, Business-local dates, Row-Level Security, physical schema, identifier type, lock syntax, transaction isolation, event sourcing, and deferred framework/provider choices.
- Financial arithmetic examples and formulas were checked with integer shell arithmetic.
- Search for package manifests, source files, SQL, migration folders, Prisma folders, `node_modules`, and common scaffold files returned no matches.
- Search for existing documentation validation tooling returned no matches, so no documentation tool was run.
- `git diff --check` executed successfully.
- Additional whitespace inspection for untracked Markdown files executed with `git diff --no-index --check`; one extra final blank line was found, normalized, and the check then passed.
- Final Git status inspected with `git status --short --branch --untracked-files=all`.

Recommended next cycle:

Cycle 005: First Critical User Journey Specification.

Recommended next task:

Task 001: Specify the End-to-End Merchant Journey from Sign-In to Sale, Debt, Payment, and Daily Result.

Why this should come next:

Cycles 002 through 004 now define tenant, auth, session, persistence, financial, audit, and consistency invariants. The next useful specification should connect them into the first merchant-facing journey, exposing where product language, flow decisions, and validation gaps remain before implementation planning.

Non-goals for the recommended next cycle:

- No application implementation.
- No database schema or migration.
- No API endpoint or contract implementation.
- No UI screen implementation unless explicitly scoped as behavioral flow documentation.
- No provider integration.
- No MVP scope expansion.

## Cycle 005: First Critical User Journey Specification

### Task 001: Specify the End-to-End Merchant Journey from Sign-In to Sale, Debt, Payment, and Daily Result

Status: Complete.

Objective:

Specify the first complete merchant-facing journey connecting accepted product, domain, authorization, persistence, and financial rules from sign-in through active Business selection, first-owner bootstrap, minimum readiness, Sale recording, debt visibility, later Payment, Payment Request behavior, daily result, correction, recovery, web/mobile responsibilities, accessibility, security, and future acceptance-test obligations.

Scope:

- Define actors and journey entry conditions for new, returning, single-Business, multi-Business, suspended, removed, deactivated, expired-session, and mobile users.
- Define active Business resolution, remembered-Business revalidation, Business switching, tenant-state clearing, and session invalidation handling.
- Define first-owner onboarding from verified identity to atomic Business bootstrap and operational use.
- Define minimum operational readiness without requiring unnecessary setup.
- Define Customer selection, Customer creation during Sale, anonymous fully paid Sales, and Customer-required debt.
- Define Product selection, ad hoc Sale Item entry, snapshots, integer quantity assumption, and Product edit behavior.
- Define fully paid, partially paid, and unpaid Sale outcomes.
- Define debt visibility, later Payment recording, allocation order, overpayment rejection, Payment Request behavior, daily result, Expense relationship, correction, cancellation, reversal, replacement, conflict, idempotency, and unknown-outcome handling.
- Define web and mobile responsibilities, accessibility obligations, security/privacy implications, conceptual analytics, examples, and future acceptance scenarios.
- Align README, MVP scope, architecture, domain model, security, quality, and task tracking.

Deliverables:

- `docs/specs/first-critical-user-journey.md`
- Updated `README.md`
- Updated `docs/product/mvp-scope.md`
- Updated `docs/architecture/architecture.md`
- Updated `docs/architecture/domain-model.md`
- Updated `docs/security/privacy-and-lgpd.md`
- Updated `docs/quality/test-strategy.md`
- Updated `docs/tasks.md`

Acceptance criteria:

- The first critical journey is specified end to end.
- New and returning User paths are explicit.
- Active Business selection and revalidation are explicit.
- First-owner bootstrap connects safely to operational use.
- Minimum operational readiness is defined without unnecessary setup.
- Customer requirements for paid, partial, and unpaid Sales are explicit.
- Customer creation during Sale is decided.
- Product and ad hoc Sale Item behavior is explicit.
- Sale Item snapshot behavior is preserved.
- Fully paid Sale transaction behavior is explicit.
- Partially paid Sale transaction behavior is explicit.
- Unpaid Sale and debt creation are explicit.
- Later Payment and Allocation behavior is explicit.
- Allocation order and overpayment rejection are preserved.
- Payment Request remains separate from Payment.
- Debt visibility is derived from canonical records.
- Daily result distinguishes Sales, Payments, Allocations, Payment Requests, and Expenses.
- "Quanto sobrou" has a clear conceptual formula and disclaimer.
- Expense permissions are aligned with role capabilities.
- Correction, cancellation, reversal, and replacement behavior is understandable.
- Duplicate submission and unknown outcomes are addressed.
- Concurrency and stale-state conflicts fail safely.
- Session, Membership, capability, and Business-state changes are handled.
- Cross-tenant access fails closed without existence leakage.
- Web and mobile responsibilities are aligned.
- Accessibility and low-technical-literacy requirements are documented.
- Security and privacy documentation is aligned.
- Future acceptance and end-to-end test targets are documented.
- Open questions are separated from accepted decisions.
- Existing documentation is internally consistent.
- No application code, dependency, manifest, schema, migration, API, UI implementation, provider integration, test implementation, or scaffold is introduced.

Explicit non-goals:

- No application code.
- No package manifest, workspace setup, or dependency installation.
- No physical database schema, SQL, migrations, ORM model, repository implementation, or tenant middleware.
- No API endpoint, transport contract, DTO, authentication, session, authorization, audit storage, report, or provider implementation.
- No UI component, final screen layout, visual design, design token, state-management implementation, or mobile scaffold.
- No offline synchronization, background job, queue, email, SMS, Pix, WhatsApp, object storage, analytics, notification, or product-photo upload integration.
- No automated tests.
- No billing, subscription, plan, trial, inventory, purchasing, supplier, fiscal document, bookkeeping, DRE, or accounting behavior.
- No event sourcing, CQRS, microservice, or speculative enterprise architecture.
- No technology-stack selection.
- No commit, push, or pull request.

Decisions made:

- Returning users enter through server-validated active Business resolution; remembered Business context is never trusted without revalidation.
- First-owner bootstrap transitions directly to operational use after atomic Business, Owner Membership, required settings, audit, and idempotency evidence commit.
- Minimum readiness before first Sale is active Business, active Owner Membership, Business name, Business time zone, and BRL currency; Product catalog, initial Customer, Pix key, photos, expense categories, and payment-method setup are not required.
- Fully paid counter Sales may be anonymous.
- Unpaid and partially paid Sales require Customer.
- Customer creation during Sale is accepted for debt workflows.
- Customer display name is the minimum Customer information; phone and email remain optional and non-unique.
- Product catalog selection and ad hoc Sale Item entry are both accepted.
- Sale Items preserve snapshots; later Product edits do not rewrite historical Sales.
- Cycle 005 assumes integer quantities for the critical journey while fractional quantity remains open.
- Fully paid Sales commit Sale, Sale Items, Payment, Allocation, and audit evidence atomically.
- Partially paid Sales commit Sale, Sale Items, initial Payment, Allocation, remaining debt, and audit evidence atomically.
- Unpaid Sales commit Sale, Sale Items, full debt, and audit evidence without Payment or Allocation.
- Later Payments allocate selected Sale first and then oldest eligible outstanding Sales.
- Overpayment remains rejected.
- Payment Requests may be prepared or sent but do not reduce debt.
- Daily result uses Payments received minus Expenses for the Business-local day and is not DRE or formal accounting.
- Expenses affect "Quanto saiu" and "Quanto sobrou" only for users with appropriate capability.
- Corrections preserve history through descriptive edits, cancellation, reversal, replacement, or rejected unsafe restoration.
- Duplicate submission, unknown outcomes, stale state, concurrent allocation, Business deactivation, and Membership/capability changes fail safely.
- Web is required for the full operational journey; mobile remains supporting for reports, photos, and collection assistance.
- Analytics and observability are non-authoritative and must exclude secrets and unnecessary personal or financial payloads.

Risks:

- Fractional quantities may be required for grocery segments and could affect Sale Item capture, rounding, and tests.
- Staff report and Expense permissions require merchant validation.
- Mobile Sale or Payment recording may be requested by merchants, but it is not accepted for release one yet.
- Customer duplicate handling may affect speed and debt correctness if same-name Customers are common.
- Payment Request delivery channels may expose personal or financial data and need later provider-specific risk review.

Remaining questions:

- Are integer quantities enough for release one?
- Should mobile remain report/photo/collection-only, or later record Sales and Payments?
- Should Staff record Expenses or view any part of "Quanto sobrou"?
- Should Manager be exposed in release one?
- Which Brazilian Portuguese terms are clearest for Sale states and role names?
- Should same-name Customer warnings appear immediately or only during search?
- Which payment method labels are required first?
- What retention, anonymization, export-after-deactivation, support/admin, shared-device timeout, analytics, and legal policies are required?
- Which API framework, API style, ORM, schema, identifier strategy, session storage, idempotency structure, cache/projection strategy, queue/outbox, providers, cloud platform, and Row-Level Security adoption decision should be selected later?

Validation evidence:

- Repository state inspected before editing with `git status --short --branch --untracked-files=all` and file listing.
- `AGENTS.md`, `README.md`, product docs, architecture docs, ADRs 0001 through 0015, security, quality, task tracking, `docs/specs/domain-and-tenancy.md`, `docs/specs/authentication-and-business-onboarding.md`, and `docs/specs/data-persistence-and-tenant-enforcement.md` were read before or during editing.
- Required file existence verified with explicit file checks.
- All files in the documentation-only repository were listed with `find`.
- Changed files inspected with `sed` after editing.
- New specification section structure inspected with `rg` for Markdown headings.
- Internal Markdown links checked with a local link extraction command; no missing local links were reported.
- Draft-marker and accidental-prompt-text search with `rg` returned no matches.
- Contradiction-oriented searches reviewed User and Membership, Business selection, tenant authorization, Customer requirement, Product and Sale Item snapshots, fully paid/partial/unpaid Sales, Payment and Allocation, overpayment, Payment Request, daily result, Expense permissions, cancellation/reversal, hard deletion, Business-local dates, web/mobile responsibilities, Row-Level Security, and deferred framework/provider choices.
- Financial examples were checked with integer shell arithmetic.
- Search for package manifests, source files, SQL, migration folders, Prisma folders, `node_modules`, and common scaffold files returned no matches.
- Search for existing documentation validation tooling returned no matches, so no documentation tool was run.
- `git diff --check` executed successfully.
- Additional whitespace inspection for untracked Markdown files executed with `git diff --no-index --check` and passed.
- Final Git status inspected with `git status --short --branch --untracked-files=all`.

Recommended next cycle:

Cycle 006: Logical Data Model Specification.

Recommended next task:

Task 001: Specify Logical Records, Relationships, Constraints, and Repository Boundaries for the Critical Journey.

Why this should come next:

Cycles 002 through 005 define domain rules, tenancy, onboarding, persistence invariants, and the first merchant-facing journey. The next dependency is a logical data model that maps canonical records, derived values, tenant ownership, idempotency, audit, and consistency boundaries before API contracts or implementation planning.

Non-goals for the recommended next cycle:

- No physical schema, SQL, migration, or ORM annotation.
- No repository implementation.
- No API endpoint or transport contract implementation.
- No UI implementation.
- No provider integration.
- No MVP scope expansion.

## Cycle 006: Logical Data Model Specification

### Task 001: Specify Logical Records, Relationships, Constraints, and Repository Boundaries for the Critical Journey

Status: Complete.

Objective:

Translate accepted product, domain, tenancy, onboarding, persistence, and first-critical-journey rules into an implementation-independent logical data model covering records, relationships, ownership, lifecycle states, invariants, conceptual uniqueness, canonical facts, derived values, repository responsibilities, transaction boundaries, audit evidence, idempotency evidence, external side-effect tracking, retention, anonymization, backup, restore, projection, and repair expectations.

Scope:

- Define modeling principles that keep logical records independent of physical storage.
- Classify global identity, tenant authorization, tenant operational, session/security, audit, idempotency, external side-effect, projection, export, and backup metadata records.
- Define User, Business, Business Settings, Membership, Invitation, Customer, Product, Product Photo metadata, Sale, Sale Item, Payment, Payment Allocation, Payment Request, Expense, Audit Record, Idempotency Evidence, External Side-Effect Attempt, and projection responsibilities.
- Define tenant ownership, same-Business relationship integrity, lifecycle behavior, historical references, conceptual uniqueness, and open questions.
- Define canonical facts versus derived values for Sale status, debt, Customer balance, daily result, and projections.
- Define aggregate and consistency boundaries for bootstrap, invitations, last-active-Owner changes, Sales, Payments, Allocations, reversals, cancellations, Expenses, Business deactivation, idempotency, and audit.
- Define repository boundaries without programming-language interfaces, physical schemas, or API contracts.
- Align README, MVP scope, architecture, domain model, security, quality, and task tracking.

Deliverables:

- `docs/specs/logical-data-model.md`
- Updated `README.md`
- Updated `docs/product/mvp-scope.md`
- Updated `docs/architecture/architecture.md`
- Updated `docs/architecture/domain-model.md`
- Updated `docs/security/privacy-and-lgpd.md`
- Updated `docs/quality/test-strategy.md`
- Updated `docs/tasks.md`

Acceptance criteria:

- Logical modeling remains independent of physical storage.
- Global identity and tenant-owned records have explicit boundaries.
- Every tenant-owned record belongs to exactly one Business.
- Tenant scope is mandatory for tenant-owned repositories and relationships.
- Authorization is not reduced to Business filtering.
- Cross-tenant reads, writes, references, aggregates, and exports are rejected.
- Logical identity requirements are defined without choosing identifier representation.
- Historical references survive ordinary deactivation and correction.
- Conceptual uniqueness is distinguished from warnings and idempotency.
- Business and required settings are defined as the tenant root.
- Membership ownership and lifecycle are unambiguous.
- Last-active-Owner protection is explicit under concurrency.
- Invitation acceptance, expiration, cancellation, and replay are explicit.
- Atomic first-owner bootstrap is modeled.
- Customer requirements and optional contact data are explicit.
- Same-name Customers remain possible.
- Product and ad hoc Sale Item behavior is explicit.
- Historical Sale Item snapshots are preserved.
- Sale canonical facts and derived status are separated.
- Fully paid, partial, and unpaid Sale boundaries are explicit.
- Payment is distinguished from Payment Allocation.
- Allocation order and same-Business/same-Customer requirements are explicit.
- Overpayment remains rejected.
- Debt and balance formulas derive from canonical records.
- Payment Requests do not reduce debt.
- Expense records and permissions align with the critical journey.
- Daily result uses the accepted formula.
- Sales, Payments, Allocations, Payment Requests, and Expenses are not double-counted.
- Money uses BRL integer minor units conceptually.
- Business-local operational dates and historical time-zone context are preserved.
- Cancellation, reversal, correction, and replacement preserve history.
- Financial records are protected from ordinary hard deletion.
- Audit evidence is explicit without introducing event sourcing.
- Idempotency and unknown-outcome behavior are explicit.
- External side effects remain outside authoritative financial commit boundaries.
- Repository responsibilities and tenant requirements are explicit.
- Aggregate and consistency boundaries are documented.
- Concurrency conflicts fail safely.
- Projection rebuilding and reconciliation are documented.
- Backup and restore expectations preserve tenant and financial integrity.
- Retention and anonymization terminology is consistent.
- Security and privacy documents are aligned.
- Future tests are documented but not implemented.
- Open questions are separated from accepted decisions.
- Existing documentation is internally consistent.
- No application code, package manifest, dependency, physical schema, SQL, migration, ORM, API, UI, automated test, provider integration, or scaffold is introduced.

Explicit non-goals:

- No application code.
- No package manifest, workspace setup, dependency, or automated test.
- No physical database schema, SQL, migration, table, column, index, sequence, trigger, view, ORM model, repository implementation, database client, tenant filter, or Row-Level Security policy.
- No identifier representation decision.
- No API endpoint, transport contract, DTO, authentication, session, authorization, audit storage, idempotency storage, report, projection, backup, restore, queue, cache, outbox, or provider implementation.
- No UI component, screen layout, mobile scaffold, design-system token, or navigation behavior.
- No Pix, WhatsApp, email, SMS, analytics, product-photo storage, cloud, or payment-provider integration.
- No billing, subscription, plan, inventory, purchasing, supplier, fiscal document, bookkeeping, DRE, event sourcing, CQRS, microservice, distributed transaction, or MVP scope expansion.
- No commit, push, or pull request.

Decisions made:

- Logical records are domain persistence concepts and do not imply tables, columns, identifiers, indexes, ORM models, or API payloads.
- Global User identity, credential references, email verification evidence, sessions, and recovery evidence are separate from tenant-owned operational data.
- Business is the tenant root with required Business Settings for name, BRL currency, and operational time zone.
- Business Settings current values and historical effective context must be distinguishable conceptually.
- Membership connects one User to one Business and only `active` Membership authorizes tenant access.
- Invitation state may be modeled on Invitation, Membership, or both later, but replay, mismatch, expiration, cancellation, concurrent reuse, and deactivated-Business acceptance remain rejected.
- Atomic first-owner bootstrap commits Business, settings, initial Owner Membership, audit evidence, and idempotency evidence together.
- Customer display name is required; phone and email remain optional and non-unique; same-name Customers are allowed.
- Product catalog is optional before Sale; ad hoc Sale Items are accepted.
- Sale Items preserve historical name, price, quantity, discount, adjustment, and line-total snapshots.
- Sale paid status and debt are derived from canonical Sale, Sale Item, Payment, Allocation, and lifecycle records.
- Payment is the cash-receipt fact; Payment Allocation is debt attribution and not another receipt.
- Payment Allocation must preserve same-Business, same-Customer, amount, lifecycle, allocation-order, and overpayment invariants.
- Payment Request remains collection evidence only and has no debt effect.
- Expense affects daily result only as an active Expense with appropriate capability and history-preserving correction.
- Daily result remains `paymentsReceivedTodayMinor - expensesTodayMinor`.
- Audit evidence is distinct from domain financial history, ordinary logs, analytics, diagnostics, and event sourcing.
- Idempotency evidence is required for bootstrap, invitation acceptance, Sale, Payment, Expense, financial correction, export, and future provider callback commands.
- External side-effect attempts are post-commit evidence and do not invalidate valid financial commits.
- Repository boundaries for tenant-owned records must require validated Business scope and current authorization context.
- Aggregate boundaries are defined for bootstrap, invitations, last-active-Owner changes, Sales, Payments, reversals, cancellations, Expenses, Business deactivation, idempotency, and audit.
- Backup, restore, repair, and projection rebuild must preserve tenant isolation, logical identities, financial history, audit evidence, and historical time-zone context.

Risks:

- Fractional quantities may be required by grocery segments and would affect Sale Item quantity modeling and rounding.
- Staff Expense and daily-result permissions still require merchant validation.
- Mobile Sale and Payment recording could be requested by merchants but is not accepted for release one yet.
- Customer duplicate warnings may affect usability when same-name Customers are common.
- Legal retention and anonymization policy may constrain Customer, User, audit, backup, and Payment Request data handling.
- Future provider integrations may require additional evidence records without changing financial authority.

Remaining questions:

- Are integer quantities enough for release one?
- Should mobile remain limited to reports, photos, and collection assistance, or later record Sales and Payments?
- Should Staff record Expenses or view any part of "Quanto sobrou"?
- Should Manager be exposed in release one?
- Which Brazilian Portuguese terms are clearest for Sale states, role names, correction, cancellation, reversal, and debt?
- When should same-name Customer warnings appear?
- Which payment method labels are required first?
- Are tenant-local visible Sale or Payment numbers useful?
- Are Product SKU or barcode fields needed in the first release?
- What retention, anonymization, export-after-deactivation, support/admin, shared-device timeout, backup custody, restore authorization, and legal policies are required?
- Which physical schema, table names, identifier representation, ORM, API style, session storage, idempotency storage, transaction strategy, RLS adoption, cache/projection technology, queue/outbox, providers, analytics platform, cloud platform, and migration tooling should be selected later?

Validation evidence:

- Repository state inspected before editing with `git status --short --branch --untracked-files=all`.
- Repository files enumerated with `find . -maxdepth 4 -type f ! -path './.git/*' | sort`.
- `AGENTS.md`, `README.md`, product docs, architecture docs, security, quality, task tracking, all existing specifications, and ADRs 0001 through 0015 inspected with `sed`, `rg`, `wc`, and file listing commands before and during editing.
- Cycle 005 status and recommended Cycle 006 task confirmed from `docs/tasks.md`.
- Required file existence verified with explicit `test -f` checks.
- New specification section structure inspected with `rg -n "^#{1,3} " docs/specs/logical-data-model.md`; all required sections were present.
- Changed files inspected with `sed` and targeted `rg` searches.
- Internal Markdown links checked with a local link extraction command; no missing local links were reported after rerun.
- Unfinished-marker and accidental-prompt-text search with `rg` returned no matches before this evidence entry was finalized.
- Contradiction-oriented searches reviewed global User identity, Business tenancy, Membership, Invitation, last-active-Owner behavior, Customer requirements, Product and Sale Item snapshots, Sale states, Payment, Payment Allocation, debt, overpayment, Payment Request, Expense, daily result, cancellation/reversal, hard deletion, audit, idempotency, Business-local dates, repository tenant scope, Row-Level Security, physical schema, identifier type, ORM, framework, provider, lock syntax, and transaction isolation.
- Searches confirmed no document treats Business identifier or tenant filter alone as complete authorization.
- Searches confirmed tenant-owned child records require the same Business, suspended and removed Memberships do not authorize access, Business deactivation blocks ordinary operations, anonymous Sales are limited to fully paid counter Sales, partial and unpaid Sales require Customer, Customer phone/email are not unique, Product edits cannot rewrite Sale Item snapshots, Sale paid status and debt are derived, Payment Requests do not reduce debt, Allocations are not receipts, Sales recorded and Payments received remain distinct, overpayment/customer credit remain outside MVP, financial corrections preserve history, financial records are not ordinarily hard-deleted, and audit is not event sourcing.
- Financial formulas and examples were checked with integer shell arithmetic.
- Search for package manifests, source files, SQL, migration folders, Prisma folders, `node_modules`, workspaces, scaffolds, and common implementation artifacts returned no matches.
- Search for existing Markdown/documentation validation tooling files returned no matches, so no documentation tool was run.
- `git diff --check` executed successfully.
- Additional whitespace inspection for untracked Markdown files checked trailing whitespace and final newlines successfully.
- Final Git status inspected with `git status --short --branch --untracked-files=all`.

Recommended next cycle:

Cycle 007: API and Application Contract Specification.

Recommended next task:

Task 001: Specify Application Commands, Queries, Authorization Context, and Error Contracts for the Critical Journey.

Why this should come next:

Cycles 002 through 006 now define domain rules, tenancy, onboarding, persistence invariants, the first merchant-facing journey, and the logical data model. The next dependency is a technology-independent application contract specification that stabilizes commands, queries, authorization context, validation outcomes, idempotency behavior, error categories, and read-model expectations before physical schema or UI implementation work.

Non-goals for the recommended next cycle:

- No framework selection.
- No HTTP route or transport-specific DTO implementation.
- No physical schema or migration.
- No repository implementation.
- No UI implementation.
- No provider integration.
- No MVP scope expansion.

## Cycle 007: API and Application Contract Specification

### Task 001: Specify Application Commands, Queries, Authorization Context, and Error Contracts for the Critical Journey

Status: Complete.

Objective:

Translate the accepted product journey and logical data model into technology-independent application contracts covering commands, queries, caller context, active Business context, authorization, validation, error categories, idempotency, unknown outcomes, concurrency, audit, external-side-effect handoff, sensitive-data handling, projection expectations, and cross-client consistency.

Scope:

- Define the application boundary as the semantic place where business intent is validated and coordinated.
- Distinguish commands from queries without selecting transport, framework, DTO, route, protocol, or persistence implementation.
- Define caller, authentication, session, active Business, Membership, capability, request-correlation, and idempotency context.
- Define command and query contract templates for future specifications and implementation.
- Define stable error categories, retry guidance, non-leakage behavior, validation precedence, and unknown-outcome recovery.
- Define contracts for identity/session, Business bootstrap, Business readiness and settings, Memberships, Invitations, Customers, Products, Sales, Sale corrections, Payments, Allocations, Payment reversals, Payment Requests, Expenses, reporting, idempotency, concurrency, audit, external side effects, cross-client consistency, sensitive-data handling, and compatibility.
- Align README, MVP scope, architecture, domain model, security, quality, and task tracking.

Deliverables:

- `docs/specs/application-contracts.md`
- Updated `README.md`
- Updated `docs/product/mvp-scope.md`
- Updated `docs/architecture/architecture.md`
- Updated `docs/architecture/domain-model.md`
- Updated `docs/security/privacy-and-lgpd.md`
- Updated `docs/quality/test-strategy.md`
- Updated `docs/tasks.md`

Acceptance criteria:

- Application contracts remain independent of transport, framework, and physical persistence.
- Commands and queries are clearly distinguished.
- The authoritative application boundary is explicit.
- Caller, authentication, Business, Membership, and capability contexts are explicit.
- Client-provided Business context is not treated as authorization.
- Tenant-owned identifiers are resolved only inside validated Business scope.
- Cross-tenant operations fail without existence leakage.
- Validation and failure precedence are documented.
- Stable technology-independent error categories are documented.
- Retry guidance is explicit.
- Unknown outcomes are distinguishable from confirmed failure.
- Idempotent replay is distinguishable from duplicate business data.
- Same idempotency identity with changed intent is rejected.
- First-owner bootstrap behavior is explicit.
- Active Business selection and revalidation are explicit.
- Invitation and Membership commands are explicit.
- Last-active-Owner protection remains concurrency-safe.
- Customer commands preserve optional non-unique contact data.
- Same-name Customers remain possible.
- Product edits do not alter historical Sale Item snapshots.
- Fully paid anonymous Sale behavior is explicit.
- Partial and unpaid Sales require Customer.
- Inline Customer creation during Sale is explicit.
- Sale totals are authoritatively recalculated.
- Fully paid, partial, and unpaid Sale consistency boundaries are explicit.
- Payment remains distinct from Allocation.
- Allocation order is explicit.
- Same-Business and same-Customer Allocation requirements are explicit.
- Overpayment remains rejected.
- Payment reversal preserves history and restores derived debt appropriately.
- Payment Requests have no debt effect.
- Expense commands and capability restrictions are explicit.
- Daily result preserves the accepted formula.
- Financial queries avoid double counting.
- Business-local dates and historical time-zone context are explicit.
- Audit consequences are explicit.
- Audit remains distinct from logs, analytics, and event sourcing.
- External side effects remain outside authoritative financial commit boundaries.
- Provider delivery does not prove Payment.
- Concurrency and stale-state behavior fail safely.
- Web and mobile semantic consistency is explicit.
- Sensitive-data minimization is explicit.
- Projection freshness, rebuilding, and reconciliation are documented.
- Contract compatibility expectations are documented without selecting a versioning mechanism.
- Future tests are documented but not implemented.
- Open questions are separated from accepted decisions.
- Existing documents remain internally consistent.
- No application code, dependency, package manifest, framework, route, HTTP contract, DTO, schema, SQL, migration, ORM, UI, automated test, provider integration, or scaffold is introduced.

Explicit non-goals:

- No application code.
- No package manifest, workspace setup, dependency, or automated test.
- No programming language, application framework, transport protocol, HTTP route, HTTP method, HTTP status code, GraphQL operation, RPC message, DTO, JSON payload, serializer, controller, resolver, or middleware decision.
- No authentication provider, session implementation, credential mechanism, token format, cookie format, tenant middleware, or authorization middleware.
- No physical schema, SQL, migration, table, column, index, constraint, trigger, view, identifier representation, ORM model, repository implementation, database client, tenant filter, Row-Level Security policy, transaction isolation level, or lock syntax.
- No UI component, screen layout, wireframe, navigation behavior, design-system token, or mobile scaffold.
- No report implementation, projection storage, cache, queue, worker, scheduler, outbox, audit storage, idempotency storage, backup, restore, provider callback, or external-side-effect implementation.
- No Pix, WhatsApp, email, SMS, analytics, object storage, cloud, or payment-provider integration.
- No billing, subscription, inventory, purchasing, supplier, fiscal document, bookkeeping, DRE, event sourcing, CQRS, microservice, distributed transaction, speculative enterprise architecture, or MVP scope expansion.
- No commit, push, or pull request.

Decisions made:

- Application contracts describe semantic business operations and do not imply routes, DTOs, protocols, handlers, schemas, repository interfaces, or physical storage.
- Commands authoritatively request state changes; queries read canonical or projected information without authoritatively mutating domain state.
- The application boundary is responsible for server-side authorization context, domain validation, canonical arithmetic, consistency boundaries, idempotency, audit evidence, error categories, read-model semantics, and post-commit side-effect requests.
- Caller context includes authenticated User, session validity, requested Business input, server-validated active Business, active Membership, current capability, correlation, client category where useful, and idempotency identity where required.
- Active Business selection can be automatic or explicit only after validation, and every later tenant-owned operation must revalidate current Business, Membership, state, and capability.
- Stable error categories were defined for authentication, session, Business context, Membership state, capability denial, scoped not-found, validation, conflicts, idempotency replay, different-intent reuse, unknown outcomes, overpayment, Customer-required debt, allocation context, last-owner protection, invitation failures, projection freshness, external delivery, and internal failure.
- Validation precedence starts with authentication/session and proceeds through verified identity, Business context, Business state, Membership state, capability, idempotency, input validation, tenant-scoped resource resolution, lifecycle validation, concurrency invariants, commit, audit/idempotency completion, and post-commit side effects.
- Identity and session contracts remain global and provider-independent while tenant-owned access depends on current active Membership.
- First-owner bootstrap remains all-or-nothing and idempotent.
- Business readiness remains active Business, active Owner, Business name, Business time zone, and BRL currency.
- Invitation and Membership contracts preserve matching verified email, replay rejection, last-owner protection, session revalidation, and secret exclusion.
- Customer contracts preserve required display name, optional non-unique phone/email, same-name Customers, inline Customer creation during Sale, and historical references.
- Product contracts preserve catalog/ad hoc behavior and Sale Item snapshots.
- Sale contracts separate fully paid anonymous, fully paid identified, partially paid, and unpaid Sale intents while requiring server-authoritative total recalculation.
- Payment and Allocation contracts preserve Payment as cash receipt, Allocation as debt attribution, selected-Sale-first allocation, oldest eligible fallback, same-Business/same-Customer rules, overpayment rejection, and atomic commit.
- Payment reversal and correction preserve history and restore derived debt through canonical records.
- Payment Request contracts keep request/delivery status separate from Payment and debt.
- Expense contracts preserve Staff restrictions by default and history-preserving correction.
- Reporting contracts preserve the daily result formula and prevent double-counting Sales, Payments, Allocations, Payment Requests, and Expenses.
- Idempotency contracts distinguish replay, different-intent reuse, unknown outcome, business uniqueness, and concurrency.
- Concurrency and stale-state behavior reject unsafe financial and authorization changes rather than using silent last-write-wins.
- Audit obligations remain distinct from logs, diagnostics, analytics, and event sourcing.
- External-side-effect contracts keep delivery, provider, notification, storage, export, and analytics attempts outside authoritative financial commits.
- Web and mobile share semantic contracts while mobile remains supporting.
- Sensitive-data contracts minimize personal, financial, secret, audit, idempotency, error, analytics, and side-effect payloads.

Risks:

- UX copy and screen-state behavior are not yet specified, so final merchant-facing handling of errors and confirmations remains open.
- Transport mapping is not yet specified, so routes, status-code mapping, DTOs, serialization, and versioning remain deferred.
- Physical persistence is not yet specified, so transaction, lock, schema, index, and idempotency storage mechanics remain deferred.
- Product validation may change fractional quantity, mobile recording, Staff visibility, Manager exposure, payment method labels, and same-name Customer warning behavior.
- Legal and operational validation may affect retention, anonymization, audit retention, support/admin access, shared-device sessions, backup, and provider-dispute handling.

Remaining questions:

- Are integer quantities enough for release one, or are fractional quantities required?
- Should mobile later record Sales or Payments, or remain limited to reports, photos, and collection assistance?
- Should Staff record Expenses or view limited daily-result pieces such as "Quanto entrou" without "Quanto sobrou"?
- Should Manager be exposed in release one?
- Which Brazilian Portuguese terms are clearest for Sale state, debt, cancellation, correction, reversal, replacement, and role names?
- When should same-name Customer warnings appear?
- Which payment method labels are required first?
- Are tenant-visible Sale and Payment numbers useful?
- Are Product SKU or barcode fields needed?
- Do merchants need saved drafts or explicit confirmation previews before financial commands?
- Should Expense categories be free text or controlled labels?
- Should historical correction dates affect past operational summaries or current correction summaries?
- What retention, anonymization, export-after-deactivation, support/admin, shared-device timeout, mobile-loss, audit-retention, idempotency-retention, communication-metadata, backup custody, restore authorization, RPO, RTO, and provider-dispute policies are required?
- Which programming language, framework, API protocol, route style, DTO/serialization format, versioning mechanism, physical schema, identifier representation, ORM, repository interface, session storage, idempotency storage, transaction strategy, RLS adoption, cache/projection technology, queue/outbox, provider, analytics, cloud, observability, offline sync, backup tooling, and deployment choices should be selected later?

Validation evidence:

- Repository state inspected before editing with `git status --short --branch --untracked-files=all`; repository had no commits on `master` and Markdown files were untracked.
- Repository files enumerated with `find . -maxdepth 4 -type f ! -path './.git/*' | sort`; only documentation files were present.
- `AGENTS.md`, `README.md`, product docs, architecture docs, domain model, security, quality, task tracking, relevant specification sections, and ADRs 0001 through 0015 inspected with `sed`, `rg`, file listing, and targeted section-heading checks.
- Cycle 006 status and recommended Cycle 007 task confirmed from `docs/tasks.md`.
- Required file existence verified with explicit `test -f` checks.
- New specification section structure inspected with `rg -n "^## |^### " docs/specs/application-contracts.md`; all required sections were present.
- Changed files inspected with targeted `rg` searches for Cycle 007, application-contract, server-authoritative, semantic contract, status, validation, and recommended-cycle updates.
- Existing specifications and ADRs used as sources were inspected with section-heading and decision/status searches.
- Internal Markdown links checked with a local link extraction command; no missing local links were reported.
- Unfinished-marker and accidental-prompt-text search with `rg` returned no matches.
- Contradiction-oriented searches reviewed global User identity, Business tenancy, active Business, Membership, capability, Invitation, last-active-Owner behavior, Customer requirements, Product and Sale Item snapshots, Sale states, Payment, Payment Allocation, debt, overpayment, Payment Request, Expense, daily result, cancellation/reversal, hard deletion, audit, idempotency, unknown outcomes, Business-local dates, application authorization, repository tenant scope, external side effects, Row-Level Security, framework/protocol/DTO/schema/ORM/provider choices, and implementation artifacts.
- Searches confirmed no document treats Business identity or a tenant filter alone as complete authorization.
- Searches confirmed commands revalidate current Business, Membership, and capability state; suspended and removed Memberships cannot authorize access; Business deactivation blocks ordinary operations; last-active-Owner protection occurs inside the authoritative boundary; anonymous Sales remain limited to fully paid counter Sales; partial and unpaid Sales require Customer; Customer phone/email are not unique; Product edits cannot rewrite Sale Item snapshots; client-calculated totals are previews; Sale status and debt remain derived; Payment Requests do not reduce debt; Allocations are not receipts; Sales recorded and Payments received remain distinct; overpayment/customer credit remain outside MVP; corrections preserve financial history; financial records are not ordinarily hard-deleted; errors avoid cross-tenant existence leakage; idempotency is not business uniqueness or concurrency; unknown outcomes have recovery paths; audit is not event sourcing; secrets and unnecessary personal/financial payloads are excluded; external delivery failure does not invalidate committed financial records; Row-Level Security remains deferred and not implemented.
- Financial formulas and examples were manually checked with integer shell arithmetic.
- Search for package manifests, source files, SQL, migration folders, Prisma folders, `node_modules`, workspaces, scaffolds, and common implementation artifacts returned no matches.
- Search for existing Markdown/documentation validation tooling files returned no matches, so no documentation tool was run.
- `git diff --check` executed successfully.
- Additional whitespace inspection for untracked Markdown files checked trailing whitespace and final newlines successfully.
- Final Git status inspected with `git status --short --branch --untracked-files=all`.

Recommended next cycle:

Cycle 008: Critical Journey UX Flow Specification.

Recommended next task:

Task 001: Specify Merchant-Facing Screen Flow, Copy, States, and Accessibility for the Critical Journey.

Why this should come next:

Cycles 002 through 007 now define domain rules, tenancy, onboarding, persistence invariants, the first merchant-facing journey, the logical data model, and semantic application contracts. The next dependency is merchant-facing UX behavior: screen flow, plain Brazilian Portuguese copy, validation messages, confirmation states, error recovery, accessibility, web/mobile presentation differences, and low-technical-literacy safeguards before transport mapping or implementation starts.

Non-goals for the recommended next cycle:

- No application code.
- No UI implementation.
- No high-fidelity visual design, component library, or design-system token.
- No HTTP routes, DTOs, transport API, or serialization format.
- No physical schema, migration, ORM, repository implementation, or transaction mechanics.
- No provider integration.
- No mobile scope expansion without product validation.
- No MVP scope expansion.

## Cycle 008: Critical Journey UX Flow Specification

### Task 001: Specify Merchant-Facing Screen Flow, Copy, States, and Accessibility for the Critical Journey

Status: Complete.

Objective:

Translate the accepted domain, journey, logical-model, and application contracts into an implementation-independent merchant-facing UX specification for navigation, screens, copy, forms, financial confirmation, errors, recovery, permissions, responsive web, supporting mobile, accessibility, and sensitive-data presentation.

Scope:

- Define the target merchant and operating context without stereotypes.
- Define experience principles, Brazilian Portuguese terminology, information architecture, global shell, and conceptual screen responsibilities.
- Define identity, session, first-Business onboarding, returning User, Business selection, and Business switching flows.
- Define Home, Customer, Product, Sale, Payment, Allocation, Payment Request, Expense, report, team, Invitation, Membership, settings, correction, cancellation, reversal, and deactivation experiences.
- Translate Cycle 007 error categories into safe merchant-facing copy, actions, retry rules, and accessibility behavior.
- Define financial preview, review, named confirmation, duplicate protection, conflict, unknown outcome, authoritative recovery, and state preservation.
- Define responsive web and supporting mobile responsibilities without expanding mobile mutation scope.
- Define accessibility, screen-level privacy, cross-client consistency, UX evolution, walkthroughs, and future validation targets.

Deliverables:

- `docs/specs/critical-journey-ux-flow.md`
- Updated `README.md`
- Updated `docs/product/mvp-scope.md`
- Updated `docs/architecture/architecture.md`
- Updated `docs/security/privacy-and-lgpd.md`
- Updated `docs/quality/test-strategy.md`
- Updated `docs/tasks.md`

Acceptance criteria:

- The cycle remains documentation-only and preserves accepted domain/application authority and MVP scope.
- Target user, operating context, experience principles, terminology, information architecture, navigation, and screen responsibilities are explicit.
- Current Business is visible, switching replaces tenant state, and client selection never becomes authorization.
- Identity, session, onboarding, returning User, Home, Customer, Product, Sale, Payment, Request, Expense, report, team, and settings journeys are explicit.
- Paid anonymous/identified, partial, and unpaid Sale behavior preserves Customer, snapshot, arithmetic, and atomicity rules.
- Preview, authoritative confirmation, committed result, safe replay, conflict, and unknown outcome are distinguishable.
- Unknown financial outcomes have recovery that prevents duplicate intent.
- Corrections, cancellations, reversals, replacements, deactivation, and history presentation preserve accepted records.
- Payment, Allocation, Request, debt, Sale, Expense, and daily-result meanings remain distinct.
- Error translation, retry safety, form preservation, stale/unavailable projections, and permission-sensitive presentation are explicit.
- Web owns the full journey; mobile remains supporting under identical semantics.
- Accessibility, responsive behavior, Brazilian Portuguese copy, sensitive-data minimization, and cross-client evolution are explicit.
- All required walkthroughs and future UX/accessibility/usability tests are documented.
- Open questions are separated from accepted decisions.
- No implementation, framework, route, transport, schema, provider, component, prototype, automated test, or scaffold is introduced.
- Exactly one evidence-based next cycle is recommended and no commit is created.

Explicit non-goals:

- No application, API, UI, report, persistence, provider, or automated test implementation.
- No package manifest, workspace, dependency, programming language, framework, library, route, protocol, method, status code, DTO, JSON, schema, SQL, migration, ORM, identifier, locking, isolation, queue, cache, storage, analytics, cloud, or deployment choice.
- No high-fidelity mockup, prototype, final layout, visual token, font, color, icon, or animation system.
- No mobile Sale, Payment, Expense, correction, team-administration, offline mutation, or synchronization expansion.
- No inventory, supplier, purchasing, accounts payable, fiscal, accounting, DRE, billing, subscription, or other MVP expansion.
- No commit, push, or pull request.

Decisions made:

- Web information architecture prioritizes Home, New Sale, Customers/debt, and Sales; Products, Expenses, Reports, Team, Business settings, and account/session tasks are placed according to frequency and capability.
- The active establishment remains visible, and Business switching removes prior-tenant data before rendering the new context.
- Merchant-facing UX uses Brazilian Portuguese and avoids tenant, Membership, Allocation, projection, idempotency, command, query, callback, payload, commit, accounting, and ERP language.
- Financial actions use editable preparation, explicit review, named confirmation, authoritative progress, and distinct success/rejection/conflict/unknown states.
- Unknown outcomes withhold a new financial intent and recover the original result using the same logical command identity.
- Home presents Payments received, Expenses, daily result, Sales recorded, debt, and recent activity as separate concepts; daily result remains Payments minus Expenses and is not profit.
- Inline Customer creation preserves Sale context; same-name and same-contact Customers remain allowed with non-blocking warning.
- Product deactivation during preparation causes reviewable conflict and never silently converts the line into another intent.
- Payment destination is explained as where received money was used; Allocation is not exposed as an extra receipt.
- Payment Request delivery states explicitly say that Payment is not confirmed and debt did not change.
- Staff-sensitive Expense and `Quanto sobrou` information is hidden by default; Manager exposure remains unresolved.
- Responsive web preserves every financial safeguard. Mobile remains supporting for reports, collection assistance, product photos, Business/session behavior, and debt visibility.
- Accessibility requirements apply to every journey state, including focus, announcements, keyboard, screen reader, non-color status, contrast, reflow, touch, reduced motion, and preserved form data.
- No ADR is needed because Cycle 008 applies existing cross-cutting decisions rather than adding a new architectural boundary.

Risks:

- Provisional merchant terminology may change after usability research.
- Durable draft and browser-refresh behavior is not yet specified and may affect interruption recovery.
- Staff/Manager visibility and mobile mutation scope may change the future screen map after product validation.
- Accessibility target version, validation tooling, device matrix, and acceptance thresholds remain operational choices.
- Provider-specific collection and product-photo journeys remain intentionally incomplete.
- Retention, anonymization, support access, exports, screenshots, analytics, and shared/lost-device policies require operational and legal validation.

Remaining questions:

- Product/merchant: fractional quantity; final financial and role terms; duplicate-Customer warning timing; payment methods; visible numbering; SKU/barcode; durable drafts; confirmation coverage; Expense categories; Staff/Manager permissions; mobile mutation; photo/request workflows; correction-date presentation; shareable summaries; Home emphasis; internal versus Customer-facing debt language.
- Operational/legal: retention, anonymization, export after deactivation, support/admin access, shared/lost-device policy, audit/idempotency/communication/photo metadata, backup/restore, provider disputes, collection wording, contact visibility, screenshot/analytics redaction, accessibility validation, and fiscal/legal Sale-summary wording.
- Implementation: language, frameworks, design system, components, routes, client state, forms, authentication/session, transport, DTO/serialization, schema/identifiers/ORM, repositories, idempotency/audit storage, transactions/RLS, projections, queues/workers, providers, cloud/observability, offline sync, browser persistence, visual tokens, breakpoints, animation, and accessibility tooling.

Validation evidence:

- Repository state inspected before editing with `git status --short --branch --untracked-files=all`; repository had no commits on `master` and all project Markdown files were untracked.
- Repository Markdown inventory enumerated with `rg --files -g '*.md'` and counted with `wc -l`; required product, architecture, security, quality, specification, ADR, and task sources were present.
- `AGENTS.md`, `README.md`, all product documents, architecture/domain/security/quality/task documents, all specifications, and ADRs 0001 through 0015 were inspected with `sed`, `rg`, headings, decision sections, and open-question sections before editing.
- Cycle 007 status, deliverables, accepted decisions, risks, remaining questions, and recommended Cycle 008 task were confirmed from `docs/tasks.md` and `docs/specs/application-contracts.md`.
- Required Cycle 008 file and source existence checked with explicit `test -f` loops; inventory reported four product files, seven specifications, and fifteen ADRs.
- New specification structure inspected with `rg -n '^## [0-9]+\.'`; all 47 required numbered sections were present.
- Walkthrough rows counted with `awk`; all 52 required walkthroughs were present.
- All changed documents were inspected with `sed` and targeted `rg` searches for Cycle 008 references, UX decisions, next-cycle recommendation, security changes, quality targets, and task status.
- Internal local Markdown links checked with a read-only Python link checker; every local link resolved.
- Draft-marker and accidental-prompt-text search with `rg` returned no matches.
- Application-contract and UX error tables compared programmatically; all 26 Cycle 007 error categories were mapped exactly.
- Contradiction-oriented `rg` searches and explicit invariant checks reviewed Business authorization, switching and tenant-state clearing, Membership suspension/removal, Business deactivation, last-Owner behavior, Customer requirements and non-unique contacts, same-name Customers, Product snapshots, ad hoc items, inventory exclusion, Sale states, client previews, Payment/Allocation/Request distinctions, overpayment, history-preserving corrections, unknown-outcome recovery, reports, Business-local dates, mobile scope, accessibility, sensitive data, external side effects, RLS, and deferred technology choices.
- Financial examples checked with integer shell arithmetic: `5000 - 1200 = 3800`, `4000 - 1500 = 2500`, `1800 - 0 = 1800`, `3000 + 500 = 3500`, `5000 - 3500 = 1500`, and `1200 - 1000 = 200`.
- Search for existing documentation-validation tooling found none, so no documentation tool was installed or run.
- Search for non-Markdown files and common package, source, SQL, migration, ORM, workspace, dependency, and scaffold artifacts returned no matches outside `.git`.
- `git diff --check` executed successfully; because files remain untracked, an additional `awk` trailing-whitespace and byte-level final-newline inspection passed for every Markdown file.
- Final Git status inspected with `git status --short --branch --untracked-files=all`; no commit was created.

Recommended next cycle:

Cycle 009: Low-Fidelity Interaction and Screen-State Specification.

Recommended next task:

Task 001: Define Low-Fidelity Screen Structures, Interaction Sequences, and State Transitions for the Web Critical Journey.

Why this should come next:

Cycle 008 stabilizes merchant-facing meaning, copy, state, recovery, responsive responsibility, accessibility, and privacy. Low-fidelity screen structures are the next smallest abstraction for validating navigation, information hierarchy, form sequence, and financial confidence with merchants before transport mapping, technology selection, physical persistence, or implementation.

Non-goals for the recommended next cycle:

- No application or UI implementation.
- No clickable or high-fidelity prototype.
- No final visual brand, design tokens, component library, framework, or technology selection.
- No transport API, DTO, route, schema, migration, provider integration, automated test, mobile scope expansion, or MVP expansion.

## Cycle 009: Low-Fidelity Interaction and Screen-State Specification

### Task 001: Define Low-Fidelity Screen Structures, Interaction Sequences, and State Transitions for the Web Critical Journey

Status: Complete.

Objective:

Transform the accepted Cycle 008 behavioral UX contract into framework-independent low-fidelity screen structures, navigation relationships, interaction sequences, state transitions, responsive responsibilities, accessibility annotations, and merchant-validation targets for the complete responsive web journey.

Scope:

- Define the target audience, operating context, authority order, and low-fidelity interaction principles.
- Define the global application frame, active-Business presentation, conceptual navigation, and desktop/tablet/mobile-browser responsibilities.
- Inventory authentication, onboarding, Business, Customer, Product, Sale, Payment, Payment Request, Expense, report, team, settings, session, and security surfaces.
- Define reusable screen states and critical transition sequences, including rejection, conflict, safe replay, unknown outcome, and authoritative recovery.
- Define the Sale workspace, financial review, named confirmation, duplicate prevention, result, correction, cancellation, reversal, and report structures.
- Map all 52 Cycle 008 walkthroughs to entry, sequence, states, result, recovery, client responsibility, and future merchant-validation targets.
- Define accessibility annotations, Brazilian Portuguese copy, sensitive-data behavior, merchant-validation activities, open questions, and UX evolution.

Deliverables:

- `docs/specs/low-fidelity-interaction-screen-state-spec.md`
- Updated `README.md`
- Updated `docs/architecture/architecture.md`
- Updated `docs/quality/test-strategy.md`
- Updated `docs/tasks.md`

Acceptance criteria:

- The cycle remains documentation-only and all repository authorities were inspected.
- Screen responsibilities, global frame, navigation, major anatomy, interaction sequences, and state transitions are complete without final layout decisions.
- All 52 Cycle 008 walkthroughs are mapped with no omissions or duplicate identifiers.
- Financial preparation, review, confirmation, commit, result, conflict, safe replay, and recovery remain distinct.
- Unknown outcome has a first-class surface; a new financial intent remains withheld until authoritative recovery permits safe retry.
- Entered work is preserved where safe, duplicate activation is prevented, and prior-Business content is removed during switching.
- Capability-sensitive presentation never replaces authoritative server validation or exposes cross-tenant existence.
- Responsive web duties are explicit and supporting-mobile mutation scope is not expanded.
- Accessibility is annotated across critical structures, states, and transitions.
- Merchant-facing copy examples are Brazilian Portuguese and unvalidated terms remain provisional.
- Sensitive-data presentation is minimized and merchant-validation targets are documented without fabricated findings.
- Existing documentation remains internally consistent and exactly one next cycle is recommended.
- No code, prototype, dependency, framework, route, transport, schema, provider, test, scaffold, or commit is introduced.

Explicit non-goals:

- No production or UI code, HTML/CSS/JavaScript prototype, clickable prototype, high-fidelity mockup, brand system, final visual design, design token, or component library.
- No programming language, application/frontend/mobile framework, routing, state-management, form, validation, icon, or accessibility-tooling selection.
- No API route, HTTP behavior, DTO, serialization, schema, SQL, migration, ORM, repository, identifier, transaction, locking, RLS, projection infrastructure, queue, worker, provider, authentication, deployment, or offline-sync implementation.
- No new mobile mutation responsibility, automated test, dependency, tool installation, MVP expansion, commit, push, or pull request.

Decisions made:

- Low-fidelity surfaces express behavioral responsibilities and reading order, not components or final layout.
- Every tenant-owned surface identifies the active establishment before its task content; Business switching clears previous-tenant content before loading the target context.
- The global frame organizes page identity, interruptions, task content, consequence summaries, primary action, supporting actions, and status announcements in a consistent conceptual order.
- Financial flows use distinct preparation, review, authoritative confirmation, committing, result, and recovery surfaces with specifically named actions.
- Unknown financial outcomes block new intent and recover the prior operation with the same logical command identity; safe retry appears only after authoritative no-commit recovery.
- The Sale workspace preserves inline Customer and item work after correctable errors and keeps client arithmetic visibly provisional.
- Payment destination is shown as how received money covers eligible debt; it is not presented as additional receipt value.
- Payment Request delivery and Payment receipt remain separate states and surfaces.
- Report structures preserve Sales, Payments, debt, Requests, Expenses, and daily operational result as separate meanings.
- Web retains the complete accepted journey; mobile remains supporting and receives no new authoritative mutation scope.
- Accessibility responsibilities include reading/focus order, field and error association, keyboard use, announcements, non-color status, reflow, touch, reduced motion, table alternatives, and preserved input on every critical path.
- No ADR is required because the cycle arranges accepted behavior without adding a durable architectural decision.

Risks:

- The structures have not yet been tested with merchants, so provisional terminology and content order may change after evidence.
- Durable draft, browser-refresh, recent-activity recovery prominence, and tablet navigation behavior remain open interaction questions.
- Staff/Manager visibility and future mobile mutation decisions may later alter capability-sensitive surface coverage.
- Accessibility target version, validation tooling, device matrix, and usability acceptance thresholds remain operational choices.
- Provider-specific delivery and Product-photo behavior remains intentionally deferred.
- Retention, anonymization, support access, exported data, shared/lost-device policy, and redaction need operational or legal validation.

Remaining questions:

- Product/merchant: fractional quantity; preferred Sale, debt, status, correction, reversal, replacement, and role terms; duplicate warning timing; payment methods; visible numbering; SKU/barcode; durable drafts; Expense categories; Staff/Manager permissions; mobile mutation scope; Product photos; Payment Request delivery; correction-date presentation; shareable summaries; Home emphasis; and Customer-facing debt language.
- Operational/legal: retention, anonymization, export after deactivation, support/admin access, shared/lost-device behavior, audit/idempotency/communication/photo metadata, financial history, backup/restore authorization and targets, provider disputes, collection wording, contact visibility, screenshot/analytics redaction, accessibility validation, and legal or fiscal Sale-summary language.
- Low-fidelity interaction: whether safe in-memory preparation survives reauthentication; whether review is a separate surface or mode; how recent-activity recovery is prioritized; how multiple same-name Customers are distinguished with minimal disclosure; and how filters collapse on narrow screens without hiding active criteria.
- Implementation: language, frameworks, design/component systems, routing, client state, forms, validation, authentication/session, transport, DTOs, schema/identifiers/ORM, repositories, idempotency/audit storage, transaction/RLS mechanics, projections, queues/workers, providers, cloud/observability, offline sync, browser persistence, visual tokens, breakpoints, animation, and accessibility tooling.

Validation evidence:

- Repository state inspected before editing with `git status --short --branch --untracked-files=all`; repository had no commits on `master` and project Markdown files were untracked.
- Repository Markdown files enumerated with `rg --files -g '*.md'`; required product, architecture, security, quality, specification, ADR, and task sources were present.
- `AGENTS.md`, `README.md`, all product documents, architecture/domain/security/quality/task documents, all current specifications, and ADRs 0001 through 0015 were inspected before editing using `sed`, `rg`, file counts, headings, status, decision, traceability, error, walkthrough, and open-question sections.
- Cycle 008 status, deliverables, 47-section structure, 52 walkthroughs, 26 error translations, accepted decisions, risks, open questions, and Cycle 009 recommendation were confirmed from repository documents.
- The Cycle 009 specification structure was inspected with heading searches; required sections, acceptance criteria, traceability, and exactly one follow-up specification were present.
- The walkthrough coverage matrix was counted with `awk`; rows were numbered consecutively from 1 through 52.
- Required source existence was checked with an explicit shell list; no required file was missing, eight specifications were present after creation, and all fifteen ADR files were present.
- All specifications were confirmed as accepted for planning; ADR title/status inspection confirmed ADRs 0001 through 0015 are accepted.
- The Cycle 007 error catalogue was parsed from its authoritative table and confirmed to contain 26 stable categories.
- The Cycle 008 and Cycle 009 walkthrough identifiers were extracted and compared with `awk`, `sort`, `uniq`, `diff`, and `seq`; both contained exactly the set 1 through 52 with no duplicate or gap.
- Internal Markdown links were extracted and resolved relative to their source files; 203 local links were checked and none were missing.
- Standard draft-marker, filler-text, template-marker, and accidental-prompt-text searches returned no matches before the validation command was recorded here.
- A targeted invariant scan confirmed active-Business visibility, tenant-state clearing, authoritative access revalidation, last-Owner protection, Customer requirements, non-unique contacts, Product snapshots, inventory exclusion, preview authority, Payment/Allocation/Request distinctions, overpayment rejection, history preservation, unknown recovery, the daily-result formula, Business-local dates, web/mobile scope, minimization, and cross-tenant non-disclosure.
- A broad potential-contradiction search returned four matches; manual inspection confirmed each was a prohibition or validation-failure description, not an accepted contradictory rule.
- All 32 required reusable screen states were compared against the state table and found; focus, announcement, accessibility, and responsive obligations also appeared throughout the specification.
- Brazilian Portuguese copy inventory was inspected; provisional terminology is labeled, Request delivery is never `Pago`, and daily result is not called `Lucro`, `DRE`, or an accounting result.
- Financial examples were verified with integer shell arithmetic: `4000 - 1500 = 2500`, `3000 + 500 = 3500`, `5000 - 3500 = 1500`, and `5000 - 1200 = 3800`.
- Search for forbidden implementation choices found only pre-existing, explicitly tentative or deferred technology references in baseline/task documents; the new specification selects none. File inventory found no non-Markdown project files outside `.git`, so no documentation validation tooling existed to run.
- `git diff --check` completed successfully.
- The first untracked-file whitespace command was rejected before execution because it used disallowed temporary-file cleanup; the replacement read-only inspection checked all 35 Markdown files and found no trailing whitespace or missing final newline.

Recommended next cycle:

Cycle 010: Implementation Architecture and Technology Selection Specification.

Recommended next task:

Task 001: Select the Initial Application Architecture, Technology Stack, and Workspace Boundaries.

Why this should come next:

Cycles 002 through 009 now stabilize domain, tenancy, identity, persistence invariants, merchant journey, logical records, semantic application contracts, behavioral UX, and low-fidelity web interactions. The next dependency is an evidence-based technology and workspace decision before transport mapping, physical persistence, or implementation scaffolding creates incompatible assumptions.

Non-goals for the recommended next cycle:

- No application scaffold, package installation, production code, UI component, endpoint, physical schema, migration, provider integration, deployment, or automated test implementation.
- No change to accepted product, domain, authorization, financial, UX, or mobile-scope behavior.
- No speculative distributed architecture, microservices, event sourcing, CQRS, or MVP expansion.

## Cycle 010: Implementation Architecture and Technology Selection Specification

### Task 001: Select the Initial Application Architecture, Technology Stack, and Workspace Boundaries

Status: Complete.

Objective:

Select and justify the minimum implementation topology, technology stack, workspace boundaries, validation approach, persistence access, session architecture, supporting-mobile delivery, testing architecture, and operational boundaries needed to implement the accepted MVP without implementing or scaffolding them.

Scope:

- Derive architectural drivers and non-functional constraints from Cycles 001 through 009 and ADRs 0001 through 0015.
- Evaluate serious topology, web, runtime, server, validation, persistence-access, session, mobile, workspace, test, and observability alternatives against explicit criteria.
- Verify current support and compatibility claims through official sources dated 2026-08-01.
- Select a coherent authoritative server boundary and dependency direction that preserve tenancy, financial authority, idempotency, unknown-outcome recovery, history, privacy, accessibility, and cross-client semantics.
- Record durable decisions in ADRs and align architecture, security, quality, discoverability, and task documents.
- Separate selected technology from transport, physical persistence, provider, deployment, and product questions that remain deferred.

Deliverables:

- `docs/specs/implementation-architecture-technology-selection.md`
- ADR 0016 through ADR 0021 under `docs/architecture/decisions/`
- Updated `README.md`
- Updated `docs/architecture/architecture.md`
- Updated `docs/architecture/decisions/README.md`
- Updated `docs/security/privacy-and-lgpd.md`
- Updated `docs/quality/test-strategy.md`
- Updated `docs/tasks.md`

Acceptance criteria:

- The cycle remains documentation-only and all authoritative repository sources were inspected.
- Time-sensitive support and compatibility claims are grounded in current official evidence.
- Evaluation criteria and serious alternatives are explicit; one coherent initial stack remains authoritative.
- A modular authoritative server with separate web presentation preserves application, tenant, and financial authority.
- TypeScript, Node.js, Next.js, Fastify, Zod, PostgreSQL, `node-postgres`, pnpm, session, mobile, test, and observability boundaries are selected at the permitted level.
- Client calculations, UI permissions, and selected Business context remain non-authoritative.
- Tenant isolation, last-Owner protection, idempotency, safe replay, unknown-outcome recovery, historical preservation, projections, dates, and post-commit external work remain implementable.
- Security, privacy, accessibility, responsive, supporting-mobile, test, operational, dependency, and upgrade implications are explicit.
- Durable choices have accepted, numbered ADRs with alternatives, consequences, risks, relationships, and revisit triggers.
- Transport mapping, physical schema, migrations, provider integration, and deployment details remain deferred.
- Existing documentation is internally consistent and recommends exactly one next cycle.
- No code, scaffold, manifest, lockfile, dependency, configuration, schema, SQL, migration, test implementation, provider integration, deployment artifact, or commit is introduced.

Explicit non-goals:

- No application/UI code, prototype, scaffold, generated project, dependency, manifest, lockfile, configuration, environment file, or automated test.
- No routes, methods, status mappings, DTOs, serialization, controller/resolver, or concrete transport contract.
- No physical identifiers, table/column/index/constraint design, SQL, migration, ORM mapping, transaction implementation, locking, isolation configuration, or RLS policy.
- No concrete authentication integration, credential provider, session store, queue/outbox, worker deployment, projection infrastructure, storage/communication/payment provider, cloud, observability backend, or deployment infrastructure.
- No new product responsibility, mobile mutation scope, high-fidelity design, commit, push, or pull request.

Decisions:

- Use a modular monolith authoritative application server with a separately deployable responsive web presentation and one PostgreSQL engine.
- Keep Next.js presentation and browser calculations outside authoritative financial, tenant, session, Membership, and capability decisions.
- Use TypeScript on Node.js 24 LTS, Next.js 16 App Router with React, Fastify 5, and Zod 4.
- Use PostgreSQL 18 on its current supported minor through explicit tenant-aware `node-postgres` repository adapters; defer migration tooling and physical design.
- Use application-owned, server-side, revocable sessions with opaque client identifiers; keep credential and email providers behind adapters.
- Use responsive web as the initial supporting-mobile delivery and create no separate mobile application initially.
- Use a pnpm workspace with explicit domain, application, contract, web, server, persistence, integration, and test-support boundaries; do not add Turborepo or Nx initially.
- Select ESLint, Prettier, Vitest, React Testing Library, Playwright, axe-core integration, Testcontainers/PostgreSQL, and OpenTelemetry-compatible server telemetry boundaries for later implementation.
- Keep domain and application modules framework-independent; providers, persistence, session, transport, and telemetry remain outward adapters.
- Recommend the transport/API contract as the next specification before physical persistence or scaffolding.

ADRs:

- ADR 0016 selects a modular authoritative server with separate web presentation.
- ADR 0017 selects TypeScript, Node.js 24 LTS, Next.js 16, Fastify 5, and Zod 4 boundaries.
- ADR 0018 selects PostgreSQL 18 with explicit `node-postgres` repository adapters.
- ADR 0019 selects a pnpm workspace with enforced dependency direction and no initial build orchestrator.
- ADR 0020 selects application-owned revocable server-side sessions with provider adapters.
- ADR 0021 selects responsive web as the initial supporting-mobile delivery.

Risks:

- Next.js server features could obscure the single authoritative boundary if direct persistence or business behavior leaks into web code.
- Direct PostgreSQL access increases mapping and query-review responsibility and provides less compile-time query safety than an ORM.
- Session security and post-commit reliability still require detailed transport, persistence, threat, and operational specifications.
- Responsive web may not satisfy later validated photo, sharing, notification, device-security, or offline needs.
- Dependency/runtime churn, merchant browser age, accessibility regressions, and unmeasured build complexity require explicit revisit triggers.
- Tooling breadth can become portfolio overengineering unless dependencies are installed only when an implementation slice requires them.

Open questions:

- Product/merchant: fractional quantities, provisional terminology, duplicate warnings, payment labels, visible numbering, SKU/barcode, drafts, Expense categories, Staff/Manager exposure, mobile mutations, Product photos, Payment Request delivery, correction dates, shareable summaries, Home emphasis, and debt wording.
- Operational/legal/security: session duration, credentials and recovery, browser/device support, accessibility process, retention/anonymization, export/support access, evidence retention, backup/restore targets and authorization, provider disputes, collection wording, photo retention, and telemetry redaction.
- Before scaffolding: compatible patch lock, exact package names, ESM/module resolution, architecture checks, local PostgreSQL/container approach, and merchant-browser evidence.
- Transport/API: protocol, route/method/status mapping, DTOs, serialization, pagination, session exchange, CSRF, idempotency carriage, compatibility, upload/download, and callback ingress.
- Physical persistence: identifiers, tables/columns, constraints, indexes, migrations, transactions, locking/isolation, session/idempotency/audit/outbox/projection representation, RLS, retention, and backup verification.
- Deployment/providers: cloud, network, secrets, managed PostgreSQL, object storage, communication/payment providers, queue/worker hosting, telemetry backend, TLS/CDN, promotion, backup, and disaster recovery.

Validation evidence:

- Repository status and file inventory were inspected before editing; Cycle 009 was confirmed complete, the branch had no `HEAD`, and all project files were untracked Markdown.
- `AGENTS.md`, README, product, architecture, security, quality, task, all specification, and ADR authority documents were inspected before selection.
- Required-source checks found no missing source; the final inventory contained nine specifications and twenty-one numbered ADRs.
- Official Node.js, TypeScript, Next.js, Fastify, PostgreSQL, `node-postgres`, Zod, pnpm, ESLint, Prettier, OWASP, Playwright, Testing Library, Testcontainers, OpenTelemetry, Prisma, Drizzle, NestJS, and React Router sources were checked on 2026-08-01.
- Official compatibility requirements confirmed Node.js 24 LTS meets Next.js 16, Fastify 5, Vitest 4, and `node-postgres` runtime requirements; PostgreSQL 18 was supported through November 2030.
- All local Markdown links were extracted and resolved; no missing target remained.
- Searches found no unfinished draft markers, copied task instructions, contradictory active stack, forbidden implementation artifact, or unselected technology represented as active.
- Invariant scans confirmed server authority, Business revalidation, tenant-state clearing, last-Owner protection, Customer/Sale/Product rules, preview authority, Payment/Allocation/Request distinctions, overpayment rejection, historical preservation, unknown recovery, dates, projections, daily-result meaning, mobile scope, privacy, and accessibility.
- The only monetary example in aligned architecture documentation was confirmed as R$ 1.00 = 100 minor units; integer daily-result arithmetic was also sanity-checked as 5000 - 1200 = 3800.
- No existing documentation-validation tooling was present, so none was installed or run.
- `git diff --check`, trailing-whitespace inspection, final-newline inspection, local-link validation, final Git status, and `HEAD`/commit checks completed without a documentation defect.

Recommended next cycle:

Cycle 011: Transport/API Contract Specification.

Recommended next task:

Task 001: Map Application Contracts to Versioned Transport, Session, Error, and Idempotency Semantics.

Why this should come next:

Cycle 007 stabilizes semantic application operations, Cycles 008 and 009 stabilize client behavior and recovery states, and Cycle 010 selects separate Next.js and Fastify boundaries. Transport mapping is now the shared dependency for web implementation, future supporting-client compatibility, session exchange, safe errors, idempotency, unknown-outcome recovery, and adapter integration tests. Physical persistence can follow without dictating client-visible semantics.

Non-goals for the recommended next cycle:

- No production code, generated server/client, scaffold, physical schema, migration, persistence implementation, provider integration, deployment, or automated test implementation.
- No change to accepted domain, authorization, financial, UX, responsive, mobile, privacy, or accessibility behavior.

## Cycle 011: Transport/API Contract Specification

### Task 001: Map Application Contracts to Versioned Transport, Session, Error, and Idempotency Semantics

Status: Complete.

Objective:

Map the accepted application contracts to a coherent, versioned transport boundary between the responsive Next.js presentation and authoritative Fastify application server without implementing the API or physical persistence.

Scope:

- Preserve all accepted domain, tenancy, authorization, financial, recovery, UX, privacy, accessibility, responsive, and supporting-mobile semantics.
- Select the transport style, namespace, versioning, JSON conventions, HTTP methods/statuses, session carriage, CSRF boundary, Business context, stable errors, idempotency, outcome recovery, concurrency preconditions, pagination, freshness, caching, and compatibility governance.
- Map every accepted Cycle 007 command/query family and all 26 application error categories.
- Map every Cycle 008 walkthrough exactly once to transport operations and Cycle 009 states.
- Verify current standards and framework guidance through official sources dated 2026-08-01.
- Record durable transport decisions in ADRs and align discoverability, architecture, security, quality, and task documents.

Deliverables:

- `docs/specs/transport-api-contract-specification.md`
- `docs/architecture/decisions/0022-versioned-json-http-explicit-commands.md`
- `docs/architecture/decisions/0023-same-origin-cookie-session-csrf.md`
- `docs/architecture/decisions/0024-business-context-in-tenant-paths.md`
- `docs/architecture/decisions/0025-idempotency-key-command-outcome-recovery.md`
- Updated `README.md`
- Updated `docs/architecture/architecture.md`
- Updated `docs/architecture/decisions/README.md`
- Updated `docs/security/privacy-and-lgpd.md`
- Updated `docs/quality/test-strategy.md`
- Updated `docs/tasks.md`

Acceptance criteria:

- The cycle remains documentation-only and all authoritative repository sources are inspected.
- Cycle 010 is confirmed complete and its Next.js/Fastify authority boundary remains intact.
- Versioned JSON over HTTP uses resource reads and explicit intent-named commands without generic financial CRUD.
- Serialization, compatibility, methods, statuses, success envelopes, RFC 9457 errors, pagination, freshness, and caching are defined.
- Same-origin opaque cookie sessions, pre-session/session-bound CSRF, Origin validation, and shared/lost-device behavior are defined without selecting a credential provider or physical store.
- Tenant routes express Business scope while current User, Business, Membership, state, capability, and same-Business references remain server-authoritative.
- All accepted Cycle 007 command/query families and 26 errors are mapped.
- Idempotency key scope, equivalent-intent replay, changed-intent rejection, in-progress state, and first-class authoritative outcome recovery are defined.
- Safe replay is distinct from new creation; unknown outcome is not failure; safe resubmission follows only authoritative no-commit.
- Concurrency and conditional mutation semantics preserve authoritative multi-record revalidation.
- All 52 Cycle 008 walkthroughs appear exactly once in the primary matrix.
- Payment, Allocation, debt, Payment Request, delivery, Expense, projections, daily result, Business-local dates, and history remain semantically distinct.
- Cross-Business existence, sensitive data, session/idempotency secrets, and internal diagnostics are not disclosed.
- Accessibility-supporting transport metadata and Brazilian Portuguese copy ownership are explicit.
- Four durable ADRs follow repository numbering and format.
- Physical persistence, implementation, provider, and deployment details remain deferred.
- No code, route implementation, source schema, scaffold, dependency, configuration, physical schema, SQL, migration, test, provider, deployment artifact, or commit is introduced.

Explicit non-goals:

- No Fastify/Next.js implementation, Zod source schema, OpenAPI artifact, generated client/server, UI, prototype, scaffold, manifest, lockfile, dependency, or configuration.
- No physical identifier, table, column, index, constraint, SQL, migration, repository, transaction, lock, isolation, RLS, session/idempotency/audit storage, queue, worker, or projection infrastructure.
- No credential, email, communication, payment, object-storage, analytics, observability, cloud, or deployment provider integration.
- No new product responsibility, mobile mutation scope, test implementation, commit, push, or pull request.

Transport decisions:

- Use `/api/v1` JSON over HTTPS with resource-oriented queries and explicit command subresources for financial and lifecycle intent.
- Use lower-camel JSON, opaque string identifiers, exact base-10 integer minor-unit money strings with `BRL`, RFC 3339 UTC instants, `YYYY-MM-DD` Business-local dates, and IANA time zones.
- Use OpenAPI 3.2 as the future wire description and Zod as runtime boundary validation, with application contracts retaining semantic authority.
- Use one public origin for separately deployable Next.js and Fastify; carry opaque sessions only in secure host-only cookies.
- Require a pre-session or session-bound synchronizer CSRF token, allowed Origin/Referer evidence, and SameSite/Fetch Metadata defense in depth for unsafe browser requests.
- Carry tenant scope in `/businesses/{businessId}` paths and revalidate all current authorization server-side.
- Use RFC 9457 Problem Details plus stable error, retry, commit-state, fresh-state, violation, and safe-correlation metadata.
- Use opaque cursor pagination and explicit projection source/freshness metadata; default authenticated/sensitive responses to `no-store`.
- Require `Idempotency-Key` for duplicate-sensitive commands, compare canonical intent server-side, return original results as marked safe replay, and reject changed intent.
- Use first-class global and Business-scoped command-outcome resolvers; only authoritative no-commit permits safe resubmission.
- Use ETag/If-Match for accepted conditional current-record changes while retaining full authoritative revalidation for multi-record financial commands.
- Keep Payment Request delivery post-commit, provider-neutral, and financially independent.

ADRs:

- ADR 0022: versioned JSON over HTTP with explicit command resources, RFC 9457, and future OpenAPI 3.2 wire description.
- ADR 0023: same-origin opaque cookie sessions with layered CSRF protection.
- ADR 0024: explicit Business scope in tenant paths with authoritative revalidation.
- ADR 0025: idempotency-key carriage with first-class command-outcome recovery.

Risks:

- OpenAPI 3.2, Zod, and Fastify schema dialects may drift unless explicit mapping and conformance tests are added.
- Developers may trust Business path identity, client previews, ETags, or UI permissions instead of current application authorization and invariants.
- Cookie, CSRF, origin, cache, and reverse-proxy configuration can weaken the documented boundary if implementation lacks threat and integration testing.
- Idempotency retention, canonical intent comparison, outcome recovery, and multi-record concurrency require careful physical persistence design.
- Stable errors can leak tenant or sensitive information if raw framework/provider errors bypass the public mapper.
- Cursor and contract evolution can create client skew without compatibility checks.
- Responsive web scope can expand accidentally if operation availability is mistaken for accepted mobile responsibility.

Open questions:

- Product/merchant: fractional quantities, provisional terminology, duplicate warnings, payment labels, visible numbering, SKU/barcode, drafts, Expense categories, Staff/Manager access, mobile mutations, Product photos, Request delivery, correction dates, summaries, Home emphasis, and debt wording.
- Operational/legal/privacy/security: session and evidence retention, credential/recovery policy, abuse thresholds, anonymization, export/support access, contact visibility, shared/lost-device rules, financial/audit retention, backup/restore targets, legal collection wording, screenshot/analytics redaction, accessibility process, and threat-model ownership.
- Before scaffolding: compatible patch/package lock, OpenAPI/Zod schema-authoring direction, exact limits, correlation header, cookie/local-development names, Fetch Metadata fallback, module format, architecture checks, and local PostgreSQL approach.
- Physical persistence: identifiers, schema, constraints, indexes, migrations, transactions, concurrency, session/CSRF/idempotency/audit/revision/projection/delivery representation, retention, RLS, backup, and repair.
- Providers/deployment: credential/email, Request delivery, callback verification, object storage, gateway/TLS, security headers, rate limiter, secrets, cloud, managed PostgreSQL, telemetry, worker hosting, CDN, and disaster recovery.

Validation evidence:

- Initial `git status --short --branch --untracked-files=all`, `git rev-parse --verify HEAD`, and commit count confirmed `master`, no `HEAD`, zero commits, and 42 untracked Markdown files before editing.
- `AGENTS.md`, README, product, architecture/domain, security, quality, task, all nine existing specifications, and all accepted ADRs 0001 through 0021 were inspected through full or focused section reads, headings, decisions, traceability, inventories, and invariant searches.
- Cycle 010 status, selected stack, six ADRs, risks, open questions, validation evidence, and Cycle 011 recommendation were confirmed from repository evidence.
- Official RFC 9110, RFC 9111, RFC 3339, RFC 9557, RFC 9457, RFC 6585, OpenAPI 3.2, OWASP session/CSRF/API Security, Fastify validation/serialization, Next.js authentication, and IETF Idempotency-Key draft-history sources were inspected on 2026-08-01.
- Thirteen official source URLs were checked with `curl`; all returned HTTP 200.
- Local Markdown-link resolution checked 296 links and found no missing targets at that validation point.
- The Cycle 007 source and Cycle 011 error matrices were parsed and diffed; each contained the same 26 categories in the same order.
- The Cycle 011 primary walkthrough matrix was parsed against `1..52`; it contained 52 unique rows with no missing or extra number.
- The application operation inventory was compared manually with Cycle 007 Sections 15 through 27; every accepted family is represented and future guarded boundaries are explicitly deferred.
- Draft-marker and accidental-prompt searches returned no match; repository artifact inventory contained only Markdown files outside `.git` and no documentation tooling to run.
- Targeted authority, tenant, session, CSRF, method/status, idempotency, recovery, financial, date, projection, privacy, mobile, and accessibility searches were inspected for contradictions.
- Integer arithmetic was executed for all monetary examples: `3000 + 500 = 3500`, `5000 - 3500 = 1500`, `5000 - 1200 = 3800`, `4000 - 1500 = 2500`, and `1800 - 0 = 1800`.
- Final local-link validation checked 296 links with no missing target; all 25 ADR numbers are contiguous and ADRs 0022 through 0025 contain the required accepted format sections.
- Final artifact inspection found 47 Markdown files and no non-Markdown project file, source code, manifest, lockfile, dependency, configuration, schema, SQL, migration, or test implementation.
- `git diff --check` completed with no reported error; a separate read-only scan of all 47 untracked Markdown files found no trailing whitespace or missing final newline.
- Final `git status --short --branch --untracked-files=all`, `git rev-parse --verify HEAD`, and commit count confirmed no `HEAD`, zero commits, and 47 untracked Markdown files on `master`.

Recommended next cycle:

Cycle 012: Physical Persistence Model Specification.

Recommended next task:

Task 001: Define the PostgreSQL Schema, Constraints, Transactions, Concurrency, and Migration Strategy for the Critical Journey.

Why this should come next:

Cycles 004 and 006 define persistence invariants and logical records, Cycle 010 selects PostgreSQL with explicit `node-postgres` adapters, and Cycle 011 now fixes the external transport behavior that persistence must support. The physical model is the remaining authority needed before scaffolding can represent tenant relationships, atomic financial commands, sessions, idempotency/outcome recovery, audit, history, projections, and concurrency without inventing storage assumptions in code.

Non-goals for the recommended next cycle:

- No application scaffold, production code, API implementation, UI, provider integration, deployment, or automated test implementation.
- No change to accepted product, domain, application, transport, UX, authorization, financial, responsive, mobile, privacy, or accessibility semantics.
- No speculative microservices, event sourcing, CQRS, distributed transactions, or MVP expansion.

## Cycle 012: Physical Persistence Model Specification

### Task 001: Define the PostgreSQL Schema, Constraints, Transactions, Concurrency, and Migration Strategy for the Critical Journey

Status: Complete.

Objective:

Translate the accepted logical model, application/transport contracts, and PostgreSQL/node-postgres direction into a deterministic physical persistence model without creating executable schema or implementation artifacts.

Scope:

- Preserve accepted product, domain, tenancy, authorization, financial, recovery, UX, transport, privacy, accessibility, responsive, and supporting-mobile semantics.
- Select PostgreSQL organization, identifiers, physical tables/columns/types, tenant-aware keys, constraints, mapped indexes, lifecycle/history representation, sessions/challenges, durable command outcomes, audit, outbox intent, projections, transactions, locks, migration policy, backup/repair requirements, and repository implications.
- Map every accepted Cycle 007/011 operation family, every accepted financial invariant, and all 52 Cycle 008 walkthroughs.
- Verify current PostgreSQL 18 and node-postgres behavior through official sources dated 2026-08-01.
- Record durable physical decisions in ADRs and align architecture, security, quality, discoverability, and task tracking.

Deliverables:

- `docs/specs/physical-persistence-model-specification.md`
- `docs/architecture/decisions/0026-shared-schema-uuidv7-tenant-aware-keys.md`
- `docs/architecture/decisions/0027-explicit-transactions-invariant-locking.md`
- `docs/architecture/decisions/0028-durable-command-execution-outcomes.md`
- `docs/architecture/decisions/0029-transactional-outbox-post-commit-effects.md`
- Updated `README.md`
- Updated `docs/architecture/architecture.md`
- Updated `docs/architecture/decisions/README.md`
- Updated `docs/security/privacy-and-lgpd.md`
- Updated `docs/quality/test-strategy.md`
- Updated `docs/tasks.md`

Acceptance criteria:

- Documentation-only scope; all authoritative repository sources and Cycle 011 completion are verified.
- One coherent 34-table PostgreSQL model defines every table purpose, type convention, UUIDv7 identity, tenant key, relationship, lifecycle, constraint, mapped index, retention class, and canonical/projection role.
- Customer name/phone/email remain non-unique; Product history, ad hoc items, integer minor-unit money, Business-local dates, and excluded inventory remain unchanged.
- Composite tenant foreign keys prevent cross-Business relationships where physically possible while current application authorization remains mandatory and RLS remains explicitly deferred.
- Financial history, Payment/Allocation separation, Payment Request independence, no overpayment/credit, correction relationships, and daily-result meaning remain authoritative.
- Declarative constraints and transactionally enforced aggregate invariants are distinguished.
- Every critical command has transaction, lock, isolation, idempotency, audit, projection, side-effect, and recovery behavior.
- Last-Owner, allocation, cancellation/Payment, Invitation, deactivation, correction, reversal, and duplicate races have authoritative strategies.
- Durable executions/outcomes support identical replay, changed-intent rejection, unknown outcomes, and authoritative no-commit before resubmission.
- Session/challenge bearer values are never stored plaintext; sensitive data, audit, retention, backup, restore, reconciliation, repair, and repository boundaries are explicit.
- Every Cycle 007/011 operation family and financial invariant is mapped; all 52 walkthroughs appear exactly once.
- Four durable ADRs follow repository numbering/format; future guarded boundaries remain table-free.
- No SQL, migration, schema source, code, dependency, configuration, database/container, test, provider, deployment artifact, or commit is created.
- Exactly one evidence-based next cycle is recommended.

Explicit non-goals:

- No executable DDL/SQL, migration file/runner installation, ORM/source schema, repository/transaction code, database connection, container, seed, environment/configuration, or generated identifier artifact.
- No Fastify/Next.js/Zod/OpenAPI implementation, workspace scaffold, manifest, lockfile, dependency, UI, prototype, automated test, authentication/provider integration, external-delivery provider, deployment, cloud, or infrastructure.
- No new product responsibility, mobile mutation scope, event sourcing, CQRS, microservice, distributed transaction, commit, push, or pull request.

Persistence decisions:

- Use one restricted `sem_caderno` PostgreSQL schema, PostgreSQL-generated UUIDv7 keys, `snake_case`, technical `text` checks, narrow JSONB, no initial extensions, and no schema-per-tenant.
- Repeat `business_id` on tenant records and use composite tenant foreign keys; Business context remains untrusted until current server authorization.
- Use `bigint` BRL minor units and whole-unit `bigint` quantity for the accepted journey while fractional scale/rounding remains unresolved.
- Define 19 canonical/reference, 11 operational/security/integrity, and 4 projection tables; guarded credential, photo, export, provider-callback, and anonymization boundaries receive no speculative table.
- Preserve immutable Sale Item facts and append correction/reversal/replacement evidence; prohibit ordinary financial hard deletion.
- Use `READ COMMITTED`, optimistic versions, invariant-specific row locks, deterministic lock order, and complete retry with the same intent/idempotency identity.
- Persist command execution claims/leases and immutable committed/rejected/no-commit outcomes; only durable no-commit permits safe resubmission.
- Use transactional external-effect intent and provider-neutral delivery attempts after commit.
- Use canonical queries plus application projection tables, ordered changes, checkpoints, freshness, rebuild, and reconciliation.
- Use ordered immutable expand-and-contract migrations with roll-forward production recovery; exact runner remains for the scaffold/tooling specification.

ADRs:

- ADR 0026: shared application schema, UUIDv7, tenant-aware composite keys, and deferred RLS.
- ADR 0027: explicit transactions with invariant-specific locking and retry.
- ADR 0028: durable command executions and final outcomes.
- ADR 0029: transactional outbox for post-commit external effects.

Risks:

- Cross-Business key mistakes, omitted invariant locks, deadlocks, stale command leases, premature outcome cleanup, projection authority drift, audit/JSON sensitive-data leakage, unsafe migration locks, and restore without outcome continuity require real PostgreSQL tests and operational gates.
- Fractional quantity, Payment method labels, credential storage, retention periods, encryption/key custody, RLS, migration runner, provider evidence, and deployment/backup objectives remain unresolved at their accepted boundaries.

Open questions:

- Product/merchant: fractional quantity, terms, duplicate-warning timing, Payment methods, visible numbering, SKU/barcode, drafts, Expense categories/permissions, mobile mutations, photos, Request workflow, correction dates, summaries, Home emphasis, and debt wording.
- Operational/legal/privacy/security: retention/anonymization/export/support/repair, shared/lost-device policy, reauthentication, encryption/key custody, collection wording, provider disputes, backup custody/RPO/RTO, audit tamper resistance, redaction, and possible pre-production RLS.
- Before scaffolding: exact patch/package lock, workspace/module names, migration runner/schema history, local/CI PostgreSQL, and architecture gates.
- Later implementation: executable DDL, constraint/index expressions, limits, digest/encryption algorithms, migration lock/timeouts/batches, row mapping, transaction/retry helpers, projection worker, provider integration, deployment, and backup tooling.

Validation evidence:

- Initial inspection confirmed `master` has no `HEAD`, zero commits, 47 untracked Markdown files, no non-Markdown project artifact, and repository evidence marks Cycle 011 complete.
- `AGENTS.md`, README, product, architecture, security, quality, task, all nine prior specifications, and all accepted ADRs 0001-0025 were inspected; Cycle 007's 26-error catalogue, Cycle 008's 52 walkthroughs, Cycle 009 states, Cycle 010 stack, and Cycle 011's 79-operation inventory were extracted from their authoritative documents.
- The completed specification has 35 sequential sections and a 34-table catalogue: 19 canonical/reference, 11 operational/security/integrity, and 4 rebuildable projection tables. The relationship, operation, financial-invariant, and walkthrough matrices were inspected.
- An identifier comparison confirmed all 79 unique Cycle 011 operation IDs are represented in the persistence matrix with no missing or duplicate source IDs. Cycle 007 families are covered through those accepted mappings and guarded boundaries remain explicitly table-free.
- The Cycle 008 source and persistence matrices each contain walkthrough numbers 1-52 exactly once, with no missing or extra number. The financial matrix contains 23 accepted invariant rows.
- ADR numbering is contiguous from 0001 through 0029. ADRs 0026-0029 each use the repository's Accepted status and required Context, Decision, Consequences, Alternatives, Risks/revisit triggers, and relationship sections.
- All 319 repository-local Markdown links resolved. All 16 official PostgreSQL 18 and node-postgres evidence links used by Cycle 012 returned HTTP 200 on 2026-08-01.
- Targeted searches confirmed non-unique Customer name/phone/email, tenant-aware composite references, Business selection as non-authoritative, deferred RLS, immutable Sale Item snapshots, Payment/Allocation/Request separation, no overpayment or credit, history preservation, authoritative no-commit recovery, the accepted daily-result formula, and no executable SQL.
- Integer-minor-unit examples were manually checked: `4000-1500=2500`, `1800-0=1800`, `3000+500=3500`, `5000-3500=1500`, `1200-1000=200`, and `5000-1200=3800`; `1500>1200` confirms the overpayment example.
- Repository artifact inspection found only 52 Markdown files and no source, manifest, lockfile, migration, SQL, schema source, configuration, generated project, test, provider, or deployment artifact. No documentation tooling exists to run, and no tooling was installed.
- Final Markdown table-shape, placeholder/prompt, local-link, trailing-whitespace, final-newline, `git diff --check`, Git status, `HEAD`, and commit-count checks completed without findings; all 52 project Markdown files remain untracked on `master`, `HEAD` remains absent, and no commit, push, or pull request was created.

Recommended next cycle:

Cycle 013: Workspace Scaffolding and Tooling Specification.

Recommended next task:

Task 001: Define the Initial pnpm Workspace, Package Boundaries, Version Baseline, Migration Tooling Boundary, and Validation Gates.

Why this should come next:

Cycles 010-012 now fix topology, stack, transport, and physical persistence. One focused specification must close exact workspace/package names, compatible patch versions, ESM/build rules, architecture checks, migration runner boundary, and local PostgreSQL/Testcontainers strategy before any generated scaffold or dependency can become accidental architecture.

Non-goals for the recommended next cycle:

- No scaffold, package manifest, lockfile, dependency installation, generated project, application/API/UI/repository/migration implementation, SQL, database/container execution, provider integration, deployment, test implementation, product expansion, mobile mutation expansion, or commit.

## Cycle 013 — Workspace Scaffolding and Tooling Specification

### Task 001 — Define the Initial pnpm Workspace, Package Boundaries, Version Baseline, Migration Tooling Boundary, and Validation Gates

Status: Complete.

Objective:

Define one implementation-ready, documentation-only baseline for the initial pnpm workspace, exact package ownership and dependency direction, compatible runtime/tool versions, ESM/TypeScript conventions, architecture enforcement, testing/database boundaries, migration runner, environment ownership, repository hygiene, ordered validation gates, and the bounded executable scaffold that may follow.

Scope:

- Verify Cycles 010-012 and all accepted architecture, transport, persistence, quality, security, UX, mobile, and accessibility authority.
- Select exact paths and package names for the smallest coherent workspace.
- Define allowed and forbidden dependencies, exports, type-only imports, shared-utility extraction, and cycle prevention.
- Verify current versions and compatibility through official documentation, release metadata, registry metadata, and official PostgreSQL image evidence.
- Define Node/pnpm/lockfile, ESM/TypeScript, build/development, lint/format, architecture, test, PostgreSQL/Testcontainers, migration, configuration, supply-chain, generated-artifact, and validation policies.
- Define the precise artifacts permitted in Cycle 014 without creating them.

Deliverables:

- [Workspace Scaffolding and Tooling Specification](specs/workspace-scaffolding-tooling-specification.md).
- ADR 0030: ESM, TypeScript project references, and explicit package exports.
- ADR 0031: node-pg-migrate in a dedicated database tool workspace.
- ADR 0032: layered static workspace-boundary enforcement.
- Consistency and discoverability updates to README, architecture, ADR index, test strategy, security/privacy planning, and task tracking.

Acceptance criteria:

- The cycle remains documentation-only and every authoritative source is inspected.
- Cycles 010, 011, and 012 are verified from repository evidence.
- Seven exact private workspace members have responsibilities, public boundaries, dependency rules, build/runtime ownership, test ownership, and scaffold/defer status.
- Allowed/forbidden dependency matrices, a graph, type-only rules, exports, shared-utility constraints, and cycle prevention preserve the accepted authority boundaries.
- Current Node, pnpm, TypeScript, Next.js, React, Fastify, Zod, node-postgres, PostgreSQL, test, lint, format, architecture, and migration baselines are supported by primary evidence and compatible engine/peer metadata.
- ESM/TypeScript, package-manager, build/development, lint/format, architecture, testing, local PostgreSQL, Testcontainers, migration, environment, supply-chain, and generated-artifact policies are explicit.
- Ordered local/CI validation gates and a bounded Cycle 014 file plan are documented.
- Web, mobile, Fastify, Next.js, domain/application, PostgreSQL, node-postgres, tenancy, financial, idempotency, recovery, outbox, projection, privacy, security, and accessibility decisions remain unchanged.
- Durable decisions use contiguous accepted ADRs and ordinary patch/script/path choices remain in the specification.
- No manifest, lockfile, executable configuration, source, dependency, migration, SQL, test, project generator, database/container, provider, deployment artifact, or commit is introduced.
- Exactly one next cycle is recommended.

Explicit non-goals:

- No application/UI/API/domain/repository implementation, workspace scaffold, manifest, lockfile, TypeScript/lint/format config, environment file, dependency install, generated project, migration/SQL, database/container execution, CI workflow, provider/deployment integration, automated test, product expansion, mobile expansion, commit, push, or pull request.

Repository evidence:

- `master` has no `HEAD` and no commits; the initial repository inventory contains only Markdown documentation.
- Cycle 010 is complete and selects the modular Fastify/Next.js/TypeScript/Node/PostgreSQL/node-postgres/pnpm architecture.
- Cycle 011 is complete and preserves Fastify authority, untrusted web/DTO/Business context, session/CSRF, stable errors, idempotency, and outcome recovery.
- Cycle 012 is complete and selects the shared schema, UUIDv7, tenant keys, `bigint` money, physical records, explicit transactions/locks, durable outcomes, outbox, projections, and migration policy.

Selected decisions:

- Create `apps/web`, `apps/server`, `packages/domain`, `packages/application`, `packages/contracts`, `packages/persistence-postgres`, and `tools/database` in Cycle 014; defer mobile, provider-adapter, shared-test, generic shared/config, and projection-worker packages.
- Use ESM, NodeNext for Node targets, Next bundler resolution for web, strict TypeScript, project references, declarations for libraries, public package exports, and no editor-only aliases.
- Use pnpm recursive/filter execution and TypeScript references without Turborepo/Nx.
- Use root ESLint/Prettier, package-specific rules, package exports, pnpm cycle rejection, dependency-cruiser, and a narrow repository validator.
- Use developer-managed PostgreSQL for ordinary development and pinned PostgreSQL 18.4 Testcontainers with unique test databases for integration tests.
- Use node-pg-migrate in the isolated database tool with ordered immutable TypeScript migrations, history/checksum evidence, fail-fast advisory lock, transactional default, expand-and-contract, and production roll-forward policy.
- Keep environment parsing local to executable boundaries and prohibit secret/browser/config-object leakage.

Version evidence:

- Verified on 2026-08-04: Node 24.19.0 LTS; pnpm 11.20.0; TypeScript 6.0.3; Next.js 16.3.0; React/React DOM 19.2.8; Fastify 5.11.2; Zod 4.4.3; `pg` 8.22.0; PostgreSQL 18.4; Vitest 4.1.10; Testcontainers 12.1.0; ESLint 9.39.5; Prettier 3.9.6; dependency-cruiser 18.1.1; node-pg-migrate 9.0.0.
- TypeScript 7.0.2 is not selected because `typescript-eslint` 8.66.0 declares `<6.1.0`; ESLint 10.8.0 is not selected because JSX accessibility plugin 6.10.2 declares support through ESLint 9.
- The official PostgreSQL `18.4-bookworm` multi-architecture image digest is pinned for future tests.

Validation evidence:

- Initial and final Git inspection confirmed `master`, no `HEAD`, zero commits, and documentation-only project contents; the final inventory has 56 untracked Markdown files and no non-Markdown artifact.
- `AGENTS.md`, README, product scope, architecture/domain, security, quality, all 11 prior specifications, all accepted ADRs 0001-0029, and Cycle 010-012 task evidence were inspected through complete reads, focused reads, inventories, headings, decisions, and traceability searches.
- Cycle 010, 011, and 012 completion and their topology, transport, persistence, authority, financial, tenancy, idempotency, recovery, projection, outbox, mobile, privacy, and accessibility boundaries were confirmed from repository evidence.
- Official Node release metadata and npm registry metadata verified the selected versions and engine/peer compatibility on 2026-08-04. TypeScript 7/ESLint 10 incompatibility with the selected lint stack was verified rather than inferred.
- Official pnpm settings/workspace/CI, TypeScript, Next.js, Fastify, OpenAPI, PostgreSQL, Testcontainers, and node-pg-migrate sources were inspected; every official URL cited by the specification returned HTTP 200.
- The official `postgres:18.4-bookworm` registry manifest returned the documented digest and 16 multi-architecture manifests.
- Workspace parsing found seven catalogue rows and all seven package paths/names in the dependency rules; the validation matrix contains 20 ordered gates.
- ADR numbering is contiguous from 0001 through 0032; ADRs 0030-0032 are Accepted and include Context, Decision, Consequences, Alternatives, Risks/revisit triggers, relationship, and follow-up sections.
- Repository Markdown validation checked 56 files, 336 local links, and 78 tables with no missing target, malformed table, trailing whitespace, or missing final newline.
- Draft-marker, accidental-prompt, contradiction, authority, package-name/path/version, forbidden-technology, and artifact searches were inspected without an unresolved finding.
- `git diff --check` returned no error. Because every project file remains untracked, the separate all-Markdown whitespace/final-newline check supplied coverage that Git diff cannot provide.
- No existing documentation validation tooling was present, so no such tool was run and none was installed.
- Final status confirmed no package-manager command modified the repository, no dependency was installed, and no manifest, lockfile, executable config, source, SQL, migration, test, generated artifact, database/container, provider, deployment artifact, commit, push, or pull request was created.

ADRs:

- ADR 0030 records the ESM/TypeScript project-reference/export model.
- ADR 0031 records the dedicated node-pg-migrate boundary.
- ADR 0032 records layered static architecture enforcement.

Risks:

- Package fragmentation, shared-package sprawl, framework/DTO/persistence leakage, cycles, version/module drift, false confidence from static checks, container unavailability/flakiness, PostgreSQL divergence, unsafe database targeting, migration race/drift/destruction, lifecycle-script risk, lockfile drift, secret leakage, and implementation hidden in configuration.

Open questions:

- Before scaffolding: reverify exact patches/peers/image digest and choose only the non-secret example variable names required by minimal entrypoints.
- Contract implementation: OpenAPI/Zod source ownership and concrete schema organization.
- Migration/repository implementation: first DDL, lock key/timeouts, checksum ledger, backfill, SQL/transaction helper, row mapping, and fixtures.
- Provider/deployment: credentials, delivery providers, CI/cloud/secrets/telemetry, backup/RPO/RTO, and update/security automation.
- Product questions remain unchanged and cannot be resolved by workspace defaults.

Recommended next cycle:

Cycle 014 — Executable Workspace Scaffolding.

Recommended next task:

Task 001 — Create the Approved pnpm Workspace Skeleton and Run the Initial Static Validation Gates.

Why this should come next:

Cycles 010-013 now close topology, stack, transport, physical persistence, exact workspace ownership, compatible versions, module/build conventions, migration-tooling ownership, architecture enforcement, and initial gates. The next safe dependency is to create only that bounded scaffold and prove its lockfile, static, type, architecture, and build behavior before implementing contracts or product behavior.

Non-goals for the recommended next cycle:

- No domain or application behavior, transport schema/route, database migration/SQL, repository implementation, session/provider integration, product UI journey, Testcontainers/database test harness, CI/deployment infrastructure, mobile package, product expansion, or unrelated refactor.

## Cycle 014 — Executable Workspace Scaffolding

### Task 001 — Create the Approved pnpm Workspace Skeleton and Run the Initial Static Validation Gates

Status: Complete.

Objective:

Create only the seven-member pnpm workspace approved by Cycle 013 and prove its reproducible installation, ESM/TypeScript boundaries, static architecture enforcement, behavior-free framework builds, and isolated migration-tool boundary without beginning product implementation.

Prerequisites and repository evidence:

- `AGENTS.md`, all 12 accepted specifications, all accepted ADRs 0001-0032, README, product scope, architecture/domain, security, quality, and task history were inspected before editing.
- Cycles 010-013 are Complete in repository evidence and select the Fastify/Next.js modular topology, transport semantics, PostgreSQL physical direction, seven package boundaries, exact version baseline, and static gates implemented here.
- Preflight found `master`, no `HEAD`, zero commits, 56 untracked Markdown files, and no non-Markdown project artifact.
- Official release and registry metadata were reverified on 2026-08-04 before installation. The approved versions remained obtainable and compatible; the PostgreSQL `18.4-bookworm` digest remained `sha256:1961f96e6029a02c3812d7cb329a3b03a3ac2bb067058dec17b0f5596aca9296`.

Scope:

- Create the root pnpm workspace, one lockfile, repository hygiene, exact runtime/package-manager declarations, ESM/strict TypeScript configuration, formatting, linting, architecture validation, build scripts, and documentation checks.
- Create exactly the approved web, server, domain, application, contracts, PostgreSQL adapter, and database migration-tool members.
- Keep library entrypoints behavior-free, the Fastify edge route-free and non-listening, the Next.js page neutral, and the migration directory empty.
- Install only dependencies required by the actual scaffold and explicitly defer source-contract, feature-test, PostgreSQL, browser-test, and provider tools until their owning source exists.

Deliverables:

- Root manifests and lockfile: `package.json`, `pnpm-workspace.yaml`, and `pnpm-lock.yaml`.
- Root runtime, hygiene, TypeScript, ESLint, Prettier, dependency-cruiser, documentation, architecture, migration-boundary, runtime, and cleanup configuration/scripts.
- Seven approved private workspace members under `apps`, `packages`, and `tools`.
- Minimal Fastify construction and public composition entrypoints, a neutral buildable Next.js App Router shell, behavior-free package exports, and an empty migration directory.
- Updated README, architecture, quality, security/privacy, and task tracking.

Workspace members:

| Path | Package | Responsibility |
| --- | --- | --- |
| `apps/web` | `@sem-caderno/web` | Next.js presentation shell; first-party dependency only on browser-safe contracts. |
| `apps/server` | `@sem-caderno/server` | Fastify authoritative composition edge; no product route or listener. |
| `packages/domain` | `@sem-caderno/domain` | Framework-independent domain boundary; empty until domain implementation. |
| `packages/application` | `@sem-caderno/application` | Application boundary depending only on domain; empty until use-case implementation. |
| `packages/contracts` | `@sem-caderno/contracts` | Browser-safe wire-contract boundary; no schema or Zod dependency yet. |
| `packages/persistence-postgres` | `@sem-caderno/persistence-postgres` | PostgreSQL adapter boundary; no pg dependency, connection, SQL, or repository yet. |
| `tools/database` | `@sem-caderno/database-migrations` | Isolated node-pg-migrate ownership and empty migration source boundary. |

Dependencies and exact versions:

- Runtime/tool activation: Node.js 24.19.0, Corepack 0.35.0, and pnpm 11.20.0.
- Language/framework/runtime: TypeScript 6.0.3, Next.js 16.3.0, React/React DOM 19.2.8, Fastify 5.11.2, pg 8.22.0, and node-pg-migrate 9.0.0.
- Static tooling: ESLint 9.39.5, typescript-eslint 8.66.0, Prettier 3.9.6, dependency-cruiser 18.1.1, @next/eslint-plugin-next 16.3.0, eslint-plugin-jsx-a11y 6.10.2, eslint-plugin-react-hooks 7.1.1, globals 17.9.0, and @types/node 24.13.3.
- Migration typing: @types/pg 8.20.3. Zod is not declared directly by contracts, and Vitest, React Testing Library, Playwright, axe-core, Testcontainers, and tsx are not declared because the initial scaffold has no schema, corresponding test, database harness, or development execution need. Transitive packages remain unavailable for application imports unless declared by the owning workspace.
- No accepted Cycle 013 dependency version changed. Exact release-age exceptions were required for the newly published approved Next.js 16.3.0 and typescript-eslint 8.66.0 package sets; no lifecycle script was allowed.

Root commands:

- `check:runtime`, `docs:check`, `format`, `format:check`, `lint`, `typecheck`, `architecture`, `test`, `build:packages`, `build:server`, `build:database`, `build:web`, `build`, `migration:check`, `validate`, and `clean` own only gates that exist.
- `test` runs the architecture validator self-test. No contract, database, browser, mobile, or feature-test script falsely claims an absent gate.

Architecture checks:

- Package exports and TypeScript project references encode public and build boundaries.
- ESLint rejects layer-specific imports and applies browser/Node environments separately.
- dependency-cruiser rejects circular, orphaned, deep, and cross-layer dependencies.
- The narrow root validator checks exact members/names/privacy, dependency allow lists, workspace protocol, cycles, undeclared/deep/cross-root imports, Node built-ins in browser-safe code, raw SQL, forbidden workspace categories, active environment files, and forbidden infrastructure artifacts.
- The validator self-test accepts a controlled valid graph and rejects a controlled invalid dependency. Static evidence cannot prove authorization, tenant isolation, financial or transaction correctness, idempotency, recovery, projection correctness, privacy compliance, or accessibility conformance.

Tests present:

- One root-owned architecture-validator valid/invalid fixture self-test.
- No empty feature test is created. Domain, application, contract, transport, PostgreSQL, migration execution, concurrency, tenant, browser, accessibility, mobile, provider, backup, and end-to-end tests remain deferred.

Validation evidence:

- Pre-install runtime, documentation (56 Markdown files, 336 local links, 78 tables), architecture manifest/self-test, migration-boundary, and seven-manifest checks passed.
- The first installation attempt reached the registry but was interrupted by slow tarball retries; the first resolved installation failed because pnpm's approved 24-hour minimum release age rejected newly published Next.js 16.3.0 and typescript-eslint 8.66.0.
- Exact package-set release-age exceptions were added after registry verification. Installation then resolved 406 packages and created the single root lockfile without a lifecycle-script exception.
- Frozen offline reinstall passed. Lock inspection found only approved workspace `link:` entries and no Git, HTTP tarball, or out-of-workspace local dependency.
- Initial lint failed on one unused import and an App Router-inapplicable Next.js pages rule; both scaffold configuration issues were corrected without weakening an accepted boundary, and lint then passed.
- The initial root test command failed because the manifest omitted its root alias; adding `test` as an alias to the already implemented architecture self-test corrected it, and the rerun passed.
- The first clean-state full validation exposed that Next.js 16 generated route-type imports require `next typegen` before standalone web type-checking. The web-owned command now runs the framework generator first; generated `.next` types remain ignored and cleanable.
- The next clean-state run exposed that Next rewrites framework-owned `next-env.d.ts` in its own format. That single generated declaration is excluded from Prettier while remaining committed and type-checked.
- After those corrections, `pnpm validate` passed from a clean generated state: exact runtime, documentation, format, lint, all project type-checks, three architecture layers, all package/server/database-tool/web builds, and static migration-boundary checks.
- A final frozen offline reinstall passed after the final manifests. Lock inspection found eight importers, seven approved workspace links, and no Git, HTTP tarball, out-of-workspace local source, or lifecycle-script allowance.
- Generated `dist` and `.next` outputs were confirmed ignored and then removed. Final scans found no active environment file, secret-like assignment, product implementation term in source, migration, SQL file, database/container/Testcontainers artifact, mobile/provider/projection workspace, CI/deployment artifact, unfinished marker, or request residue.
- Final documentation validation checked 56 Markdown files, 336 local links, and 79 tables. Read-only all-text validation checked 102 non-generated files with no trailing whitespace or missing final newline; `git diff --check` returned no error.
- Final structure inspection found exactly seven approved private ESM members, 46 non-Markdown project files, eight manifests including root, no generated output after cleanup, `master` with no `HEAD`, and zero commits.

Deferred and not-applicable gates:

- PostgreSQL startup, migration execution, Testcontainers, repositories, transactions, concurrency, tenant isolation, financial integrity, projection, outbox, browser journey, product accessibility, mobile, provider, backup, CI, and deployment gates are deferred.
- Contract tests are not applicable because no transport schema exists; Fastify request tests are not applicable because no route exists.

Acceptance criteria:

- Exactly seven approved private workspace members, one root lockfile, ESM, strict TypeScript, project references, explicit exports, approved first-party direction, reproducible installation, static architecture enforcement, and buildable behavior-free applications/libraries.
- No generic shared/config/test package, mobile workspace, projection worker, provider adapter, product behavior, transport schema/route, database connection, migration/SQL, Testcontainers, product UI, CI/deployment artifact, or secret.
- Applicable static gates pass after generated-output cleanup and a clean-state repeat; deferred gates are reported only as deferred.
- Documentation matches actual scaffold evidence, no new durable ADR is required unless implementation disproves an accepted decision, no commit/push/branch/PR occurs, and exactly one next cycle is recommended.

Explicit non-goals:

- No domain/use-case/authorization/contract/product implementation, database/repository/transaction/migration/Testcontainers code, provider/mobile/projection/UI feature, CI/deployment infrastructure, production environment, or product-scope change.

Initial failures and corrections:

- pnpm minimum-release-age rejection: narrowed reviewed exceptions to exact approved new package sets; no policy-wide disable.
- ESLint: removed one unused import and disabled only the obsolete pages-directory rule for the App Router scope.
- Root test command: added the missing alias to the existing architecture self-test.
- NVM auto-activation initially returned before explicit `nvm use` because the user's unrelated default Node 22.22.0 was absent; validation commands use the verified Node 24.19.0 binary path directly without changing repository policy.
- Clean-state web type-check: added the official `next typegen` prerequisite to the web-owned type-check command.
- Framework declaration formatting: excluded only Next-owned `apps/web/next-env.d.ts` from Prettier after the generator reproducibly rewrote it.

Risks:

- Static checks may provide false confidence; semantic tests remain mandatory as real contracts, domain behavior, persistence, and UI are introduced.
- Exact newly published release-age exceptions must be removed once the packages naturally satisfy the policy and the lockfile is regenerated deliberately.
- ESM/framework/version drift, package-boundary erosion, slow validation, container-runtime absence, PostgreSQL divergence, migration safety, secret leakage, and generated-artifact drift require later implementation evidence.

ADR assessment:

- No new ADR is currently required. The scaffold implements ADRs 0030-0032; the release-age exceptions, App Router lint adjustment, and root script alias are ordinary scaffold details rather than new durable architecture.

Open questions:

- Contract implementation: canonical OpenAPI/Zod source organization, generated-artifact posture, field limits, and the first real contract tests.
- Domain/application implementation: first value objects, command/query ports, authorization orchestration, and semantic test slices.
- Migration/repository implementation: initial DDL, checksums/history, migration lock details, transaction helper, pg ownership in the persistence package, Testcontainers harness, and tenant/financial tests.
- Authentication/providers: credential method, session/challenge implementation, delivery providers, and adapter packages.
- Product/UI/mobile: responsive merchant workflows, accessibility validation, and any future supporting-mobile package remain governed by accepted specifications.
- CI/deployment: runner, container runtime, secrets, production database, backup, telemetry, and infrastructure remain unselected.

Recommended next cycle:

Cycle 015 — Source Contract Schema Implementation.

Recommended next task:

Task 001 — Implement the Versioned Transport Schemas and Contract Validation Baseline.

Why this should come next:

The Cycle 011 transport contract is the accepted external shape, and Cycle 014 gives `packages/contracts` a browser-safe, framework-independent, buildable boundary with enforceable imports. Implementing contract schemas and mapping tests before routes, repositories, or product UI prevents those outer layers from inventing divergent wire behavior.

Non-goals for the recommended next cycle:

- No Fastify product route, domain/use-case implementation, database connection or migration, authentication/provider integration, product UI, mobile package, deployment, or accepted transport semantic change.

## Cycle 015 — Source Contract Schema Implementation

### Task 001 — Implement the Versioned Transport Schemas and Contract Validation Baseline

Status: Complete.

Objective:

Implement the accepted Cycle 011 cross-cutting transport contract as browser-safe Zod schemas with inferred TypeScript types, deterministic contract tests, and an intentional package-root API without beginning routes, domain behavior, persistence, authentication, or UI work.

Prerequisites and authoritative sources:

- `AGENTS.md`, README, product scope, architecture/domain, security/privacy, quality, all 12 specifications, all accepted ADRs 0001-0032, every Cycle 014 source/configuration file affecting contracts and validation, and Cycle 010-014 task evidence were inspected before editing.
- Repository evidence confirmed Cycles 010-014 Complete, exactly seven private workspaces, Cycle 011 `/api/v1` semantics, Cycle 012 durable outcome/persistence boundaries, Cycle 013 tooling choices, and Cycle 014 static architecture gates.
- Preflight found `master`, no `HEAD`, zero commits, 102 untracked project files, and no generated output.
- Registry metadata verified Zod 4.4.3, Vitest 4.1.10, TypeScript 6.0.3, and Node.js 24.19.0 availability and compatibility on 2026-08-05. Zod has no runtime dependency or engine declaration; Vitest supports Node `^20 || ^22 || >=24`, requires compatible Vite, and accepts the selected `@types/node` line.

Scope and deliverables:

- Add Zod 4.4.3 only to `@sem-caderno/contracts` and Vitest 4.1.10 only as root-owned test tooling.
- Implement exact cross-cutting JSON scalars, context, stable errors, command/replay/recovery, concurrency, pagination, projection, and envelope schemas.
- Infer and intentionally export TypeScript transport types through the package root with no subpath export.
- Add deterministic contract tests and integrate them into honest root `contract:test`, `test`, build, and validation ownership.
- Record Zod-first executable source ownership in ADR 0033 and update the accepted transport implementation profile and repository documentation.

Explicit non-goals:

- No product-specific DTO guessed from logical operation prose, Fastify route/handler, web API call/UI, domain entity/use case, authorization/session implementation, database connection/repository/migration/SQL, idempotency/recovery execution, projection/outbox processing, OpenAPI output/client generation, provider/mobile/Testcontainers/CI/deployment artifact, or product-scope change.

Source ownership:

- Reviewed Zod schemas are the single executable `/api/v1` wire-shape source.
- Public TypeScript transport types are inferred from schemas.
- Future OpenAPI 3.2 must be derived or mechanically checked, not maintained as a competing handwritten source.
- Cycle 007 application contracts and accepted domain rules remain semantic authority; schemas validate representation only.

Cycle 011 coverage matrix:

| Accepted transport category | Source | Executable evidence | Result |
| --- | --- | --- | --- |
| `/api/v1` versioning | Cycle 011 §4 | `apiNamespace`, `apiVersionSchema` | Implemented; no second version |
| JSON-safe runtime values | Cycle 011 §5 | `jsonValueSchema` | Implemented, including cyclic/non-JSON rejection |
| Opaque identifiers | Cycle 011 §5 | `opaqueIdentifierSchema` | Implemented without physical-ID promise |
| Integer minor-unit BRL | Cycle 011 §5/§16 | money schemas | Implemented, no decimal/coercion/calculation |
| Whole-unit quantity | Cycle 011 §5 | quantity schema | Implemented; fractional remains deferred |
| UTC instant/local date/time zone | Cycle 011 §5 | date/time schemas | Implemented representation checks |
| Success envelopes | Cycle 011 §5.1 | envelope factories | Implemented without redundant version body field |
| Session context | Cycle 011 §6 | session context union | Implemented safe shape only; cookie/auth behavior deferred |
| Selected Business context | Cycle 011 §7 | selected-Business schema | Implemented as client context, never authorization |
| Command result phases | Cycle 011 §8 | command metadata union | Implemented commit/replay/unknown branches |
| Query source metadata | Cycle 011 §9 | canonical/projection union | Implemented with explicit non-canonical projection source |
| Cursor pagination | Cycle 011 §9 | page request/result unions | Implemented limit/cursor/has-more invariants |
| RFC 9457 errors | Cycle 011 §10 | Problem Details schema | Implemented safe fields and status/code matching |
| 26 accepted error categories | Cycle 011 §10.2 | error/status code catalogues | All represented; non-error statuses kept separate |
| Five transport-only failures | Cycle 011 §10.2 | transport error catalogue | All represented |
| Idempotency key carriage value | Cycle 011 §12/ADR 0025 | bounded visible-ASCII schema | Implemented representation only |
| Safe replay | Cycle 011 §12 | `replayed` command metadata | Implemented and distinguishable from first commit |
| Unknown outcome | Cycle 011 §13 | unknown command/recovery branches | Implemented as non-failure with recovery required |
| Authoritative recovery | Cycle 011 §13 | recovery request/result schemas | Four outcomes; only no-commit allows retry |
| Conditional concurrency | Cycle 011 §14 | strong ETag/If-Match schemas | Implemented representation only |
| Projection freshness | Cycle 011 §18 | current/stale/unavailable union | Implemented; no processing or authority |
| External delivery status codes | Cycle 011 §17 | stable success-status catalogue | Implemented code vocabulary; resource DTO deferred |
| Resource-specific operation DTOs | Cycle 011 §15 | none | Deferred because exact fields/optionality/limits are not accepted |
| Cookie/CSRF headers and provider events | Cycle 011 §6/§17/§27 | none | Deferred to owning integration cycles |
| OpenAPI and clients | Cycle 011 §4/§23 | ADR 0033 policy only | Deferred; no generated artifact |

Files created and updated:

- Contract source: `packages/contracts/src/scalars.ts`, `context.ts`, `errors.ts`, `commands.ts`, `queries.ts`, `envelopes.ts`, and the intentional `index.ts` export surface.
- Tests/configuration: `packages/contracts/test/contracts.test.ts`, its test `tsconfig.json`, root `vitest.config.mjs`, package/root manifests, lockfile, and the Zod architecture allow-list.
- Architecture decision: ADR 0033 and ADR index.
- Documentation: README, architecture, test strategy, security/privacy, transport implementation profile, and this task record.

Schema categories and public exports:

- Scalars: API namespace/version, JSON-safe value, opaque IDs, correlation, cursor, idempotency, operation code, money, quantity, UTC instant, local date, time zone, and strong ETag.
- Context: anonymous/authenticated session response and distinct selected Business.
- Errors: all accepted stable code catalogues, retry/commit classifications, field violation, and status-checked Problem Details.
- Outcomes: command first/replay/unknown metadata and committed/rejected/no-commit/unknown recovery metadata.
- Queries: cursor page request/result, canonical source/ETag, and projection freshness.
- Envelopes: generic data and data-plus-meta response composition.
- Only `.` is exported. Internal composition branches and helpers remain private.

Dependencies and commands:

- `zod` 4.4.3: direct runtime dependency of contracts only.
- `vitest` 4.1.10: root development dependency only.
- `contract:test` runs the actual contract suite; root `test` runs architecture self-test and contracts; `build:contracts` builds contracts; `validate` includes all actual tests.
- One root lockfile remains authoritative. No release-age or lifecycle exception was added.

Tests:

- One suite, `packages/contracts/test/contracts.test.ts`, currently contains 41 deterministic tests.
- It covers positive/negative primitives, bounds, no coercion, JSON safety/cycles, IDs, dates/zones, money/quantity, session/Business context, stable codes/statuses, field violations, replay/unknown/no-commit recovery, strong validators, pagination, projection freshness, envelopes, public inferred unions, serialization, determinism, and non-mutation.
- Synthetic identifiers and `.invalid` URLs are used; no real person, Business, contact, credential, provider, or secret fixture exists.
- The suite proves transport shape only. Route, authorization, domain, financial, persistence, recovery-execution, projection-processing, browser, accessibility, mobile, provider, and infrastructure tests remain deferred.

Initial failures and corrections:

- The first batched NVM preflight command returned exit 3 because output suppression interacted with shell activation; explicit `nvm use 24.19.0` confirmed Node 24.19.0, Corepack 0.35.0, and pnpm 11.20.0 without repository change.
- Initial ESLint could not assign the TypeScript root Vitest config to a project. Replacing it with equivalent ESM `vitest.config.mjs` kept root ownership and removed the unsupported TS tooling file.
- Initial money tests exposed a `BigInt` refinement running after a failed lexical check. The refinement now guards conversion with the canonical integer pattern; all invalid decimal cases return validation failure.
- Initial architecture validation showed Zod had been added to the workspace-dependency map instead of the external allow-list. The map entries were corrected without broadening any other package.
- The first compile-time test type-check failed because the browser-library base enabled declaration maps while the test config used `noEmit`. The test-only config now disables declaration and source-map emission; production declaration output remains enabled.
- The affected lint, type-check, contract, and architecture gates passed after correction.

Validation evidence:

- Preflight inventory, Git/HEAD/commit inspection, all-source reads, Cycle 011 coverage audit, and registry/engine/peer checks completed before editing.
- Dependency installation updated the root lockfile with 33 packages and no lifecycle-script allowance.
- Frozen and offline-frozen installations both passed. Lock inspection found no Git source, HTTP tarball, out-of-workspace source, build-script allowance, or release-age exception added by this cycle.
- In-scope formatting passed. Corrected type-check, lint, 41 contract tests, and all architecture layers passed.
- Clean-state `pnpm validate` passed exact runtime, 57-file documentation with 338 local links and 82 tables, formatting, lint, source/test type-checks, architecture manifests/graph/self-test, 41 contracts tests, all package/server/database/web builds, and static migration-boundary checks.
- Built-package inspection found 45 intentional root exports, blocked the unsupported `@sem-caderno/contracts/scalars` deep import, and found only Zod imports in emitted JavaScript/declarations. Source and emitted scans found no Node, first-party, framework, PostgreSQL, environment, network, filesystem, or import-time integration dependency.
- Final marker, secret, forbidden-artifact, generated-output, Markdown, whitespace/newline, `git diff --check`, status, `HEAD`, and commit-count checks were completed after cleanup.

Acceptance criteria:

- Cross-cutting accepted transport categories are executable and traced; unsupported resource DTOs are explicitly deferred rather than fabricated.
- Zod and Vitest have narrow ownership, contracts remain browser-safe with no first-party/Node/environment dependency, and architecture rules remain strict.
- Exact serialization, optionality, request unknown-key, additive response, code/status, replay/recovery, concurrency-validator, and projection metadata behavior is tested.
- No outer workspace product behavior or forbidden implementation artifact was introduced.
- Applicable gates pass from a clean generated state, generated output is removed, no commit/push/branch/PR occurs, and exactly one next cycle is recommended.

Risks:

- Cross-cutting schemas could be mistaken for domain authority; package docs, architecture checks, and tests state the narrower responsibility.
- Response additive compatibility can hide unconsumed safe fields; consumers need explicit upgrade handling for unknown semantic enum values.
- Operation DTO implementation may reveal unresolved product field limits or nullability and must return to the accepted specifications rather than guessing.
- Zod/OpenAPI tooling drift, broad root exports, slow tests, and accidental Node imports are revisit triggers.

ADR assessment:

- ADR 0033 records the durable Zod executable-source, inferred-TypeScript, derived/OpenAPI relationship. No other new ADR is required.

Open questions:

- OpenAPI: generator selection, deterministic OpenAPI 3.2 support, and artifact review remain deferred.
- Route integration: exact first operation slice, request/response DTO fields, headers, filters, sorts, cursor encoding, and correlation-header name must be closed before its Fastify route.
- Domain/application: semantic models, use cases, authorization contexts, recalculation, and policy remain unimplemented.
- Authentication/session: cookie, CSRF, challenge, credential, expiry, and revocation implementation remain deferred.
- Persistence/migrations: database schema execution, repositories, transactions, durable outcome records, outbox, and Testcontainers remain deferred.
- UI/mobile/providers/deployment/product validation remain governed by accepted specifications and are not advanced here.

Recommended next cycle:

Cycle 016 — First Vertical Contract and Application Slice.

Recommended next task:

Task 001 — Implement the Global Session Inspection Contract and Application Port Baseline.

Why this should come next:

Cycle 015 proves the shared runtime schema, inferred type, testing, export, and architecture baseline. A narrow non-financial session-inspection slice can now close one exact operation DTO and establish the application port/transport mapping before higher-risk financial commands or persistence implementation.

Non-goals for the recommended next cycle:

- No credential provider, cookie/CSRF implementation, tenant authorization decision, financial command, database repository/migration, product UI, mobile client, OpenAPI generator, provider integration, or deployment artifact.

## Cycle 016 — First Vertical Contract and Application Slice

### Task 001 — Implement the Global Session Inspection Contract and Application Port Baseline

Status: Complete.

Objective:

Implement the exact global current-session inspection response, a framework-independent application model and port, and a pure application-to-transport mapper without implementing authentication, authorization, HTTP exposure, persistence, or UI behavior.

Prerequisites and repository evidence:

- `AGENTS.md`, README, tasks, all 12 specifications, all ADRs 0001-0033, and the current contracts, application, domain, server, architecture-validation, TypeScript, Vitest, ESLint, and manifest sources were inspected before editing.
- Repository evidence confirmed Cycles 010-015 Complete, ADR 0033 source ownership, Fastify server-edge composition authority, application/domain independence, and the Cycle 014 seven-member workspace.
- Preflight found `master`, no `HEAD`, zero commits, 113 untracked project files, exactly seven approved workspace members, and no generated output.

Session-inspection authority matrix:

| Concern | Accepted source | Cycle 016 result |
| --- | --- | --- |
| Operation | Cycle 007 ID05; Cycle 011 ID05 | Inspect current global session; no request body |
| Anonymous | Cycle 011 session context; Cycle 015 schema | `state: anonymous`; no identity or Business field |
| Authenticated | Cycle 011 session context; Cycle 015 schema | `state: authenticated`, User identifier, expiry instant |
| Selected Business | ADR 0012; Cycle 011 §§6-7 | Optional context containing only Business identifier; never authorization |
| Version | Cycle 011 §4 | Existing `/api/v1`; no additional body version |
| Optionality | Cycle 011 §5 and Cycle 015 profile | Selected Business omitted when absent; not nullable |
| Limits | Cycle 015 executable profile | Existing opaque-identifier and UTC-instant rules reused |
| Errors | Cycle 011 §10 | No new operation-specific error or HTTP mapping introduced |
| Authorization meaning | ADRs 0010/0012/0020 | Future server execution revalidates applicable current state; inspection shape grants no access |

Scope and deliverables:

- Add `currentSessionInspectionResponseSchema` as the existing data envelope around the existing session-context schema and export its inferred type through the contracts package root.
- Add application-owned anonymous/authenticated session-inspection models, `CurrentSessionStatePort`, `InspectCurrentSession`, and a small delegating factory without importing contracts or frameworks.
- Add a pure mapper in `apps/server`, the already authorized composition edge that may import both application and contracts, without registering a Fastify route.
- Add deterministic contract, application, and mapper tests and honest root commands for their actual categories.
- Update architecture, transport/application implementation profiles, quality, security/privacy, README, and task evidence.

Files created and updated:

- Contract source/test: `packages/contracts/src/session.ts`, `src/index.ts`, and `test/session-inspection.test.ts`.
- Application source/test/config: `packages/application/src/session-inspection.ts`, `src/index.ts`, `test/session-inspection.test.ts`, `test/tsconfig.json`, and package scripts.
- Server edge/test/config: `apps/server/src/session-inspection-mapper.ts`, `test/session-inspection-mapper.test.ts`, `test/tsconfig.json`, and package scripts.
- Root configuration: `package.json` and `vitest.config.mjs` add only real application/mapper test ownership and built-edge preparation.
- Documentation: README, architecture, test strategy, security/privacy, application contracts, transport contract, and this task record.

Dependency and architecture decisions:

- No dependency or lockfile change is required.
- Contracts retain no first-party dependency; application retains only its accepted domain dependency; domain remains independent.
- Server already depends on application and contracts and therefore owns the pure mapping edge. The mapper is not exported as application authority and registers no route.
- Application expiry is an application-owned `Date`; transport expiry remains the reviewed RFC 3339 UTC string. Selected Business is flat optional application semantics and nested optional transport context, making the authority separation explicit.
- Root `prepare:edge-types` builds application and contracts before lint, aggregate type-check, and mapper tests because ADR 0030 intentionally resolves first-party package imports through built package exports rather than source aliases or deep imports.

Tests:

- `packages/contracts/test/session-inspection.test.ts`: 13 tests for anonymous and authenticated responses, selected-Business presence/absence, invalid discriminators/fields/IDs/expiry, additive response output, JSON serialization, determinism, and non-mutation.
- `packages/application/test/session-inspection.test.ts`: 4 tests for deterministic port delegation across anonymous and authenticated states and non-mutation of port-owned results.
- `apps/server/test/session-inspection-mapper.test.ts`: 5 tests for anonymous/authenticated mapping, selected Business, canonical Zod compatibility, deterministic non-mutating behavior, and exclusion of application-only properties.
- Existing Cycle 015 contract coverage remains green, for a current total of 54 contract, 4 application, and 5 mapper tests, plus the architecture-validator controlled self-test.
- Tests prove only shape, delegation, and pure mapping. They do not prove authentication, authorization, tenancy, persistence, cookie/CSRF, financial, browser, mobile, provider, or production behavior.

Initial failures and corrections:

- Initial mapper tests and type-aware lint failed after cleanup because package-root exports correctly target absent build output. Building only contracts fixed mapper resolution but application imports remained unresolved during server type-check.
- `tsc -b --noEmit --force` was evaluated and rejected because referenced composite projects cannot disable emit (`TS6310`). No TypeScript or architecture rule was weakened.
- Root `prepare:edge-types` now builds application and contracts before edge lint/type-check/test consumers, preserving ADR 0030 package exports and project-reference behavior.
- The first clean-state rerun resolved the non-login shell to Node 20.20.2 and pnpm 9.15.0, producing engine warnings; those results were discarded. The approved NVM binary path explicitly verified and reran with Node 24.19.0, Corepack 0.35.0, and pnpm 11.20.0.

Explicit non-goals:

- No login/logout, credential, cookie, CSRF, JWT/OAuth, session store or adapter, authorization/Membership/capability lookup, Business switching, tenant persistence, route/handler/status mapping, database/SQL/migration/Testcontainers, financial behavior, idempotency/recovery execution, projection/outbox, product UI/API call, mobile, provider, OpenAPI/client generation, browser journey, user testing, CI/deployment, telemetry, or backup implementation.

Acceptance criteria:

- Exact accepted anonymous/authenticated and optional selected-Business semantics are traced and implemented without invented fields.
- Application owns its framework-independent model and port and does not import contracts; domain/contracts boundaries remain unchanged.
- Pure deterministic mapping exists only at the authorized server edge; no Fastify route or infrastructure adapter exists.
- Real contract/application/mapper tests, static architecture checks, builds, documentation, and aggregate validation pass from a clean generated state.
- No dependency, product behavior, secret, generated committed output, forbidden artifact, commit, push, branch, or pull request is introduced.

Deferred gates:

- PostgreSQL, migrations, Testcontainers, repository/transaction/concurrency, tenant-isolation, authentication, authorization, cookie/CSRF, Fastify route, browser, accessibility conformance, mobile, provider, user-testing, CI, deployment, telemetry, and backup gates are deferred or not applicable.

Validation evidence:

- Node 24.19.0, Corepack 0.35.0, and pnpm 11.20.0 were verified through the approved NVM binary path. No dependency changed; offline frozen installation reported the eight root/workspace projects already up to date.
- Formatting, 57-file documentation validation with 338 local links and 83 tables, ESLint, source/test type-checking, all architecture layers, 54 contract tests, 4 application tests, 5 mapper tests, the architecture self-test, all package/server/database/web builds, and static migration-boundary validation passed.
- Root `validate` passed, then cleanup removed generated output and root `validate` passed again from the clean generated state.
- Authorized built-package import exposed 46 public root symbols including the session-inspection schema; unsupported contracts deep import was blocked. Source/emitted scans found no contracts first-party, Node, environment, framework, PostgreSQL, network, or filesystem dependency.
- Marker, secret, realistic-data, forbidden-artifact, generated-output, Markdown link/table, whitespace/newline, `git diff --check`, Git status, `HEAD`, and commit-count checks completed after final cleanup.
- User testing is not applicable because the cycle introduces no merchant-facing workflow.

Risks:

- A transport session shape could be mistaken for authorization evidence; names, documentation, package direction, and tests retain selected Business as context only.
- A generic mapper framework could grow prematurely; Cycle 016 adds one operation-specific pure function only.
- Built-package preparation adds static-gate cost; revisit only with measured validation cost or a repository-wide build-graph change, not with editor-only aliases.
- The future session adapter must not expose bearer evidence, provider claims, or persistence rows through the application result.

ADR assessment:

- No new ADR is required. ADRs 0012, 0016, 0019, 0020, 0030, 0032, and 0033 already decide Business-context authority, server composition ownership, dependency direction, session ownership, module exports, architecture enforcement, and contract source ownership.

Open questions:

- Authentication/session: concrete current-session evidence resolution, revocation/expiry handling, cookie exchange, credential provider, and shared/lost-device implementation.
- Authorization: where request-scoped Membership/capability/lifecycle revalidation is orchestrated for tenant operations; session inspection itself grants no tenant access.
- Fastify: route registration, request context, status/cache headers, error translation, and HTTP tests.
- Persistence/migrations/PostgreSQL: executable session/User tables, repository adapter, integration harness, migration checksums, and database tests.
- Product/UI/mobile/providers/OpenAPI/CI/deployment/product validation remain deferred under accepted specifications.

Recommended next cycle:

Cycle 017 — Revocable Session Resolution and Persistence Slice.

Recommended next task:

Task 001 — Implement the Current-Session Resolution Adapter and PostgreSQL Integration Baseline.

Why this should come next:

Cycle 016 closes the application port, application-owned result, transport response, and pure mapping edge. The missing dependency before honest Fastify exposure is authoritative revocable-session resolution with durable evidence and integration tests; implementing a route first would require a fake or framework-owned authentication source.

Non-goals for the recommended next cycle:

- No credential provider, login/logout route, cookie/CSRF exchange, tenant authorization engine, product route/UI, financial behavior, mobile, external provider, OpenAPI generator, CI/deployment, or product-scope expansion.

## Cycle 017 — Revocable Session Resolution and Persistence Slice

### Task 001 — Implement the Current-Session Resolution Adapter and PostgreSQL Integration Baseline

Status: Partially complete. Authority audit and blocker documentation are complete; the PostgreSQL adapter and integration baseline are blocked by missing session credential-resolution and lifecycle semantics.

Objective:

Determine whether accepted authority is sufficient to implement the smallest PostgreSQL-backed `CurrentSessionStatePort`. Implement only fully authorized behavior and stop rather than invent request-scoped authentication, cryptographic, expiry, or inactive-session semantics.

Prerequisites and repository evidence:

- `AGENTS.md`, README, tasks, all 12 specifications, all ADRs 0001-0033, architecture/domain, security/privacy, quality, all relevant current source/tests/manifests/TypeScript configuration, migration tooling, architecture enforcement, and Cycles 010-016 evidence were inspected before editing.
- Repository evidence confirmed Cycles 010-016 Complete, the seven approved private workspaces, ADR 0018 PostgreSQL/node-postgres ownership, ADR 0020 revocable server sessions, ADR 0023 opaque cookie carriage, ADR 0031 migration ownership, and the Cycle 012 physical `sessions` catalogue.
- Preflight found `master`, no `HEAD`, zero commits, 121 Git-visible untracked project files, no generated output, an empty `packages/persistence-postgres` source boundary, and an empty migration directory containing only `.gitkeep`.
- Runtime verification used Node 24.19.0, Corepack 0.35.0, and pnpm 11.20.0.

Session-persistence authority matrix:

| Question | Repository authority | Classification and Cycle 017 consequence |
| --- | --- | --- |
| Persisted Session representation | Physical Persistence §§7, 31.1 | Accepted: global `sessions` operational-security row; no executable DDL yet. |
| Persistence required | ADR 0020; Physical Persistence §7 | Accepted: application-owned revocable server state cannot be client-authoritative. |
| Revocability | Authentication §11.3; ADR 0020 | Accepted: sign-out and security/lifecycle changes revoke or force revalidation. |
| Persisted Session identity | ADR 0026; Physical Persistence §§4, 7 | Accepted: UUIDv7 row key plus unique token digest; row ID is not bearer evidence. |
| Associated User identity | ADR 0010; Physical Persistence §§6-7 | Accepted: global User reference; it grants no Business access. |
| Expiry persistence type | Physical Persistence §§5, 7 | Accepted: UTC `timestamptz` endpoints, including idle and absolute expiry evidence. |
| Creation timestamp | Physical Persistence §5 | Accepted: every table has `created_at`; Session also has issued evidence. |
| Revocation representation | Physical Persistence §§5, 7 | Accepted at catalogue level: nullable revocation time/reason and rotation evidence; exact state/check vocabulary remains deferred. |
| Selected Business persistence | Physical Persistence §7 | Accepted: nullable remembered Business candidate on Session. |
| Selected Business absence | Physical Persistence §7 | Accepted physically as nullable candidate; application/transport omit it when absent. |
| Active Session conditions | Authentication §11; Physical Persistence §7 | Unspecified/blocking: exact predicate across revocation, idle/absolute expiry, rotation, and User lifecycle is not closed. |
| Expired Session conditions | Authentication §11; Physical Persistence §7 | Partly derivable but blocking: endpoint passage invalidates use, but effective endpoint and clock ownership are not defined. |
| Revoked Session conditions | Authentication §11.3; Physical Persistence §7 | Partly derivable but blocking for DDL/query: revocation invalidates use, but exact row-state predicate is not defined. |
| Expiration evaluation owner | Physical Persistence §7 says expiry may be evaluated | Explicitly deferred/blocking: adapter versus application/security boundary is not selected. |
| Current-time source | Workspace Specification §12 expects deterministic clocks | Unspecified/blocking: no narrow clock/input exists for this use case. |
| Lookup basis | ADR 0023; Physical Persistence §§5, 7, 20 | Accepted conceptually: opaque cookie value maps to keyed digest lookup. |
| Raw value to digest | Physical Persistence §§5, 34.4; ADR 0023 | Explicitly deferred/blocking: algorithm, key/version selection, and owning boundary are unspecified. |
| Request-scoped lookup identity | Cycle 016 application profile; ADR 0023 | Unspecified/blocking: `CurrentSessionStatePort` has no input and no accepted edge supplies validated session evidence. |
| Lookup key independent of HTTP/cookie | Current source and specifications | Not present. Introducing request global, AsyncLocalStorage, singleton, or invented context is prohibited. |
| Missing Session inspection outcome | Cycle 011 §§6, 10; Cycle 016 profile | Unspecified/blocking: anonymous response versus `SESSION_INVALID` is not closed when a cookie/evidence was supplied. |
| Revoked/expired inspection outcome | Cycle 007 §15; Cycle 011 §10 | Unspecified/blocking: stable error exists, but current-inspection normalization/output is not selected. |
| Disabled/deleted User behavior | Authentication §11.3; Logical Model User lifecycle | Accepted requirement to revoke/revalidate; exact inspection result and deletion policy are unspecified/blocking. |
| User lifecycle check owner | Physical Persistence operation ID05 reads Sessions/Users | Derivable that authoritative resolution considers User, but adapter/application responsibility and outcome are blocking. |
| Membership/Business authorization | ADRs 0010/0012/0020 | Accepted: not conferred by Session and independently revalidated for protected operations. |
| Selected Business revalidation during inspection | Application Contracts §15; Physical Persistence ID05 | Accepted requirement, but invalid-candidate result, clearing behavior, and atomicity are unspecified/blocking. |
| PostgreSQL schema/table authority | ADR 0026; Physical Persistence §§3, 7, 31.1 | Accepted catalogue: `sem_caderno.sessions`; exact executable columns/checks/sizes remain migration-implementation choices. |
| SQL owner | ADR 0018; Workspace Specification §§2, 12 | Accepted: `@sem-caderno/persistence-postgres`. |
| Concrete adapter owner | ADRs 0018/0019; Workspace Specification §2 | Accepted: persistence adapter points inward to application port. |
| Adapter construction owner | ADR 0016; Workspace Specification §12 | Accepted generally: `apps/server` composition root; per-request evidence construction remains blocking. |
| Migration owner and authorization | ADR 0031; Workspace Specification §14 | Accepted owner/tool, conditional implementation authority; session migration remains blocked by unresolved semantics. |
| PostgreSQL integration testing | Workspace Specification §§12-13 | Authorized future gate with Testcontainers 12.1.0/PostgreSQL 18.4, but harness/dependencies are absent and no behavior is ready to test. |
| Connection/configuration acquisition | Workspace Specification §15 | Server/database executables own validated inputs; exact database/session cryptographic variables and construction are unimplemented/blocking. |
| Transaction requirement | Physical Persistence ID05 | Unspecified for a consistent Session/User/Membership/Business inspection read; no transaction abstraction is introduced. |

Implementation result:

- No production source was added or changed. The existing `CurrentSessionStatePort` remains the controlling application abstraction.
- No PostgreSQL adapter, row type, mapper, query, pool, connection configuration, clock, request context, factory, repository, or transaction abstraction was introduced.
- No migration, SQL, schema-history object, Testcontainers harness, or PostgreSQL process was introduced or run.
- Documentation records the blockers without redefining the accepted conceptual Session table or transport response.

Why implementation is blocked:

The database can look up a keyed digest, but the application port has no input and repository authority does not define how an opaque cookie value becomes validated, request-scoped lookup evidence. Raw-token digest algorithm/key/version ownership is explicitly deferred. Even if a digest were supplied, effective expiry, deterministic time, missing/revoked/expired normalization, disabled-User handling, selected-Business revalidation outcome, and read-consistency boundaries remain unresolved. A test-only digest or constructor argument presented as production architecture would hide the same gap.

Files updated:

- README: records partial Cycle 017 status and blocker.
- Architecture: records adapter ownership and unresolved request evidence/lifecycle boundary.
- Authentication/application/physical persistence specifications: add implementation-readiness findings without changing accepted semantics.
- Test strategy: records that no mocked SQL or PostgreSQL claim was added.
- Security/privacy: records digest, failure-normalization, and Business-context safeguards.
- Tasks: records this matrix, evidence, risks, deferrals, and the next specification cycle.

Dependencies and lockfile:

- No dependency or lockfile change. `pg` remains owned by the migration tool only; adding it to persistence before an authorized adapter would be unused speculation.
- Testcontainers remains undeclared, as selected for the future PostgreSQL implementation gate.

Tests and PostgreSQL evidence:

- No Cycle 017 test was added because no executable behavior was authorized.
- Existing 54 contract, 4 application, 5 mapper tests and the architecture self-test remain the applicable regression baseline.
- No PostgreSQL server, container, migration, connection, query, or integration assertion was executed. Real integration was not achieved or claimed.

Validation evidence:

- From `/home/adriano/workspace/semcaderno`, the approved runtime path verified Node 24.19.0, Corepack 0.35.0, and pnpm 11.20.0.
- `pnpm run format`, `format:check`, and `docs:check` passed; documentation validation covered 57 Markdown files, 338 local links, and 84 tables.
- `pnpm run lint`, `typecheck`, and `architecture` passed. The architecture graph remained at seven approved private workspaces with 25 modules, 22 dependencies, no violation, and a passing controlled-invalid self-test.
- `application:test` passed 4 tests, `contract:test` passed 54 tests, and `mapping:test` passed 5 tests. The aggregate `test` command passed.
- Contracts, application, persistence, database tool, server, web, package, and aggregate builds passed. Static `migration:check` confirmed no migration or SQL exists.
- Root `validate` passed, cleanup removed reproducible output, and root `validate` passed again from the clean generated state.
- One batched command wrapper yielded while server test type-check was still running; polling the same process returned exit 0. No validation command failed and no correction to source, architecture, or configuration was required.
- Final dependency/export/browser-safety, secret/realistic-data, SQL/forbidden-artifact, marker, overengineering, whitespace/newline, Markdown, generated-output, `git diff --check`, status, `HEAD`, and commit-count inspections were completed after cleanup.

Overengineering audit:

- No production abstraction was introduced.
- A generic repository, base DAO, Unit of Work, transaction manager, clock framework, request-global context, AsyncLocalStorage, session framework, adapter registry, DI container, and generic mapper were considered unnecessary or unsafe for the unresolved boundary and deliberately omitted.
- A pre-digested lookup-key constructor was rejected because it would create an unauthorized production seam and leave request evidence/key ownership hidden.
- A session migration independent of the adapter was rejected because unresolved lifecycle predicates would become database defaults and test assertions.

Acceptance result:

- Preflight, source audits, Cycles 010-016 verification, authority matrix, architecture audit, documentation, existing static/test/build regression gates, cleanup, and repository evidence are applicable.
- The required authoritative lookup-identity method, expiry/revocation outcomes, concrete adapter, migration, and real PostgreSQL integration are not satisfied. Therefore the task is partially complete, not complete.
- No product behavior, authentication/authorization implementation, route, persistence code, dependency, secret, UI, provider, mobile, CI/deployment artifact, commit, push, branch, or pull request is introduced.

Risks and open questions:

- Silent anonymous fallback on database failure could hide an outage or security incident.
- Treating any opaque identifier or precomputed digest as accepted lookup evidence could bypass cookie validation and key-version policy.
- Choosing one expiry endpoint without authority could extend or shorten sessions unexpectedly.
- Joining Membership/Business in a persistence adapter without defined outcomes could turn session resolution into authorization.
- Exact session retention, timeout duration, revocation reason vocabulary, digest/key rotation, incident behavior, and audit evidence remain open.

ADR assessment:

- No ADR was created. Existing ADRs establish the surrounding architecture but intentionally defer the blocking session credential/lifecycle decisions. An implementation agent must not use a new ADR to invent those security semantics.

User-testing status:

- Not applicable. Cycle 017 introduces no merchant-facing workflow and makes no usability or accessibility-conformance claim.

Recommended next cycle:

Cycle 018 — Session Credential Resolution and Lifecycle Specification.

Recommended next task:

Task 001 — Define Request-Scoped Session Evidence, Digesting, Active-State Evaluation, and Inspection Outcomes.

Objective of the recommended cycle:

Define, without implementation, how validated opaque session evidence reaches the application/persistence boundary; raw-value digest and key-version ownership; effective idle/absolute expiry and deterministic time; missing/revoked/expired/disabled-User inspection outcomes; selected-Business candidate revalidation; database failure behavior; adapter construction; exact first-session-migration readiness; and real PostgreSQL test obligations.

Why this should come next:

It resolves every blocker identified by the authority matrix while preserving application independence and avoiding premature Fastify, credential-provider, or database implementation. Once accepted, a later executable cycle can implement the migration, narrow adapter, and real PostgreSQL tests deterministically.

Explicit non-goals for the recommended cycle:

- No code, dependency, cookie parser, credential provider, login/logout route, JWT/OAuth, SQL, migration, PostgreSQL/Testcontainers execution, authorization engine, Business switching, product UI, mobile, provider, OpenAPI, CI/deployment, or product-scope expansion.

## Cycle 018 — Session Credential Resolution and Lifecycle Specification

### Task 001 — Define Request-Scoped Session Evidence, Digesting, Active-State Evaluation, Inspection Outcomes, and Reassess the CurrentSessionStatePort Boundary

Status: Complete. The Cycle 017 authority blocker is resolved at specification/architecture level; Cycle 018 remains documentation-only.

Objective:

Resolve the authority gaps that correctly blocked Cycle 017 so a later implementation can evolve the application boundary and add a real PostgreSQL-backed revocable-session resolver without inventing request, credential, cryptographic, lifecycle, time, authorization, or persistence semantics.

Prerequisites and repository evidence:

- `AGENTS.md`, README, this task register, all 12 pre-Cycle-018 specifications, all ADRs 0001-0033, architecture/domain, security/privacy, quality, all current session source/tests, persistence/database boundaries, architecture enforcement, manifests, and configuration were inspected before editing.
- Cycles 010-016 are Complete from repository evidence. Cycle 017 is accepted as Partially complete and contains the authoritative blocker matrix; no adapter, SQL, migration, authentication, or request-global workaround was introduced.
- Preflight found branch `master`, no `HEAD`, zero commits, exactly seven approved private workspaces, 121 Git-visible untracked project files, and no generated output.
- Cycle 016 source confirmed a framework-independent no-input `CurrentSessionStatePort`, application-owned `Date` expiry, stable transport response, and a pure server-edge mapper. Cycle 017 evidence confirmed that no accepted boundary supplied the per-request lookup identity.

Scope and deliverables:

- Create `docs/specs/session-credential-resolution-lifecycle-specification.md` as the authoritative request-evidence, digest, lifecycle, time, outcome, persistence-readiness, security, privacy, and implementation-sequence profile.
- Create ADR 0034 for the durable selection of explicit evidence and keyed digest resolution over hidden request-scoped state.
- Reconcile README, architecture, ADR index, authentication, application, transport, physical persistence, security/privacy, quality, and task documentation without changing product scope or production source.
- Select exactly one next executable cycle and keep HTTP/authentication/product behavior outside Cycle 018.

Selected decisions:

- Replace the no-input `CurrentSessionStatePort` in the next implementation cycle with a parameterized application-owned resolver receiving optional normalized lookup evidence and one explicit evaluation instant.
- The future server edge accepts only the ADR 0023 protected cookie, validates `v1.` plus 32 CSPRNG bytes encoded as canonical unpadded base64url, and derives a domain-separated HMAC-SHA-256 digest with a server-held secret.
- Raw credentials remain transient server-edge bearer evidence and never enter application, contracts, persistence, logs, audit, analytics, support data, or errors. PostgreSQL stores only digest version and 32 digest bytes.
- First-slice session expiry is fixed and absolute. `expiresAt` means `expires_at`; `evaluatedAt < expires_at` is active and equality is expired. Explicit time input replaces hidden clocks.
- Missing, malformed, unknown, revoked, expired, missing-User, or unusable-User evidence produces the same anonymous inspection result. Database or mapping failure propagates and never degrades to anonymous.
- The nullable selected-Business identifier is returned as remembered context without Business/Membership authorization joins. Every protected tenant operation independently revalidates User, verified identity where required, Business, Membership, capability, lifecycle, and same-Business references.
- User session eligibility is concrete: the User must exist and `disabled_at` must be null. Verification remains an operation precondition rather than session existence.
- The Cycle 016 public transport contract and output mapper remain stable.
- The minimum future session row contains UUIDv7 identity, digest version/bytes, User, nullable selected-Business candidate, creation/absolute-expiry/revocation/update instants, and positive optimistic version. Idle/sliding state, CSRF, rotation chains, device/IP/user-agent data, revocation narratives, and arbitrary metadata are excluded from the first slice.

Boundary comparison:

| Model | Result |
| --- | --- |
| Explicit evidence from cookie edge through digest normalization into application/persistence | Accepted: visible dependencies, deterministic time, no framework leakage, no cross-request state. |
| No-input port backed by AsyncLocalStorage, mutable request context, service location, or per-request adapter construction | Rejected: hides the actual security input and makes isolation/concurrency harder to prove. |
| Raw credential passed into application/persistence | Rejected: unnecessarily broadens bearer-secret exposure. |

Minimum persistence and query readiness:

- `sem_caderno.sessions` uses unique `(digest_version, credential_digest)` with exact 32-byte digest length, User and nullable Business foreign keys, absolute expiry/revocation checks, accepted timestamp/version checks, and no raw credential column.
- Because no executable schema exists, the next implementation migration order is minimal `users`, then `businesses`, then `sessions`; this preserves actual foreign keys instead of using a test-only parent schema. Parent fields are limited to the already accepted global identity/disabled-state and Business tenant-root/lifecycle requirements.
- One parameterized statement receives digest version, digest bytes, and `evaluatedAt`, checks the usable User and active predicate, returns only User/expiry/Business-candidate fields, and performs no Membership/Business authorization join or mutation.
- Zero rows means no active session; database/query/mapping failure remains a failure. The single read does not require a transaction abstraction.

Official technical evidence:

- Node 24 crypto documentation confirms built-in CSPRNG and HMAC primitives.
- RFC 2104 defines HMAC; RFC 4648 defines canonical base64url encoding.
- OWASP session guidance supports meaningless CSPRNG identifiers, cookie-only exchange, server-side state, protected cookie attributes, and excluding bearer identifiers from logs.
- PostgreSQL 18 documentation confirms `bytea`, `timestamptz`, and multicolumn uniqueness support the selected physical representation.
- Evidence was verified on 2026-08-05 and remains subordinate to repository product/application semantics.

Acceptance criteria:

- Cycle 017 lookup-identity, raw/digest ownership, active/revoked/expired behavior, inactive outcomes, User handling, selected-Business treatment, deterministic time, and first-migration readiness are resolved without production implementation.
- The no-input application boundary is explicitly reassessed and scheduled for replacement; no hidden request context is selected.
- Minimum persistence fields and query behavior are justified; speculative identity/security tracking is excluded.
- Security/privacy analysis, alternatives, risks, overengineering audit, contract impact, and future validation obligations are documented.
- Existing applicable documentation/static/test/build gates pass from a clean generated state.
- No dependency, lockfile, source, migration, SQL, database, route, authentication, authorization, UI, provider, mobile, infrastructure, commit, push, branch, or pull request is introduced.

Explicit non-goals:

- No TypeScript production/test behavior, port signature change, parser/digester implementation, adapter, SQL, migration, PostgreSQL/Testcontainers execution, Fastify route/hook, cookie read/write, login/logout/issuance, CSRF, authorization engine, Business switching, product UI, mobile, provider, OpenAPI/client generation, telemetry, CI/deployment, browser journey, accessibility conformance, product validation, or user testing.

Risks and revisit triggers:

- HMAC key loss or unsafe rotation can invalidate session lookup; specify production secret backup/rotation before operation.
- Presentation could mistake a stale selected-Business candidate for access; authorization and accessible-Business refresh tests remain mandatory.
- Fixed absolute expiry may require reauthentication more often; add idle/sliding policy only from merchant/security evidence.
- Anonymous normalization can reduce diagnosis detail; use independent safe correlation and restricted operational evidence, never credential data.
- Revisit credential profile for changed cryptographic guidance, origin topology, non-browser client acceptance, or demonstrated browser constraints.

Open questions and deliberate deferrals:

- Non-blocking for the next read slice: production absolute duration, cookie persistence attributes, key rotation/cutover, expired/revoked retention, CSRF evidence, all-device revocation command/index, issuance/login/logout, credential provider/password policy, audit vocabulary, production secret injection, and future non-browser authentication.
- No product or architecture blocker remains for the narrow explicit application boundary, parser/digester, minimum migration, PostgreSQL adapter, and real PostgreSQL integration tests.

ADR assessment:

- ADR 0034 is required because explicit evidence versus hidden request state and server-owned keyed digest derivation are durable cross-cutting choices affecting server, application, persistence, security, and testing. It specializes ADRs 0016, 0018, 0020, 0023, 0026, 0030, and 0032 without changing the public contract under ADR 0033.

Validation evidence:

- Preflight independently verified branch `master`, no `HEAD`, zero commits, 121 initial Git-visible untracked files, seven approved private workspaces, no generated output, the Cycle 016 source boundary, and Cycle 017's partial result. All accepted specifications and ADRs 0001-0033 were inspected before editing.
- The ambient shell exposed Node 20.20.2, Corepack 0.34.6, and pnpm 9.15.0, so project gates used `PATH=/home/adriano/.nvm/versions/node/v24.19.0/bin:$PATH`. The approved path verified Node 24.19.0, Corepack 0.35.0, and pnpm 11.20.0.
- Official links for Node 24 crypto, RFC 2104, RFC 4648, OWASP session management, and PostgreSQL 18 binary, date/time, and unique-index behavior were opened successfully on 2026-08-05.
- Root `format`, `format:check`, and `docs:check` passed. The documentation checker covered 59 Markdown files, 354 local links, and 92 tables.
- Root `lint`, `typecheck`, and `architecture` passed. Architecture evidence remained seven approved private workspaces, 25 modules, 22 dependencies, no violations, and a passing controlled-invalid self-test.
- `application:test` passed 4 tests, `contract:test` passed 54 tests, and `mapping:test` passed 5 tests. The aggregate test command and architecture self-test passed; no Cycle 018 test was added because no behavior changed.
- Contracts, domain, application, persistence, server, database-tool, web, package, and aggregate builds passed. The Next.js production build remained static and required no secret or server.
- Static `migration:check` passed and confirmed no migration or SQL file exists. No PostgreSQL server, container, connection, migration, query, Testcontainers harness, or integration assertion ran.
- Root `validate` passed before cleanup. `pnpm run clean` removed known generated output; root `validate` then passed again from a clean generated state.
- The first combined marker/forbidden/secret scan command exited 2 after its earlier checks because a shell-quoted secret regex was malformed. No repository rule failed. The corrected command used a simplified POSIX character-class regex and passed: no marker, prompt text, forbidden executable artifact, migration content, or secret-like assignment was found.
- Workspace, package/lockfile checksum, session-consistency, public-contract, dependency-direction, security/privacy, no-source-change, forbidden-artifact, marker, secret, generated-output, Markdown table/link, whitespace/newline, `git diff --check`, Git status, `HEAD`, and commit-count inspections were included in final review. No dependency or lockfile changed.
- PostgreSQL integration, migrations, Testcontainers, HTTP/cookie behavior, authentication, authorization, browsers, accessibility conformance, mobile, providers, CI/deployment, product validation, and user testing are deferred or not applicable, not passed.

User-testing status:

- Not applicable. Cycle 018 is documentation-only and introduces no merchant-facing workflow.

Recommended next cycle:

Cycle 019 — Explicit Session Resolution and PostgreSQL Foundation Implementation.

Recommended next task:

Task 001 — Replace the No-Input Session Port and Implement the Minimal Identity/Session Migrations, Adapter, and PostgreSQL Tests.

Objective of the recommended cycle:

Apply Cycle 018 by evolving the Cycle 016 application boundary, implementing the server-owned credential parser/digester without HTTP exposure, creating only the minimum `users`, `businesses`, and `sessions` migration foundation required for referential integrity, adding the parameterized `pg` adapter, and proving active/anonymous/failure behavior against real PostgreSQL 18.4.

Why this should come next:

Cycle 018 resolves every authority gap that blocked Cycle 017. The next safe dependency is executable session evidence and persistence, not an HTTP route or product workflow.

Explicit non-goals for the recommended cycle:

- No login/logout/issuance, Fastify route/hook, cookie integration, CSRF, authorization engine, Business switching, product behavior/UI, mobile, provider, OpenAPI/client generation, telemetry, CI/deployment, backup implementation, or user/product testing.

## Cycle 019 — Explicit Session Resolution and PostgreSQL Persistence Foundation

### Task 001 — Evolve the Application Session Boundary, Derive Explicit Lookup Keys, and Implement the Minimum PostgreSQL Current-Session Adapter

Status: Complete. The Cycle 018 boundary is implemented; the accepted PostgreSQL 18.4 integration gate ran against a real disposable container. The task remained an internal infrastructure slice.

Objective:

Apply ADR 0034 and the Cycle 018 specification by making lookup identity and time explicit, deriving only canonical keyed lookup evidence at the server edge, creating the minimum identity/session relational foundation, and satisfying the application resolver with one parameterized PostgreSQL adapter while preserving the public Cycle 016 response.

Prerequisites and authority:

- `AGENTS.md`, README, this task register, all 13 specifications, all accepted ADRs 0001-0034, architecture/domain, security/privacy, quality, source/tests, manifests, migration tooling, architecture checks, and Cycles 010-018 evidence were inspected before production edits.
- Preflight found branch `master`, no `HEAD`, zero commits, seven approved private workspaces, 123 Git-visible untracked project files, no generated output, an empty persistence implementation, and an empty migration boundary.
- Cycle 018 authorizes `SessionResolutionPort`, optional canonical lookup evidence, explicit `evaluatedAt`, the exact HMAC byte profile, anonymous inactive outcomes, fail-closed infrastructure errors, nullable selected-Business context, minimum parent/session fields, migration order, and real PostgreSQL testing.
- The schema authority gate passed. The parent tables are explicitly authorized as canonical prerequisites, not test substitutes; no Membership, credential-provider, settings, product, financial, or authorization table was inferred.

Implementation authority matrix:

| Question | Implemented authority/result |
| --- | --- |
| Lookup identity | Application-owned digest version `1` plus canonical 43-character unpadded-base64url digest from Cycle 018 §4.3. |
| HMAC input | UTF-8 `sem-caderno/session-lookup/v1`, one zero byte, and exactly 32 decoded credential bytes under HMAC-SHA-256. |
| Raw evidence owner | Transient `apps/server` function input only; absent from application, contracts, persistence, logs, errors, and migration schema. |
| Operation time | One explicit application-owned `Date`; no `Date.now()`, `new Date()`, or SQL current time in lifecycle evaluation. |
| Active predicate | Unique digest match, null `revoked_at`, `evaluatedAt < expires_at`, and existing User with null `disabled_at`. |
| Anonymous outcomes | Absent evidence short-circuits; unknown, revoked, expired, equal-expiry, or disabled-User lookup produces anonymous through resolver miss. |
| Failure | PostgreSQL/adapter failure rejects with a fixed safe persistence message and is never anonymous. |
| Selected Business | Nullable remembered context returned without Business-state or Membership authorization. |
| Schema | Minimum `users`, `businesses`, and `sessions` fields and named constraints from Cycle 018 §§11-12. |
| Foreign keys | Session User and nullable Business plus Business creator User; restrictive deletion, no cascade. |
| Testing | Real PostgreSQL 18.4 through the accepted Testcontainers 12.1.0 boundary and immutable accepted image digest. |
| Public contract | Existing anonymous/authenticated response remains unchanged; no digest, raw evidence, row ID, revocation, or database detail is exposed. |

Files and behavior:

- Application replaces `CurrentSessionStatePort` with explicit input and `SessionResolutionPort`; tests prove short-circuit, exact propagation, miss normalization, failure propagation, and non-mutation.
- Server adds one pure parser/digester with fixed known-answer tests. No route, hook, cookie parser, listener, environment reader, or request context is present.
- Persistence adds `PostgresSessionResolutionAdapter`, `pg 8.22.0`, and `@types/pg 8.20.3`. One parameterized query selects only application-required columns and contains driver failures.
- Database tooling adds three TypeScript migrations and a narrow runner for advisory locking, node-pg-migrate history, and SHA-256 source checksums. Test execution accepts only loopback `sem_caderno_test_*` targets.
- PostgreSQL tests are owned by the persistence package and use `@testcontainers/postgresql 12.1.0`. The exact accepted PostgreSQL image digest remains available even though the mutable `18.4-bookworm` tag had moved to a newer image index during Cycle 019 verification.
- Root commands add `database:test`; aggregate `test` and `validate` now include the real database gate.

Database objects:

- `users`: UUIDv7 `id`, `email_original`, globally unique `email_normalized`, nullable verification/disable instants, created/updated instants, positive version.
- `businesses`: UUIDv7 `id`, accepted active/deactivated state, creator User, nullable deactivation instant, created/updated instants, positive version.
- `sessions`: UUIDv7 `id`, digest version and 32-byte digest, User, nullable selected Business, created/absolute-expiry/revoked/updated instants, positive version.
- `schema_migrations` and `schema_migration_checksums`: migration-tool-owned history and immutable-source evidence.
- No raw credential, HMAC key, idle/last-active field, IP, user agent, device/location, arbitrary metadata, Membership permission, or credential-provider data is stored.

Validation and corrections:

- Registry metadata confirmed `pg 8.22.0`, `@types/pg 8.20.3`, and `@testcontainers/postgresql 12.1.0`; Node 24.19.0 satisfies every engine. The accepted PostgreSQL image digest remained resolvable. Docker 29.6.2 was available.
- The first Testcontainers dependency install stopped under strict build-script policy for `cpu-features`, `protobufjs`, and `ssh2`. Their lifecycle scripts are unnecessary for the local Docker path and were explicitly denied; no broad approval was granted. Installation then succeeded.
- The first database run failed before migration because the test-target guard accepted only `postgresql:` while Testcontainers supplied standard `postgres:`. The guard was narrowed to both PostgreSQL schemes while retaining loopback and test-database checks; rerun reached the suite.
- The second database run applied migrations and passed schema tests but seven adapter reads failed because `session` was used as a PostgreSQL alias. It was replaced with unambiguous aliases; the complete 12-test real database suite passed.
- Application tests passed 5 cases; server-edge mapper/derivation tests passed 14; migration static validation passed three ordered sources; architecture validation passed seven workspaces with 34 modules and 26 dependencies.
- `pnpm run format`, `format:check`, and `docs:check` passed; documentation covered 59 Markdown files, 354 local links, and 93 tables.
- `pnpm run lint`, `typecheck`, and `architecture` passed. The graph contains seven approved private workspaces, 34 modules, 26 dependencies, no violation, and a passing controlled-invalid self-test.
- `contract:test` passed 54 tests, `application:test` passed 5, `mapping:test` passed 14 mapper/derivation tests, and `database:test` passed 12 real PostgreSQL tests. The aggregate `test` command passed.
- Contract, application, persistence, server, database-tool, web, package, and aggregate builds passed. The web build remained static and required no secret or live server. Static migration validation passed three ordered TypeScript migrations.
- Frozen and offline frozen installs passed after lockfile generation. The corrected source inspection found only approved workspace links and no Git or HTTP tarball dependency. Lifecycle scripts for three unnecessary Testcontainers transitives remain explicitly denied.
- Root `validate` passed, cleanup removed every known reproducible output, and root `validate` passed again from that clean generated state before final status inspection.

Dependencies and supply chain:

- Runtime: `pg 8.22.0` belongs only to persistence; existing `pg` ownership remains in the isolated database tool.
- Test-only: `@types/pg 8.20.3` and `@testcontainers/postgresql 12.1.0` belong to persistence. The PostgreSQL module resolves Testcontainers 12.1.0.
- One root lockfile remains authoritative. No Git, HTTP tarball, external file source, lifecycle-script approval, ORM, crypto library, cookie/authentication library, DI framework, or telemetry dependency was introduced.

Overengineering audit:

- Introduced only the application resolver port required by ADR 0034, one concrete PostgreSQL adapter, one direct row mapper, one server derivation function, three schema migrations, and one migration runner wrapper required by ADR 0031.
- Rejected generic repository/base DAO, Unit of Work, transaction framework, clock service, request context, AsyncLocalStorage, credential/session provider, hash strategy registry, DI container, mapper framework, adapter factory, event bus, policy engine, and audit framework.
- The active lookup is one statement and therefore has no transaction abstraction. No separate persistence row model is exported.

ADRs:

- No ADR was created or updated. ADR 0034 already decides explicit evidence, keyed digest ownership, lifecycle/time authority, and dependency direction; ADRs 0018, 0026, 0031, and 0032 already decide PostgreSQL, identifiers/schema, migration ownership, and enforcement.

Open and deferred work:

- Deliberate deferrals: HTTP cookie extraction/configuration, request composition, issuance duration, login, logout/revocation command, key rotation, CSRF, authorization, Business switching, retention/cleanup, production secret injection, migration deployment safeguards, product UI, mobile, providers, OpenAPI clients, CI/deployment, backup/restore, product validation, and user testing.
- No blocker remains for composing already-extracted optional session evidence with the implemented derivation, use case, adapter, and stable mapper.

User-testing status:

- Not applicable. Cycle 019 introduces no merchant-facing workflow or usability/accessibility claim.

Recommended next cycle:

Cycle 020 — Request-Scoped Session Inspection Composition.

Recommended task:

Task 001 — Compose Extracted Session Evidence with Lookup Derivation, PostgreSQL Resolution, and Stable Transport Mapping.

Objective:

Implement the narrow server-owned orchestration that accepts optional already-extracted credential evidence, an explicit operation instant, and the server-held version 1 HMAC key; derives normalized lookup evidence; invokes the existing application use case backed by the PostgreSQL adapter; and maps the result through the stable transport mapper.

Why next:

Cycle 019 supplies every tested inner boundary but deliberately leaves their request-scoped composition disconnected. Composing them before Fastify/cookie exposure proves ownership and failure propagation without making HTTP behavior or authentication issuance accidental architecture.

Explicit non-goals:

- No cookie extraction/writing, Fastify route/hook, login/logout/issuance, CSRF, authorization engine, Membership lookup, Business switching, product endpoint/UI, mobile, provider, OpenAPI generation, telemetry, CI/deployment, or merchant user testing.

## Cycle 020 — Request-Scoped Session Inspection Composition

### Task 001 — Compose Extracted Session Evidence with Lookup Derivation, PostgreSQL Resolution, and Stable Transport Mapping

Status: Complete. The server-owned composition boundary is implemented, all applicable gates pass from a clean generated state, and no HTTP/cookie or merchant-facing behavior was introduced.

Objective:

Compose the accepted Cycle 019 server derivation, explicit application inspection boundary, PostgreSQL-backed resolver port, and stable Cycle 016 transport mapper without implementing HTTP/cookie infrastructure, authentication issuance, authorization, or product behavior.

Prerequisites and authority:

- `AGENTS.md`, README, this task register, all session/identity/application/transport/persistence/security/privacy/testing specifications, every accepted ADR 0001-0034, and all relevant Cycle 016-019 production/test/configuration sources were inspected before production edits.
- Cycles 010-019 were verified from repository evidence. Preflight found branch `master`, no `HEAD`, zero commits, seven approved private workspaces, 132 Git-visible untracked files, no generated output, and a green Cycle 019 focused baseline.
- ADR 0034 and the Cycle 018 specification authorize explicit optional evidence, server-only HMAC ownership, application-owned lookup/time input, anonymous normalization for unusable evidence, failure propagation, server composition, and stable transport output.

Composition authority matrix:

| Concern | Authority and Cycle 020 result |
| --- | --- |
| Evidence | Optional already-extracted string enters only `apps/server`; HTTP/cookie extraction remains deferred. |
| Missing evidence | Cycle 018 outcome matrix and Cycle 019 use case: execute with no lookup; resolver/PG are not called; stable anonymous result. |
| Malformed evidence | Existing derivation returns `undefined` without throwing; execute with no lookup; no resolver/PG; stable anonymous result. |
| HMAC configuration | Server construction owns a key of at least 32 bytes; invalid length fails during composition construction. |
| Lookup derivation | Existing Cycle 019 function is reused unchanged for exact domain-separated HMAC-SHA-256 bytes and canonical output. |
| Application input | Existing application-owned optional `SessionLookupKey` plus explicit `evaluatedAt`; no raw evidence or transport DTO. |
| Time | Caller supplies one `Date`; the same object reaches the resolver; no implicit clock exists. |
| Persistence | `SessionResolutionPort` remains the only inward boundary; the composition never imports/calls `pg`, Pool, SQL, or rows. |
| Transport | Existing pure Cycle 016 mapper returns the unchanged response schema. |
| Selected Business | Optional context is mapped; no Business/Membership/capability validation is implied. |
| Failures | No catch exists; invalid config, crypto, application/resolver, PostgreSQL, decoding, and mapping failures propagate. |
| PostgreSQL testing | Existing 12-test real PostgreSQL 18.4 adapter gate remains applicable; no second full composition-to-container claim is made. |

Implementation:

- `apps/server/src/session-inspection-composition.ts` adds one internal factory. Construction receives `hmacKey` and `InspectCurrentSession`; operation input receives optional `sessionEvidence` and `evaluatedAt`; output is `CurrentSessionInspectionResponse`.
- The factory validates and copies the HMAC key once, reuses `deriveSessionLookupKey`, invokes `InspectCurrentSession.execute`, and reuses `mapSessionInspectionToTransport`.
- `assertSessionHmacKey` is factored inside the existing credential module so direct derivation and composition construction use one key-length rule. Neither helper nor composition is exported from the server package root.
- Missing/malformed evidence still passes through the application use case with no lookup key. The application-owned short circuit prevents resolution rather than duplicating application semantics in server code.
- No catch, broad error classification, log, environment read, HTTP type, cookie/header access, Fastify behavior, Pool, SQL, hidden clock, global context, or mutable singleton exists.

Tests:

- `session-inspection-composition.test.ts` proves missing/malformed no-resolution behavior, no logs, canonical lookup/time propagation, anonymous unknown result, authenticated mapping with/without selected Business, schema compatibility, persistence/application/mapping failure propagation, invalid construction config, deterministic output, key-copy behavior, and non-mutation.
- `session-inspection-composition-crypto-failure.test.ts` uses Vitest's existing module mocking only to prove an unexpected Node crypto failure propagates rather than becoming anonymous.
- Existing credential known-answer, mapper, application, contract, migration, adapter, architecture, and build tests remain mandatory regressions.

Real PostgreSQL composition assessment:

- The existing real PostgreSQL adapter suite is rerun. A new full server-composition Testcontainer test is deliberately not added: Testcontainers and `pg` are persistence-owned, and adding them to server tests or importing the server edge from persistence would violate the explicit no-new-dependency/package-direction policy while duplicating Cycle 019's lifecycle matrix.
- Composition wiring is therefore proven deterministically with the real application use case and resolver double; PostgreSQL behavior remains proven separately by the real adapter gate. No combined end-to-end container claim is made.

Dependencies and artifacts:

- No dependency, manifest, lockfile, migration, SQL, table, column, contract, domain, application, persistence, web, or database-tool change is required.
- No route, hook, middleware, decorator, request handler, cookie parser/writer, environment file/reader, startup binding, login/logout, issuance, CSRF, authorization, Membership lookup, Business switching, product behavior, UI, provider, mobile, telemetry, CI, deployment, or generated client is introduced.

Security and privacy:

- Raw evidence exists only in the composition input and existing derivation call. Application call inspection proves only digest evidence/time cross inward; production scans must find no credential-shaped literal outside synthetic tests.
- The HMAC key is construction-owned, copied, and never an operation input or public export. Invalid configuration fails before any inspection operation.
- Malformed evidence performs no lookup and logs nothing. The composition has no catch, so infrastructure/configuration failures cannot fail open.
- No data is persisted and no IP, user agent, device, location, request history, telemetry, metadata, authorization cache, or sensitive audit field is introduced.

Overengineering audit:

- Accepted: one operation-specific factory, one operation input type, one execute boundary, and one shared key assertion, each used by the current composition or derivation.
- Rejected: request context, AsyncLocalStorage, mutable global state, handler/pipeline/composition framework, DI container, service locator, session provider, result monad, generic error registry, hash strategy, clock abstraction, repository/Unit of Work, generic mapper, event bus, policy engine, and audit framework.

Validation evidence:

- Pre-edit runtime verification passed Node 24.19.0, Corepack 0.35.0, and pnpm 11.20.0. Dependency inventory and manifest/lockfile SHA-256 values were recorded; no dependency changes.
- Pre-edit `application:test` passed 5, `mapping:test` passed 14, and the real `database:test` passed 12 against PostgreSQL 18.4.
- Post-edit server tests pass 27 across four files, including 13 new composition/failure cases. Type-aware lint, all workspace type-checks, and layered architecture validation pass with seven workspaces, 37 modules, 30 dependencies, and no violation.
- Aggregate `test` passes 98 tests: 54 contracts, 5 application, 27 server-edge, and 12 real PostgreSQL adapter tests. All package, server, database-tool, and static Next.js builds pass; three migration sources remain valid.
- Root `validate` passed, cleanup removed every known reproducible output, and root `validate` passed again from that clean generated state.
- Public-export, browser/application independence, raw-evidence/secret/HMAC ownership, implicit-clock, broad-catch, SQL, forbidden-artifact, marker, generated-output, Docker, Markdown, text-file, Git, HEAD, and commit-count inspections complete the final audit.
- No validation command failed. One `apply_patch` context check failed while removing an unused return type/import; it changed no file. The source was inspected and the smaller patch applied successfully before all affected tests and gates were rerun.

ADRs:

- No ADR is created or updated. ADR 0034 already decides explicit evidence, keyed derivation, time, inactive outcomes, failure propagation, and server composition ownership.

User-testing status:

- Not applicable. No merchant-facing behavior, HTTP endpoint, browser behavior, product UI, or usability/accessibility claim exists.

Open and deferred work:

- A focused specification must close exact cookie name/configuration, production/local rules, HMAC secret loading and startup validation, request-time capture, Fastify extraction/exposure, missing/malformed HTTP behavior, safe internal-failure mapping, cache headers, and the older ID05 CSRF/access-context wording before route implementation.
- Login, issuance duration, credential issuance/rotation, logout/revocation commands, CSRF token lifecycle, authorization/Membership/capability evaluation, Business switching, session retention/cleanup, product API/UI, mobile, providers, OpenAPI clients, telemetry, CI/deployment, product validation, and user testing remain deliberate later work.

Recommended next cycle:

Cycle 021 — HTTP Session Evidence and Configuration Specification.

Recommended task:

Task 001 — Define Cookie Extraction, HMAC Secret Loading, Request-Time Capture, and Safe Fastify Session Inspection Exposure.

Objective:

Specify the exact server configuration, cookie parsing, request-time capture, Fastify composition/startup ownership, ID05 route/status/cache/error behavior, and security tests needed to expose the existing internal composition without implementing login, authorization, or product behavior.

Why next:

Cycle 020 completes every framework-neutral and internal server boundary. HTTP exposure is now blocked only by concrete cookie/configuration/error details, including reconciliation of Cycle 011 ID05's older CSRF/access-context wording with the stable Cycle 016 response.

Explicit non-goals:

- No production route/hook, cookie implementation, login/logout/issuance, CSRF token implementation, authorization/Membership, Business switching, product API/UI, mobile, provider, OpenAPI generation, telemetry, CI/deployment, or merchant user testing.

## Cycle 021 — HTTP Session Evidence and Configuration Specification

### Task 001 — Define Cookie Extraction, HMAC Secret Loading, Request-Time Capture, and Safe Fastify Session Inspection Exposure

Status: Complete.

Objective:

Specify the smallest safe Fastify/HTTP boundary that can expose the completed Cycle 020 session-inspection composition without implementing the route, cookies, configuration loading, authentication, authorization, or product behavior.

Prerequisites and repository evidence:

- `AGENTS.md`, README, this task register, the Cycle 016 response/mapper, Cycle 017 blocker, Cycle 018 session specification and ADR 0034, Cycle 019 application/persistence implementation, Cycle 020 composition/source/tests, relevant identity/transport/persistence/security/privacy/testing specifications, Fastify bootstrap/configuration, package exports, and architecture enforcement were inspected before editing.
- Cycles 010-020 were verified from repository evidence. Preflight found branch `master`, no `HEAD`, zero commits, exactly seven private workspaces, 135 Git-visible untracked project files, no compiled/generated output beyond installed `node_modules`, and no HTTP/cookie/session route behavior.
- The default login shell resolved Node 20.20.2, Corepack 0.34.6, and pnpm 9.15.0. Those versions were not accepted for validation. The approved toolchain path verified Node 24.19.0, Corepack 0.35.0, and pnpm 11.20.0 and owns every executable gate.
- Docker 29.6.2 was available. The pre-edit real PostgreSQL 18.4 lifecycle suite passed all 12 cases and stopped its ephemeral container.

Cycle 020 lifecycle evidence gate:

| Required behavior | Repository evidence | Result |
| --- | --- | --- |
| Revoked | Persistence integration table case sets `revoked_at` and expects no active session | Proven against PostgreSQL 18.4 |
| Expired | Persistence integration table case sets expiry before `evaluatedAt` and expects no active session | Proven against PostgreSQL 18.4 |
| Equal expiry | Dedicated case passes `evaluatedAt === expiresAt` and expects no active session | Proven against PostgreSQL 18.4 |
| Disabled User | Persistence integration table case sets `disabled_at` and expects no active session | Proven against PostgreSQL 18.4 |

Specification authority result:

| Concern | Cycle 021 decision |
| --- | --- |
| Evidence source | Configured cookie in the Fastify request `Cookie` header only |
| Production/local names | `__Host-sem-caderno-session`; loopback-only `sem-caderno-session` |
| Cookie profile config | Required `SEM_CADERNO_SESSION_COOKIE_PROFILE`: `production` or `local-development` |
| Value | Exact existing 46-character version 1 credential; no decoding, normalization, or repair |
| Missing/malformed/duplicate | Stable anonymous 200 without derivation/persistence; duplicate configured names are ambiguous |
| HMAC config | Required `SEM_CADERNO_SESSION_HMAC_KEY_V1_BASE64URL`, exactly 32 canonical decoded bytes, no default |
| Startup | Missing/invalid profile or key prevents construction/listening and never becomes anonymous |
| Time | One `Date` captured at route-handler entry and passed unchanged inward |
| HTTP | Direct `GET /api/v1/session`; no auth hook/middleware; no body/query/path input |
| Success/cache | 200 stable Cycle 016 body; `Cache-Control: no-store`; no ETag/304/Set-Cookie |
| Failure | Safe 500 `INTERNAL_FAILURE` Problem Details; internal failures never become anonymous |
| CSRF | No token for safe ID05; all unsafe-operation ADR 0023 requirements remain |
| Business | Optional selected Business is remembered context only; ID10 owns accessible Businesses |
| Testing | Unit/Fastify injection plus one focused outer-edge PostgreSQL 18.4 path in the next cycle |

Deliverables:

- Create `docs/specs/http-session-evidence-configuration-specification.md` as the authoritative Cycle 021 decision matrix, cookie/configuration/time/Fastify/failure/security/privacy/test plan, deferrals, and next-cycle boundary.
- Update README and architecture to show the completed specification without implying executable HTTP behavior.
- Refine Cycle 011 ID05 to match the stable Cycle 016 response: optional session, no CSRF token, no accessible-Business authorization read.
- Add the Cycle 021 profile to the session lifecycle specification.
- Update security/privacy and test strategy with the specified future implementation controls and honest test ownership.
- Record Cycle 021 task evidence and exactly one next cycle.

Files created and updated:

- Created: `docs/specs/http-session-evidence-configuration-specification.md`.
- Updated: `README.md`, `docs/architecture/architecture.md`, `docs/specs/session-credential-resolution-lifecycle-specification.md`, `docs/specs/transport-api-contract-specification.md`, `docs/security/privacy-and-lgpd.md`, `docs/quality/test-strategy.md`, and `docs/tasks.md`.
- No production source, test source, manifest, lockfile, migration, SQL, environment file, or ADR changed.

Framework and source review:

- Fastify's official cookie plugin documentation confirms maintained request cookie parsing, identity-decode configuration through parser options, and Fastify 5 compatibility for plugin major 10 and later.
- Registry metadata checked on 2026-08-05 reported `@fastify/cookie` 11.1.2 as current, with `cookie ^2.0.0` and `fastify-plugin ^6.0.0`; it is a future candidate only and was not installed.
- RFC 6265 warns servers not to rely on same-name cookie order, supporting explicit duplicate rejection.
- Fastify's official server/error documentation confirms `setErrorHandler` ownership for thrown route failures and the need for custom safe response mapping.

Selected boundary:

- The HTTP adapter in `apps/server` alone sees Fastify requests, raw Cookie headers, names, parsing, status, cache, and public failures.
- The official cookie parser is selected for future maintained parsing, configured with identity decode; one narrow raw-header check detects duplicate configured names before using the parsed value.
- `SEM_CADERNO_SESSION_COOKIE_PROFILE` selects one of two fixed names; arbitrary names are not accepted.
- `SEM_CADERNO_SESSION_HMAC_KEY_V1_BASE64URL` is server-only, strictly canonical, decoded before construction, and never logged or passed inward.
- The route captures one operation time and calls the existing Cycle 020 composition. It does not bypass application or persistence boundaries.
- `about:blank` avoids inventing a deployment documentation domain for the safe 500; the stable `INTERNAL_FAILURE` code and correlation ID retain machine/support meaning.

Public and CSRF clarification:

- ID05 is `GET /api/v1/session` with optional session evidence and stable anonymous/authenticated success body.
- ID05 returns no CSRF token and no accessible-Business list. ID00 remains pre-session CSRF bootstrap; ID10 remains accessible-Business read.
- Read-only ID05 does not require a synchronizer token and must perform no renewal, cookie write, selection, or mutation.
- Login/issuance and every unsafe authenticated operation retain Origin/Referer, synchronizer-token, and defense-in-depth requirements from ADR 0023.

Security and privacy:

- Raw evidence is confined to the HTTP adapter and Cycle 020 derivation call. It is prohibited from logs, errors, contracts, application, persistence, audit, telemetry, and support data.
- Missing/invalid HMAC configuration fails before listen. Crypto/application/PostgreSQL/mapping failures return safe 500 rather than anonymous.
- Success and error responses are `no-store`; no session rejection detail is public.
- No IP, user agent, device, fingerprint, location, request history, login history, telemetry, arbitrary metadata, or authorization cache is authorized.
- Selected Business remains context only and does not prove Business/Membership/capability access.

Future tests specified, not implemented:

- Direct configuration and exact cookie extraction tests, including duplicate and no-decoding cases.
- Fastify injection tests for status/body/media/cache, one request time, safe failures, redaction, and no Set-Cookie.
- One focused server-owned PostgreSQL 18.4 HTTP path proving active, unknown, inactive, and closed-pool failure without duplicating the persistence lifecycle matrix.
- Exact future dependency versions and lockfile effects must be reverified in Cycle 022; Cycle 021 adds no dependency.

Overengineering assessment:

- Accepted only two fixed cookie names, one narrow profile, one HMAC environment value, one route-specific extractor, one direct route, one safe error mapping, one handler-entry time capture, and one focused integration path.
- Rejected generic authentication/session providers, request context, AsyncLocalStorage, DI/service location, handler/middleware frameworks, generic configuration or secret-provider frameworks, signed-cookie duplication, hash strategies, clock interfaces, result/error registries, generic repositories/transactions, policy engines, event buses, telemetry, and device tracking.

Explicit non-goals:

- No production HTTP code, cookie parser/writer, configuration reader, listener, route/hook/middleware/plugin/decorator, login/logout/registration/password/recovery, credential issuance/rotation, refresh token, JWT/OAuth, CSRF token, authorization/Membership/capability, Business switching, product API/UI, financial behavior, mobile, provider, OpenAPI/client, telemetry, CI/deployment, backup, browser journey, accessibility conformance, or merchant user testing.

Validation evidence:

- Pre-edit approved runtime checks passed; the non-approved login-shell versions were recorded and excluded.
- `pnpm run database:test` passed 12 real PostgreSQL 18.4 tests, including the four mandatory lifecycle cases.
- The official npm registry check reported `@fastify/cookie` 11.1.2 as current; official Fastify/plugin and RFC 6265 source checks support the selected future parser, Fastify 5 compatibility, custom error handling, identity decode, and duplicate rejection direction. No package was installed.
- Changed-document formatting and repository `format:check` passed. `docs:check` passed 60 Markdown files, 362 local links, and 102 tables.
- ESLint and every workspace source/test type-check passed. Architecture validation passed seven approved private workspaces, 37 modules, 30 dependencies, no violation, and the controlled-invalid self-test.
- Focused regressions passed 54 contract tests, 5 application tests, and 27 server tests. Aggregate `test` passed those tests plus 12 real PostgreSQL tests and the architecture self-test: 98 behavioral/integration tests total.
- Contract, domain, application, persistence, server, database-tool, and static Next.js builds passed. Migration validation passed three ordered TypeScript sources with checksums.
- Root `validate` passed once after documentation changes. Cleanup, a second clean-state `validate`, final scans, `git diff --check`, Markdown/text checks, generated-output inspection, Docker inspection, and Git status completed before the final report.
- No validation gate failed. One preflight command resolved the login shell to unsupported Node 20/pnpm 9; it was treated as environment evidence rather than an accepted gate and every actual gate used the explicit approved Node 24 path.

Risks and deliberate deferrals:

- The next implementation adds a cookie parser dependency and server test-only outer integration ownership; exact metadata and architecture manifest allowances require implementation-time review.
- Session duration and cookie persistence, login/issuance, logout/revocation, CSRF token lifecycle, HMAC rotation, retention, rate limiting, correlation response header, public problem documentation, reverse proxy/TLS, listener/database production configuration, operational logging, and deployment secret management remain deliberate deferrals, not blockers for the narrow read route.
- No material authority blocker remains for Cycle 022.

ADR assessment:

- No ADR is required. ADR 0023 already decides same-origin protected opaque-cookie sessions and layered CSRF, while ADR 0034 already decides explicit evidence, HMAC ownership, time, lifecycle outcomes, and dependency direction. Exact names, environment fields, route/cache behavior, and test placement are bounded implementation-facing specification details.

User-testing status:

- Not applicable. Cycle 021 introduces no merchant-facing behavior, browser workflow, UI, or usability/accessibility claim.

Acceptance criteria:

- Cycles 010-020 and the four-case lifecycle evidence gate are verified.
- HTTP evidence ownership, exact cookie names, strict parsing, duplicate behavior, and missing/malformed outcomes are explicit.
- HMAC loading, canonical representation, startup failure, and server-only ownership are explicit.
- One request-time capture and direct Fastify route ownership are explicit.
- Success, cache, safe failure, CSRF, and selected-Business semantics are explicit.
- The public contract remains stable and ID05 wording is reconciled.
- Future test ownership is explicit without claiming unexecuted HTTP/PostgreSQL coverage.
- Security, privacy, risks, deferrals, and overengineering are reviewed.
- No production implementation, dependency, lockfile, database, migration, SQL, product behavior, user test, commit, push, branch, or pull request is introduced.
- Applicable repository validation passed before the task status changed to Complete.

Recommended next cycle:

Cycle 022 — Fastify Current-Session HTTP Exposure.

Recommended next task:

Task 001 — Implement Strict Cookie Evidence Extraction, Server Session Configuration, and the Current-Session Route.

Objective:

Implement the direct server-local configuration parser, strict cookie extraction, one request-time capture, `GET /api/v1/session`, safe cache/error behavior, Fastify injection tests, and focused real PostgreSQL HTTP composition test while reusing every Cycle 020 boundary.

Why next:

Cycle 021 resolves all HTTP/configuration authority gaps. The route is now the smallest executable step that proves cookie-to-PostgreSQL inspection without adding login, issuance, authorization, or product behavior.

Explicit non-goals:

- No credential issuance, login/logout, CSRF token implementation, authorization/Membership, Business switching, product API/UI, mobile, provider, OpenAPI generation, telemetry, CI/deployment, backup, browser journey, accessibility conformance, or merchant user testing.

## Cycle 022 — Fastify Current-Session HTTP Exposure

### Task 001 — Implement Strict Cookie Evidence Extraction, Server Session Configuration, and the Current-Session Route

Status: Complete. The strict Fastify ID05 boundary and focused real PostgreSQL HTTP path are implemented, and all applicable gates pass from a clean generated state.

Objective:

Implement the smallest production HTTP edge authorized by Cycle 021: strict configured-cookie extraction, server-only HMAC configuration, one request time, direct `GET /api/v1/session`, stable success/cache behavior, safe internal failures, focused Fastify tests, and one real PostgreSQL HTTP composition path.

Authority and prerequisites:

- `AGENTS.md`, the repository-local `sem-caderno-cycle` Skill, README, this task register, architecture, security/privacy, test strategy, the Cycle 021 HTTP specification, session lifecycle and transport specifications, ADRs 0016-0018, 0020, 0022-0023, and 0030-0034 were inspected before editing.
- Cycles 010-021 were verified. Preflight found branch `master`, no `HEAD`, zero commits, seven private workspaces, 138 untracked project files, no generated output, and no Cycle 022 route/configuration implementation.
- Approved execution used Node 24.19.0, Corepack 0.35.0, pnpm 11.20.0, and Docker 29.7.1.
- Pre-edit application tests passed 5, server tests passed 27, and the real PostgreSQL 18.4 persistence suite passed 12.
- Cycle 021 provided complete authority for evidence source, fixed cookie names/profiles, canonical key configuration, missing/malformed/duplicate behavior, explicit time, direct Fastify exposure, cache/error behavior, selected-Business context, and outer PostgreSQL test ownership. No blocker or semantic invention was required.

Implemented boundary:

- `loadSessionHttpConfiguration` reads an injected environment map or explicit invocation-time `process.env`, accepts only `production` or `local-development`, decodes exactly 32 canonical unpadded base64url HMAC bytes, has no default, and returns only server-owned values.
- `extractSessionCookieEvidence` recognizes exactly one configured cookie occurrence. It compares the maintained parser's identity-decoded value with the exact raw value so whitespace trimming, percent decoding, quote removal, padding repair, malformed occurrences, and duplicates cannot authenticate.
- `buildApp` receives validated session configuration and the application-owned `SessionResolutionPort`, constructs the existing Cycle 020 use case/composition once, registers `@fastify/cookie`, and exposes only `GET /api/v1/session`.
- Each request creates one `Date`, passes it unchanged inward, and returns stable Cycle 016 transport data with `Cache-Control: no-store`, no ETag, and no cookie write.
- A route-local error handler returns the allow-listed 500 `INTERNAL_FAILURE` Problem Details with a Node-generated request correlation UUID. It exposes no internal error, credential, key, digest, SQL, or row data and never converts infrastructure failure to anonymous.
- Missing, malformed, duplicate, unknown, and inactive evidence remains indistinguishable as anonymous. Selected Business remains remembered context only.

Files created and updated:

- Production source created: `apps/server/src/session-http-configuration.ts`, `apps/server/src/session-cookie-evidence.ts`.
- Production source updated: `apps/server/src/app.ts`, `apps/server/src/index.ts`.
- Tests created: `apps/server/test/session-http-configuration.test.ts`, `apps/server/test/session-cookie-evidence.test.ts`, `apps/server/test/session-route.test.ts`, `apps/server/test/session-route.postgres.test.ts`.
- Configuration updated: `apps/server/package.json`, `apps/server/test/tsconfig.json`, root `package.json`, `pnpm-lock.yaml`, and `tools/check-architecture.mjs`.
- Documentation updated: `README.md`, `docs/architecture/architecture.md`, `docs/quality/test-strategy.md`, `docs/security/privacy-and-lgpd.md`, `docs/specs/http-session-evidence-configuration-specification.md`, `docs/specs/transport-api-contract-specification.md`, and this task register.
- No domain, application, contract, persistence production source, web source, database migration, SQL artifact, environment file, or ADR changed.

Dependencies and lockfile:

- Server runtime adds exact `@fastify/cookie` 11.1.2.
- Server test ownership adds exact `@testcontainers/postgresql` 12.1.0, `@types/pg` 8.20.3, and `pg` 8.22.0. These versions were already accepted and locked by persistence/database ownership; pnpm reuses them.
- Registry metadata, release age, Fastify 5 compatibility, integrity, lifecycle policy, and one frozen-lockfile installation were checked. No release-age or lifecycle exception was added.
- Root edge preparation now emits persistence declarations needed by clean server tests; server test execution also builds the existing migration tool before the HTTP container test.

Architecture and security:

- Domain, application, contracts, persistence production code, and public transport schemas remain unchanged.
- Server owns environment parsing, raw Cookie evidence, HMAC configuration, request time, HTTP behavior, and transport error translation. Application receives only canonical lookup plus time; persistence receives no raw evidence or HTTP type.
- Architecture validation permits the four reviewed server dependencies and parameterized fixture SQL only in `apps/server/test/*.postgres.test.ts`; production server SQL remains prohibited.
- No request context, AsyncLocalStorage, generic auth/configuration/error/handler framework, clock abstraction, repository, Unit of Work, cookie writer, authorization, tracking, telemetry, or new persisted data exists.

Tests introduced:

- Configuration tests cover both profiles and missing, empty, unknown, padded, malformed, non-canonical, short, and long HMAC values without value leakage.
- Extraction tests cover exact raw/parsed identity, missing/unrelated evidence, duplicate and malformed occurrences, whitespace normalization attempts, and parser mismatch.
- Fastify tests cover missing/malformed/transformed/duplicate evidence without resolution, stable authenticated and anonymous responses, one explicit time, selected-Business context, no-store/no-cookie/no-ETag behavior, safe Problem Details, redaction, and construction failure.
- One real PostgreSQL 18.4 server suite migrates from zero and proves active authenticated, unknown anonymous, revoked anonymous, and closed-pool 500 behavior through HTTP, Cycle 020, application, and the real adapter.

Initial failures and corrections:

- Server type-check exposed `@fastify/cookie` 11.1.2's declaration mismatch for documented `parseOptions.decode`; one narrow intersection of its public option types preserves identity decoding and strict TypeScript.
- A clean server test type-check initially lacked emitted persistence declarations; the existing edge preparation was extended to build the declared persistence dependency.
- One focused test incorrectly asserted that an error string could exclude the empty string; redaction checking now applies only to non-empty supplied values.
- ESLint rejected a thenable return from the Fastify error handler and `any` response bodies; the handler now sends without returning, and tests parse `unknown` through contract schemas.
- One malformed manual patch changed no file; the corrected smaller patch applied before validation reruns.

Validation evidence:

- Registry checks and pnpm installation passed supply-chain policy; the frozen lockfile is reproducible and contains no new lifecycle allowance or exotic dependency source.
- Focused configuration/extraction/route tests pass 32 cases. The full server gate passes 62 tests across eight files, including two assertions in the real PostgreSQL 18.4 HTTP suite.
- Aggregate `test` passes 133 behavioral/integration tests: 54 contracts, 5 application, 62 server, and 12 persistence tests, plus the architecture controlled-invalid self-test.
- Runtime, formatting, documentation, type-aware lint, every workspace type-check, dependency-cruiser, seven-workspace structural validation, all library/server/database/web builds, and three-source migration validation pass.
- Root `validate` passed, cleanup removed known outputs, and root `validate` passed again from a clean generated state. Final cleanup, source/export/dependency, browser-safety, secret/raw-evidence/HMAC, implicit-clock, broad-catch, SQL, marker, forbidden-artifact, text, Docker, and Git checks complete the evidence.
- The real PostgreSQL HTTP test used the immutable PostgreSQL 18.4 image, applied all three migrations, inserted synthetic parameterized fixtures, proved active/unknown/revoked/closed-pool outcomes, and stopped its container.

Skill forward-test:

- The repository-local `sem-caderno-cycle` Skill was sufficient for the first real cycle. It correctly directed authority inspection, scoped implementation, focused-before-aggregate validation, failure classification, clean-state rerun, honest user-testing status, and one-cycle handoff.
- No Skill deficiency required correction. Cycle-specific commands and decisions continued to come from repository authority rather than the Skill.

User-testing status:

- Not applicable. This internal read endpoint introduces no merchant UI, workflow, browser journey, usability claim, or accessibility-conformance claim.

ADR assessment:

- No ADR is required. Cycle 022 implements ADRs 0023 and 0034 plus the accepted Cycle 021 boundary without a new durable cross-cutting choice.

Overengineering assessment:

- Introduced only one configuration parser, one strict extractor, one direct route composition, one route-local safe error body, and focused tests. Rejected generic authentication/session providers, request contexts, DI, service locators, middleware/handler pipelines, generic configuration, hash/clock strategies, repositories, transactions, event/audit systems, and policy engines.

Recommended next cycle:

Cycle 023 — Session Issuance and Sign-In Specification.

Recommended next task:

Task 001 — Define Credential Verification, Session Issuance, Cookie Lifetime, and Authenticated CSRF Token Lifecycle.

Objective:

Close the exact sign-in input/outcome, credential verification ownership, session issuance duration, cookie writing attributes, fixation resistance, authenticated CSRF token lifecycle, and failure semantics before any login or credential-writing implementation.

Why next:

Cycle 022 completes safe read-only session inspection. Issuing the inspected credential remains intentionally undefined and security-sensitive, so specification must precede login, cookie writing, logout, or authorization implementation.

Explicit non-goals:

- No production login/logout, credential storage or verification, session insertion, cookie writing, CSRF token implementation, authorization/Membership, Business switching, product API/UI, mobile, provider, telemetry, CI/deployment, or merchant user testing.

## Cycle 023 — Session Issuance and Sign-In Specification

### Task 001 — Define Credential Verification, Session Issuance, Cookie Lifetime, and Authenticated CSRF Token Lifecycle

Status: Complete. The documentation and architecture authority required for a future narrow sign-in/session-issuance implementation is accepted; no production behavior was introduced.

Objective:

Define strict sign-in input and public outcomes, local credential-verification ownership, fresh session/CSRF issuance, fixed lifetime, atomic persistence, fixation resistance, cookie writing, abuse controls, failure boundaries, authorization separation, and focused future tests without implementing them.

Authority and prerequisites:

- `AGENTS.md`, the repository-local `sem-caderno-cycle` Skill, README, this task register, all 12 specifications, all accepted ADRs through 0034, architecture, security/privacy, test strategy, and Cycle 016/Cycles 017-022 session evidence were inspected before editing.
- The Git baseline was independently verified on `main` at `53708d81f858ba0a2489b28b60e1deb2042139dd`, tracking matching `origin/main`, with one commit, a clean tree, and no generated output. Cycles 010-022 were present and Cycle 023 existed only as the accepted recommendation.
- Cycle 022 preserves strict read-only ID05 behavior and the real PostgreSQL 18.4 HTTP path. Cycle 023 does not change that implementation.
- Official NIST and OWASP password, session, and CSRF guidance was rechecked against repository authority. Repository semantics remain controlling.

Specification decisions:

- ID04 is `POST /api/v1/sessions` with a strict JSON object containing only normalized primary-email input and password. It requires ID00 pre-session CSRF evidence plus strict same-origin validation.
- The application owns a narrow verification port. PostgreSQL infrastructure owns local Argon2id PHC retrieval/comparison. Password, transport, cookie, crypto, and database details do not enter application semantics.
- Wrong password, unknown email, disabled User, and missing credential binding are one generic 401 `AUTHENTICATION_FAILED`; equivalent dummy Argon2 work reduces identity disclosure. Correct proof may distinguish an unverified email. Infrastructure failure remains 500 failure.
- Future password creation requires at least 15 and supports at least 128 Unicode scalar values, with blocklist review and no composition/periodic-change rule. Sign-in accepts 1-128 scalars within its transport byte bound.
- Successful verification independently generates a fresh `v1` session credential and `c1` authenticated CSRF token from 32 CSPRNG bytes each. Persistence receives only versioned domain-separated HMAC digests.
- One explicit `issuedAt` owns transaction timestamps and fixed 12-hour absolute expiry. There is no idle/sliding expiry, renewal, remember-me, or refresh token.
- One transaction revalidates the User, consumes the ID00 challenge, revokes only the prior presented session, inserts the fresh session with null selected Business, records minimal safe audit evidence, and clears aggregate rate state. Any failure rolls the entire issuance back.
- Only a committed 201 writes the accepted production/local session cookie with `HttpOnly`, `SameSite=Lax`, `Path=/`, no `Domain`, `Max-Age=43200`, and matching `Expires`; production remains `Secure` and `__Host-` constrained.
- ID00 returns a 10-minute in-memory `p1` CSRF token. ID04 returns the independent `c1` token in a no-store body. Unsafe authenticated operations later validate session, CSRF digest, origin evidence, Fetch Metadata when present, authorization, and input separately.
- The minimum account-keyed abuse policy is 10 failures in a rolling 15 minutes using only a normalized-identity HMAC digest and bounded aggregate state. No IP, device, user-agent, or attempt history is stored.
- Authentication establishes only global User context. Selected Business starts absent and never proves Membership, capability, tenant access, or authorization.

Files created and updated:

- Created `docs/specs/session-issuance-sign-in-specification.md` as the detailed Cycle 023 authority.
- Created `docs/architecture/decisions/0035-local-email-password-session-csrf-issuance.md` for the durable local-password, split-evidence, explicit-time, and application-port decision.
- Updated `README.md`, ADR index, architecture, application/identity/session/HTTP/transport/persistence specifications, security/privacy, test strategy, and this task register for traceability and stale-deferral correction.
- No source, test, configuration, manifest, lockfile, database migration, SQL, generated artifact, or environment file changed.

Persistence and future dependency implications:

- No migration or schema change is implemented. Future authority permits only password-verifier, pre-session-challenge, session-CSRF, and aggregate sign-in-rate state reviewed in the implementation cycle.
- No dependency or lockfile change occurs. The exact maintained Argon2 package/version remains an implementation-time supply-chain decision, not a product/security semantic gap.

Security and privacy:

- Password, raw session credential, raw CSRF evidence, HMAC key, and digests never enter logs, public errors, audit payloads, browser-safe contracts, analytics, telemetry, or support data.
- Fresh evidence, atomic replacement, no pre-commit cookie, generic invalid proof, fail-closed infrastructure behavior, CSRF/origin layering, and no authorization inference address the current disclosure, fixation, replay, CSRF, and fail-open risks.
- No IP, user agent, device/fingerprint/location data, login/request history, arbitrary metadata, or behavioral telemetry is authorized.

Validation evidence:

- `pnpm run check:runtime` passed twice with Node 24.19.0, Corepack 0.35.0, and pnpm 11.20.0. `pnpm run format` changed no executable file; `pnpm run format:check` passed before and after cleanup.
- `pnpm run docs:check` passed before and after cleanup with 63 Markdown files, 376 local links, and 108 tables.
- `pnpm run architecture` passed before and after cleanup: seven approved private workspaces, 43 modules, 40 dependencies, no dependency violation, and the controlled-invalid self-test.
- `pnpm run clean` removed known reproducible outputs. Final scope, active-environment, draft-marker, credential/secret, generated/forbidden-artifact, trailing-whitespace, final-newline, Markdown, `git diff --check`, Cycle 024 boundary, and Git-state inspections passed.
- Production lint, type-check, application/server/persistence tests, PostgreSQL, builds, browser/mobile/provider/deployment gates, and merchant testing were not applicable because no executable, dependency, manifest, lockfile, schema, migration, or runtime behavior changed.

Initial failures and corrections:

- Two combined manual `apply_patch` attempts failed atomically because one hunk was malformed and one persistence anchor differed; neither changed a file. Smaller verified patches applied the same reviewed documentation edits.
- The first combined hygiene command stopped after all preceding checks passed because it assumed `rg -c` prints `0` for no Cycle 024 heading. `rg` emitted no text with exit 1 for the valid no-match case; the corrected explicit no-match branch passed and confirmed Cycle 024 was not started.

ADR assessment:

- ADR 0035 is required because Cycle 023 selects a durable local email/password verification boundary over provider-managed or transport-owned alternatives and divides raw session/CSRF generation from application and persistence authority. Exact fields, durations, limits, mappings, and tests remain in the specification rather than the ADR.

Overengineering assessment:

- Accepted only one local verifier boundary, one issuance operation, two distinct CSRF/session evidence classes, one explicit time, one transaction boundary, and bounded aggregate abuse state because each closes a concrete implementation blocker.
- Rejected provider/plugin frameworks, generic token/credential/session/CSRF abstractions, hash-strategy registries, request contexts, AsyncLocalStorage, DI/service location, clock frameworks, generic repositories/transactions, refresh-token/session-family/device systems, event buses, policy engines, telemetry, and speculative rotation infrastructure.

Explicit non-goals:

- No production sign-in, verifier, password migration, session insertion, CSPRNG use, cookie writer, ID00/ID04 route, logout, registration, reset, CSRF middleware, authorization, Membership lookup, Business switching, product API/UI, mobile, provider, telemetry, deployment, JWT/OAuth/refresh token, runtime dependency, migration, SQL, commit, push, branch, or pull request.

User-testing status:

- Not applicable. Cycle 023 adds no merchant-facing behavior, UI, browser journey, usability claim, or accessibility-conformance claim.

Recommended next cycle:

Cycle 024 — Sign-In Contract and Application Boundary Implementation.

Recommended next task:

Task 001 — Implement ID00/ID04 Transport Schemas, Email Normalization, Password-Verification Port, and Digest-Only Session-Issuance Ports.

Objective:

Implement only the reviewed browser-safe ID00/ID04 schemas and framework-independent application input/output ports needed for verification and digest-only issuance, with focused contract/application tests and no infrastructure adapter or HTTP exposure.

Why next:

Cycle 023 closes all semantic inputs for the inner boundary. Establishing executable transport and application ownership before choosing Argon packaging, migrations, transactions, or Fastify writing preserves the repository's inside-out sequence and keeps raw credential generation at the future server edge.

Explicit non-goals:

- No Argon2 dependency or password adapter, migration, SQL, session insertion, rate-limit store, crypto evidence generation, Fastify ID00/ID04 route, cookie writing, CSRF enforcement, login UI, logout, authorization/Membership, Business switching, product behavior, mobile, provider, telemetry, deployment, or merchant user testing.

## Cycle 024 — Sign-In Contract and Application Boundary Implementation

### Task 001 — Implement ID00/ID04 Transport Schemas, Email Normalization, Password-Verification Port, and Digest-Only Session-Issuance Ports

Status: Complete. The reviewed browser-safe transport and framework-independent application boundaries are implemented; all infrastructure and HTTP behavior remain absent.

Objective:

Implement the smallest executable inner boundary authorized by Cycle 023: ID00/ID04 Zod schemas and inferred types, deterministic accepted-email normalization, a password-verification port with explicit outcomes/failure separation, digest-only session/CSRF issuance transaction types, and focused tests.

Authority and preflight:

- `AGENTS.md`, the repository-local `sem-caderno-cycle` Skill, README, Cycle 023 task evidence, the accepted sign-in/session specification, ADRs 0016-0018, 0020, 0022-0023, 0030, and 0032-0035, application/transport/authentication/session/persistence specifications, architecture, security/privacy, test strategy, and current source/tests were inspected before editing.
- Git preflight found `main` at accepted Cycle 023 SHA `962ca63373ef6a7c72e340c63d8717511a49d11e`, one clean worktree, two commits, matching `origin/main`, the exact SSH origin, no generated output, and no Cycle 024 implementation.
- The authority matrix classified strict ID00/ID04 JSON, the new generic authentication failure, ASCII email normalization, verification outcomes, and digest-only issuance as accepted. Argon2, persistence, transaction execution, cryptography, HTTP, cookie, CSRF enforcement, rate storage, authorization, and UI remain explicitly deferred. No blocker or contradiction remained.
- One security-summary sentence incorrectly implied a password could never appear in a browser-safe request contract. The detailed accepted ID04 authority necessarily includes a transient password request field; documentation now clarifies that it is never a response, retained value, hash/verifier export, log, audit value, or persistence value.

Implementation:

- `authentication.ts` owns strict ID04 `{ email, password }`, additive ID00/ID04 responses, accepted email/password limits, canonical `p1`/`c1` browser evidence, and inferred types. Password output is NFC-normalized without trimming, case change, or coercion.
- `errors.ts` adds stable 401 `AUTHENTICATION_FAILED` and enforces status/code consistency through the existing Problem Details schema.
- The contracts root exports only operation schemas, inferred types, and reviewed limits. It exports no session credential/digest, HMAC key, password hash, or verifier schema.
- `sign-in.ts` owns one nominal `NormalizedEmail`, deterministic full-address lowercase normalization for the accepted ASCII mailbox profile, `PasswordVerificationPort`, three explicit verification outcomes, and `SessionIssuanceTransactionPort`. Compile-time-only purpose brands keep session, pre-session-CSRF, and authenticated-CSRF digest values non-interchangeable without adding persistence fields.
- Verification infrastructure failure remains promise rejection, never the `invalid` outcome. Issuance infrastructure failure likewise rejects rather than fabricating an issued session.
- Issuance input contains User identity, `issuedAt`, `expiresAt`, session/pre-session-CSRF/authenticated-CSRF digests, and optional prior-session digest only. It contains no raw session/CSRF evidence, selected Business, HMAC key, password/hash, HTTP, transport, Argon2, PostgreSQL, Membership, capability, or authorization type.
- No sign-in coordinator is implemented because verification, rate state, CSPRNG, digest derivation, challenge consumption, persistence, and cookie writing do not yet have infrastructure adapters in this cycle.

Files created and updated:

- Contract source created: `packages/contracts/src/authentication.ts`.
- Contract source updated: `packages/contracts/src/errors.ts`, `packages/contracts/src/index.ts`.
- Contract tests created: `packages/contracts/test/authentication.test.ts`.
- Application source created: `packages/application/src/sign-in.ts`.
- Application source updated: `packages/application/src/index.ts`.
- Application tests created: `packages/application/test/sign-in.test.ts`.
- Documentation updated: `README.md`, `docs/architecture/architecture.md`, `docs/quality/test-strategy.md`, `docs/security/privacy-and-lgpd.md`, `docs/specs/application-contracts.md`, `docs/specs/session-issuance-sign-in-specification.md`, `docs/specs/transport-api-contract-specification.md`, and this task register.
- No domain, server, web, persistence, database-tool, configuration, manifest, lockfile, migration, SQL, environment, or ADR file changed.

Tests:

- Contract authentication tests cover canonical/additive ID00, invalid/missing bootstrap fields, strict ID04 request shape, unknown keys, ASCII email rules, NFC password normalization, Unicode scalar/UTF-8 limits, canonical CSRF evidence, safe authenticated response, stable generic Problem Details, determinism, JSON serialization, non-mutation, inferred types, and forbidden server-only exports.
- Application sign-in tests cover deterministic normalization/idempotence, unsupported email rejection without value echo, verified/email-verification-required/invalid outcomes, verifier failure propagation, compile-time digest-purpose separation, digest-only issuance, explicit times, selected-Business/raw-evidence absence, and issuance failure propagation.
- Existing contract, application, server, persistence, architecture, and build gates remain regression requirements; no mock is described as PostgreSQL or cryptographic evidence.

Dependencies, persistence, and database:

- No dependency, manifest, or lockfile change. Zod remains contracts-only; application has no external dependency. Argon2 remains intentionally absent.
- No table, column, constraint, index, migration, SQL, repository, PostgreSQL adapter, transaction, fixture, or database process is introduced by production source.

Initial failures and corrections:

- One preflight ADR read used guessed filenames for ADRs 0016-0020 and failed with file-not-found output. The ADR index supplied the exact repository slugs; all relevant ADRs were then read successfully.
- The first focused contract run passed type-checking but failed one boundary test because the synthetic maximum email was accidentally 255 characters. The fixture local part was reduced by one character; the rerun passed without weakening the 254-byte schema limit.
- One validation shell resolved the host defaults Node 20.20.2 and pnpm 9.15.0, so its successful lint result was not accepted as Cycle 024 evidence. The repository-pinned Node 24.19.0 installation was activated explicitly; Node 24.19.0, Corepack 0.35.0, and pnpm 11.20.0 were reverified before lint and every subsequent executable gate passed under the required toolchain.
- Two guessed focused-test script names (`test:contracts` and `test:application`) did not exist. The root manifest was reinspected and the authoritative `contract:test` and `application:test` commands then passed. No repository file changed for this command correction.
- An attempted parallel validation wrapper yielded overlapping lint/type-check processes without retaining reliable completion output. The processes were allowed to finish, no validation process remained, and lint plus type-check were rerun serially under the pinned runtime before their results were accepted.
- The first browser-safety scan incorrectly treated the intentionally browser-visible `csrfToken` response fields as server-only leakage. The scan was narrowed to the actual prohibited session credential, digest, HMAC, password-verifier, infrastructure, environment, and hidden-time concepts; the corrected scan passed without a source change.

Validation evidence:

- Pre-edit runtime, 54 contract tests, and 5 application tests passed.
- Node 24.19.0, Corepack 0.35.0, and pnpm 11.20.0 passed the runtime baseline. Prettier formatting/checking and documentation validation passed for 63 Markdown files, 375 local links, and 108 tables.
- Corrected focused suites passed: 81 contract tests in three files and 22 application tests in two files. The aggregate suite passed 177 tests: 81 contract, 22 application, 62 server-edge, and 12 real-PostgreSQL persistence tests, plus the controlled architecture-validator self-test.
- Type-aware ESLint and every workspace type-check passed. Architecture validation retained seven approved private workspaces, 47 modules, 46 dependencies, no violation, and the passing controlled-invalid self-test.
- Contracts, domain, application, PostgreSQL persistence, server, isolated database tool, and the neutral Next.js production application built successfully. All three ordered migration sources retained their accepted checksums and passed static migration validation; Cycle 024 introduced no migration or PostgreSQL behavior.
- The complete root `pnpm run validate` passed before cleanup and passed again from a clean generated state. Package-root export inspection, dependency direction, browser safety, implicit-time, credential/secret, draft-marker, artifact, Markdown, and changed-text hygiene scans passed.
- `pnpm run clean` removed all reproducible TypeScript, Next.js, declaration, and test output before the clean-state rerun and again after final validation. `git diff --check`, final repository status, branch/HEAD/upstream, and generated-output inspections passed with only the 15 intended Cycle 024 paths changed or untracked.

ADR assessment:

- No ADR is required or changed. Cycle 024 implements ADRs 0033-0035 and the accepted Cycle 023 specification without selecting a new durable cross-cutting alternative.

Overengineering assessment:

- Added one cohesive contract module and one cohesive application module. Reused existing envelopes, identifiers, instants, Problem Details, package roots, and test ownership.
- Rejected a sign-in coordinator, generic identity/token/digest framework, branded runtime factories, strategy registry, DI container, request context, clock, repository/transaction base, crypto helper, Argon adapter, rate service, server mapper, and route because no current executable dependency can fulfill them in this cycle.

Explicit non-goals:

- No Argon2/bcrypt/scrypt/PBKDF2, password hash/storage, migration, SQL, PostgreSQL credential lookup, transaction orchestration, session insertion, CSPRNG, HMAC issuance, Fastify ID00/ID04 route, cookie writing, CSRF middleware/enforcement, rate-limit persistence, login UI, logout, registration, reset, authorization/Membership, Business switching, protected product API, mobile, provider, telemetry, deployment, JWT/OAuth/refresh token, commit, push, branch, or pull request.

User-testing status:

- Not applicable. Cycle 024 adds no merchant-facing UI, workflow, browser journey, usability claim, or accessibility-conformance claim.

Recommended next cycle:

Cycle 025 — Password Verification Persistence Foundation.

Recommended next task:

Task 001 — Implement the Argon2id Credential Verification Adapter and Minimum User Password-Credential Migration.

Objective:

Select and verify the exact maintained Argon2 package, add only the authorized `user_password_credentials` migration, implement the application-owned `PasswordVerificationPort` in PostgreSQL infrastructure, and prove verified, verification-required, invalid, dummy-work, and infrastructure-failure behavior against real PostgreSQL.

Why next:

Cycle 024 makes verifier ownership and outcomes executable while leaving infrastructure intentionally absent. Implementing that one adapter and its minimum persistence prerequisite is the smallest next inward-to-outward step before session/challenge/CSRF issuance transactions or Fastify sign-in exposure.

Explicit non-goals:

- No pre-session challenge, session-CSRF, or rate-limit migration; no session issuance transaction, CSPRNG/HMAC issuance, ID00/ID04 route, cookie writing, CSRF enforcement, registration, recovery, logout, authorization/Membership, Business switching, product API/UI, mobile, provider, telemetry, deployment, or merchant user testing.
