# Logical Data Model Specification

## 1. Status and Metadata

Status: Accepted for planning.

Cycle: 006 - Logical Data Model Specification.

Task: 001 - Specify Logical Records, Relationships, Constraints, and Repository Boundaries for the Critical Journey.

Created: 2026-07-31.

Scope type: implementation-independent logical data model specification.

This document translates accepted product, tenancy, authentication, persistence, and first-journey rules into logical records, relationships, invariants, repository responsibilities, and future test obligations. It does not define tables, columns, identifier types, SQL, indexes, ORM models, HTTP contracts, UI components, transaction isolation, lock syntax, provider payloads, queue implementations, or deployment configuration.

## 2. Context

Sem Caderno replaces the paper notebook used by small Brazilian merchants to record sales, "fiado", customer payments, expenses, and practical daily results. Cycles 002 through 005 established the domain rules, tenant boundary, onboarding and session behavior, persistence invariants, and first merchant-facing journey.

Cycle 006 defines the logical data model needed before API contracts, physical schema, UX flow detail, or implementation planning. The model must be precise enough to protect tenant isolation and financial trust while remaining independent of the future ORM, query layer, transport, and database design.

## 3. Goals

- Define logical records and their responsibilities.
- Separate global identity from tenant-owned authorization and operational data.
- Preserve accepted tenant, membership, financial, audit, idempotency, and side-effect invariants.
- Define canonical facts versus derived values.
- Define relationship, lifecycle, uniqueness, and reference-integrity requirements without physical schema.
- Define aggregate and consistency boundaries for critical commands.
- Define implementation-independent repository boundaries that cannot omit tenant scope.
- Define projection, backup, restore, retention, anonymization, and repair expectations.
- Update related documentation and future test targets.

## 4. Non-Goals

- No application code.
- No package manifest, workspace scaffold, dependency, or automated test.
- No physical database schema, SQL, migration, table, column, index, sequence, trigger, or view.
- No ORM model, ORM annotation, repository implementation, database client, tenant filter, or Row-Level Security policy.
- No identifier representation decision such as UUID, ULID, integer, sequence, or composite key.
- No API endpoint, GraphQL operation, RPC method, DTO, request payload, or response payload.
- No authentication, session, invitation, authorization, audit storage, idempotency storage, report, projection, backup, restore, queue, cache, outbox, or provider implementation.
- No UI component, screen layout, mobile scaffold, design-system token, or navigation behavior.
- No Pix, WhatsApp, email, SMS, analytics, product-photo storage, cloud, or payment-provider integration.
- No billing, subscription, plan, inventory, purchasing, supplier, fiscal document, bookkeeping, DRE, event sourcing, CQRS, microservice, or distributed transaction.
- No MVP scope expansion.

## 5. Terminology

Logical record: a domain persistence concept with identity, lifecycle, relationships, and invariants. A logical record may later map to one table, several tables, a document, a service boundary, or another storage shape.

Aggregate or consistency boundary: the smallest set of logical records whose invariants must be checked and committed together for one command.

Canonical fact: a durable business fact that is the source of truth, such as a Sale Item snapshot, Payment, Payment Allocation, or Expense.

Derived value: a calculated value, such as Sale paid status, Customer outstanding balance, or daily result.

Projection or read model: a stored or cached view optimized for reading. It is subordinate to canonical records and must be rebuildable.

Historical snapshot: immutable or append-only business information copied at event time so later edits do not rewrite history.

Lifecycle state: a domain status such as active, deactivated, suspended, removed, cancelled, reversed, replaced, expired, or anonymized.

Audit evidence: durable accountability information showing actor, tenant context, action, target, time, outcome, reason, and safe references.

Idempotency evidence: durable or authoritative evidence that a command was already attempted with a specific actor, tenant context, and intent.

External side-effect attempt: evidence of a post-commit attempt to send, store, notify, export, or call an external provider.

Repository boundary: an implementation-independent persistence responsibility for reading or mutating logical records while preserving tenant, authorization, consistency, and history rules.

## 6. Confirmed Inherited Decisions

- Spec-Driven Development and cycle traceability are mandatory.
- Sem Caderno is a notebook replacement, not a smaller ERP.
- The MVP remains deliberately small.
- Web is the primary operational client; mobile is supporting.
- Business is the tenant boundary.
- User identity is global and separate from tenant-owned Membership.
- Every tenant-owned record belongs to exactly one Business.
- Tenant access requires active Membership, active Business, and required capability in the same Business.
- Business identifiers, URLs, client state, cached context, remembered session context, and tenant filters alone are never sufficient authorization.
- Owner, Manager, and Staff are capability groups; Manager release-one exposure requires merchant validation.
- Staff does not receive expense, sensitive-report, export, member-management, or financial-correction capabilities by default.
- Suspended and removed Memberships deny current access but remain historically referenceable.
- Every active Business must have at least one active Owner.
- Business deactivation blocks ordinary tenant operations and requires affected sessions to revoke or revalidate.
- PostgreSQL is the accepted database direction with application-enforced tenant scoping; Row-Level Security remains deferred and not implemented.
- BRL integer minor units are authoritative; binary floating point is forbidden for financial source of truth.
- Sales, Sale Items, Payments, Payment Allocations, Payment Requests, and Expenses are distinct.
- Sale Items preserve historical commercial snapshots.
- Fully paid counter Sales may be anonymous; partially paid and unpaid Sales require a Customer.
- A Customer may be created during Sale recording.
- Product catalog setup is not required before first Sale; ad hoc Sale Items are allowed.
- Customer phone and email are optional and not conceptually unique.
- Payments use explicit Allocations to Sales.
- Allocation applies the selected Sale first and then oldest eligible outstanding Sales for the same Business and Customer.
- Cross-Business and cross-Customer Allocation is rejected.
- Customer credit and overpayment are outside the MVP.
- Payment Requests do not reduce debt and are not Payment confirmations.
- Financial corrections preserve history through descriptive edits, cancellation, reversal, replacement, or rejected unsafe operations.
- Financial records are not hard-deleted during ordinary operation.
- Sales recorded and Payments received are distinct financial events.
- Payment Allocations affect debt attribution but are not additional cash receipts.
- Daily result uses `paymentsReceivedTodayMinor - expensesTodayMinor` and is not profit, DRE, bookkeeping, or formal accounting.
- UTC instants, Business-local operational dates, and relevant historical time-zone context are preserved.
- Canonical records are authoritative; derived balances, statuses, reports, and projections are rebuildable.
- Sensitive commands require idempotency and replay protection.
- External side effects happen after authoritative commit or through equivalent retryable post-commit handling.
- Audit history is required, but the application is not event-sourced.

## 7. Modeling Principles

- Business is the tenant root for operational records.
- Global identity records do not own merchant operations.
- Tenant scope is mandatory and explicit for tenant-owned records and repositories.
- Authorization and persistence scope are related but not interchangeable. A repository can receive Business scope only from a validated application context.
- Tenant-owned child records must belong to the same Business as their parent.
- Cross-tenant reads, writes, references, aggregates, exports, jobs, and provider callbacks fail closed.
- Canonical financial records are authoritative; derived values are explainable and rebuildable.
- Historical references survive deactivation, removal, cancellation, reversal, replacement, anonymization, and ordinary correction.
- Financial mutations preserve history instead of silently overwriting financial meaning.
- External side effects never become financial authority.
- Logical records do not imply physical tables or storage structure.
- Logical relationships do not silently choose foreign-key syntax, identifier type, or index strategy.
- Read models and reports are conveniences, not source records.
- Merchant-facing language remains simple Brazilian Portuguese; internal terms such as tenant, capability, and projection should not be exposed in the UI.

Viable alternatives considered:

- Physical-first modeling. Rejected because schema choices depend on unresolved ORM, API, and persistence implementation decisions.
- Balance-as-record authority. Rejected because it hides payment history and conflicts with explicit Payment Allocations.
- Event-sourced logical model. Rejected because audit and financial history can be preserved without enterprise complexity.

## 8. Logical Record Classification

### Global Identity and Access Records

User:

- Purpose: identifies a person who can authenticate and join one or more Businesses.
- Scope: global.
- Identity: stable logical identity independent of email, display name, or phone.
- Required information: normalized primary email, verification state, account lifecycle evidence.
- Optional information: display name and future alternate verified channels.
- Lifecycle: active, recovery-restricted, compromised/review-needed, or future deactivated state if specified later.
- Canonical status: canonical identity record.
- Relationships: Memberships, Invitations by normalized email, Sessions, Recovery evidence, Audit actor references.
- Sensitive data: personal and security-sensitive identity metadata.
- Historical behavior: actor references survive Membership removal and Business deactivation.
- Deletion/anonymization: cannot erase financial actor history silently; legal handling remains future work.

Credential or Authentication Identity:

- Purpose: conceptual reference to how the User proves identity.
- Scope: global.
- Identity: stable reference to credential or managed identity, without selecting a provider.
- Required information: safe credential reference and lifecycle state.
- Forbidden information in audit/logs: passwords, password hashes, reset secrets, session secrets, full tokens.
- Lifecycle: active, rotated, reset, compromised, revoked.
- Mutation boundary: credential-sensitive changes must update revocation or revalidation state.

Email Verification Evidence:

- Purpose: proves control of the normalized MVP identity channel.
- Scope: global.
- Required information: normalized email, verification outcome, verified-at instant, safe correlation reference.
- Lifecycle: pending, verified, expired, revoked or superseded.
- Relationships: User and Invitations.
- Security rule: verification secrets are not audit payloads.

Session or Session Revocation Authority:

- Purpose: determines whether a signed-in client interaction remains valid.
- Scope: global with selected Business reference only after revalidation.
- Required information: User reference, lifecycle or revocation state, expiration expectation, safe device/client category when useful.
- Derived/cached information: active Business and capabilities may be remembered but must be revalidated.
- Sensitive data: session secrets must not appear in audit or ordinary logs.

Recovery Evidence:

- Purpose: supports credential reset and compromise response.
- Scope: global.
- Required information: User reference, recovery intent, lifecycle, outcome, safe correlation reference.
- Security rule: recovery secrets are never retained in logs or audit records.

### Tenant and Membership Records

Business:

- Purpose: tenant root and establishment profile.
- Scope: global root for one tenant; all operational children are tenant-owned by it.
- Required information: stable identity, name, active/deactivated state, required settings reference.
- Lifecycle: active or deactivated.
- Historical behavior: deactivation blocks ordinary operations but retains records.

Business Settings:

- Purpose: current operational configuration required by the Business.
- Scope: tenant-owned.
- Required information: Business-local time zone, BRL currency for release one, and future settings when specified.
- Historical behavior: time-zone context used for historical records must remain preserved even if current settings change.

Membership:

- Purpose: connects one global User to one Business with state and capability group.
- Scope: tenant-owned authorization data.
- Lifecycle: invited, active, suspended, removed, invitation_expired if represented on Membership.
- Required invariant: only active Membership authorizes access.
- Historical behavior: remains referenceable after suspension or removal.

Invitation:

- Purpose: tenant-owned request for a verified identity to join a Business.
- Scope: tenant-owned authorization data.
- Required information: Business, invited normalized email, intended capability group, inviter, lifecycle, expiration.
- Security rule: invitation secret is separate from safe historical evidence.

Capability or Role Assignment:

- Purpose: records the effective authorization group or explicit capability assignment for a Membership.
- Scope: tenant-owned.
- Lifecycle: current effective state plus audit history for changes.
- Decision: current authorization may be updated, but changes require audit evidence and session revalidation.

Business Bootstrap Evidence:

- Purpose: connects first-owner command identity, committed Business, initial Owner Membership, required settings, and audit evidence.
- Scope: global command context plus tenant-owned committed result.
- Lifecycle: completed, rejected, failed, unknown until rediscovered.
- Role: idempotency and recovery after repeated or uncertain first-owner submission.

### Merchant Operational Records

Customer:

- Purpose: identifies a buyer in one Business, especially for debt.
- Scope: tenant-owned.
- Required information: display name.
- Optional information: phone, email, notes when later specified.
- Lifecycle: active, deactivated, anonymized where legally and operationally valid.
- History: financial relationships survive edits, deactivation, and anonymization.

Product:

- Purpose: current catalog item for faster Sale Item capture.
- Scope: tenant-owned.
- Required information: display name and current sale information when used.
- Optional information: photo metadata, SKU/barcode only after later specification.
- Lifecycle: active or deactivated.
- History: edits do not rewrite Sale Item snapshots.

Product Photo Metadata:

- Purpose: tenant-owned reference to an external object associated with a Product.
- Scope: tenant-owned.
- Required information: Product and Business relationship plus safe object reference when implemented later.
- Provider boundary: storage provider, object keys, and upload flow remain deferred.
- Security: access must be Business-scoped.

Sale:

- Purpose: records a Business sale.
- Scope: tenant-owned.
- Required information: Business, operational date, recorded-at instant, actor, lifecycle, Sale Items.
- Customer rule: optional only for fully paid anonymous counter Sale; required for partial or unpaid Sale.
- Canonical/derived: Sale itself and items are canonical; paid/partial/unpaid classification is derived.

Sale Item:

- Purpose: line inside a Sale.
- Scope: tenant-owned through Sale and Business.
- Required information: snapshot name or ad hoc description, unit price snapshot, integer quantity for first journey, line total.
- Optional information: Product reference, discount, adjustment.
- History: later Product edits or deactivation do not change snapshots.

Payment:

- Purpose: canonical fact that money was received.
- Scope: tenant-owned.
- Required information: Business, amount, method classification, occurrence date, recorded-at instant, actor.
- Customer rule: required when paying Customer debt; may be tied to anonymous fully paid Sale only inside same atomic Sale command.
- History: reversal/replacement preserves original Payment.

Payment Allocation:

- Purpose: applies a Payment amount to a Sale.
- Scope: tenant-owned.
- Required information: Payment, Sale, allocated amount, Business, lifecycle.
- Invariants: same Business, same Customer for debt payments, amount within Payment and Sale outstanding limits.
- History: corrections use reversal/replacement, not destructive rewriting.

Payment Request:

- Purpose: records a collection request prepared or sent to a Customer or Sale context.
- Scope: tenant-owned.
- Required information: requested amount, intended Customer or Sale context, status, safe delivery metadata.
- Balance effect: none until a valid Payment exists.
- Provider boundary: delivery channels and Pix/provider behavior are deferred.

Expense:

- Purpose: basic record of money leaving the Business.
- Scope: tenant-owned.
- Required information: amount, occurrence date, recorded-at instant, description or category, actor.
- Permission: Owner and authorized Manager by default; Staff excluded unless later validated.
- History: correction of financial meaning uses cancellation/replacement.

### Integrity and Operational Evidence

Audit Record:

- Purpose: accountability evidence for sensitive domain, security, membership, financial, export, and correction actions.
- Scope: global or tenant-owned depending on action; tenant operations carry Business context.
- Canonical status: audit evidence, not event-sourcing source of financial state.
- Data minimization: store safe references instead of secrets or unnecessary payloads.

Idempotency Evidence:

- Purpose: prevents duplicate sensitive commands and supports unknown-outcome recovery.
- Scope: global, tenant-owned, or mixed depending on command.
- Required information: actor, Business when applicable, command identity, intent equivalence, outcome reference, timestamps.
- Security: command identity cannot establish authorization by itself.

External Side-Effect Attempt:

- Purpose: tracks post-commit delivery, notification, storage, analytics, export, or provider attempts.
- Scope: associated with the committed canonical record and Business when applicable.
- Required information: safe correlation, attempt state, channel category, retry information.
- Balance effect: none.

Projection Checkpoint or Reconciliation Evidence:

- Purpose: records rebuild or reconciliation state for derived views when needed.
- Scope: tenant-owned for tenant projections.
- Rule: projections remain subordinate to canonical records.
- Use only when a later persistence or operations specification justifies it.

Export or Backup Metadata:

- Purpose: records authorization, scope, timing, and integrity evidence for export or restore-related operations.
- Scope: tenant-owned for Business exports; operational for full backup.
- Rule: backup and export are separate concepts and must preserve tenant isolation.

## 9. Global Identity Boundary

User is global identity, not Business-owned data. A User may exist before creating or joining a Business. A User may have multiple simultaneous Memberships, one per Business relationship, but each Membership authorizes only its own Business.

Normalized email is the conceptual MVP identity channel. It must identify one global User once verified, but exact normalization and credential storage remain future implementation decisions. Phone identity, social login, and managed identity provider choices are deferred.

Invitations match by normalized verified email. A User with a matching verified email may accept the Invitation if the Invitation is valid and the Business is active. A User whose email does not match must not gain Membership and should receive safe guidance without account enumeration.

Historical actor references should retain stable User and Membership references even after:

- Membership suspension.
- Membership removal.
- Business deactivation.
- User email change.
- Future User deactivation or anonymization.

Anonymization may remove unnecessary personal display data later, but it must not erase the fact that a historical actor performed a financial, authorization, or sensitive action. Legal and operational rules for identity anonymization remain deferred.

## 10. Business Tenant Root and Settings

Business is the tenant root. Every tenant-owned operational, authorization, audit, idempotency, side-effect, projection, export, and photo metadata record belongs to exactly one Business unless explicitly global.

Required Business facts for release-one readiness:

- Stable logical Business identity.
- Business name.
- Active or deactivated state.
- Required Business settings.
- At least one active Owner Membership while active.

Required Business settings:

- Operational IANA time zone.
- Currency fixed to BRL for release one.

Current settings and historical effective settings must be distinguishable conceptually. Changing the current Business time zone may affect future records, but it must not rewrite stored historical Business-local operational dates or the time-zone context used to derive them.

Deactivation:

- Blocks ordinary tenant operations.
- Invalidates or requires revalidation of active sessions.
- Does not erase financial, membership, audit, idempotency, or side-effect history.
- May be reversible only under later rules and appropriate capability.
- Does not remove the need for export, retention, and legal handling.

Business hard deletion is outside ordinary operation because it can destroy financial explanation, audit evidence, and tenant history.

## 11. Membership and Capabilities

Membership connects one global User to one Business. It is tenant-owned authorization data and may remain historically referenceable after current access ends.

Accepted logical states:

- invited: invitation-related state if represented on Membership.
- active: authorizes access according to capabilities.
- suspended: denies access, may be reversible.
- removed: denies access, preserved for history; reinvitation behavior must preserve lifecycle history.
- invitation_expired: no access; may be represented on Invitation only or on Membership if the later model chooses that shape.

The logical model does not decide whether invitation state lives only on Invitation, only on Membership, or both. The invariant is that an expired, cancelled, mismatched, already-used, or deactivated-Business invitation cannot authorize access.

Capability groups:

- Owner: all accepted Business capabilities, including member management, financial correction, expense recording, sensitive reports, export, and deactivation.
- Manager: defined group pending merchant validation for release-one exposure.
- Staff: customer/product management, Sale recording, Payment recording, Payment Request preparation, and operational reports by default.

Staff default exclusions:

- Expense recording.
- Sensitive financial reports such as "Quanto sobrou".
- Data export.
- Member management.
- Business settings.
- Financial correction/reversal.
- Business deactivation.

Last-active-Owner invariant:

- Every active Business must have at least one active Owner Membership.
- Self-removal, suspension, removal, demotion, concurrent Owner changes, and reactivation must evaluate this invariant inside the authoritative consistency boundary.
- Application pre-checks are useful for guidance but insufficient under concurrency.
- Business deactivation may stop ordinary operations, but the deactivation action itself must be authorized and audited.

Role or capability changes may update current Membership authorization state, but the previous state must remain auditable. Cached session capabilities cannot override current persisted authorization state.

## 12. Invitation Lifecycle

Invitation is a tenant-owned request for an identity to join a Business.

Required logical facts:

- Inviting Business.
- Intended normalized email.
- Intended capability group or role.
- Inviting actor.
- Created-at instant.
- Expiration rule.
- Lifecycle status.
- Safe delivery and resend references if applicable.

Lifecycle behavior:

- prepared or invited: can be delivered or accepted if valid.
- accepted: consumed and cannot be replayed.
- cancelled: no longer valid.
- expired: no longer valid.
- delivery_failed: may be retried if the Invitation is still valid.

Acceptance must:

- Verify the Business is active.
- Verify the accepting User controls the matching normalized email.
- Consume the Invitation and create or activate the correct Membership atomically.
- Reject replay, mismatch, expiration, cancellation, duplicate active Membership conflict, and concurrent reuse.
- Preserve audit and idempotency evidence without storing invitation secrets.

Duplicate pending Invitations for the same Business and normalized email should be idempotent or safely rejected. Reinvitation after removal must preserve history; the later physical model may decide whether it reuses a prior Membership identity or creates a new lifecycle entry.

## 13. Atomic First-Owner Bootstrap

First-owner bootstrap creates the first tenant and access path for a verified User.

Committed logical outcome:

- One active Business.
- Required Business settings, including time zone and BRL currency.
- One active Owner Membership for the verified User.
- Bootstrap audit evidence.
- Idempotency evidence linking the command to the committed result.

All of those records must commit as one authoritative consistency boundary. A Business cannot become visible as successfully created without its initial active Owner Membership. An Owner Membership cannot reference a Business that failed to commit.

Before the boundary:

- Global User may exist.
- Email verification may be complete.
- Input may be validated.

After commit:

- Session may select the new Business after server-side validation.
- Welcome messages, analytics, emails, or other side effects may be attempted.
- Side-effect failure does not invalidate the bootstrap.

Failure and retry:

- If the transaction fails, no partial Business or Owner Membership is authoritative.
- If the response is unknown, the system must rediscover by idempotency evidence and User context.
- Same command identity with same intent returns or references the committed result.
- Same command identity with different intent is rejected.

## 14. Customer

Customer belongs to exactly one Business and represents a buyer, especially when debt exists.

Required information:

- Stable logical Customer identity within one Business.
- Display name.
- Active, deactivated, or anonymized lifecycle where applicable.

Optional information:

- Phone.
- Email.
- Notes or contact metadata when specified later.

Rules:

- Phone and email are optional and not unique in the MVP.
- Same-name Customers are allowed.
- Duplicate detection is a warning or search UX concern, not a hard uniqueness rule unless later specified.
- A Customer may be created during Sale recording.
- A partially paid or unpaid Sale requires a Customer.
- A fully paid counter Sale may be anonymous when no future debt tracking is needed.
- Customer changes do not rewrite historical Sale, Payment, Allocation, or Payment Request facts.
- Customer deactivation blocks new debt association unless later specified, but preserves history.
- Customer anonymization may remove unnecessary personal data while preserving financial relationships and audit references.
- Cross-Business Customer references fail closed without revealing whether the Customer exists elsewhere.

## 15. Product

Product belongs to exactly one Business and represents current catalog information used to speed up Sale Item capture.

Required information:

- Stable logical Product identity within one Business.
- Current display name.
- Active or deactivated state.

Optional information:

- Current suggested price.
- Product photo metadata.
- SKU/barcode only after future product specification.

Rules:

- Product catalog setup is not required before first Sale.
- A Sale Item may reference a Product or use an ad hoc description.
- Product edits do not rewrite historical Sale Item snapshots.
- Product deactivation prevents future selection by default but keeps historical references.
- Product-photo storage and access behavior require a later specification.
- Inventory, purchasing, suppliers, stock reservations, and cost accounting remain outside the MVP.

## 16. Sale

Sale is the canonical record of a Business sale.

Required logical facts:

- Business.
- Sale lifecycle state.
- Business-local operational date.
- Recorded-at UTC instant.
- Recording actor User and Membership where available.
- One or more Sale Items.
- Customer reference when debt exists.
- Cancellation, replacement, or correction references when applicable.
- Idempotency evidence for duplicate-submit protection where applicable.

Customer rule:

- Fully paid anonymous counter Sale is allowed only when Payment is recorded in the same atomic command and no future debt tracking is needed.
- Partially paid and unpaid Sales require Customer.

Canonical versus derived:

- Sale creation, lifecycle, operational date, actor, Customer reference, and Sale Item snapshots are canonical.
- Paid, partially paid, and unpaid labels are derived from Sale total, effective active Allocations, and Sale lifecycle.
- Outstanding debt is derived.

Lifecycle:

- active: counts according to Sale Items and effective Allocations.
- cancelled: preserved but excluded from active Sales recorded and outstanding debt unless a later report explicitly shows cancelled records.
- replaced: original remains referenceable and a replacement Sale carries the corrected facts.

Concurrency:

- Sale cancellation and Payment Allocation against the same Sale cannot silently both succeed if they conflict.
- Commands must re-read authoritative state inside the consistency boundary.

## 17. Sale Item and Historical Snapshots

Sale Item belongs to the same Business as its Sale.

Required logical facts:

- Parent Sale.
- Business through parent Sale.
- Name snapshot or ad hoc description.
- Unit price snapshot in BRL minor units.
- Quantity.
- Line total in BRL minor units.
- Lifecycle or effective state if correction requires item replacement.

Optional facts:

- Product reference.
- Discount amount.
- Adjustment amount.

Rules:

- If Product is referenced, the Sale Item snapshots the product name and price used at sale time.
- If no Product is referenced, the Sale Item requires an ad hoc merchant-entered description.
- Integer quantity is assumed for the first critical journey.
- Fractional quantity remains a product-validation question and would require scaled integer or safe decimal quantity rules.
- Line total must be calculated without binary floating point.
- Zero or negative line totals are invalid in the MVP unless a later adjustment model explicitly allows them.
- Duplicate lines are allowed when they reflect the merchant's intended entry; future UX may combine or warn.
- Product rename or deactivation has no effect on historical Sale Items.

Logical arithmetic:

```text
saleItemLineTotalMinor =
  unitPriceMinor * integerQuantity
  - itemDiscountMinor
  + itemAdjustmentMinor
```

Discount and adjustment values must be validated so the line total remains positive.

## 18. Payment

Payment is the canonical cash-receipt fact. It is not a request, allocation, projection, or provider message.

Required logical facts:

- Business.
- Amount in BRL minor units.
- Payment method classification.
- Business-local occurrence date.
- Recorded-at UTC instant.
- Recording actor User and Membership where available.
- Customer when the Payment pays Customer debt.
- Lifecycle state.
- Reversal, replacement, or correction references when applicable.
- Idempotency evidence for duplicate-submit protection where applicable.

Rules:

- Payment method labels are conceptual and need user-facing validation.
- Manual Pix is treated like other manually confirmed methods after the merchant records receipt.
- A Payment Request does not create Payment.
- Payment amount must be positive.
- Overpayment is rejected because Customer credit is outside MVP.
- Reversal makes the Payment ineffective for current balance while preserving history.
- Wrong amount, method, date, or Customer correction uses reversal/replacement or explicit correction according to financial meaning.
- Duplicate Payment submission after timeout must return the prior committed result or reject conflicting intent.

## 19. Payment Allocation

Payment Allocation applies part of a Payment to one Sale.

Required logical facts:

- Business.
- Payment reference.
- Sale reference.
- Allocated amount in BRL minor units.
- Lifecycle state.
- Creation or reversal actor/time evidence.

Invariants:

- Payment and Sale must belong to the same Business.
- Debt Payment and allocated Sale must belong to the same Customer.
- Allocation to an anonymous Sale is allowed only inside the same fully paid anonymous Sale command.
- Allocation amount must be positive.
- Total active Allocations from one Payment must not exceed effective Payment amount.
- Total effective Allocations to one Sale must not exceed eligible Sale outstanding amount.
- Allocation to cancelled, replaced, reversed, or otherwise ineligible Sales is rejected.
- Cross-Business and cross-Customer Allocation is rejected even if identifiers exist.

Allocation order:

- Apply the merchant-selected Sale first.
- Apply any remaining amount to oldest eligible outstanding Sales for the same Business and Customer.
- Reject any remainder that would create customer credit.

Logical formulas:

```text
activeAllocatedToSaleMinor =
  sum(activeAllocationAmountsForSaleMinor)
  - sum(reversedAllocationAmountsForSaleMinor)

activeAllocatedFromPaymentMinor =
  sum(activeAllocationAmountsFromPaymentMinor)
  - sum(reversedAllocationAmountsFromPaymentMinor)

paymentUnallocatedMinor =
  paymentAmountMinor - activeAllocatedFromPaymentMinor
```

Allocation correction requires reversal/replacement or explicit audit-preserving correction, not silent rewriting.

## 20. Debt and Balance Derivation

Debt is a derived value from canonical Sales, Sale Items, Payments, Allocations, and lifecycle records. It is not an independent editable balance.

Canonical formulas:

```text
saleTotalMinor =
  sum(effectiveSaleItemLineTotalMinor)
  - acceptedSaleLevelDiscountMinor
  + acceptedSaleLevelAdjustmentMinor

effectiveAllocatedToSaleMinor =
  sum(activeAllocationAmountsForSaleMinor)
  - sum(reversedAllocationAmountsForSaleMinor)

saleOutstandingMinor =
  max(0, saleTotalMinor - effectiveAllocatedToSaleMinor)

customerOutstandingMinor =
  sum(saleOutstandingMinor for active, non-cancelled Sales for that Customer)
```

Derived Sale classification:

- paid: active Sale total is positive and outstanding amount is `0`.
- partially paid: active Sale has allocation greater than `0` and outstanding amount greater than `0`.
- unpaid: active Sale has no effective allocation and outstanding amount equals Sale total.
- cancelled: lifecycle state overrides the payment classification for ordinary debt and report views.

Projection rules:

- Cached balances and lists are read models only.
- Projection disagreement with canonical records must be resolved in favor of canonical records.
- Rebuild must preserve Business scope and historical time-zone context.
- Payment Requests do not reduce debt.
- Payment Allocations attribute debt reduction but are not cash receipts.

## 21. Payment Request

Payment Request is a tenant-owned collection request. It may be prepared for a Customer, a specific Sale, or a Customer balance context according to later journey details.

Required logical facts:

- Business.
- Intended Customer.
- Optional Sale context.
- Requested amount in BRL minor units.
- Created-at UTC instant.
- Business-local date when relevant for merchant history.
- Requested delivery channel category when applicable.
- Lifecycle status.
- Safe correlation to delivery attempts.

Possible lifecycle statuses:

- prepared.
- pending_delivery.
- delivered.
- delivery_failed.
- expired.
- cancelled.

Rules:

- Payment Request does not reduce debt.
- Delivery does not prove receipt.
- A later verified Payment may reference the Payment Request for reconciliation, but Payment remains the cash-receipt fact.
- Future provider callbacks require authentication, tenant mapping, deduplication, and internal reconciliation before financial effect.
- Secrets, full tokens, and unnecessary Customer personal data must not appear in audit or logs.

## 22. Expense

Expense is the canonical record of money leaving the Business for basic operational purposes.

Required logical facts:

- Business.
- Amount in BRL minor units.
- Business-local occurrence date.
- Recorded-at UTC instant.
- Description or category.
- Recording actor User and Membership where available.
- Lifecycle state.
- Correction, cancellation, or replacement reference when applicable.

Rules:

- Owner may record and correct Expenses.
- Manager may record or view Expenses only if exposed with matching capability.
- Staff does not record Expenses or view expense-sensitive daily result by default.
- Amount must be positive.
- Changing description only may be a descriptive edit with audit.
- Changing amount, occurrence date, or financial meaning uses cancellation/replacement or correcting record.
- Expense affects "Quanto saiu" and daily result according to Business-local occurrence date.
- Financial Expense records are not hard-deleted during ordinary operation.
- Suppliers, accounts payable, purchasing, receipts, attachments, tax, and accounting are outside MVP.

## 23. Daily-Result Derivation

Daily result is a practical operational answer, not formal accounting.

Canonical sources:

- Sales recorded during the Business-local day: active Sales by stored operational date.
- Payments received during the Business-local day: active Payments by stored occurrence date.
- Expenses during the Business-local day: active Expenses by stored occurrence date.
- Outstanding debt created: derived from Sales and Allocations for Customers when useful.

Canonical formula:

```text
dailyResultMinor =
  paymentsReceivedTodayMinor - expensesTodayMinor
```

Rules:

- Sale is not automatically cash receipt.
- Payment is the cash receipt.
- Allocation is not another receipt.
- Payment Request is not a receipt.
- Cancelled Sales are excluded from ordinary active Sales totals.
- Reversed Payments are excluded or netted according to the accepted reversal view.
- Corrected Expenses use the effective active Expense records.
- Late-entered operations use the stored Business-local occurrence date for operational reports and the recorded-at instant for audit.
- Expense-sensitive daily result requires the appropriate capability.
- Reports and projections must be rebuildable from canonical records.

Example:

- Today receives R$ 50,00 for an old debt: `paymentsReceivedTodayMinor = 5000`.
- Today records Expenses of R$ 12,00: `expensesTodayMinor = 1200`.
- Today records no new Sales: `salesRecordedTodayMinor = 0`.
- Daily result is `5000 - 1200 = 3800`, displayed as R$ 38,00.
- The report may show Sales recorded separately, but it must not treat the old-debt Payment as a Sale recorded today.

## 24. Audit Evidence

Audit evidence records accountability for sensitive actions. It is not a generic event store and is not ordinary application logging.

Required logical facts when applicable:

- Actor User.
- Actor Membership.
- Business.
- Action category.
- Target logical record reference.
- Timestamp.
- Outcome.
- Reason or safe reference.
- Before/after security-relevant values or safe summaries where useful.
- Correlation with idempotency evidence.
- Client category or origin when useful.

Audit must cover:

- Business bootstrap, deactivation, and reactivation.
- Invitation lifecycle.
- Membership activation, suspension, reactivation, removal, and capability change.
- Rejected last-active-Owner changes.
- Session revocation and credential-sensitive events.
- Cross-tenant or sensitive authorization denials when security value justifies retention.
- Sale cancellation, replacement, and financial correction.
- Payment creation, reversal, correction, and Allocation changes.
- Expense cancellation and correction.
- Export actions.
- Future provider-confirmation reconciliation.

Audit and ordinary logs must not contain:

- Passwords.
- Password hashes.
- Reset secrets.
- Invitation secrets.
- Session secrets.
- Full tokens.
- Provider secrets.
- Unnecessary Customer personal data.
- Full financial payloads when safe references are sufficient.

## 25. Idempotency Evidence

Idempotency evidence is required for commands where retry or double-submit could create duplicate tenant, authorization, or financial state.

Required for:

- First-owner bootstrap.
- Invitation acceptance.
- Fully paid Sale.
- Partially paid Sale.
- Unpaid Sale.
- Later Payment.
- Expense creation.
- Financial cancellation, reversal, replacement, or correction.
- Future provider callback handling.
- Export request.

Logical command identity includes:

- Actor User.
- Business when applicable.
- Command category.
- Intent or payload equivalence.
- Client or request correlation when useful.
- Outcome reference.

Rules:

- Same command identity and same intent returns or references the same committed result.
- Same command identity with different intent is rejected.
- Failed and unknown outcomes must be retried by rediscovering authoritative records before creating new ones.
- Idempotency evidence must be scoped to the correct User and Business.
- Client-generated command identity never establishes authorization.
- Retention duration remains an operational/legal choice, but evidence must last long enough to handle ordinary retry, timeout, and provider replay windows.
- Idempotency evidence may correlate with audit evidence but does not replace it.

## 26. External Side-Effect Attempts

External side effects are not authoritative financial state.

Future side effects include:

- Invitation email.
- Recovery email.
- WhatsApp collection message.
- Pix/payment-provider interaction.
- Product-photo storage.
- Analytics emission.
- Export generation.
- Notification delivery.

Rules:

- Authoritative domain commit happens before dependent side effects.
- Post-commit work must be retryable and deduplicated where possible.
- Side-effect failure is represented as delivery or processing state, not as rollback of a valid financial transaction.
- External provider callbacks are evidence that require authentication, tenant mapping, deduplication, and reconciliation before internal effect.
- Side-effect payloads must minimize personal, financial, and secret data.
- A transactional outbox or equivalent remains a future implementation candidate, not an accepted physical design.

## 27. Logical Relationships and Cardinalities

- One User may have zero, one, or many Memberships.
- One Business has one or many Memberships over time.
- One active Business must have at least one active Owner Membership.
- One Membership belongs to exactly one User and exactly one Business.
- One Invitation belongs to exactly one Business and targets one normalized email.
- One Invitation may activate one Membership or be rejected/expired/cancelled.
- One Business owns many Customers, Products, Sales, Payments, Allocations, Payment Requests, Expenses, Product Photo metadata records, tenant audit records, tenant idempotency records, and tenant projections.
- One Customer belongs to exactly one Business.
- One Product belongs to exactly one Business.
- One Product may have zero or more Product Photo metadata records.
- One Sale belongs to exactly one Business.
- One Sale has one or more Sale Items.
- One Sale may reference zero or one Customer; zero is allowed only for fully paid anonymous counter Sales.
- One Sale Item belongs to exactly one Sale and may reference zero or one Product.
- One Payment belongs to exactly one Business.
- One debt Payment references one Customer.
- One Payment has one or more Allocations when it pays debt or is part of a fully paid Sale.
- One Allocation belongs to exactly one Payment and one Sale in the same Business.
- One Payment Request belongs to exactly one Business and normally references a Customer; it may also reference one intended Sale.
- One Expense belongs to exactly one Business.
- Audit, idempotency, side-effect, export, and projection records reference canonical records by safe logical identity and tenant scope where applicable.

## 28. Conceptual Uniqueness

Normalized User email:

- Scope: global.
- Type: true uniqueness for MVP identity.
- Conflict: repeated signup routes to existing identity or safe sign-in/recovery guidance.

User-Business Membership:

- Scope: one User and one Business.
- Type: one effective current Membership relationship; historical lifecycle remains preserved.
- Conflict: duplicate active Membership is rejected or resolved by existing Membership.

Invitation intent:

- Scope: Business plus normalized invited email plus pending lifecycle.
- Type: conditional uniqueness or idempotent command.
- Conflict: duplicate pending Invitation returns existing active Invitation or safe duplicate guidance.

Business bootstrap command identity:

- Scope: User plus bootstrap intent.
- Type: idempotency.
- Conflict: same intent returns committed result; different intent rejects.

Tenant-local Product identity:

- Scope: Business.
- Type: stable logical identity, not necessarily unique name.
- Conflict: same names may be allowed unless future SKU/barcode rule is accepted.

Tenant-local Customer identity:

- Scope: Business.
- Type: stable logical identity; name, phone, and email are not unique in MVP.
- Conflict: same-name or same-contact Customer may warn but not block by default.

Financial command identity:

- Scope: Business plus actor plus command intent.
- Type: idempotency.
- Conflict: duplicate Sale, Payment, Expense, reversal, or correction submission returns prior outcome or rejects different intent.

Payment Allocation duplication:

- Scope: Payment, Sale, allocation lifecycle, and command identity.
- Type: invariant plus idempotency, not user-facing uniqueness.
- Conflict: duplicate attempt must not over-allocate.

External provider callback identity:

- Scope: provider boundary plus mapped Business and provider reference when later specified.
- Type: replay protection.
- Conflict: duplicate callback is ignored or references the prior reconciled outcome.

Audit record identity:

- Scope: audit system.
- Type: stable evidence identity.
- Conflict: audit records should be append-only or tamper-aware; exact implementation deferred.

## 29. Reference Integrity

- Every tenant-owned child record must belong to the same Business as its parent.
- Tenant-owned identifiers must not be accepted without a matching validated Business context.
- Cross-tenant references are rejected without revealing whether another Business owns the record.
- Global User references do not grant tenant access.
- Historical User and Membership references may remain after suspension, removal, deactivation, or anonymization.
- Product edits and deactivation do not alter Sale Item snapshots.
- Customer edits do not alter historical Sale, Payment, Allocation, or Payment Request facts.
- Cancelled Sales, reversed Payments, reversed Allocations, and replaced records remain historically referenceable.
- Payment Allocation cannot connect unrelated Business or Customer contexts.
- Payment Request cannot become proof of Payment.
- Audit references must avoid exposing secrets or deleted personal payloads.

## 30. Aggregate and Transaction Boundaries

First-owner bootstrap:

- Records: Business, Business Settings, initial Owner Membership, audit evidence, idempotency evidence.
- Boundary: all-or-nothing.
- Invariants: active Business has Owner, verified User, same committed result for retry.
- Conflict: same command identity with different intent rejects.
- Post-commit: welcome, analytics, or notification attempts.

Invitation acceptance:

- Records: Invitation, Membership, audit evidence, idempotency evidence, session revalidation if applicable.
- Boundary: consume Invitation and create/activate Membership atomically.
- Invariants: matching verified email, active Business, no replay.
- Conflict: concurrent second acceptance rejects or returns prior outcome.

Last-active-Owner changes:

- Records: Membership, Business, audit evidence, session revalidation state.
- Boundary: re-check active Owner count inside mutation.
- Invariants: active Business retains at least one active Owner.
- Conflict: concurrent demotion/removal may reject one operation.

Fully paid Sale:

- Records: Sale, Sale Items, Payment, Allocation, audit evidence, idempotency evidence.
- Boundary: all-or-nothing.
- Invariants: total equals Payment/Allocation, no overpayment, optional Customer only when no debt remains.

Partially paid Sale:

- Records: Sale, Sale Items, Payment, Allocation, audit evidence, idempotency evidence.
- Boundary: all-or-nothing.
- Invariants: Customer required, Payment less than Sale total, remaining debt derived.

Unpaid Sale:

- Records: Sale, Sale Items, audit evidence, idempotency evidence.
- Boundary: all-or-nothing.
- Invariants: Customer required, no Payment or Allocation.

Later Payment and Allocations:

- Records: Payment, one or more Allocations, audit evidence, idempotency evidence.
- Boundary: all-or-nothing.
- Invariants: same Business, same Customer, selected Sale first, oldest eligible next, no overpayment.

Payment reversal:

- Records: Payment lifecycle/reversal, Allocation reversal effects, audit evidence, idempotency evidence.
- Boundary: Payment and Allocation effects become ineffective together.
- Invariants: restored debt reflects canonical records.

Sale cancellation or replacement:

- Records: Sale lifecycle, replacement Sale if any, affected Allocation eligibility, audit evidence.
- Boundary: cancellation must not conflict silently with new Allocation.
- Invariants: cancelled Sale no longer counts in active debt.

Expense creation or correction:

- Records: Expense, replacement/cancellation if needed, audit evidence, idempotency evidence.
- Boundary: financial meaning change preserved all-or-nothing.

Business deactivation:

- Records: Business lifecycle, session revalidation/revocation state, pending Invitations, audit evidence.
- Boundary: deactivation blocks ordinary operations and invalidates access consistently.

## 31. Repository Boundaries

Global identity access:

- Scope: global.
- Responsibilities: User, credential reference, verification, recovery, and security state.
- Requirement: must not expose tenant data merely because a User exists.

Business and Membership access:

- Scope: validated Business context for tenant-owned Membership operations.
- Responsibilities: Business state, settings, Membership state, capability group, last-active-Owner invariant.
- Requirement: suspended and removed Memberships never authorize access.

Invitation access:

- Scope: Business plus invited normalized email and safe command context.
- Responsibilities: create, expire, cancel, resend, accept, replay protection.
- Requirement: secrets are separated from safe evidence.

Customer access:

- Scope: validated Business context.
- Responsibilities: Customer profile, deactivation, anonymization references, search/read for Sale and Payment flows.
- Requirement: same-name and same-contact records are allowed unless later specified.

Product access:

- Scope: validated Business context.
- Responsibilities: current Product profile, deactivation, Product Photo metadata references.
- Requirement: historical Sale Item snapshots are never rebuilt from current Product.

Sale and Sale Item access:

- Scope: validated Business context and financial consistency boundary.
- Responsibilities: Sale creation, Sale Item snapshots, cancellation, replacement, report source reads.
- Requirement: paid status and debt are derived.

Payment and Allocation access:

- Scope: validated Business context and Customer/Sale consistency boundary.
- Responsibilities: Payment creation, Allocation creation, reversal, overpayment rejection, concurrent allocation conflict handling.
- Requirement: Payment is receipt; Allocation is debt attribution.

Payment Request access:

- Scope: validated Business context.
- Responsibilities: request preparation, lifecycle, delivery-attempt correlation, no balance effect.
- Requirement: future provider evidence cannot bypass tenant mapping.

Expense access:

- Scope: validated Business context and expense capability.
- Responsibilities: creation, descriptive edits, cancellation, replacement, report source reads.
- Requirement: Staff excluded by default.

Audit access:

- Scope: tenant or global security scope depending on event.
- Responsibilities: safe evidence for sensitive actions.
- Requirement: not ordinary logs and not event sourcing.

Idempotency evidence access:

- Scope: actor plus Business where applicable.
- Responsibilities: duplicate detection, unknown-outcome recovery, prior-result reference.
- Requirement: cannot authorize by itself.

Projection or reporting access:

- Scope: validated Business context and report capability.
- Responsibilities: derived balances, debt views, daily result, rebuild/reconciliation evidence.
- Requirement: canonical records win when disagreement occurs.

No repository boundary may allow callers to omit Business scope for tenant-owned data. Global access is exceptional and limited to identity, verification, recovery, and system data that does not contain tenant operational records.

## 32. Lifecycle and Historical Preservation

Vocabulary:

- active: usable for ordinary operations.
- deactivated: Business or Product is retained but blocked for ordinary new operations.
- suspended: Membership access is temporarily denied.
- removed: Membership access is ended while history remains.
- cancelled: financial record no longer counts for ordinary active financial views.
- reversed: previous Payment or Allocation effect is negated while history remains.
- replaced: original record remains and a new record carries corrected facts.
- expired: time-limited Invitation, recovery, session, or request is no longer valid.
- anonymized: unnecessary personal data is removed while required financial relationships remain.
- archived: retained outside ordinary active use only if later justified.
- deleted: hard removal, allowed only where legally and operationally valid and not for ordinary financial history.

Major record behavior:

- User: may be future deactivated or anonymized under legal process; financial actor references remain.
- Business: deactivated by default, not hard-deleted ordinarily.
- Membership: suspended or removed; historical references remain.
- Invitation: expires, cancels, accepts, or fails delivery; secret material is not retained in audit.
- Customer: may deactivate or anonymize; financial links remain.
- Product: may deactivate; Sale Item snapshots remain.
- Product Photo metadata: lifecycle depends on future storage spec; access remains tenant-scoped.
- Sale and Sale Item: cancellation/replacement, not ordinary hard deletion.
- Payment and Allocation: reversal/replacement, not ordinary hard deletion.
- Payment Request: cancellation/expiration/delivery failure; no debt effect; retained when tied to collection history.
- Expense: cancellation/replacement for financial meaning; descriptive edits audited.
- Audit: retained according to legal/operational policy; secrets excluded.
- Idempotency evidence: retained long enough for retry/replay windows and audit needs.
- External Side-Effect Attempt: retained long enough for retry, diagnosis, and safe user feedback.

## 33. Dates, Time Zones, and Money

Money:

- MVP currency is BRL.
- Authoritative financial amounts use integer minor units.
- R$ 1,00 is represented conceptually as `100`.
- Binary floating point is not allowed for financial authority.
- Currency association remains present conceptually even while only BRL is supported.
- Monetary amounts must be positive for Sales, Payments, Allocations, and Expenses unless an explicit correction model allows a negating record.
- Zero-value Sales, Payments, Allocations, and Expenses are invalid for the MVP.
- Sum and subtraction must protect against overflow in future implementation.
- Percentage discounts, if introduced later, must produce deterministic minor-unit amounts.

Quantity:

- First journey assumes integer quantities.
- Fractional quantity remains open.
- If accepted later, quantity must use scaled integers or safe decimals and deterministic rounding.
- Rounding occurs before persistence of the canonical Sale Item line total.

Dates and time:

- Events store UTC instants.
- Financial records store Business-local operational date.
- The Business owns its time-zone setting.
- The time-zone context used to derive historical operational dates must be preserved.
- Business time-zone changes do not rewrite historical operational dates.
- Sales use operational sale date for sales-recorded reports.
- Payments use occurrence date for payments-received reports.
- Expenses use occurrence date for "Quanto saiu" and daily result.
- Audit uses recorded-at UTC instant and may include Business-local context for explanation.
- Browser, device, and server time cannot silently replace Business time-zone rules.

## 34. Security and Privacy Implications

- Tenant isolation depends on both validated authorization context and same-Business relationship integrity.
- Direct-object reference attacks must fail closed without existence leakage.
- Mass assignment must not allow clients to change Business ownership, User references, Membership state, capability group, lifecycle state, amount fields, audit actor, or correction references outside approved commands.
- Business switching must clear or replace tenant-specific client state before showing another Business's records.
- Shared devices require visible sign-out and bounded session revalidation.
- Mobile device loss requires session revocation or revalidation behavior.
- Customer names, phone, email, purchase history, Payment history, and Payment Requests may contain personal data.
- Sales, Payments, Allocations, Expenses, daily result, exports, and backups are financially sensitive.
- Expense-sensitive reports require appropriate capability.
- Product Photo metadata and future object access are tenant-owned.
- Provider callbacks must be authenticated, tenant-mapped, and deduplicated.
- Audit, logs, analytics, diagnostics, and test fixtures must avoid secrets and unnecessary personal or financial payloads.
- Support or administrative access remains deferred and must not bypass tenant rules without separate specification.
- This specification defines design controls only and does not claim complete LGPD compliance.

## 35. Backup, Restore, Repair, and Projections

Backup expectations:

- Backups must preserve logical identities, tenant ownership, relationships, canonical financial records, audit evidence, idempotency evidence where needed, and historical time-zone context.
- Backup tooling must prevent cross-tenant leakage.
- Backup access must be restricted and auditable.
- Backup is not the same as user-facing export.

Restore expectations:

- Restore must preserve Business boundaries.
- Restore validation must re-check same-Business child relationships.
- Restore validation must re-check active Business active-Owner invariant.
- Restore validation must rebuild or verify derived balances and reports from canonical records.
- Missing future external objects, such as Product photos, require reconciliation evidence instead of destructive cleanup.

Repair expectations:

- Derived projections may be rebuilt from canonical records.
- Canonical financial invariant violations require manual operational review and preserved evidence.
- Cross-tenant inconsistency must fail closed and block affected operations until repaired.
- Active Business without active Owner is an integrity incident.
- Repair must not silently alter financial history.

## 36. Examples and Invariant Walkthroughs

1. Atomic first-owner Business bootstrap.
   Records: User, Business, Business Settings, Owner Membership, audit, idempotency.
   Ownership: User is global; Business and Membership are tenant-rooted.
   Canonical facts: active Business, BRL currency, time zone, active Owner.
   Derived values: selected Business after session revalidation.
   Invariants: no active Business without Owner.
   Boundary: all records commit together.
   Conflict/retry: same command returns committed result; different intent rejects.
   Audit: bootstrap success.
   Future test: duplicate bootstrap and unknown outcome.

2. Returning User with two Businesses.
   Records: User, two Memberships, two Businesses, Session state.
   Ownership: Memberships are tenant-owned by their Businesses.
   Canonical facts: active Memberships and active Businesses.
   Derived values: chosen active Business context.
   Invariants: remembered Business revalidated server-side.
   Boundary: session selection revalidation.
   Conflict/retry: inaccessible remembered Business is cleared.
   Audit: tenant switch only where security value justifies it.
   Future test: no cross-tenant data after switch.

3. Fully paid anonymous counter Sale.
   Records: Sale, Sale Item, Payment, Allocation, audit, idempotency.
   Ownership: all tenant-owned by same Business.
   Canonical facts: item R$ 25,00 as `2500`, quantity `1`, Payment `2500`, Allocation `2500`.
   Derived values: Sale total `2500`, outstanding `0`, status paid.
   Invariants: anonymous allowed only because fully paid in same command.
   Boundary: Sale, Payment, Allocation commit together.
   Conflict/retry: duplicate submit returns prior Sale.
   Audit: Sale and Payment creation.
   Future test: anonymous unpaid Sale rejected.

4. Fully paid Sale for an identified Customer.
   Records: Customer, Sale, Sale Items, Payment, Allocation.
   Ownership: same Business.
   Canonical facts: Sale total `3200`, Payment `3200`, Allocation `3200`.
   Derived values: Customer debt unchanged at `0`.
   Invariants: same Customer and Business.
   Boundary: fully paid Sale transaction.
   Conflict/retry: stale Customer deactivation requires re-read and rejection if ineligible.
   Audit: Sale and Payment creation.
   Future test: Customer history includes paid Sale.

5. Partially paid Sale.
   Records: Customer, Sale, Sale Items, Payment, Allocation.
   Ownership: same Business.
   Canonical facts: Sale `4000`, Payment `1500`, Allocation `1500`.
   Derived values: outstanding `2500`, status partially paid.
   Invariants: Customer required and overpayment rejected.
   Boundary: Sale and initial Payment commit together.
   Conflict/retry: duplicate command returns prior result.
   Audit: partial Sale and Payment.
   Future test: debt appears for Customer.

6. Unpaid Sale.
   Records: Customer, Sale, Sale Items, audit, idempotency.
   Ownership: same Business.
   Canonical facts: Sale `1800`, no Payment, no Allocation.
   Derived values: outstanding `1800`, status unpaid.
   Invariants: Customer required.
   Boundary: Sale command.
   Conflict/retry: duplicate submit returns prior Sale.
   Audit: unpaid Sale creation.
   Future test: payments received unchanged.

7. Customer created during Sale.
   Records: Customer, Sale, Sale Items, audit.
   Ownership: same Business.
   Canonical facts: Customer "Ana", Sale `1200`.
   Derived values: Customer balance `1200` if unpaid.
   Invariants: Customer and Sale share Business.
   Boundary: Customer creation and Sale creation may be one command if needed for all-or-nothing journey.
   Conflict/retry: same Customer name can coexist; duplicate warning is UX only.
   Audit: Customer and Sale creation.
   Future test: same-name Customer allowed.

8. Ad hoc Sale Item without Product.
   Records: Sale, Sale Item.
   Ownership: same Business.
   Canonical facts: description "Bala", price `100`, quantity `3`, line total `300`.
   Derived values: Sale total `300`.
   Invariants: description required when no Product reference.
   Boundary: Sale command.
   Conflict/retry: none beyond duplicate Sale idempotency.
   Audit: Sale creation.
   Future test: Product catalog not required.

9. Product renamed after historical Sale.
   Records: Product, Sale Item snapshot.
   Ownership: same Business.
   Canonical facts: Sale Item keeps old snapshot name.
   Derived values: reports use snapshot for historical Sale details.
   Invariants: Product edit cannot rewrite Sale history.
   Boundary: Product metadata edit.
   Conflict/retry: stale product edit may conflict by version later.
   Audit: Product rename.
   Future test: historical Sale display unchanged.

10. Later Payment allocated to one Sale.
    Records: Customer, Payment, Allocation, Sale.
    Ownership: same Business.
    Canonical facts: Sale outstanding `2500`, Payment `2500`, Allocation `2500`.
    Derived values: outstanding `0`, status paid.
    Invariants: same Customer and no overpayment.
    Boundary: Payment and Allocation commit together.
    Conflict/retry: concurrent payment may force authoritative re-read.
    Audit: Payment creation.
    Future test: balance becomes zero.

11. One Payment allocated across multiple Sales.
    Records: Customer, Payment, Allocations, Sales.
    Ownership: same Business.
    Canonical facts: Sale A outstanding `3000`, Sale B `2000`, Payment `3500`, Allocations `3000` and `500`.
    Derived values: A outstanding `0`, B outstanding `1500`, Customer debt `1500`.
    Invariants: selected Sale first, oldest eligible next.
    Boundary: Payment plus Allocations.
    Conflict/retry: stale outstanding amount rejects or reallocates only after authoritative re-read.
    Audit: Payment and Allocation creation.
    Future test: no double-counted cash receipt.

12. Overpayment attempt.
    Records: Customer, outstanding Sales.
    Ownership: same Business.
    Canonical facts: Customer debt `1200`, attempted Payment `1500`.
    Derived values: unchanged debt `1200`.
    Invariants: customer credit outside MVP.
    Boundary: Payment command rejects before commit.
    Conflict/retry: user may retry with `1200`.
    Audit: rejected sensitive financial attempt where useful.
    Future test: no Payment or Allocation created.

13. Concurrent Payments targeting the same debt.
    Records: Sale, two Payment commands, Allocation attempts.
    Ownership: same Business.
    Canonical facts: outstanding checked inside each boundary.
    Derived values: only committed Allocation reduces debt.
    Invariants: total Allocation cannot exceed Sale outstanding.
    Boundary: each Payment command.
    Conflict/retry: one succeeds; stale one rejects or must re-read.
    Audit: success and conflict.
    Future test: no over-allocation.

14. Sale cancellation racing with Allocation.
    Records: Sale, Payment, Allocation attempt, audit.
    Ownership: same Business.
    Canonical facts: Sale lifecycle and Allocation eligibility.
    Derived values: cancelled Sale does not hold active debt.
    Invariants: allocation to cancelled Sale rejected.
    Boundary: whichever command commits must make the other revalidate.
    Conflict/retry: stale command rejects.
    Audit: cancellation or rejected allocation.
    Future test: no allocation to cancelled Sale.

15. Payment reversal causing debt to reappear.
    Records: Payment, Allocations, Sale.
    Ownership: same Business.
    Canonical facts: Payment `2500` reversed; Allocation effect reversed.
    Derived values: Sale outstanding returns to `2500`.
    Invariants: reversal preserves history.
    Boundary: Payment and Allocation effects reverse together.
    Conflict/retry: reallocation must use current outstanding.
    Audit: reversal with reason.
    Future test: debt reappears without deleting Payment.

16. Payment Request delivery without Payment.
    Records: Payment Request, External Side-Effect Attempt.
    Ownership: same Business.
    Canonical facts: requested `2500`, delivered or failed status.
    Derived values: debt unchanged.
    Invariants: request is not receipt.
    Boundary: request commit before delivery attempt.
    Conflict/retry: delivery retry may be deduplicated.
    Audit: request lifecycle.
    Future test: no Payment or Allocation created.

17. Duplicate Sale submission after timeout.
    Records: Sale command idempotency, Sale, Sale Items, maybe Payment/Allocation.
    Ownership: same Business.
    Canonical facts: first committed result.
    Derived values: unchanged by duplicate.
    Invariants: same identity and same intent returns same result.
    Boundary: idempotency and Sale command.
    Conflict/retry: different intent rejects.
    Audit: first success, duplicate reference as needed.
    Future test: no duplicate financial record.

18. Same idempotency identity with a different intent.
    Records: idempotency evidence and attempted command.
    Ownership: same actor and Business context.
    Canonical facts: prior intent payload reference.
    Derived values: none.
    Invariants: command identity cannot be reused for different financial meaning.
    Boundary: idempotency check.
    Conflict/retry: reject as conflict.
    Audit: rejected duplicate identity conflict where useful.
    Future test: no overwrite of prior outcome.

19. Membership suspension during financial confirmation.
    Records: Membership, Session revocation/revalidation state, attempted Sale or Payment.
    Ownership: Membership belongs to Business.
    Canonical facts: Membership no longer active.
    Derived values: authorization denied.
    Invariants: suspended Membership cannot authorize.
    Boundary: command must validate current Membership before commit.
    Conflict/retry: user must reauthenticate or contact Owner.
    Audit: suspension and denied sensitive attempt.
    Future test: no financial mutation after suspension.

20. Concurrent removal of the last two Owners.
    Records: two Membership changes, Business.
    Ownership: same Business.
    Canonical facts: Owner count evaluated inside mutation.
    Derived values: authorization state.
    Invariants: active Business keeps active Owner.
    Boundary: each membership mutation.
    Conflict/retry: at least one removal/demotion rejects.
    Audit: success and rejected last-owner attempt.
    Future test: concurrent last-owner invariant.

21. Business deactivation with active sessions.
    Records: Business, sessions or revocation state, audit.
    Ownership: Business tenant root.
    Canonical facts: Business deactivated.
    Derived values: ordinary operations denied.
    Invariants: deactivated Business blocks tenant operations.
    Boundary: deactivation and revalidation state update.
    Conflict/retry: in-flight operations revalidate and reject.
    Audit: deactivation.
    Future test: active sessions cannot continue operating.

22. Cross-tenant Customer reference.
    Records: Sale command and Customer identifier from another Business.
    Ownership: mismatched Businesses.
    Canonical facts: no mutation.
    Derived values: none.
    Invariants: tenant-owned child references require same Business.
    Boundary: authorization and persistence validation.
    Conflict/retry: reject without existence leakage.
    Audit: sensitive denial where useful.
    Future test: direct-object reference defense.

23. Expense correction affecting daily result.
    Records: Expense, replacement/correction, audit.
    Ownership: same Business.
    Canonical facts: original `1200` cancelled/replaced by `1000`.
    Derived values: daily result increases by `200` for that occurrence date.
    Invariants: financial meaning change preserves history.
    Boundary: correction command.
    Conflict/retry: stale correction rejects.
    Audit: correction reason.
    Future test: projection rebuild uses effective Expense.

24. Payment for an older debt received today.
    Records: old Sale, today Payment, Allocation.
    Ownership: same Business and Customer.
    Canonical facts: old Sale date, Payment occurrence date today.
    Derived values: payments received today increases; sales recorded today does not.
    Invariants: Sales and Payments are distinct events.
    Boundary: Payment and Allocation command.
    Conflict/retry: current outstanding checked.
    Audit: Payment creation.
    Future test: daily result uses Payment date.

25. Business time-zone change after historical operations.
    Records: Business Settings, historical Sales/Payments/Expenses.
    Ownership: same Business.
    Canonical facts: historical local dates and time-zone context remain.
    Derived values: past reports unchanged.
    Invariants: time-zone change cannot rewrite history.
    Boundary: settings change with audit.
    Conflict/retry: future records use new setting after commit.
    Audit: settings change.
    Future test: old report dates stable.

26. Projection disagreement with canonical records.
    Records: canonical Sales/Payments/Allocations/Expenses, projection checkpoint.
    Ownership: same Business.
    Canonical facts: source records win.
    Derived values: projection rebuilt.
    Invariants: derived data subordinate.
    Boundary: rebuild or repair job with tenant scope.
    Conflict/retry: block or mark unreliable if canonical invariant violation exists.
    Audit: repair/rebuild evidence where useful.
    Future test: rebuild restores balance.

27. Customer anonymization with retained financial history.
    Records: Customer, Sales, Payments, Allocations, audit.
    Ownership: same Business.
    Canonical facts: financial amounts and relationships remain.
    Derived values: debt and reports remain explainable.
    Invariants: remove unnecessary personal data without destroying financial history.
    Boundary: legal/operational process later.
    Conflict/retry: ordinary hard deletion rejected.
    Audit: anonymization decision.
    Future test: history remains but personal fields removed according to policy.

28. External delivery failure after successful commit.
    Records: Payment Request or Invitation, External Side-Effect Attempt.
    Ownership: same Business when tenant-owned.
    Canonical facts: request/invitation committed.
    Derived values: delivery status failed or retrying.
    Invariants: side-effect failure does not undo authoritative commit.
    Boundary: domain commit before side-effect attempt.
    Conflict/retry: retry delivery with deduplication.
    Audit: delivery state where useful.
    Future test: committed financial state remains valid.

## 37. Future Acceptance and Test Targets

Future tests should cover:

- Global versus tenant-owned isolation.
- Required Business scope on tenant-owned repositories.
- Cross-tenant direct-record, child-reference, aggregate, export, job, and provider-callback rejection.
- Membership state, current authorization, uniqueness, and historical references.
- Invitation expiration, cancellation, replay, mismatch, and concurrent acceptance.
- Last-active-Owner concurrency.
- Atomic first-owner bootstrap and idempotent retry.
- Anonymous fully paid Sale.
- Customer-required partial and unpaid Sales.
- Customer creation during Sale.
- Same-name Customer allowance and optional non-unique phone/email.
- Product-backed and ad hoc Sale Items.
- Sale Item snapshots after Product edit or deactivation.
- Sale total arithmetic and invalid zero/negative values.
- Fully paid, partially paid, and unpaid Sale atomicity.
- Payment and Allocation integrity.
- Allocation order, same-Business, same-Customer, and overpayment rejection.
- Duplicate Payment prevention and unknown-outcome recovery.
- Payment reversal and Sale cancellation/Allocation race.
- Payment Request not affecting debt.
- Expense correction and Staff permission denial.
- Daily-result formula and Sales-versus-Payments distinction.
- Business-local dates and historical time-zone context.
- Idempotency conflict for same command identity with different intent.
- Audit evidence creation without secrets.
- External-side-effect retry and future provider callback deduplication.
- Projection rebuilding and canonical-record reconciliation.
- Backup and restore integrity.
- Deactivation, retention, and anonymization.
- Repository tenant-scope enforcement.

These are future obligations only; this cycle does not implement tests.

## 38. Rejected or Deferred Alternatives

Rejected:

- Physical schema in this cycle.
- Business identifier filtering as complete authorization.
- User-owned operational records.
- Editable Customer balance as source of truth.
- Customer phone/email uniqueness as a hard MVP rule.
- Product catalog as prerequisite for first Sale.
- Payment Request as Payment.
- Payment Allocation as a cash receipt.
- Customer credit from overpayment.
- Silent financial mutation.
- Ordinary hard deletion of financial records.
- Event sourcing, CQRS, microservices, or distributed transactions.
- Row-Level Security as an implemented MVP dependency.

Deferred:

- Physical schema and migration order.
- Identifier representation.
- ORM and query layer.
- API style and application contracts.
- Session storage and revocation implementation.
- Physical idempotency structure.
- Transaction isolation and lock strategy.
- Cache and projection storage.
- Queue, outbox, and background-worker implementation.
- Product-photo storage provider and lifecycle.
- Pix, WhatsApp, email, SMS, analytics, cloud, and payment providers.
- Final backup schedule, vendor, restore targets, and custody model.
- Final legal retention and anonymization policy.

## 39. Open Questions

Product or merchant-validation questions:

- Are integer quantities enough for release one, or are fractional quantities required for grocery-style products?
- Should mobile remain limited to reports, photos, and collection assistance, or later record Sales and Payments?
- Should Staff record Expenses in some businesses?
- Should Staff see parts of daily result such as "Quanto entrou" while still hiding "Quanto sobrou"?
- Should Manager be exposed in release one?
- Which Brazilian Portuguese terms are clearest for Sale states, role names, correction, cancellation, reversal, and debt?
- When should same-name Customer warnings appear?
- Which payment method labels are required first?
- Are business-local visible Sale or Payment numbers useful for merchants?
- Are Product SKU or barcode fields needed in the first release?

Operational or legal-validation questions:

- What retention periods apply to identity, Membership, financial, audit, idempotency, backup, Payment Request, and Product Photo metadata?
- What anonymization rules apply to Customers and Users with financial history?
- What export behavior remains available after Business deactivation?
- What support or administrative access model is acceptable?
- What shared-device session duration balances safety and usability?
- What legal review is required for audit, analytics, communication metadata, and collection messages?
- How long must financial history remain available after account or Business closure?
- What backup custody, restore authorization, recovery point, and recovery time targets are appropriate?

Intentionally deferred implementation choices:

- Physical schema.
- Table and column names.
- Identifier representation.
- ORM and query layer.
- API framework and API style.
- Session storage.
- Physical idempotency storage.
- Transaction isolation and locking.
- PostgreSQL Row-Level Security adoption.
- Cache and projection technology.
- Queue or outbox implementation.
- Provider selection.
- Object storage.
- Analytics platform.
- Cloud and deployment provider.
- Migration tooling.
- Concrete repository interfaces and method signatures.

## 40. Acceptance Criteria

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

## 41. Traceability

Cycle 006 traces to:

- Product vision: notebook replacement for sales, debts, payments, expenses, and practical reports.
- MVP scope: customer management, product management with optional photos, Sales, Payments, debt, basic Expenses, manual collection, reports, access control, and supporting mobile.
- ADR 0001: SDD and traceable cycles.
- ADR 0002: narrow MVP.
- ADR 0003: web primary, mobile supporting.
- ADR 0004: payment-provider boundary.
- ADR 0005: safe money representation.
- ADR 0006: Business as tenant boundary.
- ADR 0007: explicit Payment Allocations.
- ADR 0008: financial history through cancellation and reversal.
- ADR 0009: Business time zone for reporting.
- ADR 0010: global User identity with tenant-scoped Memberships.
- ADR 0011: atomic first-owner Business bootstrap.
- ADR 0012: server-validated active Business context.
- ADR 0013: tenant scope in persistence operations.
- ADR 0014: canonical records and rebuildable projections.
- ADR 0015: external side effects after authoritative commit.
- Cycle 002: Domain and Tenancy Specification.
- Cycle 003: Authentication and Business Onboarding Specification.
- Cycle 004: Data Persistence and Tenant Enforcement Specification.
- Cycle 005: First Critical User Journey Specification.

Future implementation traceability must link:

1. Product requirement.
2. Approved specification or ADR.
3. Task entry.
4. Logical record and repository boundary.
5. Application contract.
6. Implementation.
7. Validation evidence.

## 42. Recommended Follow-up Specification

Recommended next cycle: Cycle 007 - API and Application Contract Specification.

Recommended next task: Task 001 - Specify Application Commands, Queries, Authorization Context, and Error Contracts for the Critical Journey.

Why this should come next:

The logical model now defines canonical records, derived values, tenant-owned relationships, consistency boundaries, repository responsibilities, idempotency evidence, audit evidence, and side-effect boundaries. The next dependency is to define implementation-independent application contracts for commands and queries before selecting physical schema or building UI. API/application contracts should clarify input responsibilities, authorization context, command outcomes, validation errors, idempotency behavior, and read models in a way that future web, mobile, persistence, and tests can share.

Explicit non-goals for the recommended next cycle:

- No framework selection.
- No HTTP route or transport-specific DTO implementation.
- No physical schema or migration.
- No repository implementation.
- No UI implementation.
- No provider integration.
- No MVP scope expansion.
