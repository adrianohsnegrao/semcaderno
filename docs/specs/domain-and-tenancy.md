# Domain and Tenancy Specification

## 1. Status and Metadata

Status: Accepted for planning.

Cycle: 002 - Domain and Tenancy Specification.

Task: 001 - Specify Business Tenancy, Core Financial Records, and Audit Boundaries.

Created: 2026-07-31.

Scope type: implementation-independent domain specification.

This document defines domain rules and architecture constraints only. It does not define a physical database schema, API contract, application scaffold, migration, UI, authentication library, ORM, or provider integration.

## 2. Context

Sem Caderno replaces the paper notebook used by small Brazilian businesses to track sales, "fiado", payments, expenses, and simple reports. The product must preserve financial history while remaining simple enough for merchants who may not be comfortable with technology.

Cycle 001 established that Sem Caderno is not a smaller ERP. It also established that the MVP is deliberately narrow, web is the primary operational client, mobile is supporting, payment providers remain behind a domain boundary, and money must never use binary floating point.

This cycle reduces ambiguity around tenancy, authorization responsibilities, core records, financial history, balances, corrections, auditability, money, dates, and time zones.

## 3. Goals

- Define the business or establishment as the tenant boundary.
- Define how users access business data through memberships.
- Define a minimal authorization model for MVP responsibilities.
- Define core domain concepts without locking a database schema.
- Define paid, partially paid, and unpaid sale behavior.
- Define customer payments, payment allocation, and outstanding balance rules.
- Define overpayment behavior.
- Define expense behavior.
- Define correction, reversal, cancellation, and deletion restrictions.
- Define audit boundaries for trustworthy financial records.
- Define formulas for balances and practical reports.
- Define money, dates, timestamps, and business time-zone rules.
- Align security and privacy expectations with tenancy and financial history.

## 4. Non-Goals

- No application code.
- No database schema or migration.
- No API endpoint design.
- No UI screen design.
- No authentication or session implementation.
- No provider, Pix, WhatsApp, storage, or bank integration.
- No decision on NestJS versus Fastify.
- No decision on Prisma versus Drizzle.
- No deployment or infrastructure design.
- No formal accounting model, DRE, tax, inventory purchasing, or ERP module design.

## 5. Terminology

Business: the small establishment using Sem Caderno. It is the tenant boundary.

User: a person who authenticates into Sem Caderno.

Membership: the relationship that authorizes a user to access one business with a role and status.

Tenant-owned record: a record that belongs to exactly one business and must never be accessed without that business context.

Financial record: a sale, sale item, payment, payment allocation, expense, correction, reversal, cancellation, or financial audit event.

Payment: money received and manually recorded by a user, or in a future version confirmed by a verified provider event.

Payment request: a collection request sent or prepared for a customer. It is not proof that money was received.

Allocation: an explicit association between a payment amount and one or more unpaid sales.

Outstanding balance: amount still owed, derived from active sales and effective payment allocations.

Cancellation: a domain action that makes a record no longer count financially while preserving its history.

Reversal: a domain action that negates a previous financial record, usually because money was not actually received or was returned.

Business date: the local calendar date used for reports and merchant-facing history, based on the business time zone.

## 6. Confirmed Decisions Inherited from Cycle 001

- Use Spec-Driven Development with traceable delivery cycles.
- Keep the MVP deliberately narrow.
- Treat the web application as the primary operational client.
- Treat the mobile application as a supporting client for product photos, Pix collection assistance, and report consultation.
- Keep payment providers behind a domain boundary.
- Never represent money using binary floating point.

## 7. Assumptions

- The MVP is BRL-only.
- A business normally has one owner and may have a small number of trusted helpers.
- A user may belong to more than one business, but most early users probably belong to one.
- Customer credit is a common workflow, but overpayment credit is not required for the MVP.
- A sale without a registered customer is useful only when it is fully paid immediately.
- An unpaid or partially paid sale requires a customer so the debt can be explained.
- The default business time zone for the first Brazilian market is `America/Manaus` only if no better onboarding choice is specified later; the product must support storing a business time zone.
- These assumptions require validation with real merchants before being treated as market facts.

## 8. Tenant Model

### 8.1 Required Domain Invariant

The business or establishment is the tenant. Every operational record belongs to exactly one business unless explicitly listed as global.

Tenant-owned records:

- Business membership.
- Customer.
- Product.
- Product photo.
- Sale.
- Sale item, through its sale and business.
- Payment.
- Payment allocation.
- Expense.
- Payment request.
- Audit-relevant business event.
- Business settings, including future Pix configuration.

Global records:

- User identity records are global because the same user may belong to multiple businesses.
- System-level configuration may be global when it contains no tenant operational data.
- Public product or merchant data is not part of the MVP.

No tenant-owned record may be read, created, updated, cancelled, reversed, exported, or used in a report unless the actor has an active membership in the target business and the required capability.

### 8.2 Membership and Access

A user can access business data only through an active membership. A suspended or removed membership immediately loses access to that business. Historical audit events should keep a reference to the actor identity and membership context when available, even if the membership is later suspended or removed.

Membership states:

- `active`: may access the business according to capabilities.
- `suspended`: cannot access the business, but history remains.
- `removed`: cannot access the business, but history remains.

Invitation and authentication mechanics are outside this cycle.

### 8.3 Tenant Context Selection

Every business-scoped operation must receive or resolve an explicit business context. The system must validate:

1. The requested business exists and is active.
2. The user has an active membership in that business.
3. The membership has the required capability.
4. Every referenced tenant-owned record belongs to the same business.

Clients may remember a selected business, but the server-side application boundary must revalidate tenant context for every request.

### 8.4 Cross-Tenant Prevention

Cross-tenant references are invalid. Examples:

- A sale in business A cannot reference a customer from business B.
- A payment in business A cannot allocate to a sale from business B.
- A product photo in business A cannot be attached to a product from business B.
- A report for business A cannot include payments, expenses, or sales from business B.

Background jobs, reports, exports, mobile requests, and future provider callbacks must carry or resolve tenant context before touching tenant-owned data. Provider callbacks must be verified and mapped to a known tenant-owned payment request or provider record before any financial effect is recorded.

### 8.5 Business Deactivation and Deletion

Hard deletion of a business is not normal MVP behavior. A business may be deactivated, which prevents new operational activity while retaining financial history, audit events, and data required for explanation, export, and legal review.

Permanent deletion, retention windows, anonymization, and owner-requested erasure must be specified later with LGPD and audit requirements. No implementation should assume that business deletion simply cascades through financial records.

### 8.6 Implementation Strategy Evaluation

Required invariant:

- All tenant-owned data is scoped to one business and protected by active membership plus capability checks.

Likely MVP implementation direction:

- Use a single PostgreSQL database with explicit business identifiers on tenant-owned records, application-enforced scoping, authorization tests, and careful query boundaries.

Deferred infrastructure decision:

- PostgreSQL Row-Level Security may be added later as defense in depth.
- Schema-per-tenant and database-per-tenant are not selected for the MVP because they add operational complexity without current evidence of need.

## 9. Membership and Authorization Model

Authorization should be based on capabilities. Role names are convenience groupings, not permission checks scattered through code.

### 9.1 MVP Role Groups

Owner:

- Has all business capabilities.
- Can manage business settings.
- Can invite, suspend, or remove members.
- Can manage customers and products.
- Can record sales, payments, and expenses.
- Can correct, cancel, or reverse financial records.
- Can view operational and sensitive financial reports.
- Can export business data.
- Can deactivate the business.

Manager:

- Can manage customers and products.
- Can record sales, payments, and expenses.
- Can correct, cancel, or reverse financial records.
- Can view operational and sensitive financial reports.
- Can export business data only if later validated as necessary.
- Cannot deactivate the business unless a later specification grants that capability.
- Cannot remove the last owner.

Staff:

- Can manage customers and products.
- Can record sales and payments.
- Can prepare or send manual payment requests.
- Can view operational reports needed for daily work.
- Cannot view sensitive financial reports by default.
- Cannot export business data.
- Cannot manage members, business settings, or deactivate the business.
- Cannot correct or reverse financial records unless a later specification grants a limited workflow.

### 9.2 Capability Groups

Use capabilities such as:

- `business.settings.manage`
- `members.manage`
- `customers.manage`
- `products.manage`
- `sales.record`
- `payments.record`
- `expenses.record`
- `financial.correct`
- `reports.operational.view`
- `reports.financial.view`
- `data.export`
- `business.deactivate`

The first implementation specification may simplify the role list, but it must preserve least privilege and must not grant sensitive financial powers silently.

### 9.3 Merchant Validation Needed

- Whether Manager is needed in the first release or whether Owner and Staff are enough.
- Whether staff may record expenses.
- Whether staff may view "Quanto sobrou este mês".
- Whether staff may correct a mistaken payment or must ask the owner.

## 10. Core Domain Concepts

### 10.1 Business

Purpose: represents the establishment and tenant boundary.

Tenant ownership: global root for tenant-owned records.

Essential identity: stable business identifier, display name, status, time zone, and future settings.

Lifecycle states: active, deactivated.

Critical invariants:

- Owns all operational data.
- Cannot be hard-deleted during normal MVP operation.
- Has at least one active owner while active.

Financial or personal data: contains business data and settings, potentially Pix data later.

Mutation behavior: profile metadata may be updated; deactivation is restricted and audited.

### 10.2 User

Purpose: represents an authenticated person.

Tenant ownership: global identity record.

Essential identity: stable user identifier and authentication identity.

Lifecycle states: active, disabled, pending future authentication specification.

Critical invariants:

- Cannot access a business without active membership.
- May belong to multiple businesses.

Financial or personal data: personal data.

Mutation behavior: identity changes are outside this cycle and must be audited when security-sensitive.

### 10.3 Business Membership

Purpose: authorizes a user to act in a business.

Tenant ownership: belongs to exactly one business and one user.

Essential identity: stable membership identifier, business, user, role group, status.

Lifecycle states: active, suspended, removed.

Critical invariants:

- Active business access requires active membership.
- Last active owner cannot be removed or suspended without transferring ownership or deactivating the business through a specified process.

Financial or personal data: contains personal and authorization data.

Mutation behavior: role/status changes are audited.

### 10.4 Customer

Purpose: represents a buyer, especially one who can owe money.

Tenant ownership: belongs to exactly one business.

Essential identity: stable customer identifier and display name. Contact details are optional until specified.

Lifecycle states: active, deactivated.

Critical invariants:

- Required for unpaid and partially paid sales.
- Customer outstanding balance is derived from sales, payments, allocations, cancellations, and reversals.
- Historical sales and payments keep their customer reference even if the customer is deactivated.

Financial or personal data: may contain personal data and financial history.

Mutation behavior: descriptive metadata may be updated; deactivation hides the customer from ordinary new-sale selection but does not remove history. Hard deletion is restricted when financial history exists.

### 10.5 Product

Purpose: represents an item sold by the business.

Tenant ownership: belongs to exactly one business.

Essential identity: stable product identifier, display name, current price when specified, active status.

Lifecycle states: active, deactivated.

Critical invariants:

- Later edits do not change historical sale items.
- Complex stock, purchasing, and inventory management are outside the MVP.

Financial or personal data: product price is financial business data.

Mutation behavior: descriptive metadata and current price may be updated; deactivation prevents ordinary selection for new sales. Hard deletion is restricted when referenced by sales.

### 10.6 Product Photo

Purpose: stores an optional image associated with a product.

Tenant ownership: belongs to exactly one business and one product.

Essential identity: stable photo identifier and storage object reference.

Lifecycle states: active, replaced, removed.

Critical invariants:

- Product photo access is business-scoped.
- Storage provider details stay outside domain rules.
- Replacing a photo does not change financial history.

Financial or personal data: may expose business context and possibly incidental personal data.

Mutation behavior: replacement/removal is audited. Retention of removed storage objects must be specified later.

### 10.7 Sale

Purpose: records a business sale.

Tenant ownership: belongs to exactly one business.

Essential identity: stable sale identifier, business, optional customer, status, occurred business date, creation timestamp.

Lifecycle states: active, cancelled.

Critical invariants:

- A sale may be fully paid, partially paid, or unpaid.
- A sale with outstanding amount requires a customer.
- Active sale total is derived from sale items.
- Later product edits do not affect historical sale items.

Financial or personal data: financial data; may be linked to customer personal data.

Mutation behavior: financial meaning is not silently edited after creation. Corrections use cancellation plus replacement or explicit adjustment rules.

### 10.8 Sale Item

Purpose: records an item or line amount inside a sale.

Tenant ownership: belongs through a sale to exactly one business.

Essential identity: stable sale item identifier, sale, optional product reference, snapshot name, quantity, unit price, line total.

Lifecycle states: follows sale lifecycle.

Critical invariants:

- Product name and unit price must be snapshotted at sale time.
- Quantity and money must be represented safely.
- Line totals must reconcile to the sale total.

Financial or personal data: financial business data.

Mutation behavior: not silently changed after sale creation. Corrections follow sale correction rules.

### 10.9 Payment

Purpose: records money received from or for a customer.

Tenant ownership: belongs to exactly one business.

Essential identity: stable payment identifier, amount, method, received timestamp, business date, status.

Lifecycle states: active, reversed.

Critical invariants:

- Payment amount must be positive.
- Payment history remains visible after balance changes.
- A payment is not the same as a payment request.
- Manual Pix confirmation is treated as a manually recorded payment, like cash or card, unless future provider confirmation is specified.

Financial or personal data: financial data; may be linked to customer personal data.

Mutation behavior: financial amount, customer, method, and received date are not silently edited after creation. Corrections use reversal plus replacement where needed.

### 10.10 Payment Allocation

Purpose: connects part or all of a payment to one or more sales.

Tenant ownership: belongs to exactly one business and references one payment and one sale in the same business.

Essential identity: stable allocation identifier, payment, sale, allocated amount, status.

Lifecycle states: active, reversed through the payment or explicit allocation reversal if later specified.

Critical invariants:

- Allocated amounts for a payment must not exceed the active payment amount.
- Active allocated amounts for a sale must not exceed the active sale total.
- A new allocation must not exceed the sale's current outstanding amount.
- Payment and sale must belong to the same business and customer when customer is present.

Financial or personal data: financial data.

Mutation behavior: allocations are not silently edited. Reallocation requires reversal and replacement or a specified correction action.

### 10.11 Expense

Purpose: records simple money leaving the business.

Tenant ownership: belongs to exactly one business.

Essential identity: stable expense identifier, amount, description, optional simple category, occurred business date, status.

Lifecycle states: active, cancelled.

Critical invariants:

- Expense amount must be positive.
- Expense management remains basic in the MVP.
- Attachments and receipts are outside the MVP.

Financial or personal data: financial business data and possibly personal data in descriptions.

Mutation behavior: descriptive metadata may be edited with audit. Changing financial meaning requires cancellation and replacement.

### 10.12 Payment Request

Purpose: records that the system prepared or sent a collection request to a customer.

Tenant ownership: belongs to exactly one business.

Essential identity: stable request identifier, amount requested, customer or sale/balance context, channel, message snapshot, status.

Lifecycle states: draft, sent, cancelled, expired if later specified.

Critical invariants:

- A payment request does not reduce debt.
- A payment request does not confirm payment.
- Future provider confirmations must be verified before creating or linking a payment.

Financial or personal data: financial data and customer communication data.

Mutation behavior: sent message snapshots are preserved; cancellation only stops the request from being treated as active.

### 10.13 Audit-Relevant Business Event

Purpose: records sensitive domain actions.

Tenant ownership: belongs to exactly one business.

Essential identity: stable event identifier, business, actor, action, target, timestamp, reason when required.

Lifecycle states: append-only.

Critical invariants:

- Audit events are not generic event sourcing.
- Events explain sensitive actions without replacing domain records.
- Ordinary technical logs must not be the source of domain financial history.

Financial or personal data: may contain sensitive references; store only necessary details.

Mutation behavior: append-only under normal operation.

## 11. Financial Invariants

- All monetary amounts use BRL minor units for the MVP, where R$ 1.00 is `100`.
- Monetary values are integers in canonical domain representation.
- No financial calculation may depend on binary floating point.
- Sale totals are derived from sale items.
- Customer balances are derived from active sales and active payment allocations.
- Financial history is preserved after corrections.
- Active payments allocated to sales reduce outstanding sale amounts.
- Payment requests have no balance effect.
- Cancelled sales and cancelled expenses do not count in ordinary financial totals.
- Reversed payments do not count as money received and their allocations no longer reduce debt.
- Financial records from different businesses cannot reference each other.

## 12. Sales and Sale-Item Rules

### 12.1 Sale States

Sale lifecycle state:

- `active`: counts in sales and balance formulas.
- `cancelled`: preserved for history, excluded from ordinary totals.

Sale payment state is derived:

- `paid`: active sale outstanding amount is `0`.
- `partially_paid`: active sale outstanding amount is greater than `0` and less than sale total.
- `unpaid`: active sale outstanding amount equals sale total.

The implementation may cache a display status later, but the canonical status must be derivable from sale total, active allocations, and cancellation state.

### 12.2 Customer Requirement

- A fully paid immediate sale may exist without a registered customer.
- An unpaid or partially paid sale requires a customer.
- A payment allocated to an anonymous sale is allowed only when the sale is fully paid at creation and no future debt tracking is needed.

### 12.3 Sale Totals

Line total formula:

```text
line_total_minor = quantity_minor * unit_price_minor / quantity_scale - line_discount_minor
```

The first implementation specification must define quantity scale. The MVP should prefer simple integer quantities when possible. Fractional quantities, if required for grocery contexts, must use a fixed scale such as thousandths and deterministic rounding.

Sale total formula:

```text
sale_total_minor = sum(active sale item line_total_minor) - sale_discount_minor
```

Rules:

- Sale total must be greater than `0`.
- Discounts cannot make a line or sale negative.
- Rounding must be deterministic and occur at the line level before summing.
- The rounding mode must be specified before implementation; the domain should avoid calculations that need rounding in the first MVP where possible.

### 12.4 Product Snapshot

Sale items must snapshot product display name and unit price at the time of sale. Later product edits do not change historical sales, debt, or reports.

If a sale item does not reference a registered product, it still needs a description snapshot and price.

### 12.5 Cancellation and Correction

Sales are not hard-deleted during normal operation. If a sale was recorded by mistake, cancel it with an audit reason. If the correct sale should exist, create a replacement sale.

When cancelling a sale with active payment allocations, the correction flow must also reverse the affected payment or create an explicit replacement payment/allocation sequence through an audited action. A cancelled sale cannot retain active allocations that reduce customer debt, and the system must not silently move allocated money to another sale.

## 13. Payment and Allocation Rules

### 13.1 Alternatives Considered

Payment directly associated with a single sale:

- Simple for one unpaid sale.
- Fails when one customer pays multiple sales at once.
- Makes future reporting and corrections harder.

Customer-level payment without explicit sale allocation:

- Simple to record.
- Preserves payment history.
- Makes it harder to explain which sale is paid and to show sale-level status.

Payment plus explicit allocations across one or more sales:

- Supports partial payments, multiple payments, multiple outstanding sales, sale-level status, reliable balances, corrections, and future provider reconciliation.
- Adds one extra domain concept, but keeps the model understandable.

Selected MVP model: payment plus explicit allocations. The UI may present this as a simple "record payment" action, but the domain should create explicit allocations.

### 13.2 Payment Recording

Payment amount must be positive. Payment method should be recorded as a simple method value:

- `cash`
- `pix_manual`
- `card`
- `other`

Manual Pix is not treated differently from cash for balance purposes. It is only a payment method label unless future provider confirmation is introduced.

A payment may be created for:

- A specific sale.
- A customer with one or more outstanding sales.

For MVP debt payments, payments must reference a customer. A fully paid anonymous immediate sale may create an immediate payment-like receipt only if later implementation needs it for "Quanto entrou"; this must still be tenant-owned and auditable.

### 13.3 Allocation Behavior

Allocation is automatic by default for the MVP:

1. Allocate to selected sale first when the user records payment from a sale context.
2. Otherwise allocate to the customer's oldest active outstanding sales first by business date, then creation timestamp, then stable identifier.
3. Allocate to each sale only up to its current outstanding amount.
4. Allocate until the payment amount is exhausted or no outstanding balance remains.

This keeps the merchant workflow small while preserving explicit allocation records. A future specification may allow manual allocation if merchant validation shows a need.

Rounding remainders should not occur when allocations use integer minor units. The sum of allocation amounts must equal the effective payment amount unless a rejected overpayment prevents payment creation.

### 13.4 Overpayment and Customer Credit

Customer credit is outside the MVP. A payment cannot exceed the customer's active outstanding balance unless it is part of a fully paid immediate sale created at the same time.

Attempted overpayment must be rejected with a plain-language message such as "O valor pago é maior do que a dívida deste cliente." The user may record only the outstanding amount or create a new sale if appropriate.

### 13.5 Reversal and Corrections

Reversing a payment makes the payment ineffective for balances and reports from the reversal point onward. Active allocations from a reversed payment no longer reduce sale outstanding amounts.

Payment correction rules:

- Mistyped amount: reverse the incorrect payment and create a replacement payment.
- Wrong customer: reverse the incorrect payment and create a replacement payment for the correct customer.
- Duplicate payment: reverse the duplicate with reason.
- Returned or failed payment: reverse the payment with reason.

### 13.6 Payment Request Difference

A payment request is a message or collection attempt. It can be drafted, sent, cancelled, or later expired. It has no balance effect.

A payment is a financial record that money was received. A future provider confirmation is evidence that may create or confirm a payment only after verification and tenant mapping.

## 14. Expense Rules

- Expenses belong to exactly one business.
- Expense amount must be positive and represented in BRL minor units.
- Expense occurred business date is required.
- A description is required.
- A simple category may be optional in the MVP; advanced accounting categories are outside scope.
- Owner and Manager may record and correct expenses.
- Staff may record expenses only if merchant validation supports it; default MVP assumption is no.
- Editing spelling, description, or simple category is allowed with audit when it does not change financial meaning.
- Changing amount, occurrence date, or business requires cancellation and replacement.
- Expenses are not hard-deleted during normal operation.
- Attachments and receipts are outside the MVP.

## 15. Corrections, Reversals, Cancellation, and Deletion

Financial records should not be silently mutated when financial meaning changes.

Permitted patterns:

- Correct descriptive metadata with audit when financial meaning is unchanged.
- Cancel an incorrect sale or expense and create a replacement when needed.
- Reverse an incorrect payment and create a replacement when needed.
- Record an explicit reason for sensitive corrections.

Cases:

- Mistyped sale amount or items: cancel sale, reverse affected payments or create explicit replacement payment/allocation records, create replacement sale.
- Wrong customer on sale: cancel sale and create replacement sale for correct customer.
- Wrong sale items: cancel sale and create replacement sale.
- Duplicate payment: reverse duplicate payment.
- Incorrect expense: cancel expense and create replacement expense.
- Future chargeback-like scenario: reverse payment through a specified provider-aware workflow.
- Accidental sale cancellation: restoration is not part of the MVP; create a replacement sale with an audit reason if necessary.

Hard deletion restrictions:

- Sales, sale items, payments, allocations, expenses, payment requests, memberships with history, product photos with history, and audit events must not be hard-deleted during normal operation.
- Customers and products with financial history must not be hard-deleted during normal operation.
- Hard deletion for privacy or retention must be specified later and must preserve legal and audit requirements.

## 16. Balance and Reporting Formulas

All formulas use tenant-scoped records only.

Sale total:

```text
sale_total_minor(sale) =
  0 if sale.lifecycle_state = cancelled
  otherwise sum(sale_item.line_total_minor) - sale_discount_minor
```

Amount paid for a sale:

```text
amount_paid_minor(sale) =
  sum(active payment allocations for sale where payment.status = active)
```

Outstanding amount for a sale:

```text
outstanding_minor(sale) =
  max(sale_total_minor(sale) - amount_paid_minor(sale), 0)
```

Customer outstanding balance:

```text
customer_balance_minor(customer) =
  sum(outstanding_minor(active sales for customer))
```

Business sales total for a period:

```text
sales_recorded_minor(period) =
  sum(sale_total_minor(active sales whose occurred business date is in period))
```

Payments received during a period:

```text
payments_received_minor(period) =
  sum(active payments whose received business date is in period)
```

Expenses during a period:

```text
expenses_minor(period) =
  sum(active expenses whose occurred business date is in period)
```

Simplified "quanto sobrou" for a period:

```text
quanto_sobrou_minor(period) =
  payments_received_minor(period) - expenses_minor(period)
```

Important distinctions:

- Sales recorded in a period are not the same as money received in a period.
- A sale can create debt without increasing payments received.
- A payment can be received in a later period than the sale.
- Cancelled sales and cancelled expenses are excluded from ordinary totals.
- Reversed payments are excluded from payments received.
- Outstanding debt is a balance view, not income received.

This is intentionally simplified operational reporting. It must not be labeled as formal accounting, DRE, profit, taxable revenue, or financial statement output.

## 17. Money, Dates, and Time-Zone Rules

### 17.1 Money

- MVP canonical currency is BRL.
- Canonical representation is integer minor units, centavos.
- R$ 1.00 is `100`.
- Amounts for sales, payments, allocations, and expenses must be positive unless a future adjustment concept explicitly allows otherwise.
- Zero-value sales, payments, allocations, and expenses are invalid for MVP financial records.
- Discounts may be zero or positive but cannot make totals negative.
- Binary floating point is forbidden for source-of-truth financial values.

### 17.2 Rounding

The MVP should avoid calculations that require rounding by preferring integer quantities and centavo prices. If fractional quantities are allowed later, the quantity scale and rounding mode must be specified before implementation.

Any required rounding must be deterministic, tested, and performed before persistence of financial source-of-truth values.

### 17.3 Timestamps and Business Dates

Each financial record should carry:

- A UTC instant for when the record was created.
- A UTC instant for when the business event occurred or was received when different from creation.
- A business-local date derived from the business time zone at the time of the event.
- The business time zone identifier used to derive that date.

Daily and monthly reports use the business-local date, not the server date and not the user's device date.

### 17.4 Business Time Zone

Each business owns its configured time zone. The time zone must use a stable IANA identifier, such as `America/Manaus` or `America/Sao_Paulo`.

If a business changes time zone later:

- Historical records keep their original business-local date and time-zone context.
- Future records use the new time zone.
- Reports over historical periods use the stored business-local dates to avoid shifting past records unexpectedly.

No specific date library is selected in this cycle.

## 18. Audit Boundaries

Audit-relevant business events are required for:

- Business creation, deactivation, and settings changes.
- Membership invitation, activation, role changes, suspension, removal.
- Customer creation, deactivation, and sensitive data changes.
- Product creation, deactivation, price changes, and product photo changes.
- Sale creation, cancellation, and replacement reference.
- Payment creation and reversal.
- Payment allocation creation and reversal or replacement.
- Expense creation, metadata edit, cancellation, and replacement reference.
- Payment request creation, sending, cancellation, and future provider status changes.
- Data export.

Minimum audit fields:

- Business identifier.
- Actor user identifier or system actor.
- Membership context when available.
- UTC timestamp.
- Action.
- Target type and target identifier.
- Reason for sensitive corrections, reversals, cancellations, export, and deactivation.
- Before/after values or references when necessary and safe.

Domain financial history is not the same as technical application logs. Technical logs may help operations but must not be the only proof of a payment, cancellation, correction, or export.

## 19. Security and Privacy Implications

- Tenant isolation is a mandatory authorization boundary.
- Customer records may contain personal data.
- Sales, debts, payments, and expenses are sensitive business financial data.
- Access should follow least privilege through capabilities.
- Ordinary logs should avoid personal data, full payment details, customer debt lists, and sensitive report values.
- Product photo access must be scoped by business.
- Exports are sensitive and require authorization plus audit.
- Deactivation and deletion requests require future retention and LGPD specification.
- Provider callbacks in future payment integrations must be authenticated, verified, idempotent, and mapped to tenant-owned records before creating financial effects.

This specification defines design controls. It does not claim legal LGPD compliance or replace legal validation.

## 20. Examples and Edge Cases

### Example 1: Fully Paid Sale

Sale total: R$ 25.00, canonical `2500`.

Payment: R$ 25.00 cash, canonical `2500`.

Allocation: `2500` to the sale.

Result: sale status `paid`, outstanding `0`, payments received includes `2500`, "quanto sobrou" includes the payment less expenses.

### Example 2: Completely Unpaid Sale

Customer Ana buys R$ 18.00, canonical `1800`, and pays nothing.

Payment: none.

Result: sale status `unpaid`, customer balance increases by `1800`, payments received does not increase.

### Example 3: Partially Paid Sale

Customer Ana buys R$ 40.00, canonical `4000`, and pays R$ 15.00, canonical `1500`.

Allocation: `1500` to the sale.

Result: sale status `partially_paid`, outstanding `2500`, payments received includes `1500`.

### Example 4: Multiple Payments Against One Debt

Sale total: `4000`.

First payment: `1500`.

Second payment: `1000`.

Allocations: `1500` and `1000` to the same sale.

Result: amount paid `2500`, outstanding `1500`, payment history shows both payments.

### Example 5: One Customer With Multiple Outstanding Sales

Customer Bia has sale A `3000` and sale B `2000`.

Payment: `3500`.

Automatic allocation by oldest sale first:

- `3000` to sale A.
- `500` to sale B.

Result: sale A `paid`, sale B `partially_paid`, customer balance `1500`.

### Example 6: Payment Correction or Reversal

Customer Bia had payment `3500`, but the merchant entered the wrong amount. Correct amount was `2500`.

Action:

- Reverse original payment `3500` with reason.
- Create replacement payment `2500`.
- Allocate replacement by the normal rule.

Result: audit shows both actions; balance is recalculated from active payment allocations only.

### Example 7: Attempted Overpayment

Customer Caio owes `1200`. User tries to record payment `1500`.

Result: reject payment because customer credit is outside the MVP. No payment or allocation is created. User may record `1200` instead.

### Example 8: Payment Request Sent but Never Paid

Customer Ana owes `2500`. User sends a WhatsApp payment request for `2500`.

Result: payment request status `sent`; balance remains `2500`; payments received remains unchanged. If payment is later received manually, a separate payment is recorded.

## 21. Rejected or Deferred Alternatives

Rejected for MVP:

- Business deletion through cascading hard delete.
- Schema-per-tenant or database-per-tenant as the initial tenancy model.
- Customer-level debt as a manually edited balance.
- Payment model without allocations.
- Customer credit from overpayment.
- Silent editing of financial amounts after creation.
- Treating payment requests as payments.
- Formal accounting or DRE reports.

Deferred:

- PostgreSQL Row-Level Security.
- Manual allocation UI.
- Fractional quantity scale and rounding mode.
- Authentication/session mechanics.
- Data retention and LGPD deletion workflows.
- Provider callback processing and automatic Pix reconciliation.
- Storage provider and product photo URL strategy.

## 22. Open Questions

- Are Owner and Staff sufficient for the first release, or is Manager required?
- May Staff record expenses in real merchant routines?
- May Staff view "Quanto sobrou este mês" or only operational debt lists?
- Which payment methods besides cash, manual Pix, card, and other should be present in the first UI?
- Are fractional quantities required for the first target segment?
- Which default time zone should onboarding suggest for each business?
- What data export format is required first?
- What retention periods and deletion/anonymization rules are legally and operationally appropriate?

## 23. Acceptance Criteria

- A single coherent tenant boundary is defined as Business.
- Cross-tenant isolation invariants are explicit.
- Membership and minimum authorization responsibilities are documented.
- Core domain concepts and relationships are defined without a physical schema.
- Paid, partial, and unpaid sale behavior is unambiguous.
- Payment history and allocation behavior are unambiguous.
- Balance formulas are defined.
- Overpayment behavior is defined.
- Corrections, reversals, cancellations, and deletion restrictions are defined.
- Audit boundaries are explicit without generic event sourcing.
- Expense behavior is defined.
- Money and rounding rules are defined.
- Date and time-zone behavior is defined.
- Security and privacy implications are aligned with the tenant and financial model.
- Open questions are separated from decisions.
- No application code, dependency, scaffold, migration, or integration is introduced.

## 24. Traceability

Product requirements:

- Replace the paper notebook for sales, "fiado", payments, expenses, and simple reports.
- Preserve clear payment history.
- Keep the MVP simple and practical.
- Support basic user and business access control.
- Include security, privacy, auditability, and LGPD considerations from the beginning.

Related documents:

- [Product Vision](../product/vision.md)
- [MVP Scope](../product/mvp-scope.md)
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

## 25. Recommended Follow-up Specification

Recommended next cycle: Authentication and Business Onboarding Specification.

Why: Cycle 002 defines that business access depends on active membership, business status, roles, capabilities, and selected tenant context. The next dependency is to specify how the first owner, business, membership, session, tenant selection, and member lifecycle are created and controlled before any sales or payment implementation begins.

Non-goals for that cycle should include application implementation, database migrations, UI screens, payment integration, product photo storage, and any expansion of the MVP.
