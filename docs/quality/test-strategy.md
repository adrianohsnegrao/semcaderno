# Test Strategy

## Purpose

This document defines the testing strategy for Sem Caderno. Cycle 014 installs the static scaffold tooling and root-owned architecture-validator self-test. Cycle 015 adds Vitest 4.1.10 at the root and the cross-cutting contract baseline. Cycle 016 extends the executable evidence to 54 contract tests, 4 framework-independent application tests, and 5 pure server-edge mapper tests; persistence, route, browser, accessibility, and mobile test implementations remain future work.

Cycle 002 adds a detailed domain and tenancy specification in [Domain and Tenancy Specification](../specs/domain-and-tenancy.md). Cycle 003 adds authentication and onboarding rules in [Authentication and Business Onboarding Specification](../specs/authentication-and-business-onboarding.md). Cycle 004 adds persistence and tenant-enforcement rules in [Data Persistence and Tenant Enforcement Specification](../specs/data-persistence-and-tenant-enforcement.md). Cycle 005 adds the first critical journey in [First Critical User Journey Specification](../specs/first-critical-user-journey.md). Cycle 006 adds logical records, relationships, consistency boundaries, and repository responsibilities in [Logical Data Model Specification](../specs/logical-data-model.md). Cycle 007 adds technology-independent command, query, authorization-context, error, idempotency, and read-model contracts in [Application Contracts Specification](../specs/application-contracts.md). Cycle 008 adds merchant-facing navigation, copy, state, recovery, responsive, accessibility, and screen-level privacy requirements in [Critical Journey UX Flow Specification](../specs/critical-journey-ux-flow.md). Cycle 009 adds conceptual screen structures, interaction sequences, state transitions, walkthrough coverage, and merchant-validation targets in [Low-Fidelity Interaction and Screen-State Specification](../specs/low-fidelity-interaction-screen-state-spec.md). Cycle 010 selects the future test architecture and implementation boundaries in [Implementation Architecture and Technology Selection Specification](../specs/implementation-architecture-technology-selection.md). Cycle 011 maps those semantics into versioned HTTP/JSON, session/CSRF, Business-context, stable error, idempotency, recovery, concurrency, pagination, freshness, and cache contracts in [Transport and API Contract Specification](../specs/transport-api-contract-specification.md). Cycle 012 maps them into PostgreSQL tables, tenant keys, types, constraints, indexes, transactions, locks, durable outcomes, outbox intent, projections, migrations, and repair requirements in [Physical Persistence Model Specification](../specs/physical-persistence-model-specification.md). Cycle 013 assigns tests to exact workspace owners, selects compatible baseline versions, defines real PostgreSQL/Testcontainers isolation, and orders repository gates in [Workspace Scaffolding and Tooling Specification](../specs/workspace-scaffolding-tooling-specification.md). Future tests should trace back to those specifications when covering tenant isolation, payments, balances, corrections, sessions, memberships, persistence, journey behavior, logical records, repository boundaries, application contracts, UX states, low-fidelity transitions, transport errors, idempotency, and auditability.

## Testing Principles

- Test the domain rules that protect money, debt, and history.
- Validate tenant isolation and authorization paths early.
- Keep tests connected to specifications and tasks.
- Do not claim validation passed unless the command or manual check was actually performed.
- Prefer focused tests over broad fragile coverage.

## Selected Future Test Technologies

Cycles 010 and 013 select these technologies and current compatible baselines for later implementation:

- Vitest 4.1.10 for domain, application, adapter, and integration test orchestration.
- Fastify request injection for server transport-adapter tests.
- React Testing Library 16.3.2 for accessible web interaction behavior when UI tests begin.
- Playwright 1.62.1 for supported-browser, responsive, and end-to-end journeys when browser tests begin.
- axe-core 4.12.1 through Playwright for automated accessibility checks, supplemented by manual assistive-technology review.
- Testcontainers 12.1.0 for Node.js with the PostgreSQL 18.4 module/image boundary for transaction, concurrency, tenant, projection, and repository integration tests.

Cycle 013 assigns domain tests to `packages/domain`, use-case tests to `packages/application`, wire tests to `packages/contracts`, transport tests to `apps/server`, presentation tests to `apps/web`, PostgreSQL tests to `packages/persistence-postgres`, and migration tests to `tools/database`. Static architecture tests are root-owned. Database suites migrate an empty PostgreSQL 18.4 database and use unique databases rather than transaction rollback as the only isolation mechanism.

Tests that claim PostgreSQL transaction or concurrency behavior must exercise PostgreSQL rather than an in-memory substitute. Provider adapters must be testable with fakes and must not require live providers for normal test execution.

## Current Scaffold Validation

Cycle 015 declares Zod 4.4.3 only in `@sem-caderno/contracts` and Vitest 4.1.10 only as root-owned test tooling. Cycle 016 adds honest `application:test` and `mapping:test` commands; root `test` runs contract, application, server, persistence, and architecture tests. Testcontainers is declared only by the PostgreSQL persistence package and by server test ownership for the focused outer HTTP path. React Testing Library, Playwright, and axe-core remain undeclared because no corresponding implementation exists. A transitive package does not authorize application use; each owning workspace must declare a dependency before importing it.

The current contract suite covers positive, negative, boundary, strict-request, additive-response, JSON-safety, version, money, date, error-code/status, current-session inspection, Business context, replay, unknown outcome, authoritative no-commit recovery, concurrency-validator, pagination, projection-freshness, envelope, determinism, non-mutation, and inferred-union cases. Application tests prove only delegation from `InspectCurrentSession` to a deterministic current-session port. Mapper tests prove explicit conversion from application-owned `Date` and flat selected-Business semantics to the canonical transport envelope. These tests do not prove authentication, authorization, financial, persistence, recovery-execution, or projection correctness.

Cycle 017 adds no tests because no new executable behavior is authoritative. In particular, no mocked query is described as PostgreSQL integration. Real session repository tests remain blocked until lookup evidence, digest/key handling, active/expired/revoked evaluation, disabled-User behavior, and selected-Business revalidation outcomes are specified. When unblocked, the database gate must use the accepted PostgreSQL 18.4 Testcontainers strategy, migrate from zero, and test parameterized digest lookup against a real server.

The only implemented scaffold test is the root architecture-validator self-test. It proves that the narrow manifest validator accepts the approved seven-member structure and rejects a controlled invalid workspace dependency. ESLint restrictions, dependency-cruiser, TypeScript project references, package exports, and production builds provide additional static evidence, but none proves authorization, tenant isolation, financial correctness, idempotency, recovery, privacy compliance, or accessibility conformance.

The initial Fastify boundary is validated by TypeScript and its production build, not by a request test because it exposes no route. The Next.js shell is validated by its production build, not by product UI or accessibility tests because it contains no accepted merchant workflow. PostgreSQL, migration execution, Testcontainers, repository integration, transaction, concurrency, cross-Business, browser-journey, mobile, backup, and provider tests are explicitly deferred.

## Domain Tests

Domain tests should cover framework-independent rules:

- Sale total calculation.
- Paid, partially paid, and unpaid sale states.
- Partial and full payments.
- Customer outstanding balance derivation.
- Automatic payment allocation by selected sale or oldest outstanding sale.
- Rejection of overpayment when customer credit is outside the MVP.
- Payment history preservation.
- Payment reversal effects on balances and reports.
- Expense totals.
- Money representation and rounding boundaries.
- Sale and expense cancellation behavior.
- Business-local date reporting boundaries.

## API Integration Tests

API tests should cover application behavior across authentication, authorization, persistence, and domain orchestration:

- `/api/v1` method, media-type, status, success-envelope, RFC 9457, and compatibility semantics.
- OpenAPI 3.2 and runtime Zod conformance without treating either as domain authority.
- Same-origin opaque-cookie session exchange, Secure/HttpOnly/SameSite requirements, rotation, Origin/Referer checks, synchronizer CSRF, Fetch Metadata fallback, and CORS denial by default.
- Explicit Business path scope plus current server-side User, Business, Membership, state, capability, and child-reference validation.
- `Idempotency-Key` scope, canonical intent comparison, first execution, safe replay metadata, changed-intent rejection, in-progress result, and cross-Business isolation.
- Outcome recovery for committed, rejected, authoritative no-commit, and still-unknown results; safe retry only after no-commit.
- ETag/If-Match, 428/412, lifecycle 409, authoritative recalculation conflict, and multi-record concurrency revalidation.
- Cursor pagination stability, allow-listed filters/sorts, empty results, projection freshness, canonical disagreement, and no false zero.
- `Cache-Control: no-store`, Business-switch clearing, discarded in-flight old-Business responses, browser-back protection, and shared-device clearing.
- Stable mapping for all 26 Cycle 007 application error categories, field paths, retry classification, commit state, fresh-state guidance, and non-disclosing fallback.
- Response allow-listing, sensitive-data omission, correlation redaction, and separation of machine codes from Brazilian Portuguese copy.

- Mandatory tenant scope on every tenant-owned repository or persistence operation.
- Cross-tenant direct-record, child-reference, aggregate, and export denial.
- Business-scoped access to customers, products, sales, payments, expenses, photos, and reports.
- Rejection of cross-business access.
- Rejection of cross-business references such as payment allocation to another business's sale.
- Sale recording and payment recording flows.
- Manual payment request creation or sharing metadata once specified.
- Audit event creation for financial and membership changes.
- Suspended or removed membership access denial.
- Signup and email verification flows.
- Atomic first-owner Business bootstrap.
- Duplicate signup and bootstrap idempotency.
- Sign-in outcomes for one, multiple, none, suspended, removed, deactivated, and invited membership states.
- Tenant selection, switching, and remembered-tenant revalidation.
- Invitation lifecycle, replay rejection, expiration, cancellation, and concurrent acceptance.
- Membership suspension, removal, reactivation, and role changes.
- Immediate or bounded authorization revocation after membership and Business-status changes.
- Last-owner invariant under normal and concurrent changes.
- Business deactivation access denial.
- Session expiration, sign-out, credential reset, and revocation.
- Audit-event generation without secret leakage.
- Session revocation state after credential reset, membership changes, capability reduction, and Business deactivation.
- Duplicate command behavior for bootstrap, Sale recording, Payment recording, invitation acceptance, credential recovery, and exports.
- New and returning User entry into the critical journey.
- Business selection, switching, and tenant-state clearing on Business change.
- Minimum readiness before first Sale.
- Customer-required debt and Customer creation during Sale.
- Anonymous fully paid Sale.
- Payment Request not affecting debt.
- Expense permission differences across Owner, Manager, and Staff.

## Persistence and Consistency Tests

Future persistence tests should cover:

- Migration-from-zero, previous-version upgrade, schema-history drift, expand-and-contract compatibility, backfill resumability, constraint validation, and migration lock-risk evidence.
- PostgreSQL UUIDv7 generation, `bigint`/date/UUID row mapping, and prohibition of JavaScript `number` financial authority.
- Composite tenant foreign keys for every Business-owned parent/child relationship and non-disclosing constraint-error translation.
- PostgreSQL runtime/migration/repair role separation, restricted financial deletion, trusted schema resolution, and the explicit absence of RLS guarantees.
- Durable `command_executions` and `command_outcomes`: claim, lease, committed/rejected/no-commit, canonical root linkage, retention, and cleanup safety.
- Crash boundaries before canonical commit, after canonical commit/before response, and during outcome recovery; only persisted no-commit permits resubmission.
- Transactional external-effect intent, dispatcher claim, attempt history, duplicate/unknown delivery, and no Payment/debt effect.
- Projection change ordering, per-Business checkpoints, stale/unavailable states, canonical disagreement, rebuild, and reconciliation.
- Session, CSRF, verification, recovery, and Invitation token digests, rotation, expiry, revocation, and plaintext-secret exclusion.
- Backup/PITR restore exercises preserving command outcomes, audit, local dates, tenant links, financial formulas, and projection rebuildability.

- Atomic first-owner bootstrap and bootstrap idempotency.
- Last-active-Owner invariant under concurrent membership changes.
- Invitation uniqueness, acceptance, replay rejection, and concurrent acceptance.
- Membership state transitions and authorization revalidation.
- Sale and Sale Item atomicity.
- Sale Item snapshot preservation after Product edits.
- Payment and Allocation atomicity.
- Overpayment rejection.
- Concurrent allocation against the same outstanding Sale.
- Duplicate Payment prevention after retry or timeout.
- Payment reversal and Sale cancellation effects on balances.
- Expense correction through cancellation/replacement when financial meaning changes.
- Financial report formulas that keep Sales recorded distinct from Payments received.
- Derived projection rebuild when cached balances disagree with canonical records.
- Money boundaries, zero/negative rejection, overflow protection, and rounding behavior.
- Business-local date and historical time-zone preservation.
- Audit creation and exclusion of secrets or unnecessary personal and financial payloads.
- Deactivation, retention, and ordinary hard-deletion restrictions.
- Backup/restore integrity checks for tenant isolation, last Owner, and financial balances.
- Unknown commit outcomes and safe retry behavior.
- External side-effect retry behavior after committed transactions.
- Future provider callback authentication, tenant mapping, and deduplication.
- Unknown commit outcome recovery for Sale and Payment commands.
- Cancellation/allocation race behavior.
- Later Payment allocation order across multiple Sales.
- Daily-result formulas and Sale-versus-Payment distinction.
- Secret and personal-data exclusion from analytics, diagnostics, audit, and logs.
- Logical record classification into global identity, tenant authorization, tenant operations, session/security state, audit evidence, idempotency evidence, external side-effect attempts, and derived projections.
- Repository boundaries that require validated Business scope for every tenant-owned read, write, aggregate, export, and projection rebuild.
- Conceptual uniqueness versus duplicate-warning behavior versus idempotency behavior.
- Reference integrity for same-Business parent/child relationships.
- Customer phone/email remaining optional and non-unique.
- Debt and Sale paid status deriving from canonical Sales, Sale Items, Payments, and Allocations.
- Daily result derived from Payments received minus Expenses with no double-counting.
- Backup, restore, repair, and projection rebuilding preserving logical identities, tenant isolation, audit evidence, and financial history.
- Authorization-context construction at the application boundary.
- Active Business validation for every tenant-owned command and query.
- Stable application error categories and retry guidance.
- Unknown-outcome recovery for duplicate-prone commands.
- Different-intent idempotency rejection.
- Server-authoritative arithmetic for Sale totals, Payment Allocations, and daily result.
- Sensitive-query field filtering by capability.
- Application-boundary rejection of cross-tenant identifiers without existence leakage.
- External-side-effect status that does not invalidate valid authoritative commits.
- Web/mobile semantic consistency for shared queries and supporting mobile behavior.

## UX, Accessibility, and Usability Tests

Future UX validation should cover:

- Navigation comprehension, active-Business visibility, single/multiple/remembered Business behavior, Business switching, and removal of previous-tenant data.
- Session expiration, shared-device sign-out, lost-device revocation, Membership/capability change, and Business deactivation while a view or confirmation is active.
- First-Business onboarding, minimum readiness, duplicate protection, timeout, unknown-outcome recovery, and committed-result rediscovery.
- Customer creation, optional and non-unique phone/email, same-name warning timing, inline creation, preserved Sale context, search, deactivation, and sensitive-field minimization.
- Product search, ad hoc Sale Items, historical snapshot comprehension, Product rename/deactivation conflict, and the absence of inventory behavior.
- Fully paid anonymous and identified Sales, partial/unpaid Customer requirements, preview arithmetic, server-authoritative recalculation, financial review, named confirmation, duplicate suppression, safe replay, different-intent rejection, unknown outcomes, and result recovery.
- Later Payment destination comprehension, selected-Sale-first and oldest-debt ordering, multi-Sale coverage, overpayment, concurrent Payment conflict, Payment reversal, and Sale-cancellation race.
- Payment Request creation, delivery pending/failure/retry, and clear distinction from received Payment and debt reduction.
- Expense permission, recording, correction, cancellation, and daily-result consequence.
- Daily-result comprehension, Sales-versus-Payments distinction, Allocation and Payment Request exclusion, older-debt Payment date, and projection stale/unavailable/disagreement handling.
- Invitation lifecycle, last-active-Owner protection, permission-sensitive visibility, generic cross-tenant errors, and preservation of safe historical references.
- Loading, empty, success, rejection, conflict, degraded, read-only, deactivated, unknown, and recovered states with actionable Brazilian Portuguese copy.
- Form-state preservation, field-error association, error summary, focus movement, keyboard-only use, screen-reader navigation, status announcements, contrast, non-color status, text resize/reflow, touch targets, reduced motion, and responsive table/list alternatives.
- Web/mobile report semantic consistency, mobile supporting-scope boundaries, Business switching, sensitive-field filtering, and deep-link authorization denial.
- Merchant terminology, low-digital-literacy moderated sessions, financial-action confidence, accidental duplicate prevention, and comprehension of recorded, received, sent, failed, and unknown outcomes.
- Global-frame reading order, active-Business persistence, capability-sensitive destinations, and removal of previous-Business content before target-Business loading.
- Screen-inventory coverage and transition consistency for all 52 accepted Cycle 008 walkthroughs.
- Distinct preparation, review, confirming, committing, result, safe-replay, conflict, unknown, and recovered-result surfaces for financial actions.
- Preservation of Sale and other entered work across correctable validation, conflict, reauthentication, and authoritative-recovery paths when safe.
- Primary-action clarity, named financial confirmation, withheld duplicate activation, and safe retry only after authoritative no-commit recovery.
- Low-fidelity content order, focus destination, live-announcement priority, non-color status, and responsive rearrangement for desktop, tablet, and mobile browser.
- Report structures that retain separate Sales, Payments, debt, Requests, Expenses, and daily-result meanings in tables and alternative list presentations.
- Merchant comprehension of the proposed Brazilian Portuguese screen copy, including safe replay, unknown outcome, delivery failure, projection freshness, cancellation, and reversal.

Automated accessibility tooling is selected, but the target-standard version, usability sample, assistive-technology/device matrix, manual process, and acceptance thresholds remain open. This documentation cycle does not claim an accessibility audit, user study, device QA, or conformance result.

## Web Tests

Web tests should focus on critical merchant workflows:

- Register customer.
- Register product.
- Record an ad hoc item without first creating a product.
- Record a paid sale.
- Record an unpaid sale.
- Record a partial payment.
- Create a customer during an unpaid or partially paid sale.
- Attempt and reject an overpayment.
- View "Quem está devendo".
- View practical report totals such as "Quanto entrou", "Quanto saiu", and "Quanto sobrou este mês".
- Sign in, select a Business, switch Business, and sign out on a shared device.
- Accept an invitation and enter the correct Business context.
- Handle stale state, duplicate submit, temporary failure, unknown outcome, and reauthentication during the journey.

Accessibility checks should include keyboard behavior, labels, contrast, and responsive layout review once UI exists.

## Mobile Tests

Mobile tests should stay aligned with the supporting mobile scope:

- Take or select product photo.
- Upload product photo.
- Send or prepare a collection message.
- View essential reports.
- Maintain the same tenant-context rules as web for sign-in, deep links, switching, and inaccessible Businesses.
- Confirm web/mobile report consistency for the same active Business and capabilities.

Mobile Sale, Payment, Expense, and correction recording are future product-validation questions and should not be tested as accepted release-one behavior until specified.

Device QA must not be claimed unless run on the relevant simulator, emulator, or physical device.

## End-to-End Tests

Critical E2E flows should validate realistic paths across UI, API, and persistence:

- Owner creates a business and authorized access.
- Owner signs up, verifies identity, creates first Business, and receives initial Owner access.
- Returning user with multiple Businesses selects one and switches safely.
- Owner invites Staff, Staff accepts, then loses access after suspension.
- Merchant registers a customer and product.
- Merchant records an unpaid sale.
- Merchant sends a manual collection message.
- Merchant records a partial payment.
- Merchant reverses an incorrect payment and sees the corrected balance.
- Merchant verifies the updated customer history and outstanding balance.
- Merchant records an expense and checks practical report totals.
- Merchant records the first fully paid Sale without a Product catalog.
- Merchant creates a Customer during an unpaid Sale and later records Payment.
- Merchant sends or prepares a Payment Request and verifies that debt remains unchanged.
- Staff is denied expense-sensitive daily result.
- Business or Membership invalidation blocks confirmation.
- Cross-tenant Customer or Sale identifier is denied without existence leakage.

## Documentation Validation

For documentation-only cycles, validation should include:

- Required file existence.
- Internal Markdown links where practical.
- Search for contradictory MVP claims.
- Search for unfinished draft markers such as template words.
- Terminology consistency review.
- Git diff and status inspection.
- Confirmation that no application implementation or dependency installation was introduced.

## Session Resolution Test Boundary

Cycle 019 implements the first session test baseline. Fixed synthetic evidence and time prove canonical credential parsing, deterministic HMAC derivation, no-database short-circuit for absent evidence, application input propagation, anonymous miss behavior, and infrastructure-failure propagation. Existing Cycle 016 contract and mapper tests remain regression evidence, and the public transport response remains unchanged.

The Cycle 019 database gate uses a real PostgreSQL 18.4 Testcontainer pinned by immutable digest. It migrates from zero, reruns the migration wrapper, and verifies history/checksum evidence, UUIDv7 generation, table/column inventory, digest uniqueness and length, lifecycle constraints, foreign keys, active/revoked/expired/equal-expiry resolution, nullable and deactivated selected-Business context, disabled-User handling, parameterized lookup, and infrastructure-failure separation. Mocked SQL does not satisfy this gate. No Membership table or authorization join exists in the resolver.

Idle/sliding expiry, CSRF, issuance, login/logout, cookie integration, all-device revocation, retention cleanup, HTTP routes, protected-operation authorization, browser behavior, and user testing remain later test categories.

Cycle 020 adds focused server-composition tests above the existing application and persistence boundaries. They prove absent/malformed no-resolution behavior, canonical lookup and exact time propagation, stable anonymous/authenticated mapping, optional selected-Business context, deterministic non-mutation, construction-time HMAC validation, redacted malformed handling, and propagation of crypto, application/persistence, and mapping failures. These tests use the actual derivation, application use case, and transport mapper with a narrow deterministic resolver double.

The existing 12-test PostgreSQL 18.4 suite remains the real database gate for migrations, lifecycle predicates, and adapter failure. A second full composition-to-container test is not introduced because Testcontainers and `pg` are intentionally persistence-owned; adding them to server tests or importing server composition from persistence would violate the no-new-dependency and dependency-direction rules while duplicating the already-proven database matrix. Cycle 020 therefore claims real PostgreSQL regression execution, not a new full composition-to-container assertion.

## HTTP Session Inspection Test Baseline

Cycle 022 implements the Cycle 021 test boundary. Server unit and Fastify injection tests prove exact production/local cookie names, identity decoding, raw/parsed equality, missing/malformed/duplicate normalization without persistence, strict HMAC configuration failure before application construction, one handler-entry time capture, stable anonymous/authenticated bodies, selected-Business context, `no-store`, no cookie write, and safe `INTERNAL_FAILURE` propagation without raw evidence or secret leakage.

The official Fastify cookie parser may be used only with identity decoding plus a narrow raw-header duplicate check. Vitest fake timers are sufficient for deterministic request time; no generic clock or mocking framework is justified.

The focused real PostgreSQL 18.4 HTTP suite belongs at the outer server composition edge. It applies the existing migrations and proves one active authenticated response, one unknown anonymous response, one revoked anonymous response, and one closed-pool internal failure through Fastify injection. It complements rather than duplicates the 12-case persistence lifecycle matrix. Its parameterized fixture SQL is allowed only in filename-scoped server PostgreSQL integration tests, never server production source.

## Sign-In and Session Issuance Test Plan

Cycle 023 adds specification authority only. A future implementation must add focused contract/application/server/persistence evidence without duplicating the existing resolution lifecycle matrix:

- strict ID00/ID04 request, success, and Problem Details schemas, including unknown keys, field limits, media type, and stable generic failures;
- email normalization ownership and password boundary behavior without fixture values entering logs, errors, or snapshots;
- verified, invalid, unverified, disabled, unknown, rate-limited, and infrastructure-failure outcomes through deterministic application ports;
- Argon2id verification against synthetic PHC fixtures, equivalent dummy work for unknown identities, parameter parsing, and fail-closed decoder/runtime/database behavior;
- session and CSRF credential shape plus independent CSPRNG invocation, without brittle assertions over random bytes;
- exact domain-separated digest known-answer tests and proof that raw password/session/CSRF evidence never reaches persistence;
- one explicit issuance instant, fixed 12-hour expiry, equality-expired compatibility, fresh selected-Business absence, and transaction rollback behavior;
- fixation resistance by replacing only the prior presented session after commit, plus no cookie or authenticated CSRF result on any failed issuance;
- exact production/local cookie name and attributes, `Max-Age=43200`, matching `Expires`, `no-store`, and no credential leakage;
- pre-session CSRF expiry/consumption and authenticated CSRF binding, rotation, session invalidation, origin checks, and safe rejection;
- real PostgreSQL migration/transaction coverage for verifier, challenge, session-CSRF, and aggregate rate-limit state, with container cleanup;
- explicit proof that successful authentication does not query or establish Membership, capability, or Business authorization.

Browser journey, merchant usability, password recovery, logout, protected product operations, alternate identity providers, mobile authentication, and deployment abuse controls remain later test categories. Randomness quality is established by use of the accepted platform CSPRNG and boundary assertions, not statistical unit tests.

Cycle 024 implements the inner portion of this plan. Contract tests cover ID00 canonical/additive responses, strict ID04 input, exact ASCII email and normalized-password boundaries, canonical `p1`/`c1` evidence, authenticated safe output, stable generic failure, JSON serialization, determinism, non-mutation, and forbidden server-only exports. Application tests cover deterministic full-address lowercase normalization, unsupported ASCII/Unicode rejection, all three verifier outcomes, infrastructure-failure propagation, digest-only issuance inputs, selected-Business absence, explicit times, and issuance failure propagation.

These tests prove boundary behavior only. They do not prove transaction atomicity, CSPRNG quality, HMAC derivation, challenge consumption, session insertion, rate limiting, cookie writing, CSRF enforcement, HTTP behavior, authorization, or product usability. Those gates remain with their future infrastructure and transport owners.

Cycle 025 adds a real PostgreSQL 18.4 credential suite at the persistence boundary. It migrates from zero and proves the exact hash-only table, restrictive User ownership, one row per User, chronology/version/Argon2id constraints, real Argon2id PHC verification, normalized-email lookup, verified/unverified/invalid outcomes, actual fixed-dummy work for unknown/missing/disabled cases, malformed row rejection, verifier failure, and closed-pool failure. It asserts control flow rather than wall-clock equivalence and makes no constant-time claim. Existing contract/application/server/session-persistence suites remain regression gates; no sign-in HTTP, issuance transaction, cookie, CSRF, or merchant journey is tested or claimed.

Cycle 026 adds focused application and server tests for the fixed ten-minute challenge lifetime, explicit-time cloning, failure propagation, canonical `p1` parsing, and the exact `sem-caderno/session-csrf/v1` HMAC known answer. Its real PostgreSQL 18.4 suite proves the exact digest-only table, ordered migration/checksum execution, lifecycle and uniqueness constraints, creation, active single consumption, uniform unknown/expired/equal-expiry/replay rejection, one winner across eight concurrent consumers, and closed-pool failure. These are persistence-layer challenge guarantees only; CSPRNG generation, ID00/ID04 HTTP behavior, origin validation, complete sign-in transaction rollback, authenticated CSRF, rate limiting, cookies, and merchant behavior remain unclaimed.

Cycle 027 authorizes the next rate-limit test matrix without adding tests. Application tests must prove explicit valid-time handling, defensive copying, allowed/limited decisions, exact retry time, post-record semantics, idempotent clear, and failure propagation. Server known-answer tests must prove exact normalized-email HMAC framing, canonical output, domain/identity separation, configuration failure, and no key/email leakage. Real PostgreSQL tests must prove the exact aggregate-only schema, first/in-window/tenth/saturated/expired transitions, equality at 15 minutes, exact retention, known/unknown parity, clear and absent clear, out-of-order-time rejection, closed-pool failure, no lost updates, capped concurrent threshold crossing, both forced clear/record orderings, and bounded cleanup. They must not use wall-clock timing, per-attempt rows, or mocks as integration evidence.

Cycle 028 implements that matrix with two application contract tests, three independent server HMAC tests, and thirteen real PostgreSQL 18.4 tests. Fixed synthetic instants prove the half-open window and exact retention boundaries. Concurrent adapter calls prove absent creation, saturation at 10, and expired replacement; transaction-held advisory locks force both check/threshold-record and clear/record orderings instead of assuming scheduler order. Cleanup assertions are isolated per test and bounded by row count. These tests prove persistence behavior only, not complete sign-in classification, issuance atomicity, HTTP, cookies, deployment scheduling, or merchant behavior.

Cycle 029 adds focused server tests for the independent generation boundary. A deterministic queued byte source proves two separate 32-byte reads, exact `v1`/`c1` encoding, fixed HMAC known answers, purpose separation even when the injected bytes match, key copying, canonical full-length output, malformed-version rejection, and failure redaction. One shape-only call exercises the default Node CSPRNG without statistical or exact-random assertions. These tests do not claim persistence, collision retry, atomic issuance, HTTP, cookie, or merchant behavior.

Cycle 030 authority closure adds application contract tests only. They prove that issuance requires the purpose-branded rate account key, returns a discriminated committed result or the exact User/challenge/collision expected outcomes, keeps all purpose brands distinct, and preserves promise rejection for infrastructure failure. The subsequent persistence cycle must add real PostgreSQL 18.4 migration-from-six coverage for the nullable authenticated-CSRF pair, partial uniqueness, minimal audit table, and migration compatibility with historical null-pair sessions.

That persistence suite must also prove one-transaction commit and rollback across User revalidation, single challenge consumption, exact prior-session revocation, new digest-only session insertion, one audit insert, and rate-row clear. It must force challenge/User rejection, both named digest collisions, unrelated constraint/database failure, rollback failure where observable, one-winner challenge races, prior-session no-op behavior, and rate record/clear serialization. Legacy null-pair sessions must remain inspectable while unsafe CSRF and replenishment reject; no test may fabricate historical raw evidence or represent mocked transactions as atomicity proof.

Cycle 031 adds seventeen focused issuance tests and raises the real-PostgreSQL persistence suite to sixty tests. PostgreSQL 18.4 evidence covers migration-from-six compatibility, nullable all-or-complete authenticated-CSRF state, exact minimal audit shape, successful all-step commit, expected User/challenge rollback, both named collision results, unrelated uniqueness failure, late-stage rollback, absent prior/rate no-ops, one-winner challenge concurrency, and both forced issuance-clear/rate-record orderings. A narrow fake-client test covers otherwise impractical rollback-failure signaling only; it is not used as atomicity proof. The server-owned three-attempt collision coordinator, unsafe-operation CSRF rejection, and HTTP behavior remain with their later executable boundaries.

Cycle 032 adds twenty focused server orchestration tests. They prove rate check before verifier work, current-proof classification at the tenth failure, verified/unverified/invalid handling, no direct rate clear, exact account-key/time/expiry inputs, safe User/challenge mapping, two-value regeneration across three attempts, collision exhaustion, infrastructure propagation, key copying, non-mutation, and rejection of unknown verifier, rate, or issuance runtime outcomes without retry. Existing real PostgreSQL suites remain the integration evidence for verifier, rate, challenge, issuance, rollback, and concurrency behavior; the coordinator tests use narrow ports and do not relabel mocks as database evidence. ID00/ID04 HTTP, cookie, Origin, and authenticated-operation CSRF behavior remain unclaimed.
