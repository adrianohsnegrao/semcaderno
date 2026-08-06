# Domain Model Baseline

This document evaluates initial domain concepts without locking the database schema prematurely.

The detailed domain rules accepted in Cycle 002 are defined in [Domain and Tenancy Specification](../specs/domain-and-tenancy.md). Authentication and onboarding rules accepted in Cycle 003 are defined in [Authentication and Business Onboarding Specification](../specs/authentication-and-business-onboarding.md). Persistence and tenant-enforcement rules accepted in Cycle 004 are defined in [Data Persistence and Tenant Enforcement Specification](../specs/data-persistence-and-tenant-enforcement.md). The first merchant-facing journey accepted in Cycle 005 is defined in [First Critical User Journey Specification](../specs/first-critical-user-journey.md). The logical records, relationships, repository boundaries, and consistency boundaries accepted in Cycle 006 are defined in [Logical Data Model Specification](../specs/logical-data-model.md). The command, query, authorization-context, error, idempotency, and read-model contracts accepted in Cycle 007 are defined in [Application Contracts Specification](../specs/application-contracts.md). This file is a baseline summary and should remain consistent with those specifications.

## Core Concepts

### Business or Establishment

Represents the small business using Sem Caderno. It owns operational data and is the primary tenant boundary.

Expected relationships:

- Has many users through memberships.
- Has many customers, products, sales, payments, payment allocations, expenses, product photos, payment requests, and audit events.

Accepted rules:

- Business is the tenant boundary.
- Active businesses must retain at least one active owner.
- Normal MVP behavior uses deactivation, not hard deletion, for a business with history.
- First-owner bootstrap must atomically create the active Business and initial active Owner Membership.

Open questions:

- What business profile fields are required in the first release?
- How should the business Pix key be configured and protected?
- Which default time zone should onboarding suggest for a new business?

### User and Business Membership

A user authenticates into the system. A membership connects a user to a business and defines what they can access.

Expected relationships:

- A user may belong to multiple businesses.
- A business may have multiple users.
- A membership should include a role or permission level.

Accepted rules:

- A user cannot access business data without an active membership.
- Authorization should use capabilities grouped by role.
- Initial role groups are Owner, Manager, and Staff, with Manager subject to merchant validation.
- User identity is global and may exist before joining or creating a Business.
- Normalized email is the MVP conceptual identity channel.
- Suspended and removed memberships deny current access but remain historically referenceable.

Open questions:

- Are Owner and Staff enough for the first release, or is Manager required?
- Can employees view reports, expenses, and complete payment history?
- Which exact credential method, password policy, and session storage approach should be used?

### Invitation

Represents a tenant-owned request for an identity to join a Business.

Expected relationships:

- Belongs to one Business.
- References an invited normalized email.
- May activate one Business Membership after acceptance.

Important rules:

- Invitation delivery provider is outside the domain model.
- Invitation possession alone does not grant tenant access.
- Acceptance requires matching verified identity.
- Expired, cancelled, already-used, or mismatched invitations do not activate membership.
- Invitation secrets must not be stored or logged in plaintext.

### Session

Represents an authenticated client interaction context.

Expected relationships:

- References one global User.
- May remember one selected active Business.
- Must resolve current active Membership and capabilities for tenant-owned requests.

Important rules:

- Client-provided Business identifiers are never sufficient authorization.
- Tenant context is revalidated server-side for every tenant-owned request.
- Membership suspension, removal, role reduction, business deactivation, credential reset, and suspected compromise require session revocation or revalidation.
- Application commands and queries must rebuild current authorization context from server-side state before tenant-owned operations; cached client capabilities are previews only.

### Customer

Represents a person or organization that buys from the business, especially when buying on credit.

Expected relationships:

- Belongs to one business.
- Has many sales.
- Has many payments.
- Has a derived outstanding balance.

Important rules:

- Unpaid or partially paid sales require a customer.
- A fully paid counter sale may be anonymous.
- A customer may be created during sale recording when debt is involved.
- Customer history must not be destroyed when the balance changes.
- Customer outstanding balance is derived from active sales and active payment allocations.
- Customer phone and email are optional and not unique in the MVP; duplicate warnings remain a UX decision.

### Product

Represents an item sold by the business.

Expected relationships:

- Belongs to one business.
- May have one or more product photos depending on future specification.
- Appears in sale items.

Important rules:

- Product photo is optional in the MVP.
- Sale items snapshot product name and unit price so later product edits do not change historical sales.
- A product catalog is not required before the first sale because ad hoc sale items are allowed in the critical journey.
- Complex inventory and purchasing management are excluded from the MVP.

### Sale

Represents a sale made by the business.

Expected relationships:

- Belongs to one business.
- May belong to a customer.
- Has one or more sale items, unless a future specification allows simple amount-only sales.
- Has zero or more payments.

Important rules:

- A sale may be paid immediately, partially paid, or unpaid.
- Sale totals must be calculated using safe money representation.
- Future application contracts must recalculate Sale totals server-side; client-calculated totals are previews.
- A fully paid immediate sale may exist without a registered customer.
- An unpaid or partially paid sale requires a customer.
- The first journey records fully paid, partially paid, and unpaid sales through atomic outcomes defined in the Cycle 005 specification.
- Sale payment state is derived from sale total, active allocations, and cancellation state.
- Incorrect sales are cancelled and replaced when needed; they are not hard-deleted during normal operation.

### Sale Item

Represents an item inside a sale.

Expected relationships:

- Belongs to one sale.
- May reference a product.

Important rules:

- Quantity, unit price, and total must avoid binary floating point.
- Historical product names and prices are copied to the sale item.
- Later product edits do not change historical sale items.
- Sale items may reference a Product or use an ad hoc merchant-entered description.

### Payment

Represents money received from a customer or associated with a sale or outstanding debt.

Expected relationships:

- Belongs to one business.
- May be linked to a customer.
- Links to one or more sales through explicit payment allocations.

Important rules:

- Customers may make multiple partial payments.
- Payment history must remain visible.
- Payments should not be silently overwritten.
- Corrections use reversal plus replacement when financial meaning changes.
- Manual Pix is a payment method label after the user records receipt; a payment request alone is not a payment.
- Later payment recording allocates selected Sale first, then oldest eligible outstanding Sales.

### Payment Allocation

Represents how a payment amount is applied to one or more sales.

Expected relationships:

- Belongs to one business.
- References one payment and one sale in the same business.

Important rules:

- Allocations cannot exceed the active payment amount or active sale outstanding amount.
- MVP allocation is automatic by selected sale, then oldest outstanding sales first.
- Allocation history must not be silently edited.

### Customer Debt or Outstanding Balance

Represents what a customer currently owes. The safest initial view is a derived balance from sales, payments, and adjustments, not a manually edited number.

Important rules:

- Balance must be explainable from history.
- Balance changes must not destroy the payment trail.
- Customer credit from overpayment is outside the MVP.
- Attempted overpayment is rejected.
- Debt becomes visible only from committed canonical Sales and active Payment Allocations.

### Expense

Represents basic money leaving the business.

Expected relationships:

- Belongs to one business.
- Was recorded by a user.

Important rules:

- The MVP supports basic expense recording only.
- Full accounting categories and DRE terminology are excluded from the MVP.
- Changing financial meaning requires cancellation and replacement.
- Attachments and receipts are outside the MVP.
- Expenses affect "Quanto saiu" and simplified "Quanto sobrou" only for users with appropriate capability.

### Product Photo

Represents an uploaded image associated with a product.

Expected relationships:

- Belongs to one business.
- Belongs to one product.
- References an object stored in S3-compatible storage or a future equivalent.

Important rules:

- Product photos are optional.
- Storage provider details must stay outside the domain model.
- Access must be scoped by business.

### Payment Request

Represents a request to collect money from a customer, such as a WhatsApp message containing amount and Pix details.

Expected relationships:

- Belongs to one business.
- May reference a customer.
- May reference a sale or customer balance snapshot.

Important rules:

- MVP payment requests are manual and do not confirm payment automatically.
- Payment requests do not reduce outstanding balance.
- Future dynamic Pix charges require a provider boundary such as `PaymentRequestProvider`.
- The domain should represent the request concept without depending on a specific bank or provider SDK.

### Audit-Relevant Business Event

Represents a meaningful action in the business history.

Expected data:

- Business affected.
- User or system actor.
- Event type.
- Timestamp.
- Related entity.
- Before and after values when needed and safe to store.

Important rules:

- Audit history is especially important for sales, payments, expenses, customer debt, membership changes, and photo changes.
- Audit data must be useful without becoming an excessive enterprise logging system.
- Audit records are distinct from domain financial history, security audit records, ordinary logs, and diagnostic traces.

## High-Level Relationships

- Business owns all operational records.
- User accesses a business through membership.
- Customer belongs to a business.
- Product belongs to a business.
- Sale belongs to a business and may reference a customer.
- Sale item belongs to a sale and may reference a product.
- Payment belongs to a business, may reference a customer, and connects to sales through payment allocations.
- Expense belongs to a business.
- Product photo belongs to a product and business.
- Payment request belongs to a business and may reference a customer or sale context.
- Audit event belongs to a business and records significant actions.
- Payment allocation belongs to a business and connects one payment to one sale.
- Invitation belongs to a business and can activate a membership only after identity verification.
- Session references a global user and selected business context but does not replace authorization checks.
- Derived balances and report totals belong to the same business as their source records and are subordinate to canonical records.

## Financial Model Guidance

The financial model must be specified carefully before implementation:

- Use integer minor units or safe decimal values.
- Never use binary floating point.
- Preserve sale and payment history.
- Prefer derived balances over manually edited debt totals.
- Use explicit correction, reversal, or adjustment events instead of silent mutation.
- Specify deletion rules before any financial implementation.
- Ensure reports reconcile with the underlying history.
- Treat canonical Sales, Sale Items, Payments, Payment Allocations, Expenses, and correction history as the source of truth.
- Treat balances, payment status, period totals, and "Quanto sobrou" as derived values.
- Keep Payment Requests separate from Payments; requests do not reduce debt.
- Keep external side effects, such as notifications and future provider callbacks, outside authoritative financial transactions.
- Keep Sales recorded, Payments received, Payment Allocations, Payment Requests, and Expenses distinct in the first journey.
- Use `paymentsReceivedMinor - expensesMinor` for simplified "Quanto sobrou", with practical-report language only.

## Logical Data Model Guidance

Cycle 006 defines the logical model without creating a physical schema:

- Logical records are domain persistence concepts, not table definitions.
- Global identity records, tenant-owned authorization records, tenant-owned operational records, session/security state, audit evidence, idempotency evidence, external side-effect attempts, and derived projections have separate responsibilities.
- Repository boundaries for tenant-owned records must require validated Business scope and current authorization context.
- Conceptual uniqueness is separated from duplicate warnings and idempotency evidence.
- Sale, Payment, Allocation, Expense, and correction consistency boundaries must preserve all accepted financial invariants.
- Projections for debt, report totals, and daily result remain rebuildable from canonical records.

## Open Specification Topics

- Physical persistence design.
- Exact authentication/session implementation.
- Customer merge or duplicate handling.
- Customer contact uniqueness behavior.
- Product SKU or barcode behavior.
- Fractional quantity scale and rounding mode.
- Final mobile Sale and Payment recording scope.
- Product photo retention and deletion.
- Data retention, export, anonymization, and LGPD deletion workflows.
