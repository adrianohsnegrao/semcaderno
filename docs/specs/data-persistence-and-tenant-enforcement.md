# Data Persistence and Tenant Enforcement Specification

## 1. Status and Metadata

Status: Accepted for planning.

Cycle: 004 - Data Persistence and Tenant Enforcement Specification.

Task: 001 - Specify Persistence Boundaries, Tenant Enforcement, Transactional Invariants, and Audit Storage.

Created: 2026-07-31.

Scope type: implementation-independent persistence specification.

This document defines logical persistence behavior, invariants, transaction boundaries, audit expectations, failure behavior, and future test obligations. It does not define SQL, physical tables, columns, indexes, foreign keys, migrations, ORM models, repository classes, framework decorators, lock syntax, transaction isolation settings, identifier type, provider integrations, or deployment configuration.

## 2. Context

Sem Caderno replaces the paper notebook used by small Brazilian businesses to track sales, "fiado", payments, expenses, and practical reports. The persistence layer must protect tenant isolation and financial trust while staying small enough for an MVP.

Cycle 002 established Business as the tenant boundary, BRL minor units, explicit payment allocations, non-destructive financial corrections, and Business-local dates. Cycle 003 established global User identity, tenant-scoped Memberships, atomic first-owner bootstrap, server-validated active Business context, invitation behavior, session revocation requirements, and last-active-Owner invariants.

This cycle specifies how future persistence must preserve those rules without selecting a physical schema or implementation technology.

## 3. Goals

- Define persistence sources of truth.
- Classify global identity, tenant-owned, session/security, audit, and derived data.
- Define mandatory tenant enforcement for reads, writes, aggregates, exports, background work, and callbacks.
- Define logical identity, reference, and uniqueness invariants.
- Define atomic Business bootstrap and last-active-Owner persistence requirements.
- Define Membership, Invitation, and session revocation persistence behavior.
- Define financial record authority and transaction boundaries.
- Define correction, cancellation, reversal, replacement, retention, deletion, and anonymization behavior.
- Define derived balance and report consistency.
- Define money, quantity, date, instant, and time-zone persistence requirements.
- Define audit storage boundaries without event sourcing.
- Define concurrency, idempotency, side-effect, backup, restore, failure, and repair expectations.

## 4. Non-Goals

- No application code.
- No package manifests, workspace setup, or dependency installation.
- No SQL, physical database schema, indexes, constraints, migrations, or ORM models.
- No repository, transaction helper, tenant middleware, Row-Level Security policy, API, UI, session, auth, audit infrastructure, backup script, queue, cache, or provider implementation.
- No selection of Prisma, Drizzle, NestJS, Fastify, migration tooling, identifier type, lock syntax, transaction isolation, backup vendor, storage provider, payment provider, email provider, WhatsApp provider, or cloud platform.
- No event sourcing, CQRS, distributed transactions, microservices, billing, subscriptions, plans, or trials.

## 5. Terminology

Canonical record: durable source-of-truth domain record used to explain current state and history.

Derived projection: rebuildable value or view calculated from canonical records, such as balances and reports.

Tenant-owned record: durable or persisted record that belongs to exactly one Business.

Authoritative mutation boundary: conceptual transactional boundary that must commit or reject as one domain change.

Idempotency evidence: persisted or authoritative evidence used to identify safe retries and reject replay.

External side effect: action outside canonical persistence, such as sending email, generating an export file, storing a photo object, or calling a provider.

Audit record: durable record of a sensitive domain or security action. It is not an event-sourcing stream and not an ordinary technical log.

## 6. Confirmed Inherited Decisions

- Business is the tenant boundary.
- The MVP direction is one PostgreSQL database with tenant identifiers and application-enforced tenant scoping.
- PostgreSQL Row-Level Security is deferred and not implemented.
- User identity is global while Business Membership is tenant-owned.
- Tenant-owned access requires active Membership and required capability in the same Business.
- Every tenant-owned request must validate current User, Business, Membership state, Business state, and capability server-side.
- Client-provided Business identifiers, URLs, deep links, cached values, and remembered tenant context are never sufficient authorization.
- Active Business cannot have zero active Owners.
- First-owner bootstrap must atomically create active Business and initial active Owner Membership.
- Suspended and removed Memberships do not authorize access but remain historically referenceable.
- Payments use explicit allocations.
- Overpayment and customer credit are outside MVP.
- Financial corrections preserve history through cancellation, reversal, and replacement.
- Payment Requests do not reduce debt and are not payment confirmations.
- Reports distinguish Sales recorded from Payments received.
- BRL integer minor units are canonical for money.
- Financial records use UTC instants plus stored Business-local dates derived with Business time zone.
- Ordinary reports are simplified operational reports, not formal accounting or DRE.

## 7. Assumptions

- PostgreSQL remains the likely database, but this specification avoids physical DDL.
- Persistence will be centralized enough for single-transaction domain changes in the MVP.
- Derived projections may be introduced for performance but are not authoritative.
- Provider integrations will come later and must map evidence to tenant-owned records before producing financial effects.
- Legal retention periods require later legal and operational validation.

## 8. Persistence Principles and Sources of Truth

Durable persistence is required for:

- User identity and verified identity channels.
- Business, Membership, Invitation, role/capability assignment, and lifecycle history.
- Session validity or revocation state needed to enforce accepted behavior.
- Customer, Product, Product Photo metadata, Sale, Sale Item, Payment, Payment Allocation, Payment Request, Expense, corrections, cancellations, reversals, and replacement references.
- Audit records for sensitive domain and security actions.
- Idempotency and replay-prevention evidence for sensitive commands.

Authoritative stored facts:

- Stable domain identities.
- Business ownership for tenant-owned records.
- Lifecycle states and transitions.
- Financial amounts in integer minor units.
- Historical snapshots, such as Sale Item product name and unit price.
- UTC instants, Business-local dates, and time-zone context used at event time.
- Audit-safe references and reasons for sensitive changes.

Derived values:

- Sale payment status.
- Amount paid for a Sale.
- Outstanding amount for a Sale.
- Customer balance.
- Period totals.
- "Quanto sobrou".
- Onboarding completion when derived from required setup.

Ephemeral or non-authoritative values:

- Client state.
- Local cache.
- URLs and deep links.
- Form values.
- Remembered session tenant context.
- In-memory calculations before commit.
- External-provider responses until verified and mapped to canonical records.

A server-authorized mutation is not valid unless its persistence transaction also preserves domain invariants. Persistence errors must fail closed: no ambiguous partial tenant access, ownerless Business, half-created Sale, over-allocated Payment, or un-audited sensitive change may be treated as successful.

Read models and cached projections may be added later. They must be rebuildable from canonical records and must not override canonical records when disagreement occurs.

## 9. Persistence Ownership Categories

### Global Identity Data

Examples: User, verified identity channel, credential or managed-identity reference, recovery or compromise state.

Ownership: global, not tenant-owned.

Scope: one logical identity may have Memberships in many Businesses.

References: may be referenced by Memberships, audit records, sessions, and historical actor references.

Sensitivity: personal and security-sensitive.

Modification: identity attributes may change through sensitive flows; historical references keep stable User identity. Recovery and compromise state may expire or be retained according to security policy.

### Tenant-Owned Authorization Data

Examples: Business Membership, Invitation, role/capability assignment, lifecycle history, tenant-specific profile/preferences.

Ownership: exactly one Business.

Scope: valid only inside that Business.

References: references User and Business; may be referenced by audit and operational actor metadata.

Sensitivity: personal, authorization-sensitive, and sometimes security-sensitive.

Modification: role/status changes update current authorization state and create audit history. Suspended/removed Memberships remain historically referenceable. Invitations expire or are cancelled but remain auditable.

### Tenant-Owned Operational Data

Examples: Customer, Product, Sale, Sale Item, Payment, Payment Allocation, Payment Request, Expense, tenant audit references.

Ownership: exactly one Business.

Scope: all reads, writes, aggregates, exports, background work, and audit queries require explicit Business scope and authorization where applicable.

References: may reference User, Membership, Customer, Product, Sale, Payment, or related tenant records in the same Business.

Sensitivity: customer data may be personal; Sales, Payments, Allocations, and Expenses are financial.

Modification: descriptive metadata may be updated with audit. Financial meaning changes use cancellation, reversal, replacement, or correcting records. Financial history survives Business deactivation and Membership removal.

### Session and Security State

Examples: Session, revocation state, sensitive identity changes, active Business reference, replay-prevention state.

Ownership: global when tied only to User; tenant-scoped when tied to a Business, Membership, or tenant command.

Scope: used to decide whether authentication and authorization remain valid.

Sensitivity: security-sensitive.

Modification: must support expiration, explicit sign-out, credential reset, compromise response, Membership changes, capability reduction, and Business deactivation. Session secrets must not be retained in logs or audit payloads.

### Derived Data

Examples: Sale payment status, outstanding amount, Customer balance, period totals, "quanto sobrou", onboarding completion.

Ownership: same Business as source records when tenant-derived.

Scope: subordinate to canonical records.

Sensitivity: may be financial and tenant-sensitive.

Modification: rebuilt or refreshed from canonical records. If derived values disagree with canonical records, canonical records win and derived projection is repaired.

## 10. Tenant Enforcement Model

Every tenant-owned persistence operation requires explicit, validated Business scope. Tenant ownership cannot be null, ambiguous, inferred from UI state, or inferred from a global User.

Mandatory rules:

- Every tenant-owned record belongs to exactly one Business.
- A tenant-owned child belongs to the same Business as its parent.
- Cross-tenant references are rejected even if every referenced identifier exists.
- Tenant ownership is immutable after creation in ordinary MVP operation.
- Moving records between Businesses is outside the MVP.
- An active Membership and required capability must be validated for the same Business as the target record.
- Reads, writes, list queries, aggregates, exports, background jobs, provider callbacks, and audit queries require explicit tenant scope.
- Bulk operations have the same tenant guarantees as single-record operations.
- Missing tenant scope fails closed.
- Supplied Business identifiers are validated against server-established authorization context.
- Cross-tenant probing must not reveal whether another Business's record exists.
- Historical actor references do not grant current authorization.

Conceptual operation rules:

- Direct record lookup: validate Business scope and Membership before returning a tenant-owned record.
- Child-record lookup: validate both child and parent belong to the same Business.
- List query: always constrained to one authorized Business unless a future administrative specification says otherwise.
- Aggregation/report: source only records from one authorized Business.
- Update/cancellation: validate current state, Business state, Membership state, and capability inside the authoritative mutation boundary.
- Export: authorized Business scope plus audit record required.
- Background job: resolves Business from trusted persisted work record, not client payload.
- Provider callback: maps verified provider evidence to a tenant-owned request or provider reference before any domain mutation.
- Support/admin access: deferred; no support bypass exists in this specification.

Filtering by a Business identifier alone is not complete authorization. The persistence operation must also be called from an authorization context that proves current User, Membership, Business state, and capability.

## 11. Logical Identity and Reference Integrity

Every domain concept needs stable identity independent of mutable labels.

Stable identities:

- User, Business, Membership, Invitation, Session, Customer, Product, Sale, Sale Item, Payment, Payment Allocation, Payment Request, Expense, correction/reversal references, and Audit records.

Mutable values must not serve as durable identity:

- Email, Business name, Customer name, Product name, display labels, phone numbers, or user-facing reference numbers.

Historical references:

- Membership suspension/removal does not erase actor references.
- Business deactivation does not erase operational records.
- Product rename does not rewrite Sale Item snapshots.
- Customer anonymization, when later specified, must preserve financial relationships.
- Cancelled Sales and reversed Payments remain referenceable.

User-visible sale or payment references may be unique only within a Business if future specs introduce them. Tenant-owned identities may never be accepted without matching Business context.

No UUID, ULID, sequence, or physical identifier strategy is selected.

## 12. Conceptual Uniqueness Rules

Rules:

- Normalized email is globally unique for active User identity.
- One effective active Membership may exist per User and Business.
- Active pending invitations for the same normalized email and Business are idempotent or safely rejected.
- Invitation replay identity must be unique enough to reject already-used, cancelled, or expired acceptance.
- Idempotency identity for sensitive commands is scoped to actor and Business when tenant-owned.
- Session identifiers and revocation references must uniquely identify revocable session state without exposing secrets.
- Future provider references must be unique within the provider/Business context to reject duplicate confirmations.
- Customer phone/email are optional and intentionally not unique within a Business until a product specification decides otherwise.
- Product names are not unique by default. SKU/barcode behavior is deferred.
- Business-local user-visible record numbers, if introduced, need only be unique within one Business.

Concurrent conflicts:

- Absolute uniqueness conflict: one operation succeeds and the other receives safe retry/conflict behavior.
- Conditional uniqueness conflict, such as active invitation: return existing pending outcome or reject duplicate.
- Same idempotency identity with different payload: reject.

## 13. Business Bootstrap Transaction

Before the transaction:

- User identity may be created or resolved.
- Email verification may be completed.
- Required terms/notices may be accepted.
- Business input may be validated.

In one authoritative transaction:

- Create one active Business.
- Create one initial active Owner Membership for the verified User.
- Persist required Business settings, including time zone.
- Persist minimum audit evidence for Business creation and Owner assignment.
- Persist idempotency evidence for the bootstrap command.

After commit:

- Establish or update session context.
- Select the Business as active tenant after server-side validation.
- Send optional email/analytics/notification side effects.

Failure behavior:

- If transaction fails, no active Business is visible as created.
- Owner Membership must not reference a Business that failed to commit.
- Repeated submission with same idempotency identity returns or references the committed outcome.
- Same idempotency identity with different payload is rejected.
- External side effects do not participate in the transaction and must be retryable without duplicating the Business.
- Committed bootstrap attempts and rejected/failure outcomes produce audit-safe evidence.

## 14. Membership, Invitation, and Last-Owner Invariants

Last-active-Owner invariant:

```text
activeBusinessRequiresOwner =
  count(active Owner Memberships for Business) >= 1
```

The invariant must be re-evaluated inside the authoritative mutation boundary. Application pre-check alone is insufficient because concurrent requests can change Membership state between check and commit.

Protected operations:

- Self-removal.
- Suspension.
- Removal.
- Demotion.
- Role changes.
- Membership reactivation.
- Business reactivation, if specified later.
- Two Owners concurrently removing or demoting one another.

Business deactivation:

- May move Business out of ordinary active-owner enforcement for future operations only under explicit deactivation rules.
- Must be audited and block ordinary tenant operations.

Repair:

- If legacy/corrupted data violates the invariant, ordinary mutations for that Business should fail closed.
- Repair requires manual operational review and audit evidence.
- Automatic destructive cleanup is unsafe.

Membership persistence:

- Role changes mutate current authorization state and produce audit history.
- Removal preserves Membership identity for historical references.
- Reinvitation after removal or expiration may create a new Invitation and, after acceptance, reactivate or establish Membership lifecycle according to future logical model; prior history must not be erased.
- Capability changes become visible to authorization checks through current persisted Membership/capability state.
- Cached capabilities cannot override current persisted state.

Invitation persistence:

- Duplicate pending invitation is idempotent or rejected.
- Acceptance atomically consumes invitation and activates the correct Membership.
- Replay, mismatch, expired, cancelled, already-used, or deactivated-Business acceptance is rejected.
- Pending invitations become unusable when Business is deactivated.

## 15. Session Revocation and Authorization Revalidation State

Reasonable approaches:

- Fully server-stored sessions.
- Self-contained credentials with persisted revocation/version state.
- Hybrid session records.

No final library or token format is selected. Required contract:

- There is an authoritative way to determine whether a session remains valid.
- Tenant authorization is checked against current Membership and Business state.
- Authorization snapshots have bounded staleness and cannot preserve access after sensitive changes.
- Sensitive changes advance revocation/revalidation state atomically with the domain change when needed.
- Remembered Business reference is cleared or ignored after revalidation failure.
- Revocation/security audit records do not contain session secrets.

Session values:

- Authoritative: session validity/revocation state, expiration policy state, security version/revalidation marker.
- Derived: current capabilities from Membership.
- Cached: selected Business, last-used Business, display profile.
- Ephemeral: in-flight request context.
- Security-sensitive: session secret, reset secret, device/session binding evidence.
- Retained for audit: sign-in/sign-out/session revocation references without secrets.
- Eligible for deletion: expired session material after security and legal retention needs.

## 16. Financial Record Authority

### Sale

Stored facts:

- Business ownership.
- Customer reference when applicable.
- Business-local operational date and UTC instants.
- Currency.
- Lifecycle state and cancellation/replacement references.
- Sale Item snapshots.
- Accepted sale-level discount or adjustment values.
- Actor and audit references.

Derived values:

- Amount paid.
- Outstanding amount.
- Paid/partially paid/unpaid classification.

Sale total is derived from immutable or append-only Sale Item snapshots and accepted sale-level discount/adjustment. A persisted verified total snapshot may be added for integrity/performance, but it must reconcile with item snapshots. If disagreement occurs, canonical item and adjustment records trigger repair.

### Sale Item

Stored facts:

- Business ownership through Sale.
- Product reference when applicable.
- Product name snapshot.
- Unit price snapshot.
- Quantity representation.
- Discount or adjustment.
- Line total as deterministic minor-unit result or verified snapshot.

Historical Sale Items do not change after Product edits.

### Payment

Stored facts:

- Business ownership.
- Customer reference when applicable.
- Amount.
- Method.
- Occurrence Business-local date and UTC instants.
- Confirmation origin, such as manual entry or future verified provider evidence.
- Lifecycle state.
- Reversal/correction reference.
- Actor and audit metadata.

### Payment Allocation

Stored facts:

- Business ownership.
- Payment reference.
- Sale reference.
- Allocated amount.
- Lifecycle state or reversal reference.

Invariants:

- Payment, Sale, Allocation, and Customer context must belong to the same Business.
- Allocation cannot exceed Payment amount or eligible Sale outstanding debt.
- Allocation across different Customers is rejected unless a future explicit rule exists.

### Payment Request

Stored facts:

- Requested amount.
- Intended Customer/Sale/balance context.
- Delivery/status metadata.
- Expiration/cancellation status.

Payment Request has no balance effect until a valid Payment exists.

### Expense

Stored facts:

- Business ownership.
- Amount.
- Occurrence Business-local date and UTC instants.
- Description/category.
- Actor.
- Lifecycle and correction references.

Reports must not treat Payment Requests, Sales, Allocations, and Payments as interchangeable financial events.

## 17. Financial Transaction Boundaries

Required authoritative mutation boundaries:

- Sale and Sale Items are created together.
- Fully paid Sale creates Sale, Sale Items, Payment, Allocation, and audit evidence together.
- Partially paid Sale creates Sale, Sale Items, optional Payment, Allocation, and audit evidence together.
- Unpaid Sale creates Sale, Sale Items, and audit evidence together.
- Payment and its Allocations are created together.
- Overpayment is rejected before commit.
- One Payment across multiple Sales allocates only to eligible same-Business, same-Customer outstanding Sales.
- Payment reversal makes Payment and Allocations ineffective together.
- Sale cancellation rejects or resolves active Allocations inside the same correction boundary.
- Expense creation/correction persists financial state and audit evidence together.
- Duplicate Payment confirmation is rejected by idempotency/provider reference evidence.

Canonical formulas:

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

Concurrency behavior:

- If another Payment changes outstanding amount, allocation re-reads authoritative state and either adjusts within command rules or rejects.
- If Sale is cancelled while allocating, one operation wins and the other retries or rejects.
- If Payment is reversed while a report is generated, report must use a consistent read boundary or document bounded live-read behavior.
- If a command is retried after timeout, idempotency returns committed outcome or safely retries unknown outcome.
- If post-commit notification fails, canonical transaction remains committed and side effect is retried.
- If transaction fails after in-memory calculations, no financial mutation is considered successful.
- If derived values disagree with canonical records, block affected derived output or rebuild from canonical records.

## 18. Payment and Allocation Consistency

Allocation rules:

- Allocate to selected Sale first when payment comes from a Sale context.
- Otherwise allocate oldest eligible outstanding Sales first by Business-local date, creation instant, then stable identity.
- Allocate only to same Business.
- Allocate only to same Customer unless a future specification accepts an exception.
- Never allocate to cancelled Sales.
- Never allocate from reversed Payments.
- Never exceed active Payment amount or outstanding debt.
- Reject overpayment because customer credit is outside MVP.

Concurrent allocation against the same Sale must not use stale outstanding values. One operation may succeed; the other must re-read and reject or allocate only remaining eligible amount according to command rules.

## 19. Corrections, Reversals, Cancellation, and Replacement

Permitted persistence behavior:

- Descriptive metadata edit: allowed for non-financial meaning, with audit.
- Cancellation: used for incorrect Sale or Expense.
- Reversal: used for incorrect Payment or returned/failed money.
- Replacement: creates a new correct record linked to original.
- New correcting record: allowed only when later specified.
- Rejected operation: used for unsafe restoration, overpayment, cross-tenant references, or stale state.

Cases:

- Mistyped Sale amount/item: cancel original, create replacement, preserve original.
- Wrong Customer: cancel/reverse affected records and create replacement with correct Customer.
- Duplicate Sale: cancel duplicate.
- Duplicate Payment: reverse duplicate.
- Wrong Payment amount/method/date: reverse and replace unless only descriptive metadata is non-financial.
- Future Pix reversal/chargeback evidence: create provider-aware reversal after verification.
- Wrong Expense amount/date: cancel and replace.
- Wrong Expense description only: descriptive edit with audit.
- Accidental cancellation: restoration is unsafe for MVP; create replacement with audit reason.
- Reallocation after correction: explicit replacement allocation sequence; never silently move money.

Financial records ordinarily never hard-delete: Sales, Sale Items, Payments, Allocations, Expenses, Payment Requests with history, and financial audit records.

## 20. Derived Balances and Report Consistency

Canonical sources:

- Sale total: Sale Items plus accepted Sale discounts/adjustments.
- Amount paid for Sale: active Allocations from active Payments.
- Outstanding Sale amount: Sale total minus active allocated amount.
- Customer balance: outstanding active Sales for Customer.
- Sales recorded in period: active Sales by Business-local sale date.
- Payments received in period: active Payments by Business-local received date.
- Expenses in period: active Expenses by Business-local expense date.
- "Quanto sobrou": Payments received minus Expenses for the period.

Rules:

- Payment Allocation affects debt attribution; it is not a second cash receipt.
- Recording a Sale differs from receiving Payment.
- Payment Request is not a financial receipt.
- Reports must avoid double-counting Sale and Payment.
- Cancelled Sales and Expenses are excluded from ordinary totals but remain visible in history where useful.
- Reversed Payments are excluded or represented as reversal history according to report specification.
- Corrected Expenses use active replacement records.
- Cached projections must be rebuildable and validated against canonical records.
- If projection disagrees, canonical records win and projection is rebuilt or report is temporarily blocked.
- "Quanto sobrou" is an operational result, not DRE or formal accounting.

## 21. Money and Quantity Persistence

- MVP is BRL-only.
- Financial authority uses integer minor units.
- Currency association must exist conceptually even when only BRL is supported.
- Negative monetary input is rejected except through explicit reversal/adjustment concepts.
- Zero-value Sales, Payments, Allocations, and Expenses are invalid for MVP financial records.
- Discounts may be zero or positive and cannot make totals negative.
- Sum/subtraction must detect or prevent overflow.
- Rounding occurs per Sale Item before summing if fractional quantities are later accepted.
- Percentage-based calculations, if introduced later, must produce deterministic minor units before persistence.
- Allocation remainders should not occur with integer minor units; any remainder from future fractional behavior must be explicitly assigned or rejected.
- Fractional product quantities remain an open product question.
- If fractional quantities are accepted, use scaled integers or safe decimals for quantity, not binary floating point.
- JavaScript and database floating-point values are not financial authority.

No decimal library or database numeric type is selected.

## 22. Dates, Instants, and Time-Zone Persistence

Persist conceptually:

- UTC instant for creation.
- UTC instant for occurrence/receipt when different.
- Business-local operational date used for reports.
- Time-zone identifier used to derive that date.

Rules:

- Business owns time-zone setting.
- Changing Business time zone does not rewrite historical operational dates.
- Sales use Sale occurrence Business-local date.
- Payments use received Business-local date.
- Expenses use occurrence Business-local date.
- Invitations and sessions use UTC expiration instants and may display Business-local context where relevant.
- Audit uses UTC timestamp and Business context where applicable.
- Occurrence time and recording time are distinct.
- Manually entered past dates are allowed when later UX spec permits, but must be audited.
- Unreasonable future dates must be validated/rejected by future workflow specs.
- Reports use Business-local day/month boundaries.
- Daylight-saving or offset changes use stored time-zone context even if initial audience is Brazilian.
- Server, browser, or device time cannot silently replace Business time-zone rules.
- Future provider-confirmed events retain original occurrence evidence and verified mapping.

No date library is selected.

## 23. Deactivation, Retention, Deletion, and Anonymization

Definitions:

- Deactivation: disables ordinary future use while retaining history.
- Cancellation: makes a record no longer count financially while preserving it.
- Reversal: negates a Payment or similar financial effect while preserving it.
- Removal: ends current access or visibility while preserving historical references.
- Expiration: makes an invitation/session/recovery action unusable.
- Hard deletion: physical removal; not ordinary for financial history.
- Anonymization: removes unnecessary personal data while preserving required relationships.
- Archival/retention: keeps data for legal, audit, or operational reasons.

Rules:

- Business deactivation blocks ordinary access but does not erase financial history.
- Membership removal preserves historical actor references.
- Product edits/deactivation do not rewrite Sale Item snapshots.
- Customers referenced by financial history cannot simply be hard-deleted without retention/anonymization process.
- Financial records are not hard-deleted during normal operation.
- Secrets and short-lived session material must not be retained indefinitely without reason.
- Anonymization must preserve required financial relationships while removing unnecessary personal data when legally and operationally appropriate.
- Legal retention periods remain subject to legal validation.
- Product photo object retention/deletion is deferred to storage specification.
- This specification does not claim full LGPD compliance.

## 24. Audit Persistence

Audit storage is required for sensitive domain and security actions. It is not event sourcing.

Audit fields, as applicable:

- Actor User.
- Actor Membership.
- Business.
- Action.
- Target type and identity.
- Timestamp.
- Outcome.
- Reason.
- Safe before/after references.
- Correlation or idempotency reference.
- Origin/client category.
- Related reversal, cancellation, replacement, invitation, or session-revocation reference.

Audit at least:

- Business bootstrap, deactivation, and future reactivation.
- Invitation lifecycle.
- Membership activation, suspension, reactivation, removal, and role change.
- Rejected last-Owner changes.
- Session revocation.
- Credential-sensitive events.
- Cross-tenant or sensitive authorization denials when security value justifies retention.
- Sale cancellation/replacement.
- Payment creation/reversal/correction.
- Allocation changes.
- Expense cancellation/correction.
- Export actions.
- Future provider-confirmation reconciliation.

Do not store in audit or ordinary logs:

- Passwords.
- Password hashes.
- Reset secrets.
- Invitation secrets.
- Session secrets.
- Full tokens.
- Provider secrets.
- Unnecessary customer personal data.
- Full financial payloads when safe references are enough.

Domain financial history, domain audit history, security audit records, operational logs, and diagnostic traces are distinct.

## 25. Concurrency and Conflict Handling

Rules:

- Financial and authorization mutations must not use last-write-wins.
- Stale client data cannot overwrite newer financial or authorization state silently.
- Conflicts affecting money, tenant access, last Owner, or lifecycle state must reject, retry, or re-read authoritative state.
- Non-financial metadata edits may use conflict detection and user-facing retry/merge behavior later.
- Concurrent Payment recording and allocation must preserve outstanding limits.
- Concurrent Sale cancellation and allocation: one commits; the other rejects or retries.
- Concurrent Payment reversal and reallocation: re-read authoritative Payment state.
- Concurrent invitation creation: idempotent result or safe duplicate rejection.
- Concurrent invitation acceptance: one succeeds.
- Concurrent Membership suspension and tenant mutation: mutation must revalidate at commit boundary.
- Concurrent role changes: one auditable final role or conflict.
- Concurrent last-Owner changes: preserve at least one active Owner.
- Business deactivation during operation: new tenant-owned effects after deactivation are rejected.
- Repeated export creation: idempotency or safe duplicate handling.
- Concurrent correction of same financial record: one correction wins; later correction re-reads current state.

Future implementation needs conceptual version/conflict detection, but no physical version field or lock strategy is selected.

## 26. Idempotency and Replay Protection

Sensitive commands requiring idempotency/replay protection:

- Business bootstrap.
- Sale recording.
- Payment recording.
- Future provider confirmation.
- Payment reversal.
- Invitation creation.
- Invitation acceptance.
- Credential recovery.
- Export request.
- Background processing.

Rules:

- Conceptual command identity is scoped to actor and Business when tenant-owned.
- Same successful request returns or references the same committed outcome.
- Same identity with different payload is rejected.
- Failed or unknown outcomes may be retried safely.
- Replay-prevention evidence must remain available long enough for realistic retries and provider redelivery; exact retention is deferred.
- Client-generated identifiers do not establish authorization.
- Ordinary reads do not require the same idempotency behavior.
- Duplicate provider callbacks are rejected through verified provider reference and tenant-owned mapping, without choosing a provider.

## 27. External Side-Effect Boundaries

External side effects must not create partial authoritative state.

Examples:

- Invitation email.
- Password recovery email.
- WhatsApp payment request.
- Pix payment request.
- Product-photo storage.
- Analytics.
- Audit forwarding.
- Export file generation.
- Provider callback acknowledgment.

Rules:

- Canonical domain transaction commits before external side effect when the side effect depends on committed data.
- Post-commit work is retryable and idempotent where possible.
- Side-effect failure does not roll back a valid financial transaction unless the side effect was explicitly part of the domain invariant, which is not accepted for MVP.
- Duplicate side effects are reduced through idempotency evidence.
- Provider callbacks are authenticated, mapped, and deduplicated before internal financial effects.
- External provider state is evidence, not automatically internal financial source of truth.
- Transactional outbox or equivalent remains a future candidate, not an implementation decision.

## 28. Backup, Restore, and Integrity Expectations

Architecture requirements:

- Periodic durable backups are required before production use.
- Restore testing is required before claiming backup readiness.
- Recovery point and recovery time targets are future operational decisions.
- Backup and restore tooling must preserve tenant isolation.
- Tenant-specific export is not the same as full-system restore.
- Backup access requires strong access control and audit.
- Encryption in transit and at rest is an architecture requirement.
- Restore/export operations are auditable.
- Integrity verification after restore must include tenant isolation, last-owner invariant, and financial balance recalculation.
- Derived balances and projections can be rebuilt after restore.
- Missing future external objects, such as product photos, require explicit reconciliation.
- Retention and deletion of backups require legal and operational validation.

No backup vendor, storage format, cloud provider, or schedule is selected.

## 29. Failure and Repair Strategy

Fail closed when authorization, tenant scope, or commit state is uncertain.

Responses:

- Transaction rejection: no domain success; show retry/conflict later.
- Temporary persistence unavailability: block mutations and avoid partial local success.
- Unknown commit after connection loss: retry through idempotency identity.
- Duplicate retry after timeout: return committed outcome or reject conflicting payload.
- Corrupted derived projection: rebuild from canonical records.
- Orphaned external object: reconcile with canonical metadata; do not create financial state.
- Missing provider evidence: block provider-based financial confirmation.
- Cross-tenant inconsistency: block affected operations and require incident review.
- Financial invariant violation: block affected financial mutations and reports until reconciled.
- Active Business without active Owner: block ordinary high-risk mutations and repair through audited operational process.
- Audit-write failure during sensitive action: sensitive mutation must fail unless a future specification accepts compensating audit, which is not accepted here.
- Post-commit failure: retry side effect with idempotency evidence.

Repair must preserve evidence. Automatic destructive cleanup is unsafe. Manual operational review may be required for cross-tenant inconsistency, financial invariant violation, ownerless Business, or audit failure.

## 30. Security and Privacy Implications

Security requirements:

- Tenant scoping on every persistence operation.
- Protection against parameter substitution and object-reference attacks.
- Guardrails against mass assignment.
- Authorization on aggregate/export queries.
- Protection of personal data in User, Invitation, Membership, and Customer records.
- Protection of financial data in Sales, Payments, Allocations, and Expenses.
- Session/revocation data protected as security-sensitive.
- Secret separation from audit/log payloads.
- Encryption in transit and at rest as architecture requirements.
- Least-privilege database access.
- Production access controls and audited operational access.
- Backup and restore exposure controls.
- Audit access control.
- Retention/anonymization planning.
- Product-photo access isolation.
- Future provider callback verification.
- Avoid personal and financial payloads in ordinary logs.
- Safe development/test fixtures that avoid real personal or financial data where possible.

Architecture documentation does not establish LGPD compliance.

## 31. Examples and Edge Cases

1. Successful atomic first-owner Business bootstrap.
   Records: User, Business, Owner Membership, Business settings, audit, idempotency evidence.
   Scope: global identity plus new Business.
   Boundary: one bootstrap transaction.
   Outcome: success and active Business selectable.
   Audit: Business created and Owner assigned.
   Invariant: no active Business without active Owner.

2. Bootstrap failure after identity exists.
   Records: User may remain; no active Business.
   Scope: global only.
   Boundary: failed bootstrap transaction.
   Outcome: retry safely.
   Audit: failure evidence without secrets.
   Invariant: no tenant access from partial bootstrap.

3. Repeated bootstrap after unknown response.
   Records: idempotency evidence.
   Scope: User and intended Business command.
   Boundary: retry resolves committed or uncommitted outcome.
   Outcome: return existing Business or retry; do not duplicate.
   Audit: correlate attempts.
   Invariant: one command, one outcome.

4. Two Owners concurrently remove one another.
   Records: Memberships and audit.
   Scope: same Business.
   Boundary: each Membership mutation rechecks Owner count.
   Outcome: at least one operation rejects if needed.
   Audit: successful/rejected high-risk changes.
   Invariant: active Business keeps active Owner.

5. Invitation accepted concurrently twice.
   Records: Invitation, Membership, audit.
   Scope: invited Business.
   Boundary: acceptance consumes invitation once.
   Outcome: one success, one replay rejection.
   Audit: accepted and rejected replay.
   Invariant: no duplicate membership activation.

6. Membership suspended while mutation is in progress.
   Records: Membership, target record, audit.
   Scope: same Business.
   Boundary: mutation revalidates before commit.
   Outcome: mutation rejects if suspension is authoritative.
   Audit: suspension and denial where useful.
   Invariant: suspended Membership cannot authorize.

7. Cross-tenant Customer lookup.
   Records: Customer.
   Scope: requested Business context.
   Boundary: read authorization.
   Outcome: denied or generic not found.
   Audit: optional security denial.
   Invariant: no cross-tenant probing.

8. Cross-tenant Payment Allocation.
   Records: Payment, Sale, Allocation.
   Scope: one Business required.
   Boundary: allocation transaction.
   Outcome: reject.
   Audit: sensitive denial if useful.
   Invariant: allocation references same Business.

9. Fully paid Sale recorded atomically.
   Records: Sale, Sale Items, Payment, Allocation, audit.
   Scope: same Business.
   Boundary: one financial transaction.
   Outcome: committed together or rejected.
   Audit: Sale and Payment creation.
   Invariant: no half-paid partial state from failure.

10. Partially paid Sale with one Payment and Allocation.
    Records: Sale, Sale Items, Payment, Allocation.
    Scope: same Business and Customer.
    Boundary: one transaction.
    Outcome: outstanding balance derived.
    Audit: Payment allocation.
    Invariant: Payment history preserved.

11. One Payment across multiple eligible Sales.
    Records: Payment and multiple Allocations.
    Scope: same Business and Customer.
    Boundary: one allocation transaction.
    Outcome: oldest eligible Sales allocated.
    Audit: allocations created.
    Invariant: allocation does not exceed debt.

12. Two Payments concurrently target same Sale.
    Records: Sale, Payments, Allocations.
    Scope: same Business.
    Boundary: each transaction re-reads outstanding.
    Outcome: one or both succeed only within remaining debt.
    Audit: successful payments or rejected overpayment.
    Invariant: no over-allocation.

13. Attempted overpayment.
    Records: none committed for payment.
    Scope: same Business/Customer.
    Boundary: payment transaction rejects.
    Outcome: no Payment or Allocation.
    Audit: optional rejected financial action.
    Invariant: no customer credit in MVP.

14. Payment committed but notification fails.
    Records: Payment and Allocation committed.
    Scope: same Business.
    Boundary: financial transaction committed; side effect separate.
    Outcome: retry notification.
    Audit: Payment success, side-effect failure if useful.
    Invariant: external failure does not undo money record.

15. Duplicate Payment submission after timeout.
    Records: idempotency evidence.
    Scope: same actor and Business.
    Boundary: retry resolution.
    Outcome: return original Payment or reject conflicting payload.
    Audit: correlate retry.
    Invariant: no duplicate payment.

16. Payment reversal restoring debt.
    Records: Payment reversal, Allocation ineffective state, audit.
    Scope: same Business.
    Boundary: reversal transaction.
    Outcome: outstanding debt derived again.
    Audit: reversal reason.
    Invariant: history preserved.

17. Sale cancellation while Allocation is being created.
    Records: Sale, Payment, Allocation.
    Scope: same Business.
    Boundary: competing transactions.
    Outcome: one wins; other rejects/retries.
    Audit: cancellation or allocation.
    Invariant: no active allocation to cancelled Sale.

18. Product renamed after historical Sales.
    Records: Product, Sale Item snapshots.
    Scope: same Business.
    Boundary: Product metadata update.
    Outcome: future display changes; history unchanged.
    Audit: Product change if sensitive.
    Invariant: snapshots preserve history.

19. Customer removal request with financial history.
    Records: Customer, Sales, Payments.
    Scope: same Business.
    Boundary: privacy/retention process deferred.
    Outcome: hard deletion rejected; anonymization requires future policy.
    Audit: request/reference.
    Invariant: financial relationships preserved.

20. Business time-zone change after operations.
    Records: Business setting, historical financial records.
    Scope: same Business.
    Boundary: settings change.
    Outcome: future records use new zone; historical dates unchanged.
    Audit: setting change.
    Invariant: reports do not shift history.

21. Business deactivation with active sessions.
    Records: Business, session revocation/revalidation state, audit.
    Scope: same Business.
    Boundary: deactivation transaction.
    Outcome: operations blocked.
    Audit: deactivation and session effect.
    Invariant: deactivated Business blocks ordinary operations.

22. Credential reset requiring session revocation.
    Records: User security state, session revocation state, audit.
    Scope: global plus affected sessions.
    Boundary: credential reset transaction.
    Outcome: old sessions invalidated.
    Audit: reset without secrets.
    Invariant: stale sessions cannot continue silently.

23. Report projection disagrees with canonical records.
    Records: canonical financial records and projection.
    Scope: same Business.
    Boundary: report read/rebuild.
    Outcome: rebuild or block projection output.
    Audit: integrity event if serious.
    Invariant: canonical records win.

24. Restore from backup then balance verification.
    Records: all canonical and derived records.
    Scope: full system or authorized restore context.
    Boundary: restore process.
    Outcome: projections rebuilt and invariants checked.
    Audit: restore operation.
    Invariant: tenant isolation and balances verified.

25. Future provider callback delivered twice.
    Records: provider evidence, Payment/Payment Request mapping, idempotency.
    Scope: mapped Business.
    Boundary: callback processing.
    Outcome: first accepted if valid; duplicate rejected/idempotent.
    Audit: provider evidence without secrets.
    Invariant: no duplicate financial effect.

## 32. Rejected or Deferred Alternatives

Rejected for MVP:

- Treating client state or URLs as persistence authority.
- Filtering by Business identifier alone as complete authorization.
- Cross-tenant record moves.
- Customer-level manually edited debt balance.
- Hard-deleting financial mistakes.
- Last-write-wins for financial or authorization mutations.
- Event sourcing or CQRS as the MVP persistence model.
- Distributed transactions with providers.
- Row-Level Security as an implemented MVP dependency.

Deferred:

- Physical schema.
- ORM/query builder.
- Migration tooling.
- Identifier type.
- Index definitions.
- Lock syntax and isolation settings.
- Cache/queue/outbox implementation.
- Backup vendor and concrete schedule.
- Legal retention periods.
- Product-photo object lifecycle.
- Provider-specific callback formats.

## 33. Open Questions

Product or merchant validation:

- Are fractional quantities required in release one?
- Are business-local visible sale/payment numbers needed?
- Should product SKU/barcode uniqueness exist in MVP?
- Should customer phone/email uniqueness be suggested, warned, or ignored?

Operational and legal validation:

- Legal retention periods for financial, identity, audit, and backup data.
- Anonymization policy for Customers and Users with historical financial records.
- Backup recovery point and recovery time targets.
- Restore testing cadence.
- Operational repair process for corrupted data or ownerless Business.
- Support/admin access model, if any.

Deferred implementation choices:

- Prisma versus Drizzle.
- NestJS versus Fastify.
- Migration tooling.
- Identifier type.
- Physical schema and indexes.
- Transaction/locking strategy.
- Session storage and revocation implementation.
- Cache, queue, or outbox implementation.
- Backup vendor/storage.
- Object storage provider.
- Payment, email, WhatsApp, and cloud providers.
- PostgreSQL Row-Level Security adoption.

## 34. Acceptance Criteria

- Global identity data and tenant-owned data have explicit persistence boundaries.
- Every tenant-owned persistence operation requires explicit, validated Business scope.
- Cross-tenant references, reads, writes, aggregates, and exports are explicitly rejected.
- Logical identities and historical references are defined without a physical schema.
- Required uniqueness behavior is defined conceptually.
- First-owner Business bootstrap has an atomic persistence boundary.
- Last-active-Owner invariant is protected under concurrency.
- Membership and Invitation lifecycle persistence is unambiguous.
- Invitation acceptance and replay protection are defined.
- Session revocation and authorization revalidation have an authoritative conceptual basis.
- Financial stored facts and derived values are clearly separated.
- Sale and Sale Item persistence preserves historical snapshots.
- Payment and Allocation transaction boundaries are explicit.
- Overpayment remains rejected.
- Concurrent financial mutation behavior is defined.
- Cancellation, reversal, correction, and replacement preserve history.
- Balance and report derivation sources are explicit.
- Sales recorded and Payments received remain distinct financial events.
- BRL minor-unit and rounding rules are preserved.
- Business-local date and historical time-zone context are preserved.
- Deactivation, retention, deletion, and anonymization terminology is consistent.
- Financial records are protected from ordinary hard deletion.
- Audit persistence boundaries are explicit without event sourcing.
- Idempotency and replay requirements are explicit.
- External side effects are separated from authoritative commit boundaries.
- Backup, restore, and integrity expectations are documented.
- Failure and repair behavior fails safely.
- Security and privacy documentation is aligned.
- Future persistence and concurrency test targets are documented.
- Open questions are separated from accepted decisions.
- Existing documentation is internally consistent.
- No application code, dependency, manifest, physical schema, migration, ORM, API, UI, session implementation, provider integration, or scaffold is introduced.

## 35. Traceability

Product requirements:

- Replace notebook records without losing financial trust.
- Keep tenant data isolated by Business.
- Preserve financial history.
- Keep reports practical and non-accounting.
- Include security, privacy, auditability, and LGPD considerations from the beginning.

Related documents:

- [Product Vision](../product/vision.md)
- [MVP Scope](../product/mvp-scope.md)
- [Domain and Tenancy Specification](domain-and-tenancy.md)
- [Authentication and Business Onboarding Specification](authentication-and-business-onboarding.md)
- [Architecture Baseline](../architecture/architecture.md)
- [Domain Model Baseline](../architecture/domain-model.md)
- [Privacy and LGPD](../security/privacy-and-lgpd.md)
- [Test Strategy](../quality/test-strategy.md)
- [Tasks](../tasks.md)

Related ADRs:

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

## 36. Recommended Follow-up Specification

Recommended next cycle: First Critical User Journey Specification.

Recommended task: Specify the End-to-End Merchant Journey from Sign-In to Sale, Debt, Payment, and Daily Result.

Why: Cycles 002 through 004 now define tenant, auth, session, persistence, financial, audit, and consistency invariants. The next useful specification should connect them into the first merchant-facing journey without implementing code.

Non-goals for that cycle should include implementation, UI wireframes unless explicitly scoped, API contracts, database schema, provider integrations, and MVP expansion.
