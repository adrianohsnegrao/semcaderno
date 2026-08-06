# Application Contracts Specification

## 1. Status and Metadata

Status: Accepted for planning.

Cycle: 007 - API and Application Contract Specification.

Task: 001 - Specify Application Commands, Queries, Authorization Context, and Error Contracts for the Critical Journey.

Date: 2026-07-31.

Scope: documentation and architecture planning only.

Implementation status: no application code, transport API, DTO, persistence schema, UI, provider integration, or automated test is introduced by this specification.

## 2. Context

Cycles 002 through 006 define the domain, tenancy, onboarding, persistence, first critical user journey, and logical data model for Sem Caderno. Cycle 007 defines the application boundary that future web, mobile, transport adapters, persistence adapters, background work, and tests will use to express business intent.

This document intentionally describes semantic commands and queries, not HTTP routes, GraphQL operations, JSON payloads, framework handlers, ORM models, database tables, or screen layouts.

Sem Caderno remains a digital replacement for a merchant notebook. Application contracts must therefore protect tenant isolation and financial trust while keeping user-visible behavior understandable for merchants with low technical familiarity.

## 3. Goals

- Define implementation-independent commands and queries for the critical journey.
- Define caller, authentication, active Business, Membership, and capability context.
- Define validation, authorization, idempotency, concurrency, retry, and unknown-outcome semantics.
- Define stable error categories without mapping them to transport status codes.
- Preserve canonical financial authority, rebuildable projections, audit evidence, and post-commit side-effect boundaries.
- Align web and mobile semantics while preserving web as the complete operational client and mobile as supporting.
- Provide future test obligations for application, contract, transport, UX, persistence, and end-to-end cycles.

## 4. Non-Goals

- No application code.
- No package manager, dependency, package manifest, or workspace setup.
- No programming language or framework choice.
- No HTTP route, HTTP method, HTTP status code, GraphQL type, RPC message, DTO, JSON property, serialization format, controller, resolver, or middleware.
- No authentication provider, session library, credential mechanism, cookie format, token format, or session storage implementation.
- No SQL, table, column, index, constraint, trigger, migration, ORM model, identifier format, transaction isolation level, or lock syntax.
- No repository implementation or concrete method signature.
- No UI screen, wireframe, component, navigation, or design-system token.
- No report implementation, projection storage, cache, queue, worker, outbox, backup script, or audit infrastructure.
- No Pix, WhatsApp, email, SMS, analytics, object storage, payment, or cloud provider integration.
- No billing, subscription, inventory, supplier, fiscal document, bookkeeping, DRE, event sourcing, CQRS, microservice, distributed transaction, or MVP expansion.

## 5. Terminology

- Command: an application operation that asks the system to authoritatively change state.
- Query: an application operation that reads canonical or projected information without authoritatively changing domain state.
- Application boundary: the server-authoritative semantic layer that validates caller context, invokes domain rules, coordinates persistence boundaries, records audit/idempotency evidence, and requests post-commit side effects.
- Authorization context: server-derived context containing authenticated User, session validity, active Business, active Membership, Business state, Membership state, and effective capabilities.
- Active Business context: the Business selected for the current tenant-owned operation after server-side validation.
- Command intent: the business meaning of a command, including actor, Business, target records, amounts, dates, and requested outcome.
- Preconditions: current-state requirements that must be true before a command may commit.
- Domain validation: business-rule validation after authorization and before commit.
- Conflict: a state change or concurrent action invalidated the command assumptions.
- Idempotent replay: a repeat of the same command identity with equivalent intent that returns the prior committed or rejected outcome without duplicating business facts.
- Unknown outcome: the caller does not know whether a prior command committed and must rediscover the authoritative result.
- Projection result: a read result derived from canonical records and rebuildable if inconsistent.
- Audit consequence: required accountability evidence for sensitive or financial actions.
- External side-effect request: post-commit intent to send, notify, export, store, or call a provider without making that external result the internal financial authority.

## 6. Confirmed Inherited Decisions

- Spec-Driven Development and traceable cycles are mandatory.
- Sem Caderno is a notebook replacement, not a smaller ERP.
- The MVP remains deliberately narrow.
- Web is the primary operational client; mobile is supporting.
- Business is the tenant boundary and tenant root.
- Global User identity is separate from tenant-owned Membership and operational data.
- Every tenant-owned record belongs to exactly one Business.
- Tenant access requires an authenticated, verified User with active Membership, active Business, and required capability in the same Business.
- Business identifiers, URLs, deep links, cached state, remembered tenant context, and tenant filters alone are never authorization.
- Owner, Manager, and Staff are capability groups; Manager release-one exposure requires merchant validation.
- Staff does not receive expense, sensitive-report, export, member-management, Business-setting, financial-correction, or deactivation capabilities by default.
- Suspended and removed Memberships do not authorize operations but remain historically referenceable.
- Every active Business must retain at least one active Owner.
- Business deactivation blocks ordinary tenant operations and requires affected sessions to revoke or revalidate.
- PostgreSQL is the accepted database direction; Row-Level Security remains deferred and not implemented.
- BRL integer minor units are authoritative; binary floating point is forbidden for financial authority.
- Fully paid anonymous counter Sales are accepted; partial and unpaid Sales require a Customer.
- Customer display name is required; Customer phone and email are optional and not conceptually unique.
- Customer may be created during Sale recording.
- Product catalog setup is optional before Sale; ad hoc Sale Items are accepted.
- Sale Items preserve historical commercial snapshots; Product or Customer edits do not rewrite historical financial facts.
- Payment is the canonical cash-receipt fact.
- Payment Allocation attributes Payment to debt and is not another receipt.
- Allocation applies selected Sale first, then oldest eligible outstanding Sales for the same Business and Customer.
- Cross-Business and cross-Customer Allocation is rejected.
- Overpayment and customer credit are outside the MVP.
- Payment Requests do not reduce debt and do not prove Payment.
- Corrections preserve history through descriptive edit, cancellation, reversal, replacement, correcting records, or rejected unsafe operations.
- Financial records are not hard-deleted during ordinary operation.
- Sales recorded and Payments received are distinct financial events.
- Daily result is `paymentsReceivedTodayMinor - expensesTodayMinor` and is not profit, DRE, bookkeeping, or formal accounting.
- Canonical records are authoritative; derived balances, statuses, reports, and projections are rebuildable.
- Sensitive duplicate-prone commands require idempotency and replay protection.
- External side effects occur after authoritative commit or through equivalent retryable post-commit handling.
- Audit history is required, but the application is not event-sourced.

## 7. Contract Design Principles

### 7.1 Current-session resolution refinement

Cycle 018 refines ID05 without changing its public anonymous/authenticated result. The future `InspectCurrentSession` use case receives explicit optional session lookup evidence plus one evaluation instant; a parameterized application-owned resolution port replaces the Cycle 016 no-input port. The application receives neither cookies nor raw credentials, and database failure propagates instead of becoming anonymous.

Session resolution authenticates only a current global User/session. Its optional selected-Business identifier is a remembered candidate, not an active authorization context. ID05 does not join Membership or Business to grant access. Accessible-Business selection and every tenant-owned operation independently revalidate verified identity where required, active Business, active Membership, capabilities, lifecycle, and same-Business references. See the [Session Credential Resolution and Lifecycle Specification](session-credential-resolution-lifecycle-specification.md).

- Application contracts express business intent, not transport mechanics.
- Commands request authoritative state changes; queries read information.
- Commands and queries never bypass tenant or authorization validation.
- Client-provided Business context is contextual input only.
- The application boundary revalidates User, session, Business, Membership, state, and capability for tenant-owned operations.
- Tenant-owned identifiers are resolved only inside validated Business scope.
- Canonical records remain financial authority; read models and projections remain subordinate.
- Client-calculated totals are previews; server-side calculation is authoritative.
- Idempotency is distinct from validation, business uniqueness, and concurrency control.
- Audit evidence is distinct from ordinary logs, diagnostics, analytics, and event sourcing.
- External side effects remain outside authoritative financial commits.
- Error categories guide safe client behavior without leaking cross-tenant existence or sensitive internals.
- Web and mobile use the same semantic contracts even when mobile supports fewer actions.
- Contract names in this document are conceptual and do not require class names, functions, URLs, or message names.

## 8. Application Boundary and Authority

The application boundary is authoritative for:

- Building and validating authorization context.
- Accepting command intent only after the caller is authorized.
- Recalculating Sale totals, Payment Allocation amounts, balances, and report numbers from canonical records.
- Coordinating aggregate and consistency boundaries.
- Recording idempotency evidence before a duplicate-prone command can be considered safe to retry.
- Recording audit evidence for sensitive outcomes.
- Returning stable error categories.
- Requesting post-commit side effects after an authoritative commit.

The application boundary is not:

- A transport protocol.
- A database schema.
- A UI flow.
- A provider SDK boundary.
- A source of financial truth independent from canonical records.

Client state, local cache, URL parameters, device clocks, previews, remembered Business context, analytics, external delivery status, or provider callbacks cannot become persistence or financial authority.

## 9. Caller and Authorization Context

Required conceptual context for tenant-owned operations:

- Authenticated User identity.
- Session or authentication evidence that is valid at the time of the operation.
- Requested Business context, treated as untrusted input until validated.
- Server-validated active Business.
- Current active Membership for the same User and Business.
- Current Business state.
- Current Membership state.
- Effective capabilities derived server-side from the Membership.
- Client category, such as web or mobile, only where operationally relevant.
- Request correlation reference for diagnostics and audit.
- Idempotency identity for commands that require it.

Rules:

- Clients cannot assert roles, capability groups, audit actors, Business ownership, lifecycle states, or financial totals.
- A Business identifier does not prove access.
- Tenant-owned identifiers must be resolved within the validated Business context.
- Active Business switching replaces tenant-scoped application context and requires client tenant state to be cleared or reloaded.
- Cached client authorization is never authoritative.
- Membership suspension, removal, capability reduction, Business deactivation, credential reset, or compromise response must revoke or force revalidation before continuing.
- In-flight commands revalidate security-sensitive state inside the authoritative boundary before commit.
- Historical User or Membership references explain past actions but never grant current access.
- Cross-tenant failures should use not-found-within-authorized-scope or access-denied semantics without confirming another Business owns the target.
- Support or administrative access remains deferred and must not be implied by ordinary contracts.

## 10. Active Business Context

Active Business context may be selected automatically, remembered, or explicitly chosen, but it only becomes usable after server validation.

Selection rules:

- If the User has exactly one active Membership in an active Business, the application may select it automatically after validation.
- If the User has multiple active Businesses, a remembered Business may be used only after validation; otherwise explicit selection is required.
- If the remembered Business is suspended, removed, inaccessible, or deactivated, it is discarded and tenant-specific state is cleared.
- Selecting a Business does not permanently authorize future operations. Each tenant-owned command or query revalidates current Business, Membership, and capability.
- URLs or deep links containing Business context are validated like any other untrusted input.
- Business switching must clear or replace tenant-local Customers, Products, Sales, Payments, reports, drafts, and cached authorization.

## 11. Command Contract Template

Every command specification should define:

- Intent: business action requested.
- Acting User: authenticated and verified where required.
- Active Business: required for tenant-owned commands unless the command is global bootstrap or identity work.
- Required capability.
- Logical command identity when idempotency is required.
- Intent equivalence for retries.
- Required information.
- Optional information.
- Current-state preconditions.
- Validation order and non-leakage requirements.
- Participating consistency boundary.
- Canonical facts produced or changed.
- Derived outcomes returned.
- Audit evidence.
- Idempotency evidence.
- Post-commit side effects.
- Success result.
- Safe replay result.
- Rejection result.
- Conflict result.
- Unknown-outcome recovery.
- Sensitive-data rules.
- Future test obligations.

This template does not define handler signatures, function names, DTOs, route shapes, or storage structure.

## 12. Query Contract Template

Every query specification should define:

- Purpose.
- Acting User.
- Active Business when tenant-owned information is read.
- Required capability.
- Canonical or projected source.
- Required filters.
- Optional filters.
- Business-local date behavior.
- Sorting semantics.
- Pagination expectations without choosing offset, cursor, or page-number mechanics.
- Projection freshness expectations.
- Empty-result behavior.
- Sensitive-field visibility.
- Cross-tenant behavior.
- Deactivated, cancelled, reversed, or anonymized record treatment.
- Error categories.
- Future test obligations.

Queries must not authoritatively mutate domain state. A later implementation may record safe operational telemetry for a query, but analytics and logs are not domain facts.

## 13. Error Taxonomy

| Error category | Meaning | Retry guidance | Fresh state | Audit | Leakage rule | Commit state |
| --- | --- | --- | --- | --- | --- | --- |
| Unauthenticated | No valid authenticated User is present. | Retry after sign-in. | Yes. | Security telemetry. | No tenant detail. | No commit. |
| Session invalid or revoked | Session cannot continue. | Reauthenticate. | Yes. | Security audit when sensitive. | No tenant detail. | No commit. |
| Email not verified | User cannot perform active Business operation. | Verify email first. | Yes. | Optional security audit. | No invitation detail unless safe. | No commit. |
| Business context required | Tenant-owned operation lacks Business context. | Select Business. | Yes. | Usually no. | No resource detail. | No commit. |
| Business unavailable or inactive | Business is not usable for ordinary operations. | Re-read Businesses or follow deactivation guidance. | Yes. | Yes for sensitive attempts. | Avoid cross-tenant detail. | No commit. |
| Membership unavailable or inactive | No active Membership for the Business. | Re-read accessible Businesses. | Yes. | Yes for sensitive attempts. | Avoid existence disclosure. | No commit. |
| Capability denied | Active Membership lacks capability. | User correction usually requires another authorized actor. | Optional. | Yes for sensitive attempts. | Do not reveal forbidden target detail. | No commit. |
| Resource not found within authorized scope | Target is absent or inaccessible in the validated Business. | Re-read list or search. | Yes. | Security audit when suspicious. | Must hide cross-tenant existence. | No commit. |
| Validation failed | Input violates shape or business rules. | Correct input. | Not always. | Usually no, unless sensitive. | Return safe field-level meaning only. | No commit. |
| State conflict | Target lifecycle changed, such as cancelled Sale. | Re-read and retry if still valid. | Yes. | Sometimes. | No cross-tenant detail. | No commit. |
| Concurrent modification conflict | Another command changed an invariant. | Re-read; retry with new intent if appropriate. | Yes. | Sometimes. | No cross-tenant detail. | No commit for rejected command. |
| Duplicate command safely replayed | Same command identity and equivalent intent already completed. | No retry needed. | Optional. | Correlate to original. | Same scope only. | Prior commit returned. |
| Idempotency identity reused with different intent | Same command identity has different business meaning. | Use a new reviewed command. | Yes. | Yes for financial/sensitive. | No extra target detail. | No new commit. |
| Unknown prior outcome | Prior command may have committed but cannot yet be classified. | Recover by idempotency lookup or authoritative query. | Yes. | Yes when sensitive. | No tenant leakage. | Unknown until rediscovered. |
| Overpayment rejected | Payment amount exceeds eligible outstanding debt. | Re-read debt and enter valid amount. | Yes. | Usually audit financial rejection. | Authorized Customer scope only. | No commit. |
| Outstanding debt requires Customer | Partial or unpaid Sale lacks Customer. | Select or create Customer. | No. | Usually no. | No tenant leakage. | No commit. |
| Invalid allocation context | Allocation violates Business, Customer, lifecycle, amount, or eligibility. | Re-read debt and retry. | Yes. | Financial audit when sensitive. | No cross-tenant detail. | No commit. |
| Last-active-Owner protection | Action would leave active Business without active Owner. | Keep or add another Owner first. | Yes. | Yes. | Same Business only. | No commit. |
| Invitation invalid | Invitation cannot be used. | Request a new Invitation if appropriate. | Yes. | Yes. | Avoid account enumeration. | No commit. |
| Invitation expired | Invitation is past its valid period. | Request resend. | Yes. | Yes. | Avoid account enumeration. | No commit. |
| Invitation cancelled | Authorized actor cancelled Invitation. | Request a new Invitation. | Yes. | Yes. | Avoid account enumeration. | No commit. |
| Invitation already consumed | Invitation was already accepted. | Re-read accessible Businesses. | Yes. | Yes. | Avoid leaking another User's status. | No new commit. |
| Projection unavailable or stale | Read model cannot be trusted. | Retry or wait for rebuild; canonical read may be required. | Yes. | Operational audit if integrity issue. | No tenant leakage. | No mutation. |
| External delivery pending | Post-commit side effect is not complete. | Poll or retry delivery command if allowed. | Optional. | Side-effect evidence. | Minimize recipient detail. | Domain commit may exist. |
| External delivery failed | Post-commit side effect failed. | Retry side effect if allowed. | Optional. | Side-effect evidence. | Minimize recipient detail. | Domain commit remains valid. |
| Internal failure | Unexpected failure without safe business detail. | Retry if command outcome is known not committed; otherwise recover unknown outcome. | Yes. | Operational/security as applicable. | No internals. | Unknown or no commit. |

## 14. Validation and Failure Precedence

Default tenant-owned command validation order:

1. Authentication and session validity.
2. Verified identity requirement.
3. Business-context presence.
4. Business existence and active state inside authorized scope.
5. Membership existence and active state.
6. Required capability.
7. Idempotency lookup or intent comparison where applicable.
8. Input-shape and business-rule validation.
9. Tenant-scoped resource resolution.
10. Current-state and lifecycle validation.
11. Concurrency-sensitive invariant validation.
12. Authoritative commit.
13. Audit and idempotency result completion.
14. Post-commit side-effect scheduling or recording.

The exact order may vary when a safe idempotent replay must return a prior result before rechecking details that would leak information, or when non-leakage requires combining missing-resource and capability outcomes. Financial confirmations must revalidate all authoritative conditions at commit time; stale previews cannot authorize a later commit.

## 15. Identity and Session Contracts

Register or establish User identity:

- Scope: global.
- Purpose: create or discover a User identity for a normalized email.
- Required: normalized email and credential or identity proof at the conceptual level.
- Result: User exists in a non-tenant context; no Business access is granted.
- Errors: validation failed, duplicate identity routed to safe sign-in or recovery guidance, internal failure.
- Audit: signup and abuse-relevant patterns without secrets.

Verify email:

- Scope: global.
- Purpose: prove control of the MVP identity channel.
- Required: verification attempt evidence without exposing secret material.
- Result: email is verified for active Business operations and Invitation matching.
- Errors: verification expired, invalid, already used, internal failure.
- Audit: verification success and security-relevant failures; no verification secret.

Authenticate:

- Scope: global first, tenant context later.
- Purpose: verify normalized-email/password proof and establish fresh authenticated User session evidence.
- Input ownership: application receives normalized email and transient password through a dedicated use case; one narrow password-verification port returns verified, verification-required, or invalid proof and propagates infrastructure failure.
- Issuance ownership: the server edge creates independent raw session/CSRF evidence and passes only keyed digest evidence and one explicit instant to an application-owned atomic issuance port.
- Result: authenticated session with null selected Business, fixed absolute expiry, and no Membership/capability authority.
- Errors: generic `AUTHENTICATION_FAILED`, email not verified only after correct proof, rate-limited, CSRF rejected, validation, or propagated internal failure.
- Audit: sign-in success and suspicious failure patterns without credentials.

The exact initial profile, including normalization, Argon2id, 12-hour expiry, fixation resistance, cookie writing, CSRF, and digest-only persistence, is defined by the [Session Issuance and Sign-In Specification](session-issuance-sign-in-specification.md). Application code must not receive Fastify, cookies, raw session/CSRF values, Argon2 library types, PostgreSQL rows, or Business authorization facts.

Refresh or revalidate session:

- Purpose: determine whether session remains valid and whether active Business context still authorizes use.
- Required: current session evidence.
- Result: current User and, where selected, current active Business context after revalidation.
- Errors: session invalid or revoked, Membership unavailable, Business inactive.
- Side effects: may rotate or renew session conceptually after future implementation choice.

End current session:

- Purpose: sign out the current device or client interaction.
- Result: current session can no longer authorize operations.
- Audit: sign-out or security telemetry when useful.

Revoke other sessions:

- Purpose: support credential reset, compromise response, Membership changes, capability reduction, and Business deactivation.
- Result: affected sessions must reauthenticate or revalidate before tenant-owned use.
- Non-goal: session listing and individual-device revocation remain future features unless later accepted.

Start and complete account recovery:

- Scope: global identity.
- Purpose: recover access after lost credential.
- Result: credential or identity proof is reset and affected sessions are revoked or forced to revalidate.
- Security: no recovery secret in logs, audit, errors, or analytics.
- Operational note: manual support recovery remains deferred.

Read current identity and accessible Businesses:

- Purpose: show who is signed in and which Businesses can be selected.
- Source: global User plus active Memberships in active Businesses.
- Result: only Businesses the current User may access are returned.
- Suspended, removed, and deactivated access does not authorize ordinary operations; safe global guidance may be returned.

## 16. Business Bootstrap Contract

Bootstrap first Business and Owner:

- Caller: authenticated and verified User.
- Business context: none before commit; new Business after commit.
- Required capability: none before Membership exists.
- Required information: Business name, Business time zone, acceptance evidence for required notices, and BRL currency as fixed release-one setting.
- Command identity: required.
- Consistency boundary: Business, required settings, initial active Owner Membership, audit evidence, and idempotency evidence commit all-or-nothing.
- Preconditions: User may create or join a Business under accepted onboarding rules; duplicate signup must route to sign-in, Invitation acceptance, Business selection, or safe duplicate guidance.
- Success: returns logical Business, Owner Membership, readiness, and active Business selection candidate.
- Safe replay: same command identity and equivalent intent returns committed bootstrap result.
- Different intent: rejected.
- Unknown outcome: rediscover by command identity and User context; do not create a duplicate Business blindly.
- Failure: identity creation may exist globally, but no tenant access exists until bootstrap commits.
- Side effects: welcome, analytics, or notification attempts occur after commit and do not invalidate bootstrap.
- Audit: Business creation and initial Owner assignment without authentication secrets.

## 17. Business Readiness and Settings Contracts

List accessible Businesses:

- Query over active Memberships and active Businesses for the current User.
- Suspended, removed, and deactivated relationships are not returned as selectable ordinary Business context.
- Sorting is presentation-level unless later specified.

Select active Business:

- Command or session-context operation.
- Required: requested Business context.
- Validation: current User, active Business, active Membership, and at least basic access capability.
- Result: selected Business context may be remembered but must be revalidated on future tenant-owned operations.
- Failure: inaccessible Business is ignored or rejected without cross-tenant existence disclosure.

Read Business readiness:

- Query requiring active Business context.
- Returns whether minimum readiness is satisfied: active Business, active Owner, Business name, Business time zone, and BRL currency.
- Product catalog, Customer, Pix key, photos, expense categories, and provider setup are not readiness requirements.

Read Business settings:

- Query requiring capability appropriate to visibility.
- Returns current settings needed by the client while preserving sensitive-field minimization.

Update accepted Business settings:

- Command requiring settings capability.
- Accepted for current planning: Business name and current operational time zone.
- Currency remains BRL for release one.
- Historical operational dates and time-zone context are not rewritten.
- Audit is required.

Deactivate Business:

- Command requiring high-risk deactivation capability.
- Revalidates last active state and actor authorization.
- Blocks ordinary tenant operations and requires affected session revocation or revalidation.
- Does not hard-delete financial history.
- Reactivation remains separately specified and high-risk.

Export Business data:

- Future guarded contract boundary.
- Requires export capability and tenant-scoped data minimization.
- Operational and legal rules remain open.

## 18. Membership and Invitation Contracts

Create Invitation:

- Required Business context and member-management capability.
- Required: intended normalized email, intended capability group, expiration intent, inviting actor.
- Rejected when Business is deactivated, email is malformed, duplicate pending Invitation exists unless idempotent, or target already has incompatible active Membership.
- Side effect: delivery request after committed Invitation.
- Secrets: invitation secret is returned or delivered only according to future transport rules and never appears in audit/logs.

Cancel Invitation:

- Requires member-management capability.
- Rejected if already consumed, expired, cancelled, or Business inactive for ordinary operation.
- Audit records actor, Business, Invitation reference, outcome, and reason when supplied.

Accept Invitation:

- Caller: authenticated verified User.
- Required: Invitation evidence and matching normalized verified email.
- Consistency boundary: consume valid Invitation and create or activate Membership atomically.
- Rejected for mismatch, expired, cancelled, replayed, concurrent reuse, existing active Membership conflict, or deactivated Business.
- Safe replay may return prior acceptance for the same User and intent when evidence supports it.
- Result: User may access Business only after active Membership exists and future session context revalidates.

List Invitations:

- Query requiring member-management capability.
- Returns safe historical status without invitation secrets.

List Memberships:

- Query requiring member-management or allowed team-view capability.
- Historical removed/suspended Memberships may appear for accountability depending on capability.

Change Membership capability group:

- Command requiring role-assignment capability.
- Non-owners cannot grant capabilities they do not possess.
- Promotion to Owner requires accepted high-risk rule; absent that, Owner assignment is Owner-only.
- Revalidates last-active-Owner invariant if demoting an Owner.
- Affected sessions must revoke or revalidate.
- Audit is required.

Suspend Membership:

- Command requiring member-management capability.
- Denies future tenant access immediately or within accepted bounded revalidation behavior.
- Revalidates last-active-Owner invariant.
- Historical Membership remains referenceable.

Restore Membership:

- Command requiring member-management capability.
- Restores access only if Business is active and capability assignment is valid.
- Affected sessions must revalidate before use.
- Audit is required.

Remove Membership:

- Command requiring member-management capability.
- Denies access and preserves historical references.
- Self-removal or removing another Owner must not violate last-active-Owner invariant.
- Reinvitation must preserve lifecycle history; physical representation remains deferred.

Invitation state placement:

- Application semantics treat Invitation as the primary contract for invited, pending, cancelled, expired, and consumed states.
- A future physical model may also represent invited Membership state, but it cannot change acceptance, replay, mismatch, or access rules.

## 19. Customer Contracts

Create Customer:

- Requires active Business and `customers.manage` or equivalent capability.
- Required: display name or recognizable nickname.
- Optional: phone, email, and notes if later accepted.
- Phone and email are not unique. Same-name Customers are allowed.
- Duplicate detection is a warning or UX aid, not hard uniqueness.
- Audit is required for creation when useful, with personal-data minimization.

Create Customer during Sale:

- Same Customer rules, executed inside the Sale command consistency boundary when debt requires a new Customer.
- If Sale command fails, inline Customer creation must not appear as a successful unrelated result unless a future UX explicitly separates the actions.

Update Customer:

- Descriptive/contact changes do not rewrite historical Sale, Payment, Allocation, or Payment Request facts.
- Mass assignment of Business ownership, lifecycle, audit actor, or financial fields is rejected.
- Audit may record safe before/after references for sensitive contact changes.

Deactivate Customer:

- Prevents ordinary future selection for new debt unless reactivation is later specified.
- Historical financial records remain.
- Queries may show deactivated status where authorized.

Search or list Customers:

- Query scoped to active Business.
- Same-name results are allowed.
- No cross-Business Customer existence leakage.
- Empty state returns an ordinary empty result.
- Pagination and sorting are conceptual and may prioritize name and recent activity later.

Read Customer details:

- Query requiring active Business and appropriate capability.
- Returns Customer profile and safe history links according to capability.

Read Customer outstanding debt:

- Query derived from canonical Sales, Payments, Allocations, and lifecycle facts.
- Payment Requests do not reduce debt.
- Projection disagreement must be blocked or rebuilt; cached balance is not authority.

Anonymize Customer:

- Future guarded command pending legal and operational validation.
- Must preserve financial relationships and audit references while minimizing personal data.

## 20. Product Contracts

Create Product:

- Requires active Business and product-management capability.
- Required: product display name and current sale information when used.
- Optional: product-photo intent and SKU/barcode only after later specification.
- Product name is not declared unique.

Update Product:

- Updates current catalog information only.
- Does not rewrite historical Sale Item snapshots.
- Product photo update is an external-object intent when later specified.
- Audit is required for sensitive or commercially meaningful changes.

Deactivate Product:

- Prevents ordinary future selection.
- Historical Sale Items remain unchanged.
- Restore Product is deferred unless a later product rule accepts it.

Search or list Products:

- Query scoped to active Business.
- Must not leak Products from another Business.
- Deactivated Products are hidden by default but may be included in administrative views if specified.

Read Product details:

- Query requiring active Business and product visibility capability.
- Returns current catalog details, not historical Sale Item facts.

Product-photo intent:

- Future side-effect contract only.
- Product photos are tenant-owned and access-scoped.
- Object storage provider, upload flow, keys, and transformations are deferred.

## 21. Sale-Recording Contracts

Shared Sale validation:

- Caller must have Sale recording capability in the active Business.
- Sale must contain at least one Sale Item.
- Sale total must be positive.
- Unit prices, line totals, Sale-level discounts or adjustments, Payments, and Allocations use BRL integer minor units.
- Zero and negative Sales, Payments, Allocations, and Expenses are rejected for the MVP unless an accepted correction command creates a valid reversal effect.
- First journey assumes integer quantity; fractional quantity remains open.
- Server recalculates line totals and Sale total from submitted intent; client totals are previews.
- Product-backed items and ad hoc items both create Sale Item snapshots.
- Product deactivation between preview and commit causes revalidation; committed snapshots remain stable.
- Business-local operational date is derived using the Business time-zone context and preserved with recorded-at instant.
- Sale status is derived from canonical Sale, Sale Items, active Payments, active Allocations, and lifecycle.

Fully paid anonymous counter Sale:

- Customer is absent.
- Payment amount must equal Sale total.
- Consistency boundary: Sale, Sale Items, Payment, Allocation, audit evidence, and idempotency evidence commit all-or-nothing.
- Success returns Sale reference, paid classification, Payment reference, Allocation outcome, and no Customer debt.
- Example: Sale total `2500`, Payment `2500`, Allocation `2500`, outstanding `0`.

Fully paid identified-Customer Sale:

- Customer is present and must belong to the same Business.
- Payment amount equals Sale total.
- Same atomic boundary as anonymous fully paid Sale.
- Customer history includes Sale and Payment; Customer outstanding balance does not increase.

Partially paid Sale:

- Customer is required.
- Payment amount must be greater than `0` and less than Sale total.
- Atomic boundary: Sale, Sale Items, initial Payment, Allocation, audit, and idempotency evidence.
- Remaining debt is derived.
- Example: Sale `4000`, Payment `1500`, Allocation `1500`, outstanding `2500`.

Unpaid Sale:

- Customer is required.
- No Payment and no Allocation are created.
- Atomic boundary: Sale, Sale Items, audit, and idempotency evidence.
- Full debt is derived.
- Example: Sale `1800`, allocated `0`, outstanding `1800`.

Sale with inline Customer creation:

- Allowed for partial or unpaid Sale when debt requires Customer.
- Customer creation participates in the Sale boundary unless the future UX explicitly commits Customer first.
- Same-name and non-unique contact rules apply.

Unknown outcome recovery:

- Duplicate submit with same command identity and equivalent intent returns prior result.
- Same command identity with changed items, Customer, amount, date, or payment condition is rejected.
- If the caller cannot determine whether commit occurred, it must recover through idempotency evidence or authoritative Sale query.

## 22. Sale Correction and Cancellation Contracts

Read Sale before correction:

- Query requiring active Business and financial-correction visibility capability.
- Returns current lifecycle, active allocations, derived outstanding amount, correction links, and safe audit context.

Descriptive correction:

- Allowed only when financial meaning does not change.
- Requires appropriate edit capability.
- Audit records actor and safe before/after reference.

Cancel Sale:

- Requires financial-correction capability.
- Requires reason.
- Revalidates current Sale lifecycle, active allocations, Business state, Membership, and capability.
- Must not silently conflict with a concurrent Allocation.
- Cancelled Sale no longer counts in ordinary debt or sales-recorded totals according to accepted report rules.
- Original remains historically visible.

Replace or correct Sale:

- Used for wrong Customer, wrong items, wrong quantity, wrong amount, or duplicate correction when financial meaning changes.
- Creates replacement or correcting records rather than mutating financial facts in place.
- Allocations and debt are recalculated from active canonical records.
- Idempotency is required.
- Unknown outcome recovery must avoid duplicate replacements.

Accidental cancellation:

- Restoration is not default MVP behavior.
- A replacement Sale is preferred for understandable history.

## 23. Payment and Allocation Contracts

Record later Payment:

- Caller must have Payment recording capability.
- Required: Customer, received amount, payment method classification, Business-local occurrence date, and optional selected Sale.
- Customer must belong to active Business.
- Amount must be positive and must not exceed Customer outstanding debt.
- Payment is the cash-receipt fact.
- Allocations apply selected Sale first, then oldest eligible outstanding Sales by Business-local date, recorded-at instant, then stable logical identity.
- Payment and Allocations commit atomically with audit and idempotency evidence.
- Result includes Payment reference, Allocations, affected Sales, and remaining Customer debt conceptually.
- Allocation is not an additional receipt.

Allocation formulas:

```text
saleTotalMinor =
  sum(activeSaleItemLineTotalMinor)
  - acceptedSaleLevelDiscountMinor
  + acceptedSaleLevelAdjustmentMinor

activeAllocatedToSaleMinor =
  sum(activeAllocationsToSaleMinor)
  - sum(reversedAllocationsToSaleMinor)

saleOutstandingMinor =
  max(0, saleTotalMinor - activeAllocatedToSaleMinor)

activeAllocatedFromPaymentMinor =
  sum(activeAllocationsFromPaymentMinor)
  - sum(reversedAllocationsFromPaymentMinor)

paymentUnallocatedMinor =
  paymentAmountMinor - activeAllocatedFromPaymentMinor
```

Allocation invariants:

- Payment, Sale, Allocation, and Customer context must share the same Business.
- Debt Payments cannot allocate across Customers.
- Allocation to cancelled, reversed, replaced, or otherwise ineligible Sales is rejected.
- Sum of effective Allocations from a Payment cannot exceed Payment amount.
- Sum of effective Allocations to a Sale cannot exceed eligible outstanding amount.
- Overpayment and customer credit are rejected.
- Concurrent Payments must re-read outstanding debt inside the authoritative boundary.

Example:

```text
Customer debt before = 5000
Payment = 3500
Selected Sale A outstanding = 3000
Next Sale B outstanding = 2000
Allocations = 3000 to Sale A, 500 to Sale B
Customer debt after = 1500
```

## 24. Payment Reversal and Correction Contracts

Reverse Payment:

- Requires financial-correction capability and reason.
- Original Payment remains retained.
- Effective Allocations are reversed or become ineffective with the Payment inside one authoritative boundary.
- Debt reappears according to canonical Sale and Allocation formulas.
- Daily payment-received reports use active Payments and reversal rules; exact presentation of reversal date versus original occurrence date remains an open reporting detail.
- Audit and idempotency are required.

Replace or correct Payment:

- Used for wrong amount, wrong Customer, wrong method when financially meaningful, wrong date when it changes reporting meaning, or duplicate Payment.
- Reversal plus replacement is preferred over destructive mutation.
- Replacement Payment allocates under current same-Business, same-Customer, outstanding-debt, lifecycle, and overpayment rules.

Wrong Payment method:

- If method label correction does not change financial meaning and is allowed by later UX, it may be a descriptive correction with audit.
- If it changes reporting or reconciliation meaning, use reversal/replacement.

Concurrency:

- Payment reversal racing with Sale cancellation, reallocation, or another correction must revalidate active lifecycle and either commit one coherent outcome or reject as conflict.

## 25. Payment Request Contracts

Prepare Payment Request:

- Requires active Business, Customer or intended Sale context, and Payment Request capability.
- Required: requested amount and safe collection context.
- Payment Request amount must be positive and must not exceed the relevant debt context unless later collection rules accept a different use.
- No Payment or Allocation is created.
- No debt is reduced.

Request delivery:

- Requires a committed Payment Request.
- Delivery channel remains deferred: Pix, WhatsApp, email, SMS, or provider is not selected.
- Delivery is a post-commit side effect with retry and deduplication expectations.
- Delivery success means message/request delivery only, not receipt of money.

Read Payment Request status:

- Query requiring active Business and appropriate capability.
- Returns request lifecycle such as prepared, delivery pending, delivered, failed, cancelled, or expired when later modeled.
- Does not return secrets or unnecessary contact payloads.

Retry delivery:

- Reuses committed Payment Request and side-effect evidence.
- Must avoid duplicate unsafe external messages where possible.

Cancel or expire Payment Request:

- Changes request lifecycle only.
- Does not change debt.
- Audit is required for cancellation.

Reconcile future provider outcome:

- Future contract boundary.
- Provider callback must be authenticated, tenant-mapped, deduplicated, and reconciled before any internal Payment is created or confirmed.
- Unverified provider evidence is not financial authority.

Associate later verified Payment:

- A later Payment may reference a Payment Request for explanation, but the Payment remains the cash-receipt fact.

## 26. Expense Contracts

Record Expense:

- Requires active Business and expense-recording capability.
- Staff does not have this capability by default.
- Required: amount, Business-local occurrence date, description or accepted category concept, recorded-at instant, actor.
- Amount must be positive in BRL minor units.
- Audit and idempotency evidence are required.
- A committed Expense affects "Quanto saiu" and daily result for its occurrence date.

Read Expense and list Expenses:

- Require expense visibility or sensitive-report capability.
- Staff is denied expense-sensitive results by default.
- Results are Business-scoped and may use conceptual sorting/pagination.

Correct or replace Expense:

- Description-only correction may be descriptive with audit.
- Amount/date/category changes that alter financial meaning use cancellation and replacement.
- Original is retained.

Cancel Expense:

- Requires expense correction capability.
- Removes active effect from ordinary daily result without hard deletion.
- Requires audit and reason.

## 27. Reporting and Read-Model Contracts

Daily operational summary:

- Query requiring active Business.
- Expense-sensitive result requires sensitive-report capability.
- Uses Business-local day and preserved historical time-zone context.
- Formula:

```text
dailyResultMinor = paymentsReceivedTodayMinor - expensesTodayMinor
```

- `paymentsReceivedTodayMinor` sums active Payments by Payment occurrence Business-local date.
- `expensesTodayMinor` sums active Expenses by Expense occurrence Business-local date.
- Sales recorded are shown separately and are not automatically receipts.
- Allocations are not cash receipts.
- Payment Requests are not receipts.
- Payment received today for older debt counts as cash received today.
- Daily result is not profit, DRE, bookkeeping, or formal accounting.

Sales recorded by period:

- Query over active Sales by Sale operational Business-local date.
- Cancelled/replaced Sales are excluded or represented separately according to lifecycle semantics.
- Payment status is derived, not accepted from client input.

Payments received by period:

- Query over active Payments by Payment occurrence Business-local date.
- Reversed Payments do not count as active receipts; presentation of reversal timing remains a reporting detail.

Expenses by period:

- Query over active Expenses by occurrence Business-local date.
- Requires expense visibility capability.

Outstanding Sales:

- Query deriving saleOutstandingMinor from canonical Sales, Payments, Allocations, and lifecycle.
- Sorting defaults conceptually to oldest eligible debt when allocation assistance is needed.

Customer outstanding balance:

```text
customerOutstandingMinor =
  sum(active outstanding Sale amounts for Customer)
```

- Payment Requests do not reduce this amount.
- Cached balances are subordinate to canonical records.

Recent operational activity:

- Query for authorized users to understand recent Sales, Payments, Payment Requests, Expenses, and corrections.
- Sensitive fields are filtered by capability.

Projection behavior:

- Queries may use projections after implementation, but projection freshness and rebuildability must be visible to application behavior.
- If a projection disagrees with canonical records, canonical records win and the read must rebuild, block, or return projection-unavailable semantics.

Example:

```text
paymentsReceivedTodayMinor = 5000
expensesTodayMinor = 1200
dailyResultMinor = 3800
```

The merchant may see `R$ 38,00` as "quanto sobrou" for the day, with wording that avoids accounting claims.

## 28. Idempotency and Unknown Outcomes

Commands requiring idempotency:

- First-owner bootstrap.
- Invitation acceptance.
- Fully paid Sale.
- Partially paid Sale.
- Unpaid Sale.
- Later Payment.
- Expense creation.
- Financial cancellation.
- Payment reversal.
- Replacement operations.
- Payment Request delivery request.
- Future provider callback reconciliation.

Rules:

- Idempotency is scoped to actor, Business when applicable, command identity, and intent.
- Client-generated command identity is untrusted until scoped and authorized.
- Same identity plus equivalent intent returns the prior result or prior safe rejection.
- Same identity plus different intent is rejected.
- Completed, rejected, failed, in-progress, and unknown outcomes must be distinguishable conceptually.
- Unknown outcome recovery uses idempotency evidence or authoritative query.
- Idempotency is not business uniqueness and not optimistic concurrency.
- Retrying after timeout must not duplicate financial facts.
- Idempotency evidence must not store secrets or unnecessary personal/financial payloads.
- Retention duration is an operational/legal choice, but evidence must survive long enough for safe retry and reconciliation.

## 29. Concurrency and Stale-State Behavior

Concurrent Owner removal or demotion:

- Revalidate active Owner count inside the authoritative boundary.
- Reject any command that would leave an active Business without active Owner.

Invitation acceptance races:

- One acceptance may consume the Invitation.
- Later acceptance attempts return prior outcome for same valid User/intent when safe or reject as already consumed.

Duplicate Sale confirmation:

- Same idempotency identity and equivalent intent returns prior Sale result.
- Different intent rejects.

Two Payments targeting the same debt:

- Each command re-reads outstanding amounts inside the Payment boundary.
- One may commit and the other may reject overpayment or conflict.

Sale cancellation racing with Allocation:

- One coherent outcome commits.
- The other revalidates and rejects or retries with fresh state.

Payment reversal racing with financial operation:

- Revalidate active Payment, Allocation, Sale, and Customer debt state.
- Reject stale correction when resulting balances would be ambiguous.

Customer deactivation during Sale confirmation:

- Revalidate Customer state at commit.
- Reject partial/unpaid Sale or Payment that depends on a now-ineligible Customer.

Product deactivation after Sale preparation:

- Revalidate Product selection.
- If the command commits before deactivation, Sale Item snapshots stand.
- If Product is inactive before commit, merchant must reselect or use valid ad hoc entry.

Membership suspension, capability change, or Business deactivation during confirmation:

- Revalidate before commit.
- Reject ordinary operations if authorization is no longer valid.

Business setting change affecting time zone:

- Use authoritative Business time-zone context at event time.
- Historical records keep their original Business-local date and time-zone context.

Projection lag:

- Queries may indicate stale or unavailable projection and require canonical rebuild or retry.
- Stale projection does not authorize financial command confirmation.

Silent last-write-wins is forbidden for financial and authorization-sensitive actions.

## 30. Audit Obligations

Sensitive command families require audit evidence:

- Signup, verification, authentication security events, sign-out, recovery, and session revocation where security value exists.
- Business bootstrap, settings changes, deactivation, and reactivation if later accepted.
- Invitation creation, cancellation, expiration handling, resend/delivery attempt, and acceptance.
- Membership activation, suspension, restoration, removal, capability change, and rejected last-Owner attempts.
- Sale creation, cancellation, replacement, and correction.
- Payment creation, reversal, replacement, correction, and Allocation changes.
- Payment Request creation, delivery attempt, cancellation, expiration, and future provider reconciliation.
- Expense creation, correction, cancellation, and replacement.
- Sensitive report access, exports, cross-tenant or sensitive authorization denials where security value justifies retention.

Audit context should include:

- Acting User.
- Actor Membership when Business-scoped.
- Business when applicable.
- Action category.
- Target logical record reference.
- Outcome.
- Timestamp.
- Reason where required.
- Safe before/after references for security-relevant values.
- Correlation or idempotency reference.
- Client category where useful.
- Related side-effect, reversal, cancellation, replacement, or session-revocation reference.

Audit must not include passwords, password hashes, reset secrets, verification secrets, invitation secrets, session secrets, full tokens, provider secrets, unnecessary Customer personal data, full debt lists, or raw financial payloads when safe references are enough.

Audit is accountability evidence, not event sourcing, logs, diagnostics, or analytics.

## 31. External-Side-Effect Contracts

External side effects include:

- Invitation delivery.
- Recovery delivery.
- Payment Request delivery.
- Product-photo storage or processing.
- Notifications.
- Analytics emission.
- Export file generation.
- Future payment-provider communication.

Rules:

- Authoritative domain commit occurs before dependent side effects where required.
- Side-effect intent references the committed canonical record and Business context.
- Retries must be idempotent where possible.
- Duplicate side effects must be reduced through command and side-effect evidence.
- Failure is visible as delivery or processing state, not as rollback of a valid Sale, Payment, Expense, Membership, or Business commit.
- Payloads minimize personal, financial, and secret data.
- Provider callbacks require authentication, tenant mapping, deduplication, and reconciliation.
- Unverified callbacks are not internal financial authority.
- Queue, outbox, worker, scheduler, provider, and callback payload structure remain deferred.

## 32. Cross-Client Consistency

- Web supports the complete accepted critical journey.
- Mobile remains supporting for reports, collection assistance, and product-photo work.
- Mobile Sale, Payment, Expense, and correction recording remain product-validation questions.
- Both clients use the same application contracts, authorization rules, money rules, tenant scoping, audit obligations, and idempotency semantics.
- Neither client may bypass server-side authorization or same-Business relationship validation.
- Client-local calculations are previews, not authoritative outcomes.
- Client retries use the same idempotency behavior.
- Business switching clears or replaces tenant-local state.
- Offline mutation behavior remains deferred. A client that cannot reach the authoritative boundary must not show a Sale, Payment, Expense, or correction as recorded.
- Presentation differences do not create different financial rules.

## 33. Sensitive-Data Handling

Application contracts must minimize sensitive data:

- Identity queries return only information needed for current account and Business selection.
- Customer queries return contact details only to authorized users in the active Business.
- Customer debt details are financially sensitive and Business-scoped.
- Product photos are tenant-owned and must not use public or guessable access without a later risk decision.
- Expenses and "quanto sobrou" require sensitive-report or expense capability.
- Payment Requests may expose debt amount or contact data through external channels only after a delivery specification.
- Audit, idempotency, side-effect, log, analytics, diagnostic, export, backup, and support contexts must avoid secrets and unnecessary personal or financial payloads.
- Errors must not include internal identifiers, stack traces, provider payloads, secrets, or cross-tenant existence detail.
- No secret should be returned after initial safe use unless a future security design explicitly requires it.
- Anonymization must preserve historical financial and audit relationships while removing unnecessary personal data where legally and operationally valid.
- Full LGPD compliance remains subject to legal and operational validation.

## 34. Contract Compatibility and Evolution

Future contract evolution should preserve:

- Stable business intent for commands.
- Stable error category meanings.
- Stable authorization and tenant-scope invariants.
- Additive query fields where possible.
- Backward-compatible projection semantics where possible.
- Explicit deprecation when a client-facing semantic changes.
- Safe handling of web/mobile version skew.
- Auditability when business behavior changes.
- Migration path for in-progress commands, idempotency evidence, and external side-effect attempts.

Breaking changes include:

- Changing financial meaning of existing commands.
- Changing Customer requirement for debt.
- Treating Payment Request as Payment.
- Weakening tenant authorization.
- Reclassifying Staff capabilities without product decision.
- Changing report formulas without an accepted specification or ADR.

Versioning mechanism, URL strategy, headers, serialization, parser behavior, and compatibility tooling remain deferred implementation choices.

## 35. Examples and Invariant Walkthroughs

1. First-owner bootstrap succeeds.
   Caller context: verified User with no selected Business. Active Business context: none before commit, new Business after commit. Command/query: bootstrap first Business. Preconditions: valid Business name and time zone. Records: Business, settings, Owner Membership, audit, idempotency. Canonical facts: active Business and active Owner. Derived values: readiness is true. Boundary: all-or-nothing bootstrap. Idempotency: same intent returns same Business. Concurrency: competing identical submit replays. Result/error: success. Audit: creation and Owner assignment. Side effect: welcome attempt after commit. Test obligation: bootstrap atomicity.

2. Bootstrap times out after commit and is retried.
   Caller context: same verified User and command identity. Active Business context: rediscovered after validation. Command/query: bootstrap retry. Preconditions: prior outcome may be unknown. Records: idempotency evidence and committed Business. Canonical facts: no duplicate Business. Derived values: readiness remains true. Boundary: idempotency lookup plus authoritative read. Idempotency: return prior result. Concurrency: duplicate submit safe. Result/error: duplicate command safely replayed. Audit: correlate to original. Side effect: no duplicate unsafe delivery. Test obligation: unknown outcome recovery.

3. Same bootstrap identity is reused with different intent.
   Caller context: same User. Active Business context: none or prior Business. Command/query: bootstrap. Preconditions: command identity already exists with different Business name or time zone. Records: idempotency evidence. Canonical facts: no new Business. Derived values: none. Boundary: idempotency comparison. Idempotency: reject changed intent. Concurrency: no overwrite. Result/error: idempotency identity reused with different intent. Audit: sensitive rejection. Side effect: none. Test obligation: different-intent rejection.

4. Returning User has two authorized Businesses.
   Caller context: authenticated verified User. Active Business context: explicit selection or valid remembered Business required. Command/query: list accessible Businesses and select Business. Preconditions: two active Memberships. Records: User, Memberships, Businesses. Canonical facts: each Membership is tenant-scoped. Derived values: selectable list. Boundary: session revalidation. Idempotency: not required for query. Concurrency: Membership change can invalidate selection. Result/error: selected active Business. Audit: optional tenant switch if security value. Side effect: none. Test obligation: multi-Business selection.

5. Remembered Business is no longer authorized.
   Caller context: authenticated User. Active Business context: remembered value fails revalidation. Command/query: session revalidation. Preconditions: Membership suspended, removed, or Business deactivated. Records: Session, Business, Membership. Canonical facts: no active authorization. Derived values: accessible list excludes Business. Boundary: authorization check. Idempotency: not applicable. Concurrency: state checked current. Result/error: Membership inactive or Business inactive. Audit: security-relevant denial. Side effect: clear tenant state. Test obligation: remembered context denial.

6. Invitation is accepted successfully.
   Caller context: authenticated verified User with matching email. Active Business context: target Business after acceptance and selection. Command/query: accept Invitation. Preconditions: Invitation active, unexpired, not consumed, Business active. Records: Invitation, Membership, audit, idempotency. Canonical facts: active Membership. Derived values: Business becomes accessible. Boundary: consume Invitation and activate Membership atomically. Idempotency: same acceptance replays. Concurrency: one acceptance wins. Result/error: success. Audit: acceptance. Side effect: optional notification after commit. Test obligation: Invitation acceptance.

7. Invitation is accepted concurrently twice.
   Caller context: same or different authenticated User. Active Business context: target Business. Command/query: accept Invitation. Preconditions: concurrent attempts. Records: Invitation, Membership, idempotency, audit. Canonical facts: at most one accepted outcome. Derived values: one accessible Membership. Boundary: Invitation acceptance. Idempotency: same User/intent may replay; different or second use rejects. Concurrency: second attempt rejects as consumed. Result/error: invitation already consumed. Audit: accepted and rejected attempts. Side effect: no duplicate Membership. Test obligation: replay and concurrency.

8. Invitation email does not match verified User email.
   Caller context: verified User with different normalized email. Active Business context: none. Command/query: accept Invitation. Preconditions: mismatch. Records: Invitation evidence only. Canonical facts: no Membership. Derived values: no access. Boundary: identity match validation. Idempotency: rejected outcome may be recorded. Concurrency: not relevant. Result/error: invitation invalid. Audit: mismatch without secret. Side effect: none. Test obligation: email mismatch.

9. Last active Owner is removed.
   Caller context: Owner or actor with member-management capability. Active Business context: active Business. Command/query: remove Membership. Preconditions: target is only active Owner. Records: Membership, Business, audit. Canonical facts: active Business would have zero active Owners. Derived values: none. Boundary: Owner-count invariant. Idempotency: if command retried, prior rejection can replay. Concurrency: checked inside mutation. Result/error: last-active-Owner protection. Audit: rejected high-risk attempt. Side effect: none. Test obligation: last Owner protection.

10. Two Owners are concurrently demoted or removed.
   Caller context: two Owners. Active Business context: same active Business. Command/query: remove or change Membership capability. Preconditions: each sees another Owner before confirmation. Records: Memberships, Business, audit, session revalidation. Canonical facts: at least one Owner must remain. Derived values: accessible memberships. Boundary: last-owner authoritative mutation. Idempotency: per command. Concurrency: one may commit, the other rejects. Result/error: success plus conflict or last-owner rejection. Audit: both outcomes. Side effect: affected session revalidation. Test obligation: concurrent Owner changes.

11. Fully paid anonymous counter Sale.
   Caller context: active Owner, Manager if exposed, or Staff with Sale capability. Active Business context: validated Business. Command/query: record fully paid anonymous Sale. Preconditions: active Business, active Membership, valid items, Payment equals total. Records: Sale, Sale Items, Payment, Allocation, audit, idempotency. Canonical facts: Sale `2500`, Payment `2500`, Allocation `2500`. Derived values: outstanding `0`, paid. Boundary: Sale and Payment atomic. Idempotency: duplicate submit replays. Concurrency: authorization and Product state revalidated. Result/error: success. Audit: Sale and Payment. Side effect: analytics after commit. Test obligation: anonymous paid Sale.

12. Fully paid identified-Customer Sale.
   Caller context: Sale-capable User. Active Business context: validated. Command/query: record fully paid Sale for Customer. Preconditions: Customer belongs to Business. Records: Customer, Sale, Sale Items, Payment, Allocation, audit, idempotency. Canonical facts: Sale `3200`, Payment `3200`, Allocation `3200`. Derived values: Customer debt unchanged at `0` for that Sale. Boundary: atomic. Idempotency: replay same result. Concurrency: Customer deactivation before commit rejects. Result/error: success. Audit: Customer-linked Sale. Side effect: none required. Test obligation: identified paid Sale.

13. Partially paid Sale.
   Caller context: Sale-capable User. Active Business context: validated. Command/query: record partially paid Sale. Preconditions: Customer required, Payment greater than `0` and less than total. Records: Sale, Sale Items, Payment, Allocation, audit, idempotency. Canonical facts: Sale `4000`, Payment `1500`, Allocation `1500`. Derived values: outstanding `2500`, "pago em parte". Boundary: atomic. Idempotency: replay same result. Concurrency: Customer and authorization revalidated. Result/error: success. Audit: Sale and Payment. Side effect: optional analytics. Test obligation: partial Sale.

14. Unpaid Sale.
   Caller context: Sale-capable User. Active Business context: validated. Command/query: record unpaid Sale. Preconditions: Customer required, valid positive total. Records: Sale, Sale Items, audit, idempotency. Canonical facts: Sale `1800`, no Payment, no Allocation. Derived values: outstanding `1800`, "em aberto". Boundary: atomic unpaid Sale. Idempotency: replay same result. Concurrency: Customer active revalidated. Result/error: success. Audit: Sale creation. Side effect: none required. Test obligation: unpaid Sale debt.

15. Customer is created during Sale confirmation.
   Caller context: Sale-capable User with Customer creation capability. Active Business context: same Business. Command/query: record partial or unpaid Sale with inline Customer. Preconditions: Customer display name present. Records: Customer, Sale, Sale Items, maybe Payment/Allocation, audit, idempotency. Canonical facts: new Customer plus Sale facts. Derived values: Customer debt. Boundary: one Sale workflow boundary. Idempotency: replay avoids duplicate Customer and Sale. Concurrency: same-name Customer does not block. Result/error: success. Audit: Customer and Sale. Side effect: none required. Test obligation: inline Customer.

16. Ad hoc Sale Item is recorded.
   Caller context: Sale-capable User. Active Business context: validated. Command/query: record Sale. Preconditions: item has description, quantity, price, positive line total. Records: Sale Item snapshot without Product reference. Canonical facts: description and amount snapshot. Derived values: Sale total. Boundary: Sale command. Idempotency: covered by Sale command. Concurrency: Product catalog irrelevant. Result/error: success. Audit: Sale. Side effect: none. Test obligation: ad hoc item.

17. Product is renamed after a Sale.
   Caller context: product-capable User. Active Business context: same Business. Command/query: update Product. Preconditions: Product active or editable. Records: Product and historical Sale Item snapshots. Canonical facts: Product current name changes; Sale Item snapshot unchanged. Derived values: historical reports unchanged. Boundary: Product update. Idempotency: not necessarily required unless duplicate-prone. Concurrency: stale Product edit may conflict. Result/error: success. Audit: Product update. Side effect: photo none. Test obligation: snapshot preservation.

18. Duplicate Sale submission after timeout.
   Caller context: same Sale-capable User. Active Business context: same Business. Command/query: record Sale retry. Preconditions: unknown prior outcome. Records: idempotency evidence and committed Sale. Canonical facts: one Sale only. Derived values: same paid/debt outcome. Boundary: idempotency recovery. Idempotency: prior result returned. Concurrency: no duplicate financial facts. Result/error: duplicate command safely replayed. Audit: correlate retry. Side effect: no duplicate delivery. Test obligation: duplicate submit.

19. Same Sale idempotency identity with changed items.
   Caller context: same User. Active Business context: same Business. Command/query: record Sale. Preconditions: command identity reused with different amount/items/Customer. Records: idempotency evidence. Canonical facts: no new Sale. Derived values: unchanged. Boundary: idempotency comparison. Idempotency: reject changed intent. Concurrency: no overwrite. Result/error: idempotency identity reused with different intent. Audit: financial rejection. Side effect: none. Test obligation: changed-intent rejection.

20. Later Payment allocated to one selected Sale.
   Caller context: Payment-capable User. Active Business context: validated. Command/query: record later Payment. Preconditions: Customer has selected Sale outstanding `3000`; Payment `3000`. Records: Payment, Allocation, audit, idempotency. Canonical facts: Payment `3000`, Allocation `3000`. Derived values: Sale outstanding `0`. Boundary: Payment and Allocation atomic. Idempotency: duplicate replays. Concurrency: outstanding revalidated. Result/error: success. Audit: Payment. Side effect: analytics optional. Test obligation: selected Sale allocation.

21. One Payment allocated across multiple Sales.
   Caller context: Payment-capable User. Active Business context: validated. Command/query: record later Payment. Preconditions: Customer debt `5000`, selected Sale A `3000`, Sale B `2000`, Payment `3500`. Records: Payment, two Allocations, audit, idempotency. Canonical facts: `3000` to A and `500` to B. Derived values: Customer debt `1500`. Boundary: Payment atomic. Idempotency: replay same allocations. Concurrency: re-read outstanding. Result/error: success. Audit: allocation details by safe references. Side effect: none. Test obligation: multi-Sale allocation.

22. Overpayment attempt.
   Caller context: Payment-capable User. Active Business context: validated. Command/query: record later Payment. Preconditions: Customer debt `1200`, Payment `1500`. Records: none committed except optional rejected idempotency/audit evidence. Canonical facts: unchanged. Derived values: debt remains `1200`. Boundary: validation and outstanding check. Idempotency: rejected outcome may replay. Concurrency: re-read required. Result/error: overpayment rejected. Audit: financial rejection. Side effect: none. Test obligation: overpayment rejection.

23. Concurrent Payments target the same debt.
   Caller context: two Payment-capable Users. Active Business context: same Business. Command/query: record later Payment. Preconditions: Sale outstanding `3000`; both submit `3000`. Records: Payment/Allocation for winner, rejected evidence for loser. Canonical facts: one effective allocation up to `3000`. Derived values: outstanding `0`. Boundary: Payment allocation invariant. Idempotency: per command. Concurrency: second rejects overpayment or conflict after re-read. Result/error: success plus conflict. Audit: both outcomes. Side effect: none. Test obligation: concurrent allocation.

24. Sale cancellation races with Payment Allocation.
   Caller context: correction-capable User and Payment-capable User. Active Business context: same Business. Command/query: cancel Sale and record Payment. Preconditions: Sale outstanding before race. Records: either cancellation or Payment/Allocation commits. Canonical facts: no Allocation to cancelled Sale. Derived values: debt follows winning commit. Boundary: Sale lifecycle and Allocation eligibility. Idempotency: per command. Concurrency: one rejects stale state. Result/error: success plus conflict. Audit: both attempts. Side effect: none. Test obligation: cancellation/allocation race.

25. Payment reversal causes debt to reappear.
   Caller context: financial-correction-capable User. Active Business context: validated. Command/query: reverse Payment. Preconditions: active Payment `1500` allocated to Sale `4000`. Records: Payment reversal and Allocation reversal effect, audit, idempotency. Canonical facts: Payment ineffective. Derived values: Sale outstanding increases from `2500` to `4000` if no other allocations exist. Boundary: reversal atomic. Idempotency: replay same reversal. Concurrency: revalidate financial state. Result/error: success. Audit: reversal reason. Side effect: none required. Test obligation: reversal debt.

26. Payment Request is delivered without Payment.
   Caller context: Payment Request-capable User. Active Business context: validated. Command/query: request delivery. Preconditions: committed Payment Request for `2500`. Records: Payment Request and side-effect attempt. Canonical facts: no Payment and no Allocation. Derived values: debt unchanged. Boundary: request lifecycle, not financial commit. Idempotency: duplicate delivery reduced. Concurrency: cancellation may conflict. Result/error: external delivery pending or delivered. Audit: request/delivery evidence. Side effect: delivery attempt. Test obligation: request no debt effect.

27. Payment Request delivery fails after authoritative creation.
   Caller context: Payment Request-capable User. Active Business context: validated. Command/query: request delivery. Preconditions: Payment Request committed. Records: side-effect attempt failed. Canonical facts: Payment Request remains; no Payment. Derived values: debt unchanged. Boundary: post-commit side effect. Idempotency: retry delivery references same request. Concurrency: retry may see cancelled request. Result/error: external delivery failed. Audit: failure evidence. Side effect: retry candidate. Test obligation: post-commit failure.

28. Expense is recorded.
   Caller context: Owner or authorized Manager. Active Business context: validated. Command/query: record Expense. Preconditions: amount `1200`, occurrence date valid, description present. Records: Expense, audit, idempotency. Canonical facts: active Expense `1200`. Derived values: daily result reduced by `1200`. Boundary: Expense command. Idempotency: duplicate replays. Concurrency: authorization revalidated. Result/error: success. Audit: Expense creation. Side effect: analytics optional. Test obligation: Expense creation.

29. Expense correction changes daily result.
   Caller context: expense-correction-capable User. Active Business context: validated. Command/query: correct or replace Expense. Preconditions: wrong Expense `1200`, replacement `1000`. Records: cancelled original, replacement Expense, audit, idempotency. Canonical facts: active Expense becomes `1000`; original retained. Derived values: daily result increases by `200` compared with prior active view. Boundary: correction atomic. Idempotency: replay replacement. Concurrency: stale correction rejects. Result/error: success. Audit: reason. Side effect: none. Test obligation: Expense correction.

30. Payment for older debt is received today.
   Caller context: Payment-capable User. Active Business context: validated. Command/query: record later Payment. Preconditions: old Sale outstanding `5000`, Payment occurrence date today. Records: Payment, Allocation, audit, idempotency. Canonical facts: Payment `5000` today. Derived values: payments received today includes `5000`; Sales recorded today unchanged. Boundary: Payment atomic. Idempotency: replay. Concurrency: outstanding revalidated. Result/error: success. Audit: Payment. Side effect: none. Test obligation: Sale-versus-Payment distinction.

31. Membership is suspended during financial confirmation.
   Caller context: User was active during preview. Active Business context: now invalid. Command/query: record Sale or Payment. Preconditions: Membership suspended before commit. Records: no financial commit. Canonical facts: access denied. Derived values: no balance change. Boundary: authorization revalidation. Idempotency: rejected outcome may be recorded. Concurrency: suspension wins. Result/error: Membership unavailable or inactive. Audit: sensitive denial. Side effect: clear/revalidate session. Test obligation: authorization revocation.

32. Business is deactivated during confirmation.
   Caller context: previously authorized User. Active Business context: Business now inactive. Command/query: record tenant-owned command. Preconditions: deactivation committed before operation. Records: no ordinary financial commit. Canonical facts: Business inactive. Derived values: no new totals. Boundary: Business-state validation. Idempotency: rejected outcome may replay. Concurrency: deactivation wins. Result/error: Business unavailable or inactive. Audit: denied attempt if sensitive. Side effect: session revalidation. Test obligation: Business deactivation.

33. Cross-tenant Customer identifier is submitted.
   Caller context: authenticated User in Business A. Active Business context: Business A. Command/query: record unpaid Sale with Customer from Business B. Preconditions: identifier exists elsewhere but not within authorized scope. Records: no Sale. Canonical facts: unchanged. Derived values: unchanged. Boundary: tenant-scoped resource resolution. Idempotency: rejected outcome may replay. Concurrency: not relevant. Result/error: resource not found within authorized scope or access denied. Audit: suspicious attempt if useful. Side effect: none. Test obligation: non-leaking cross-tenant denial.

34. Projection disagrees with canonical records.
   Caller context: authorized report viewer. Active Business context: validated. Command/query: read daily summary or Customer debt. Preconditions: projection total differs from canonical records. Records: projection/checkpoint evidence if later implemented. Canonical facts: unchanged and authoritative. Derived values: rebuilt or blocked. Boundary: read-model reconciliation. Idempotency: not applicable. Concurrency: may retry after rebuild. Result/error: projection unavailable or stale, or rebuilt success. Audit: operational integrity evidence. Side effect: projection rebuild candidate. Test obligation: projection reconciliation.

35. Customer is anonymized while financial history remains.
   Caller context: future authorized privacy actor. Active Business context: validated or legal context. Command/query: anonymize Customer. Preconditions: legal/operational rule accepted later. Records: Customer personal fields minimized, Sales/Payments/Allocations retained. Canonical facts: financial history preserved. Derived values: balances remain explainable with anonymized label. Boundary: privacy command. Idempotency: required. Concurrency: financial operations may be blocked during anonymization. Result/error: future guarded success or rejection. Audit: privacy action. Side effect: none unless export/notice later. Test obligation: anonymization history.

36. Mobile report reads the same daily-result semantics as web.
   Caller context: mobile User with report capability. Active Business context: validated exactly like web. Command/query: read daily operational summary. Preconditions: Business active and Membership active. Records: canonical Payments and Expenses or projection. Canonical facts: Payments `5000`, Expenses `1200`. Derived values: daily result `3800`; Sales recorded separate. Boundary: query authorization and projection freshness. Idempotency: not applicable. Concurrency: stale projection handled like web. Result/error: success or projection unavailable. Audit: sensitive report view if required. Side effect: analytics minimized. Test obligation: web/mobile consistency.

## 36. Future Acceptance and Test Targets

- Authorization-context construction.
- Active Business validation and remembered Business rejection.
- Cross-tenant existence protection for direct records, child references, queries, reports, and exports.
- Capability enforcement for Owner, Manager, Staff, expense-sensitive reports, and financial correction.
- Session revocation and revalidation after credential reset, compromise, Membership change, capability reduction, and Business deactivation.
- Business switching and tenant-state clearing.
- Bootstrap atomicity, idempotency, duplicate retry, and unknown outcome.
- Invitation expiration, cancellation, replay, mismatch, duplicate pending handling, and concurrent acceptance.
- Last-active-Owner concurrency.
- Customer optional non-unique phone/email and same-name duplicate warnings versus hard uniqueness.
- Anonymous fully paid Sale.
- Customer-required partial and unpaid debt.
- Inline Customer creation during Sale.
- Ad hoc Sale Items and catalog Product Sale Item snapshots.
- Server-authoritative Sale arithmetic.
- Fully paid, partial, and unpaid Sale atomicity.
- Payment and Allocation integrity.
- Allocation order: selected Sale first, oldest eligible next.
- Same-Business and same-Customer Allocation rejection.
- Overpayment and customer-credit rejection.
- Payment reversal and debt reappearance.
- Sale cancellation and Allocation race.
- Expense permissions, correction, cancellation, and daily-result impact.
- Daily-result calculation and Sale-versus-Payment distinction.
- Business-local dates and historical time-zone context.
- Idempotent replay, different-intent rejection, and unknown outcomes.
- Stable error categories and retry guidance.
- Audit evidence, audit/log/analytics separation, and secret exclusion.
- Sensitive-query field filtering.
- External-side-effect retry, deduplication, failure visibility, and provider callback verification.
- Projection freshness, rebuild, and reconciliation.
- Cross-client semantic consistency.
- Repository and application-boundary tenant enforcement.
- Business deactivation, retention, anonymization, backup, and restore contract implications.

## 37. Rejected or Deferred Alternatives

- Transport-first API design. Rejected now because route and protocol choices should follow semantic application contracts.
- Physical DTOs or schema as the contract. Rejected because it would prematurely select implementation representation.
- Business identifier as authorization. Rejected by accepted tenant and session decisions.
- Client-submitted Sale totals as authority. Rejected because server-side arithmetic protects money.
- Customer-level editable balance command. Rejected because debt must derive from canonical Sales, Payments, and Allocations.
- Payment Request as Payment. Rejected because delivery or request status does not prove money was received.
- Mobile point-of-sale parity in release one. Deferred pending product validation.
- Product restore command. Deferred until product lifecycle UX is specified.
- Customer anonymization command as normal MVP operation. Deferred pending legal and operational validation.
- Event sourcing, CQRS, microservices, distributed transactions, generic workflow engine, and speculative enterprise contract architecture. Rejected for MVP scope.

## 38. Open Questions

Product or merchant-validation questions:

- Are integer quantities enough for release one, or are fractional quantities required for grocery-style products?
- Should mobile remain limited to reports, photos, and collection assistance, or later record Sales and Payments?
- Should Staff record Expenses in some businesses?
- Should Staff see parts of daily result such as "Quanto entrou" while still hiding "Quanto sobrou"?
- Should Manager be exposed in release one?
- Which Brazilian Portuguese terms are clearest for Sale state, debt, cancellation, correction, reversal, replacement, and role names?
- When should same-name Customer warnings appear?
- Which payment method labels are required first?
- Are tenant-visible Sale and Payment numbers useful?
- Are Product SKU or barcode fields needed in release one?
- Do merchants need saved drafts before authoritative Sale confirmation?
- Do users need explicit confirmation previews for all financial commands, or only high-risk ones?
- Should Expense categories be free text or controlled labels?
- Should historical correction dates affect past operational summaries or current correction summaries?

Operational or legal-validation questions:

- Retention periods for identity, Customer, Membership, Invitation, session, audit, idempotency, backup, Payment Request, communication, and Product Photo metadata.
- User and Customer anonymization rules when financial history exists.
- Export behavior after Business deactivation.
- Support/admin access model, if any.
- Shared-device session duration.
- Mobile-device loss handling.
- Audit retention and whether rejected security-sensitive operations require long-term audit evidence.
- Idempotency-evidence retention.
- Communication-metadata retention and debt-collection legal review.
- Financial-history retention after account or Business closure.
- Backup custody, restore authorization, RPO, and RTO.
- Provider-callback dispute handling.

Intentionally deferred implementation choices:

- Programming language and application framework.
- API protocol, HTTP routes and methods, status codes, DTOs, serialization, and versioning mechanism.
- Physical schema, table/column names, identifier representation, ORM or query layer, repository interfaces, SQL constraints, migrations, transaction isolation, and locking.
- Authentication provider, credential mechanism, session storage, cookie/token design, rate-limiting implementation, and CSRF/XSS controls.
- Physical idempotency structure.
- PostgreSQL Row-Level Security adoption.
- Cache, projection storage, queue, outbox, scheduler, and background worker.
- Pix, WhatsApp, email, SMS, object storage, analytics, observability, and payment providers.
- Cloud and deployment provider.
- Offline synchronization.
- Backup and restore tooling.

## 39. Acceptance Criteria

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

## 40. Traceability

Product requirements:

- Replace notebook workflows for Sales, "fiado", Payments, Expenses, and daily results.
- Keep operations clear for merchants with low technical familiarity.
- Preserve financial trust, tenant isolation, auditability, and privacy.
- Keep the MVP deliberately narrow.
- Keep web as primary operational client and mobile as supporting client.

Related documents:

- [Product Vision](../product/vision.md)
- [MVP Scope](../product/mvp-scope.md)
- [UX Principles](../product/ux-principles.md)
- [Domain and Tenancy Specification](domain-and-tenancy.md)
- [Authentication and Business Onboarding Specification](authentication-and-business-onboarding.md)
- [Data Persistence and Tenant Enforcement Specification](data-persistence-and-tenant-enforcement.md)
- [First Critical User Journey Specification](first-critical-user-journey.md)
- [Logical Data Model Specification](logical-data-model.md)
- [Architecture Baseline](../architecture/architecture.md)
- [Domain Model Baseline](../architecture/domain-model.md)
- [Privacy and LGPD](../security/privacy-and-lgpd.md)
- [Test Strategy](../quality/test-strategy.md)
- [Tasks](../tasks.md)

Related ADRs:

- [ADR 0001: Use Spec-Driven Development and Traceable Delivery Cycles](../architecture/decisions/0001-use-sdd-and-traceable-cycles.md)
- [ADR 0002: Keep the MVP Deliberately Small](../architecture/decisions/0002-keep-mvp-deliberately-small.md)
- [ADR 0003: Make Web the Primary Client and Mobile a Supporting Client](../architecture/decisions/0003-web-primary-mobile-supporting-client.md)
- [ADR 0004: Keep Payment Providers Behind a Domain Boundary](../architecture/decisions/0004-payment-provider-domain-boundary.md)
- [ADR 0005: Represent Money Safely Without Floating Point](../architecture/decisions/0005-safe-money-representation.md)
- [ADR 0006: Use Business as the Tenant Boundary](../architecture/decisions/0006-business-as-tenant-boundary.md)
- [ADR 0007: Use Explicit Payment Allocations for Customer Debt](../architecture/decisions/0007-explicit-payment-allocations.md)
- [ADR 0008: Preserve Financial History Through Cancellation and Reversal](../architecture/decisions/0008-financial-history-cancellation-reversal.md)
- [ADR 0009: Use Business Time Zone for Operational Reporting](../architecture/decisions/0009-business-time-zone-operational-reporting.md)
- [ADR 0010: Use Global User Identity with Tenant-Scoped Memberships](../architecture/decisions/0010-global-user-tenant-memberships.md)
- [ADR 0011: Require Atomic First-Owner Business Bootstrap](../architecture/decisions/0011-atomic-first-owner-business-bootstrap.md)
- [ADR 0012: Server-Validate Active Business Context for Sessions and Requests](../architecture/decisions/0012-server-validated-active-business-context.md)
- [ADR 0013: Require Tenant Scope in Tenant-Owned Persistence Operations](../architecture/decisions/0013-tenant-scope-persistence-operations.md)
- [ADR 0014: Treat Canonical Records as Authoritative and Derived Projections as Rebuildable](../architecture/decisions/0014-canonical-records-derived-projections.md)
- [ADR 0015: Separate External Side Effects from Authoritative Commits](../architecture/decisions/0015-external-side-effects-after-commit.md)

Future implementation traceability should link:

1. Product need.
2. Approved specification or ADR.
3. Task entry.
4. Logical record and application contract.
5. Transport, persistence, or UX specification.
6. Implementation.
7. Validation evidence.

### Cycle 016 implementation profile

Cycle 016 implements only current global session inspection from this catalogue. `@sem-caderno/application` owns an application-semantic anonymous/authenticated result, a no-input inspection operation, and the narrow `CurrentSessionStatePort` used to obtain current state. Its authenticated result contains the accepted User identifier, an expiry `Date`, and an optional selected-Business identifier. It contains no HTTP, Zod, cookie, provider, persistence, Membership, role, or capability type.

`apps/server` owns the pure mapping edge from that application result to the Cycle 011 transport response. This placement follows the accepted composition rule that the server may depend on both application and contracts. It does not make Fastify or the transport DTO application authority, and it does not expose a route. The port adapter that will resolve revocable session evidence remains unimplemented.

Cycle 017 found that the no-input port cannot yet be implemented as a PostgreSQL adapter without inventing how request-scoped opaque session evidence reaches it. The persistence model defines digest-based storage, but digest/key mechanics and active-state outcomes remain deferred. A later specification must decide whether lookup evidence becomes an explicit application input or whether the port is constructed with a validated per-request capability at the server composition edge. It must also close expiry/clock and inactive-evidence outcomes without importing HTTP, cookies, PostgreSQL, or transport DTOs into the application layer.

## 41. Recommended Follow-up Specification

Recommended next cycle: Cycle 008 - Critical Journey UX Flow Specification.

Recommended next task: Task 001 - Specify Merchant-Facing Screen Flow, Copy, States, and Accessibility for the Critical Journey.

Why this should come next:

The application contracts now define the semantic commands, queries, authorization context, error categories, idempotency behavior, and read-model expectations that web and mobile clients must honor. The next dependency is to specify the merchant-facing UX flow, plain Brazilian Portuguese copy, confirmation states, error recovery, accessibility requirements, and web/mobile responsibility details before mapping contracts to a transport API or starting implementation.

Explicit non-goals for that cycle:

- No application code.
- No UI implementation.
- No high-fidelity visual design or component library.
- No HTTP routes, DTOs, or transport API.
- No physical schema, migrations, ORM, or repository implementation.
- No provider integrations.
- No mobile scope expansion without product validation.
- No MVP expansion.
