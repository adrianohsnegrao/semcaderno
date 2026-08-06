# First Critical User Journey Specification

## 1. Status and Metadata

Status: Accepted for planning.

Cycle: 005 - First Critical User Journey Specification.

Task: 001 - Specify the End-to-End Merchant Journey from Sign-In to Sale, Debt, Payment, and Daily Result.

Created: 2026-07-31.

Scope type: implementation-independent merchant journey specification.

This document defines business-visible flow, domain outcomes, authorization expectations, financial consequences, recovery behavior, client responsibilities, accessibility obligations, and future test targets. It does not define application code, API routes, DTOs, database fields, ORM models, components, screens, visual design, provider payloads, token formats, physical idempotency storage, analytics tooling, or deployment configuration.

## 2. Context

Sem Caderno replaces the paper notebook used by small Brazilian merchants to record sales, "fiado", payments, expenses, and practical daily results. Cycles 002 through 004 defined the core rules for tenancy, authentication, authorization, financial records, persistence, audit, idempotency, and report formulas.

This cycle connects those rules into the first merchant-facing journey. The journey must be fast enough for counter work, clear enough for users with low technical familiarity, and strict enough to preserve tenant isolation and financial trust.

## 3. Goals

- Define the first end-to-end operational path from sign-in to sale, debt, payment, and daily result.
- Define entry behavior for new, returning, single-business, multi-business, suspended, removed, deactivated, expired-session, and mobile users.
- Define minimum operational readiness without unnecessary setup.
- Decide customer and product requirements for paid, partially paid, and unpaid sales.
- Define sale review, confirmation, atomic outcomes, debt visibility, later payment, allocation, and payment request behavior.
- Define daily-result rules using accepted formulas and practical language.
- Define correction, cancellation, reversal, duplicate-submit, unknown-outcome, stale-state, authorization-change, and offline behavior.
- Align web and mobile responsibilities without expanding mobile into a full point-of-sale client.
- Define accessibility, security, privacy, audit, analytics, and future acceptance-test obligations.

## 4. Non-Goals

- No application code.
- No package manifests, workspace setup, or dependency installation.
- No physical database schema, SQL, migrations, ORM models, repository contracts, or transaction helper implementation.
- No API endpoints, transport contracts, DTOs, or request/response examples.
- No authentication, session, tenant middleware, authorization, audit storage, report, or provider implementation.
- No UI components, screen layouts, high-fidelity wireframes, design tokens, CSS, navigation setup, or state-management implementation.
- No mobile scaffold, offline synchronization, background jobs, queues, notifications, analytics provider, or deployment configuration.
- No email, SMS, Pix, WhatsApp, object storage, or product-photo upload integration.
- No inventory, purchasing, supplier, fiscal document, bookkeeping, DRE, billing, subscription, plan, or trial behavior.
- No event sourcing, CQRS, microservices, or speculative enterprise architecture.
- No selection of Prisma, Drizzle, NestJS, Fastify, Next.js details, Expo details, provider, cloud platform, identifier type, or Row-Level Security implementation.

## 5. Terminology

Merchant: user-facing term for the person operating the establishment.

Business: internal tenant boundary. User-facing term: "Estabelecimento".

Active Business: selected and server-validated tenant context for the journey.

Customer: buyer recorded by the Business. User-facing term may remain "Cliente".

Sale: recorded business sale. User-facing terms include "Venda", "Venda paga", "Venda fiada", and "Venda nao paga" depending on context.

Sale Item: line inside a Sale. It may come from a catalog Product or an ad hoc description.

Payment: money actually received and recorded.

Payment Allocation: internal record applying a Payment amount to one or more Sales.

Payment Request: collection request sent or prepared for a Customer. It is not Payment confirmation.

Daily Result: practical view for "Quanto entrou hoje", "Quanto saiu hoje", and "Quanto sobrou hoje".

Debt: user-facing view of outstanding Sales. User-facing terms include "em aberto", "pago em parte", and "pago".

## 6. Confirmed Inherited Decisions

- Sem Caderno is a notebook replacement, not a smaller ERP.
- Web is the primary operational client.
- Mobile is a supporting client for photos, collection assistance, and report consultation.
- Business is the tenant boundary.
- User identity is global; Business Membership is tenant-owned.
- Tenant-owned access requires active Membership and required capability in the same active Business.
- Client-provided Business identifiers, URLs, deep links, cached context, and remembered tenant context are never sufficient authorization.
- Owner, Manager, and Staff are capability groups; Manager release-one exposure requires merchant validation.
- Staff does not receive expense, sensitive-report, export, member-management, or financial-correction capabilities by default.
- Suspended and removed Memberships do not authorize access but remain historically referenceable.
- Active Businesses must have at least one active Owner.
- Business deactivation blocks ordinary tenant operations and requires session revocation or revalidation.
- BRL integer minor units are authoritative; binary floating point is forbidden for financial source of truth.
- Sale Items preserve historical snapshots.
- Payments use explicit Allocations to Sales.
- Allocation applies selected Sale first, then oldest eligible outstanding Sales when general allocation is needed.
- Cross-Business and cross-Customer allocation is rejected.
- Overpayment and customer credit are outside the MVP.
- Payment Requests do not reduce debt and are not Payment confirmations.
- Financial corrections preserve history through descriptive edits, cancellation, reversal, replacement, or correcting records.
- Financial records are not hard-deleted during ordinary operation.
- Reports distinguish Sales recorded from Payments received.
- Payment Allocations affect debt attribution but are not a second cash receipt.
- "Quanto sobrou" is a simplified operational result, not formal accounting or DRE.
- UTC instants and stored Business-local operational dates are preserved.
- Canonical records are authoritative and derived projections are rebuildable.
- External side effects occur after authoritative commit or through equivalent retryable post-commit handling.
- PostgreSQL is the accepted MVP database direction; Row-Level Security remains deferred and not implemented.

## 7. Assumptions

- The first operational journey should allow a merchant to record a Sale before building a complete Product catalog.
- Most first Sales will use integer quantities. Fractional quantities remain a product-validation question.
- A fully paid counter Sale without Customer is common enough to support.
- Any Sale that leaves debt must identify a Customer.
- A Customer display name is enough to begin debt tracking; phone and email are optional and not unique.
- Daily result visibility is sensitive enough that Staff should not see "Quanto sobrou" by default.
- These assumptions need merchant validation before being treated as market facts.

## 8. Actors and Capabilities

New verified User with no Business:

- May enter first-owner onboarding and bootstrap a new Business.
- Has no tenant-owned access until Business and Owner Membership commit successfully.
- May accept a matching invitation if one exists.

Returning active Owner:

- May use the full critical journey for their active Business.
- Can create Customers and Products, record Sales, Payments, Expenses, Payment Requests, corrections, and view sensitive daily results.
- Can switch among Businesses where they have active Membership.

Returning active Staff member:

- May record Customers, Products, Sales, Payments, and Payment Requests.
- May view operational reports needed for daily work.
- Does not view expenses, "Quanto sobrou", exports, member management, or financial corrections by default.

Manager:

- Remains a defined capability group.
- May perform the journey according to granted capabilities, but release-one exposure is pending merchant validation.

User with one active Business:

- May have that Business selected automatically after server validation.

User with multiple active Businesses:

- Must use an explicit Business selection unless a remembered Business revalidates successfully.

User with only suspended or removed Memberships:

- Cannot access tenant-owned journey steps.
- May use safe account guidance, recovery, or invitation flows if applicable.

User whose Business is deactivated:

- Cannot perform ordinary operational actions.
- May only enter future export, retention, or reactivation flows after separate specification.

User whose session has expired or been revoked:

- Must reauthenticate before continuing.
- Unsaved tenant-specific drafts may be recoverable only under the same Business after revalidation.

Supporting mobile user:

- May sign in, select Business, view essential reports, prepare collection requests, and support product photos according to existing mobile scope.
- Mobile Sale or Payment recording is not accepted for release one by this specification; it remains a product-validation question.

## 9. Journey Entry Conditions

Required entry conditions for tenant-owned operations:

- Authenticated global User.
- Verified email for active Business operations.
- Active Business selected or resolved.
- Active Membership in that Business.
- Active Business state.
- Required capability for the requested action.
- Server-side validation of all referenced tenant-owned records.

Rejected entry conditions:

- Unverified identity trying to operate a Business.
- Suspended or removed Membership.
- Deactivated Business.
- Missing or stale remembered Business.
- Client-supplied Business identifier without server validation.
- Cross-tenant Customer, Product, Sale, Payment, Expense, or Payment Request identifier.

Business bootstrap is available to a verified User with no active Business, subject to accepted signup rules and duplicate/idempotency behavior.

## 10. Canonical End-to-End Journey

Canonical journey:

```text
Sign in
-> validate identity and session
-> resolve or choose active Business
-> verify minimum operational readiness
-> identify or create Customer when required
-> add Sale Items
-> confirm Sale totals and payment condition
-> record Sale
-> optionally record initial Payment and Allocation
-> show resulting debt or paid status
-> later record Payment
-> allocate Payment
-> review customer debt and daily result
```

First-time Owner branch:

- Sign in or create account.
- Verify email.
- Create Business with required minimum data.
- Enter operational journey as Owner after atomic bootstrap.

Returning merchant fast path:

- Sign in.
- Revalidate remembered or only Business.
- Start Sale with minimal setup.

Staff fast path:

- Sign in.
- Revalidate active Staff Membership.
- Record Sale or Payment within allowed capabilities.
- Sensitive daily result and corrections remain unavailable by default.

Financial branches:

- Fully paid Sale creates Sale, Sale Items, Payment, Allocation, and audit evidence.
- Partially paid Sale requires Customer and creates remaining debt.
- Unpaid Sale requires Customer and creates full debt.
- Later Payment allocates to selected Sale first or oldest eligible Sales.
- Payment Request can be prepared without reducing debt.
- Correction/cancellation uses accepted history-preserving patterns.

## 11. Sign-In and Active Business Resolution

Successful returning-user sign-in:

- Authenticates global User.
- Confirms required identity verification before active operations.
- Establishes or refreshes a conceptual session.
- Resolves valid active Business context or requires explicit selection.

Business resolution:

- If exactly one active Membership in an active Business exists, that Business may be selected automatically.
- If multiple active Memberships exist, a valid remembered Business may be selected; otherwise the User chooses explicitly.
- Remembered Business is always revalidated against current User, Business, Membership state, and required capability.
- If remembered Business is inaccessible, it is ignored and tenant-specific cached state is cleared.

Failure states:

- No active Membership: show global account state with safe options to create a Business or accept invitations.
- Only suspended/removed Memberships: deny tenant access with non-revealing guidance.
- Only deactivated Businesses: block ordinary operations.
- Expired/revoked session: require reauthentication and revalidate Business before restoring any draft.

Business switching:

- Replaces selected Business context after server validation.
- Clears or reloads Customers, Products, Sales, reports, drafts, and cached identifiers tied to the previous Business.
- Tenant-specific drafts may survive only under their original Business and cannot be submitted after switching.

Web and mobile sessions are independent. Both clients follow the same active Business validation and stale-context rules.

## 12. First-Owner Onboarding

Minimum merchant-visible information:

- User identity already verified by email.
- Business display name.
- Business time zone.
- Terms or notice acceptance as defined by Cycle 003.

Defaults:

- Currency is BRL and does not require setup in the MVP.
- Time zone may be suggested from trusted context or `America/Manaus` for the initial local context, but must be editable and explicitly confirmed.
- Product catalog, first Customer, Pix key, payment methods, photos, expense categories, address, and tax identifiers are optional or deferred.

Atomic success:

- Business, initial Owner Membership, required settings, audit evidence, and idempotency evidence commit together.
- Session may then select the new Business after validation.
- The merchant can record the first Sale immediately after minimum readiness.

Failure and retry:

- If bootstrap transaction fails, no active Business is shown as created.
- If response outcome is unknown, retry uses idempotency evidence and returns the committed Business or safely retries.
- Same command identity with different payload is rejected.
- Post-commit side-effect failures, such as welcome email or analytics, do not invalidate the Business.

## 13. Minimum Operational Readiness

The smallest coherent readiness before first Sale:

- Active Business.
- Active Owner Membership.
- Business display name.
- Business time zone.
- BRL currency fixed by MVP.

Not required before first Sale:

- Initial Customer.
- Product catalog.
- Pix key.
- Product photos.
- Expense categories.
- Payment method configuration.
- Inventory setup.
- Printer, table, kitchen, fiscal, accounting, or marketplace setup.

Decision: ad hoc Sale Items are permitted in the first critical journey. This keeps the workflow close to a notebook while still preserving Sale Item snapshots. The consequence is that reports may initially show item descriptions without catalog Product references.

Onboarding completion should be derived from required setup steps. A broad stored onboarding state is not required unless a later implementation specification justifies it.

## 14. Customer Selection and Creation

Customer is required when:

- Sale is unpaid.
- Sale is partially paid.
- Payment is recorded later against outstanding debt.
- Payment Request is linked to debt or Customer balance.

Customer is optional when:

- Sale is fully paid immediately and no future debt tracking is needed.

Minimum Customer information:

- Display name or recognizable nickname.

Optional Customer information:

- Phone.
- Email.
- Notes, if later specified.

Phone and email are not unique in the MVP. Same-name Customers are allowed. Future UX should warn about possible duplicates when practical, but must not block creation solely because names, phones, or emails match unless a later product specification changes that rule.

Customer search:

- Searches only within the active Business.
- Must not leak Customers from another Business.
- Empty state should use plain language, such as "Nenhum cliente encontrado".

Customer creation during Sale recording is accepted. If the merchant marks a Sale as unpaid or partially paid and no Customer exists yet, the flow must allow quick Customer creation without leaving the Sale journey.

Deactivated or anonymized Customers:

- Deactivated Customers remain in history.
- They should not appear as ordinary choices for new debt unless a later rule allows reactivation.
- Anonymization with financial history is deferred to legal/retention specification.

Stale Customer behavior:

- If Customer is deactivated or no longer belongs to the active Business before confirmation, the Sale or Payment is rejected and the merchant must reselect or create a valid Customer.

## 15. Product and Sale Item Capture

The merchant may add Sale Items through:

- Selecting an active catalog Product in the same Business.
- Entering an ad hoc description and price.

Required Sale Item information:

- Description snapshot.
- Quantity.
- Unit price or direct line amount, as specified by a later UX/API cycle.
- Line total in BRL minor units.

Product-backed item snapshots:

- Product identifier when selected.
- Product name at Sale time.
- Unit price at Sale time.
- Quantity.
- Discount or adjustment, if used.
- Line total.

Ad hoc item snapshots:

- Description typed by merchant.
- Unit price or line amount.
- Quantity.
- Line total.

Rules:

- Product edits after Sale do not rewrite Sale Item snapshots.
- Product deactivation prevents ordinary future selection but does not change historical Sales.
- Empty Sales are rejected.
- Zero or negative prices, quantities, line totals, Sales, Payments, Allocations, and Expenses are rejected for the MVP.
- Duplicate lines are allowed because they may reflect real counter behavior; the merchant may combine them manually if desired.
- Fractional quantity remains open. Cycle 005 assumes integer quantity for the critical journey.
- Product photos may help recognition but are optional and do not affect financial records.
- Inventory, purchasing, SKU management, and stock deduction are outside this journey.

## 16. Sale Review and Confirmation

Before confirmation, the merchant must understand:

- Active Business.
- Customer, if required or selected.
- Items and descriptions.
- Quantities.
- Unit values.
- Discounts or adjustments, if used.
- Sale total.
- Amount paid now.
- Amount left as debt.
- Payment method when a Payment is recorded.
- Business-local operational date.
- Consequence of confirming.

Validation:

- Fully paid Sale may be anonymous.
- Partially paid and unpaid Sales require Customer.
- Sale total must be greater than `0`.
- Amount paid now must be `0` through Sale total.
- Payment larger than Sale total is rejected for initial Sale.
- Unreasonable future dates are rejected by future workflow rules.
- Stale totals or stale Customer/Product state require authoritative re-read.
- Lost authorization before confirmation rejects the command.
- Duplicate submission uses idempotency to return the prior result or reject conflicting payload.

Example display and canonical values:

- Merchant sees `R$ 25,00`; canonical value is `2500`.
- Merchant sees `R$ 40,00` total and `R$ 15,00` paid now; canonical values are `4000` and `1500`, leaving `2500`.

## 17. Fully Paid Sale

Accepted behavior:

- May be recorded without Customer.
- May use Product-backed or ad hoc Sale Items.
- Records Sale and Sale Items.
- Records initial Payment for the amount received.
- Records Payment Allocation to the Sale.
- Derives paid status from Sale total and active Allocation.
- Creates audit evidence.

Authoritative outcome:

```text
saleTotalMinor = 2500
paymentAmountMinor = 2500
allocatedMinor = 2500
saleOutstandingMinor = 0
```

If any required part fails, no successful Sale is shown. A half-created Sale, Payment, or Allocation must not appear as completed.

Duplicate confirmation returns the already committed Sale result when command identity and payload match; a same identity with different payload is rejected.

## 18. Partially Paid Sale

Accepted behavior:

- Requires Customer.
- Records Sale and Sale Items.
- Records initial Payment for the amount received.
- Records Allocation to the Sale.
- Creates remaining outstanding debt.
- Shows merchant-visible status such as "pago em parte".
- Creates audit evidence.

Example:

```text
saleTotalMinor = 4000
paymentAmountMinor = 1500
allocatedMinor = 1500
saleOutstandingMinor = 2500
```

Consequence:

- Payments received for the Business-local day include `1500`.
- Sales recorded include `4000`.
- Customer debt increases by `2500`.

## 19. Unpaid Sale and Debt Creation

Accepted behavior:

- Requires Customer.
- Records Sale and Sale Items.
- Records no Payment.
- Records no Allocation.
- Creates full outstanding debt.
- Shows merchant-visible status such as "em aberto" or "fiado".
- Creates audit evidence.

Example:

```text
saleTotalMinor = 1800
paymentAmountMinor = 0
allocatedMinor = 0
saleOutstandingMinor = 1800
```

Consequence:

- Sales recorded for the Business-local day include `1800`.
- Payments received do not increase.
- Customer outstanding balance increases by `1800`.

## 20. Debt Visibility

Debt becomes visible after an active Sale with outstanding amount is committed.

Views:

- Customer outstanding balance.
- Sale-level outstanding amount.
- Customer purchase and payment history.
- Oldest eligible outstanding Sales for allocation.

Derived classifications:

- "pago": outstanding amount is `0`.
- "pago em parte": outstanding amount is greater than `0` and less than Sale total.
- "em aberto" or "fiado": outstanding amount equals Sale total.

Rules:

- Cancelled Sales do not count in ordinary debt.
- Reversed Payments stop reducing debt.
- Corrected Sales use active replacement records.
- Payment Request status is separate from debt.
- Empty debt state should use plain language, such as "Nenhuma venda em aberto".
- If a derived projection disagrees with canonical Sales, Payments, and Allocations, the projection is rebuilt or blocked; canonical records win.

## 21. Later Payment and Allocation

Journey:

1. Merchant selects or finds Customer in the active Business.
2. System shows outstanding Sales for that Customer.
3. Merchant enters amount received.
4. Merchant may select a specific Sale or record a general payment for the Customer.
5. Allocation applies selected Sale first.
6. Remaining amount applies to oldest eligible outstanding Sales by Business-local date, creation instant, then stable identity.
7. Payment and Allocations commit atomically.
8. Merchant sees affected Sales and remaining Customer debt.

Rules:

- Payment requires `payments.record`.
- Payment amount must be positive.
- Payment amount must not exceed Customer outstanding balance.
- Payment and Allocations must belong to the same Business.
- Payment cannot allocate across Customers.
- Cancelled Sales are ineligible.
- Reversed Payments are ineffective.
- Timeout or duplicate submission uses idempotency.
- Concurrent Payment changes require authoritative re-read and may reject as conflict.
- Authorization loss during confirmation rejects the command.

Example:

```text
Customer debt before = 5000
Payment = 3500
Oldest Sale A outstanding = 3000
Next Sale B outstanding = 2000
Allocations = 3000 to Sale A, 500 to Sale B
Customer debt after = 1500
```

## 22. Payment Request Behavior

Payment Request path:

- Merchant chooses to ask Customer to pay later.
- System prepares a request linked to Customer, Sale, or current balance context.
- Request amount is expressed in BRL minor units internally and displayed as BRL.
- Delivery channel remains deferred: WhatsApp, Pix, email, or another provider is not selected here.
- Request may be draft, sent, failed, cancelled, or expired when later specified.
- Delivery failure can be retried without changing debt.
- Request status does not confirm payment.

Financial rule:

- No outstanding debt changes until a valid Payment exists.
- Future Pix or provider confirmation must be verified, tenant-mapped, deduplicated, and reconciled before creating or confirming internal Payment.

Post-commit side effects:

- If Payment Request record commits but delivery fails, the request may show failed/pending delivery.
- The failed delivery does not cancel or alter Sales, Payments, or Customer balance.

## 23. Daily Result

Daily result uses the active Business and Business-local day.

Conceptual formulas:

```text
salesRecordedTodayMinor =
  sum(active Sales whose Sale business-local date is today)

paymentsReceivedTodayMinor =
  sum(active Payments whose received business-local date is today)

expensesTodayMinor =
  sum(active Expenses whose occurrence business-local date is today)

quantoSobrouTodayMinor =
  paymentsReceivedTodayMinor - expensesTodayMinor
```

Rules:

- Sales recorded and Payments received are distinct.
- Payment Allocation is debt attribution, not an extra receipt.
- Payment Request is not a receipt.
- A Payment received today for an older debt counts in "Quanto entrou hoje".
- A Sale recorded today and paid later does not increase Payments received today.
- Cancelled Sales and Expenses are excluded from ordinary totals but remain explainable in history.
- Reversed Payments are excluded or shown as reversals according to future report detail.
- Late-entered operations use their Business-local occurrence/received date and separate recording instant.
- Projection disagreement blocks or rebuilds the report from canonical records.
- "Quanto sobrou" is `paymentsReceivedTodayMinor - expensesTodayMinor`; it must not be presented as profit, DRE, taxable result, or formal accounting.

Permission:

- Owner can view daily result including expenses and "Quanto sobrou".
- Manager can view according to granted capabilities if exposed later.
- Staff can view operational report content only by default, such as Sales recorded and debt tasks, not expense-sensitive "Quanto sobrou".
- Mobile may view essential reports subject to the same capability checks.

## 24. Expense Relationship

Minimum Expense behavior for daily result:

- Expense belongs to active Business.
- Expense requires amount, occurrence Business-local date, description or simple category, actor, and audit evidence.
- Owner may record, view, cancel, and correct Expenses.
- Manager may do so if Manager is exposed with matching capabilities.
- Staff cannot record or view expense-sensitive daily result by default.
- Expense amount affects "Quanto saiu" and "Quanto sobrou".
- Changing financial meaning uses cancellation and replacement.
- Descriptive metadata edits may be allowed with audit.
- Expense history is not hard-deleted during ordinary operation.

Outside this journey:

- Purchasing.
- Suppliers.
- Accounts payable.
- Receipts or attachments.
- Formal accounting categories.

## 25. Correction, Cancellation, Reversal, and Replacement

Correction rules:

| Case | Capability | Action | Balance effect | History |
| --- | --- | --- | --- | --- |
| Wrong Customer on Sale | `financial.correct` | Cancel affected Sale and replacement records | Recalculate from active records | Original retained |
| Wrong item, quantity, or Sale amount | `financial.correct` | Cancel Sale and create replacement | Replacement becomes active | Original retained |
| Duplicate Sale | `financial.correct` | Cancel duplicate | Duplicate excluded from ordinary totals | Duplicate retained |
| Wrong Payment amount | `financial.correct` | Reverse and replace Payment | Active Allocations recalculated | Original retained |
| Wrong Payment method | `financial.correct` | Reverse/replace unless non-financial note is enough | No silent financial rewrite | Original retained |
| Wrong Payment date | `financial.correct` | Reverse and replace if reporting meaning changes | Period totals updated by active records | Original retained |
| Duplicate Payment | `financial.correct` | Reverse duplicate | Debt may reappear | Duplicate retained |
| Wrong Expense amount/date | `financial.correct` or expense correction capability | Cancel and replace | Daily result recalculated | Original retained |
| Wrong Expense description only | Expense edit capability | Descriptive edit with audit | No financial effect | Audit retained |
| Accidental cancellation | `financial.correct` | Replacement, not restoration by default | Active replacement counts | Cancelled original retained |

Merchant-visible explanations should use plain language:

- "Esta venda foi cancelada e uma nova venda corrigida foi criada."
- "Este pagamento foi estornado porque foi registrado errado."
- "A divida voltou porque o pagamento foi estornado."

Cancelled financial records are not safely restored in the MVP. Use replacement to preserve an understandable trail.

## 26. Conflict, Idempotency, and Recovery

Duplicate or repeated confirmation:

- Same command identity and same payload returns the prior committed result.
- Same command identity with different payload is rejected.

Unknown commit outcome:

- Retry through idempotency evidence.
- Do not ask the merchant to create a duplicate record blindly.

Concurrency:

- Concurrent Payment against same Sale re-reads outstanding amount; one or both succeed only within remaining debt.
- Concurrent Sale cancellation and Payment allocation: one commits; the other rejects or retries.
- Concurrent Customer/Product descriptive edit may require re-read; Sale Item snapshots preserve historical meaning after confirmation.
- Business deactivation during confirmation rejects new tenant-owned effects.
- Membership suspension or capability reduction during confirmation rejects or forces reauthentication/revalidation.
- Stale report or debt view is refreshed from canonical records.

Offline and poor connectivity:

- Offline synchronization is not part of the MVP.
- If the client cannot reach authoritative services, it must not claim that Sale, Payment, Expense, or correction was recorded.
- Local drafts may be kept as drafts only and must be revalidated before submission.

Silent last-write-wins is forbidden for financial and authorization-sensitive actions.

## 27. Conceptual Interaction States

Required future states:

- Loading: show that records are being checked or saved; prevent accidental duplicate confirmation where practical.
- Empty Business: explain that the merchant can start by recording a Sale; Product and Customer setup are optional until needed.
- No Customers: allow creating one when debt or Payment requires it.
- No Products: allow ad hoc Sale Item entry.
- No Sales today: show zero totals without implying failure.
- Customer with no debt: "Este cliente nao tem vendas em aberto."
- Successful Sale: show paid, partially paid, or debt result.
- Successful Payment: show affected Sales and remaining debt.
- Successful Expense: show effect on "Quanto saiu" and "Quanto sobrou" where authorized.
- Payment Request pending/failed: show delivery status without changing debt.
- Validation warning: explain the next action in plain language.
- Authorization denial: explain lack of access without exposing another Business.
- Cross-tenant denial: generic not-found or access-denied behavior.
- Conflict: ask merchant to refresh/retry after explaining that information changed.
- Temporary persistence failure: do not show success; allow safe retry.
- Unknown outcome: guide retry/status check without duplicate creation.
- Reauthentication required: preserve safe draft only after Business revalidation.
- Business deactivated: block ordinary operations.
- Projection/integrity issue: block or rebuild report; do not show untrusted numbers as final.

Messages must be actionable, plain, and safe.

## 28. Web and Mobile Responsibilities

Required on web:

- Sign in and active Business selection.
- First-owner bootstrap.
- Minimum readiness flow.
- Customer search and creation.
- Product selection and ad hoc Sale Item entry.
- Fully paid, partially paid, and unpaid Sale recording.
- Later Payment recording and allocation.
- Payment Request preparation or sharing flow once specified.
- Daily result and debt review.
- Expense recording for authorized users.
- Correction/cancellation/reversal entry points for authorized users.

Required on mobile:

- Sign in and active Business selection.
- Revalidate tenant context like web.
- View essential reports and business information within capabilities.
- Support product-photo capture/upload in a later photo specification.
- Prepare or share collection requests when that flow is specified.

Optional on mobile:

- View Customer debt details if report consultation requires it.
- Receive reauthentication and revocation handling equivalent to web.

Deferred on mobile:

- Recording Sales.
- Recording later Payments.
- Recording Expenses.
- Financial correction flows.
- Member management and Business settings.

Mobile Sale or Payment recording may be revisited only through product validation and explicit scope decision.

## 29. Accessibility and Low-Technical-Literacy Requirements

Future UX obligations:

- Use everyday Brazilian Portuguese.
- Avoid accounting, ERP, tenant, session, and capability terminology in UI.
- Prefer "Quem esta devendo", "Quanto entrou", "Quanto saiu", and "Quanto sobrou".
- One clear primary action per step where practical.
- Format merchant-visible values as BRL.
- State financial consequences before confirmation.
- Explain cancellation, reversal, debt, and Payment Request in plain language.
- Convey status with text, not color alone.
- Support keyboard operation on web.
- Use screen-reader-compatible labels and error associations.
- Provide visible focus.
- Use adequate touch targets on mobile.
- Avoid hidden critical actions based only on gestures.
- Prevent accidental duplicate submission.
- Make recovery paths understandable without technical knowledge.
- Keep confirmation friction proportional: enough for financial trust, not enough to feel like an ERP.

No visual design system is created in this cycle.

## 30. Security and Privacy Implications

Journey-level controls:

- Customer personal information appears only inside authorized active Business context.
- Customer search must not leak other Businesses.
- Business switching clears tenant-specific state.
- Direct-object reference attacks must fail closed.
- Protected fields such as Business ownership, role, lifecycle state, financial amount, and audit actor must not be mass-assigned by clients.
- Export access remains sensitive and outside Staff defaults.
- Session invalidation must be observed before confirming tenant-owned actions.
- Shared devices need visible sign-out and bounded sessions.
- Mobile device loss relies on session revocation/revalidation after credential reset or compromise response.
- Sensitive reports and Expenses require explicit capabilities.
- Product photos remain tenant-owned and access-scoped.
- Future Payment Request delivery may expose Customer contact and debt amount through external channels and must be specified before integration.
- Provider callbacks must be verified, mapped to tenant-owned records, and deduplicated.
- Logs, analytics, diagnostics, and audit records must avoid secrets and unnecessary personal or financial payloads.
- Test fixtures and demonstration data should avoid real Customer and financial data where possible.

This document defines design controls and does not claim full LGPD compliance.

## 31. Conceptual Analytics and Observability

Future product and operational signals may include:

- Onboarding started.
- Business bootstrap completed.
- First Sale completed.
- Sale type category: paid, partial, or unpaid.
- Customer created during Sale.
- Payment recording completed.
- Payment Request attempted.
- Daily result viewed.
- Validation category.
- Conflict category.
- Unknown outcome category.
- Post-commit side-effect failure category.

Rules:

- Analytics are never financial authority.
- Do not include secrets.
- Do not include raw Customer names, contact details, full debt lists, or raw financial payloads when categorized metadata is enough.
- Distinguish rejected validation, authorization denial, temporary failure, unknown outcome, and committed result.
- Observability must preserve tenant context without leaking tenant data across Businesses.

No analytics, logging, tracing, or observability provider is selected.

## 32. Examples and Edge Cases

1. New verified Owner creates first Business and records first fully paid Sale.
   Actor/capability: verified User becoming Owner; `sales.record`.
   Preconditions: no active Business, verified email.
   Business scope: new Business after bootstrap.
   Action: create Business, add ad hoc item R$ 25,00, mark paid.
   Records: Business, Owner Membership, Sale, Sale Item, Payment, Allocation, audit.
   Outcome: Sale paid.
   Financial consequence: sales recorded `2500`, payments received `2500`, debt `0`.
   Error/retry: bootstrap or Sale retry uses idempotency.
   Audit: Business created, Owner assigned, Sale and Payment recorded.
   Invariant/test: no active Business without Owner; fully paid Sale atomic.

2. Returning Owner with one Business records quick fully paid Sale.
   Actor/capability: Owner; `sales.record`.
   Preconditions: active session or successful sign-in.
   Business scope: automatically selected after validation.
   Action: ad hoc item R$ 10,00, cash paid.
   Records: Sale, Sale Item, Payment, Allocation.
   Outcome: paid.
   Financial consequence: payments received `1000`.
   Error/retry: duplicate submit returns same Sale.
   Audit: Sale and Payment creation.
   Invariant/test: remembered Business revalidated.

3. User with multiple Businesses selects correct Business.
   Actor/capability: any active member.
   Preconditions: two active Memberships.
   Business scope: selected Business only.
   Action: choose "Estabelecimento".
   Records: session context reference.
   Outcome: tenant data for selected Business only.
   Financial consequence: none.
   Error/retry: stale remembered Business ignored.
   Audit: tenant switch if security value justifies it.
   Invariant/test: no cross-Business cached data.

4. Remembered Business no longer authorized.
   Actor/capability: former member.
   Preconditions: Membership removed after last session.
   Business scope: none authorized.
   Action: return to app.
   Records: session revalidation state.
   Outcome: access denied or reselection.
   Financial consequence: none.
   Error/retry: sign-in does not restore removed access.
   Audit: optional access denial.
   Invariant/test: removed Membership cannot authorize.

5. Staff attempts expense-sensitive daily result.
   Actor/capability: Staff without `reports.financial.view`.
   Preconditions: active Business.
   Business scope: same Business.
   Action: view "Quanto sobrou hoje".
   Records: report source records not returned.
   Outcome: denied or limited operational view.
   Financial consequence: none.
   Error/retry: ask Owner if needed.
   Audit: sensitive denial if useful.
   Invariant/test: Staff does not receive sensitive report by default.

6. Merchant records unpaid Sale for existing Customer.
   Actor/capability: Owner or Staff; `sales.record`.
   Preconditions: active Customer.
   Business scope: same Business.
   Action: Sale R$ 18,00, paid now R$ 0,00.
   Records: Sale, Sale Item, audit.
   Outcome: "em aberto".
   Financial consequence: sales recorded `1800`, payments received `0`, debt `1800`.
   Error/retry: duplicate submit idempotent.
   Audit: Sale recorded.
   Invariant/test: unpaid Sale requires Customer.

7. Merchant creates Customer during unpaid Sale.
   Actor/capability: Owner or Staff; `customers.manage`, `sales.record`.
   Preconditions: no matching Customer selected.
   Business scope: active Business.
   Action: create "Ana" and confirm unpaid Sale.
   Records: Customer, Sale, Sale Item, audit.
   Outcome: Customer and debt created.
   Financial consequence: debt belongs to Ana.
   Error/retry: Customer/Sale commit boundary later specified; no cross-tenant Customer.
   Audit: Customer and Sale.
   Invariant/test: inline Customer creation allowed.

8. Merchant attempts unpaid Sale without Customer.
   Actor/capability: `sales.record`.
   Preconditions: no Customer selected.
   Business scope: active Business.
   Action: mark Sale unpaid.
   Records: none committed.
   Outcome: validation rejection.
   Financial consequence: no debt.
   Error/retry: choose/create Customer.
   Audit: optional rejected validation.
   Invariant/test: debt requires Customer.

9. Merchant records partially paid Sale.
   Actor/capability: `sales.record`, `payments.record`.
   Preconditions: Customer selected.
   Business scope: same Business.
   Action: Sale `4000`, paid `1500`.
   Records: Sale, Sale Item, Payment, Allocation.
   Outcome: "pago em parte".
   Financial consequence: debt `2500`, payments received `1500`.
   Error/retry: atomic retry.
   Audit: Sale and Payment.
   Invariant/test: partial Sale atomic.

10. Merchant attempts initial Payment above Sale total.
    Actor/capability: `sales.record`, `payments.record`.
    Preconditions: Sale total `2500`.
    Business scope: active Business.
    Action: paid now `3000`.
    Records: none committed.
    Outcome: rejected.
    Financial consequence: none.
    Error/retry: enter `2500` or lower.
    Audit: optional rejected financial action.
    Invariant/test: overpayment rejected.

11. Product renamed after historical Sales exist.
    Actor/capability: `products.manage`.
    Preconditions: Sale Item snapshot exists.
    Business scope: same Business.
    Action: rename Product.
    Records: Product metadata.
    Outcome: future Product display changes.
    Financial consequence: historical Sales unchanged.
    Error/retry: stale Product selection re-read before new Sale.
    Audit: Product change if sensitive.
    Invariant/test: Sale Item snapshots preserved.

12. Merchant records later Payment for one Sale.
    Actor/capability: `payments.record`.
    Preconditions: Customer owes `2500` on selected Sale.
    Business scope: same Business.
    Action: record Payment `1000`.
    Records: Payment, Allocation.
    Outcome: Sale remains partially paid.
    Financial consequence: debt `1500`, payments received `1000`.
    Error/retry: duplicate Payment idempotent.
    Audit: Payment and Allocation.
    Invariant/test: selected Sale first.

13. One Payment allocated across multiple Sales.
    Actor/capability: `payments.record`.
    Preconditions: Customer owes Sale A `3000`, Sale B `2000`.
    Business scope: same Business.
    Action: general Payment `3500`.
    Records: Payment, two Allocations.
    Outcome: A paid, B partially paid.
    Financial consequence: debt `1500`.
    Error/retry: stale outstanding re-read.
    Audit: allocations.
    Invariant/test: oldest eligible allocation.

14. Two Payments concurrently target same outstanding Sale.
    Actor/capability: two authorized users.
    Preconditions: Sale outstanding `2000`.
    Business scope: same Business.
    Action: both record Payment `1500`.
    Records: at most valid Payments/Allocations within remaining debt.
    Outcome: one may succeed; the other rejects or adjusts only if command permits.
    Financial consequence: no over-allocation.
    Error/retry: refresh debt.
    Audit: success and rejection as useful.
    Invariant/test: concurrent allocation safe.

15. Duplicate Payment submission after timeout.
    Actor/capability: `payments.record`.
    Preconditions: unknown response.
    Business scope: same Business.
    Action: retry same Payment command.
    Records: idempotency evidence.
    Outcome: original result returned.
    Financial consequence: no duplicate receipt.
    Error/retry: conflicting payload rejected.
    Audit: correlated retry.
    Invariant/test: idempotency.

16. Payment succeeds but notification delivery fails.
    Actor/capability: `payments.record`.
    Preconditions: Payment committed.
    Business scope: same Business.
    Action: post-commit request/notification fails.
    Records: Payment and Allocation remain active.
    Outcome: show Payment success and delivery failure.
    Financial consequence: debt reduced.
    Error/retry: retry delivery only.
    Audit: Payment success; side-effect failure if useful.
    Invariant/test: side effect not financial authority.

17. Payment Request sent but no Payment confirmed.
    Actor/capability: `payments.record` or request capability.
    Preconditions: Customer owes `2500`.
    Business scope: same Business.
    Action: send request.
    Records: Payment Request.
    Outcome: request sent/pending.
    Financial consequence: debt remains `2500`.
    Error/retry: resend or cancel request.
    Audit: request action.
    Invariant/test: request does not reduce debt.

18. Payment is reversed and debt reappears.
    Actor/capability: `financial.correct`.
    Preconditions: Payment `1500` allocated.
    Business scope: same Business.
    Action: reverse Payment.
    Records: reversal and Allocation ineffective state.
    Outcome: debt increases by `1500`.
    Financial consequence: payments received excludes reversed Payment according to report rules.
    Error/retry: duplicate reversal rejected/idempotent.
    Audit: reversal reason.
    Invariant/test: history preserved.

19. Sale cancellation races with Payment allocation.
    Actor/capability: `financial.correct` and `payments.record`.
    Preconditions: Sale outstanding.
    Business scope: same Business.
    Action: cancel while another user pays.
    Records: competing Sale/Payment/Allocation records.
    Outcome: one operation commits; the other rejects/retries.
    Financial consequence: no active allocation to cancelled Sale.
    Error/retry: refresh state.
    Audit: committed action and conflict if useful.
    Invariant/test: cancellation/allocation race safe.

20. Merchant corrects Sale associated with wrong Customer.
    Actor/capability: `financial.correct`.
    Preconditions: Sale belongs to Ana but should be Bia.
    Business scope: same Business.
    Action: cancel original and create replacement.
    Records: original Sale, replacement Sale, related reversal/replacement if needed.
    Outcome: Bia has corrected debt or paid status.
    Financial consequence: Ana balance recalculated.
    Error/retry: stale state rejected.
    Audit: correction reason.
    Invariant/test: no silent Customer rewrite.

21. Business deactivated while User has active session.
    Actor/capability: affected user.
    Preconditions: Business deactivated by Owner.
    Business scope: deactivated Business.
    Action: continue journey.
    Records: session revocation/revalidation.
    Outcome: ordinary operation blocked.
    Financial consequence: no new records.
    Error/retry: reselect another Business if available.
    Audit: deactivation.
    Invariant/test: deactivated Business blocks operations.

22. Membership suspended during Sale confirmation.
    Actor/capability: formerly active member.
    Preconditions: suspension commits before Sale.
    Business scope: same Business.
    Action: confirm Sale.
    Records: none for Sale.
    Outcome: authorization rejection.
    Financial consequence: no Sale.
    Error/retry: reauthenticate/revalidate if restored.
    Audit: denial if useful.
    Invariant/test: suspended Membership cannot authorize.

23. Daily result includes older-debt Payment.
    Actor/capability: Owner.
    Preconditions: Sale recorded yesterday, Payment today.
    Business scope: same Business.
    Action: view daily result.
    Records: Sale, Payment, Allocation, Expense.
    Outcome: today payments include Payment; today sales do not include old Sale.
    Financial consequence: no double count.
    Error/retry: projection rebuilt if stale.
    Audit: report view if needed.
    Invariant/test: Sales recorded versus Payments received.

24. Report projection disagrees with canonical records.
    Actor/capability: report viewer.
    Preconditions: derived value mismatch detected.
    Business scope: same Business.
    Action: open daily result.
    Records: canonical records and projection.
    Outcome: rebuild or block untrusted view.
    Financial consequence: no false final number.
    Error/retry: retry after rebuild.
    Audit: integrity event if serious.
    Invariant/test: canonical records win.

25. Business time zone changes after historical operations.
    Actor/capability: Owner.
    Preconditions: historical Sales exist.
    Business scope: same Business.
    Action: update time zone.
    Records: Business setting.
    Outcome: future records use new zone.
    Financial consequence: historical report dates unchanged.
    Error/retry: validate setting.
    Audit: setting change.
    Invariant/test: historical Business-local dates preserved.

26. Mobile user views same daily result as web user.
    Actor/capability: Owner or authorized Manager.
    Preconditions: same active Business.
    Business scope: same Business.
    Action: view report on mobile and web.
    Records: same canonical report sources.
    Outcome: consistent totals for same permissions.
    Financial consequence: none.
    Error/retry: revalidate mobile session.
    Audit: report view if needed.
    Invariant/test: shared domain rules across clients.

27. Cross-tenant Customer or Sale identifier supplied.
    Actor/capability: any active member in Business A.
    Preconditions: identifier belongs to Business B.
    Business scope: Business A.
    Action: use identifier in Sale or Payment flow.
    Records: none changed.
    Outcome: generic denial/not found.
    Financial consequence: none.
    Error/retry: choose valid Customer/Sale.
    Audit: sensitive denial if useful.
    Invariant/test: cross-tenant fail closed.

28. Customer has same name as another Customer.
    Actor/capability: `customers.manage`.
    Preconditions: "Joao" exists.
    Business scope: same Business.
    Action: create another "Joao".
    Records: Customer.
    Outcome: allowed with warning if practical.
    Financial consequence: debt attaches only to selected Customer.
    Error/retry: merchant may choose existing Customer.
    Audit: Customer creation.
    Invariant/test: name is not durable identity.

29. Merchant submits empty or zero-value Sale.
    Actor/capability: `sales.record`.
    Preconditions: active Business.
    Business scope: same Business.
    Action: no items or total `0`.
    Records: none committed.
    Outcome: validation rejection.
    Financial consequence: none.
    Error/retry: add valid item/value.
    Audit: usually not needed.
    Invariant/test: zero-value financial records invalid.

30. Expense corrected after appearing in daily result.
    Actor/capability: Owner or Manager if allowed.
    Preconditions: Expense `1200` should be `1000`.
    Business scope: same Business.
    Action: cancel and replace Expense.
    Records: original Expense, replacement Expense, audit.
    Outcome: daily result recalculated.
    Financial consequence: expenses change from `1200` to `1000`.
    Error/retry: stale correction rejected.
    Audit: correction reason.
    Invariant/test: financial correction preserves history.

## 33. Future Acceptance Scenarios

Scenario: Returning Owner selects the only active Business.

Given a verified User has one active Owner Membership in an active Business
When the User signs in
Then the Business is selected after server validation.

Scenario: New Owner bootstraps the first Business.

Given a verified User has no active Business
When the User provides Business name and time zone
Then the Business and initial Owner Membership are created atomically.

Scenario: Fully paid Sale is recorded.

Given an authorized User is in an active Business
When the User records a Sale for R$ 25,00 paid now
Then Sale, Sale Items, Payment, and Allocation are committed together.

Scenario: Partially paid Sale creates debt.

Given an authorized User selected Customer Ana
When the User records a R$ 40,00 Sale with R$ 15,00 paid
Then Ana has R$ 25,00 outstanding.

Scenario: Unpaid Sale requires Customer.

Given no Customer is selected
When the User tries to record an unpaid Sale
Then the command is rejected and no Sale is committed.

Scenario: Customer can be created during Sale.

Given the Customer does not exist
When the User creates the Customer inside an unpaid Sale flow
Then the Customer and Sale can be committed under the active Business.

Scenario: Later Payment allocates to multiple Sales.

Given Customer Bia owes R$ 30,00 on Sale A and R$ 20,00 on Sale B
When the User records R$ 35,00 received
Then R$ 30,00 is allocated to Sale A and R$ 5,00 to Sale B.

Scenario: Overpayment is rejected.

Given Customer Caio owes R$ 12,00
When the User records R$ 15,00 received
Then no Payment is committed.

Scenario: Payment Request does not affect debt.

Given Customer Ana owes R$ 25,00
When the User sends a Payment Request for R$ 25,00
Then Ana still owes R$ 25,00 until a Payment is recorded.

Scenario: Daily result separates Sale and Payment.

Given a Sale was recorded yesterday and paid today
When the Owner views today's result
Then today's Payments received include the Payment and today's Sales recorded do not include yesterday's Sale.

Scenario: Staff cannot view expense-sensitive result.

Given a Staff member lacks `reports.financial.view`
When Staff opens "Quanto sobrou hoje"
Then the sensitive result is denied or replaced with an allowed operational view.

Scenario: Duplicate submission is idempotent.

Given a Sale command committed but the client timed out
When the same command is retried
Then the original Sale result is returned.

Scenario: Stale state conflict.

Given a Sale's outstanding amount changed after the view loaded
When the User confirms an old Payment amount
Then the command revalidates and rejects or recalculates according to accepted rules.

Scenario: Session invalidation blocks operation.

Given a Membership is suspended
When the User tries to confirm a Sale
Then the operation is rejected and no financial record is created.

Scenario: Business deactivation blocks operation.

Given a Business was deactivated
When a User tries to record Payment
Then the operation is rejected.

Scenario: Cross-tenant identifier is supplied.

Given a User is active in Business A
When the User supplies a Customer identifier from Business B
Then the request is denied without revealing Business B.

Scenario: Payment reversal restores debt.

Given a Payment reduced a Sale's outstanding amount
When an authorized User reverses the Payment
Then debt is recalculated from active Allocations only.

Scenario: Web and mobile report consistency.

Given the same User has report permission on web and mobile
When both clients view the same Business-local day
Then they show the same canonical totals subject to the same permissions.

## 34. Rejected or Deferred Alternatives

Rejected for this journey:

- Requiring Product catalog setup before the first Sale.
- Requiring Customer setup before every fully paid counter Sale.
- Treating Payment Request as Payment.
- Recording customer credit from overpayment.
- Letting Staff view expenses or "Quanto sobrou" by default.
- Silent in-place financial edits.
- Offline-first Sales or Payment synchronization.
- Mobile point-of-sale parity without product validation.
- Business identifier filtering as authorization.
- Formal accounting, DRE, or profit language.

Deferred:

- Fractional quantity behavior and rounding mode.
- Customer contact uniqueness.
- Manager release-one exposure.
- Final mobile Sale and Payment scope.
- UX screens, copy deck, visual design, and component behavior.
- API contracts and logical data model.
- Physical schema, ORM, identifier, lock, and isolation strategy.
- Payment method catalog beyond simple conceptual method labels.
- Product photo upload implementation.
- Payment Request provider delivery.
- Analytics provider and observability tooling.
- Legal retention and anonymization policies.

## 35. Open Questions

Product or merchant validation:

- Are integer quantities enough for the first target segment?
- Do merchants need fractional quantity for grocery-style weighted products in release one?
- Should mobile allow Sale or Payment recording later, or remain report/photo/collection support?
- Should Staff record Expenses in some businesses?
- Should Staff see "Quanto entrou" but not "Quanto sobrou"?
- Should Manager be exposed in release one?
- Which terms are clearest: "Venda fiada", "Venda em aberto", "Pago em parte", "Dono", "Responsavel", "Atendente", and "Funcionario"?
- Should same-name Customer warnings appear immediately or only during search?
- Which payment method labels are necessary first?

Operational and legal validation:

- Retention and anonymization for Customer and financial history.
- Export behavior after Business deactivation.
- Support/admin access model, if any.
- Shared-device session duration.
- Legal review of analytics, audit, and communication metadata.

Deferred implementation choices:

- API framework and API style.
- ORM/query layer and physical schema.
- Identifier strategy and business-local numbering.
- Session storage and revocation implementation.
- Idempotency persistence structure.
- Cache/projection strategy.
- Queue/outbox implementation.
- Pix, WhatsApp, email, analytics, object storage, and cloud providers.
- PostgreSQL Row-Level Security adoption.

## 36. Acceptance Criteria

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
- Security and privacy implications are aligned.
- Future acceptance and end-to-end test targets are documented.
- Open questions are separated from accepted decisions.
- Existing documentation is internally consistent.
- No application code, dependency, manifest, schema, migration, API, UI implementation, provider integration, test implementation, or scaffold is introduced.

## 37. Traceability

Product requirements:

- Replace notebook workflows for Sales, "fiado", Payments, Expenses, and daily results.
- Keep operations simple for low-technical-confidence merchants.
- Preserve financial trust, auditability, and tenant isolation.
- Keep MVP deliberately narrow.
- Keep web as primary operational client and mobile as supporting client.

Related documents:

- [Product Vision](../product/vision.md)
- [MVP Scope](../product/mvp-scope.md)
- [UX Principles](../product/ux-principles.md)
- [Domain and Tenancy Specification](domain-and-tenancy.md)
- [Authentication and Business Onboarding Specification](authentication-and-business-onboarding.md)
- [Data Persistence and Tenant Enforcement Specification](data-persistence-and-tenant-enforcement.md)
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

## 38. Recommended Follow-up Specification

Recommended next cycle: Logical Data Model Specification.

Recommended task: Specify Logical Records, Relationships, Constraints, and Repository Boundaries for the Critical Journey.

Why: Cycles 002 through 005 now define the domain, tenancy, onboarding, persistence invariants, and first merchant journey. The next dependency is a logical data model that maps canonical records, derived values, tenant ownership, idempotency, audit, and consistency boundaries before API contracts or implementation planning.

Non-goals for that cycle should include physical schema, SQL, migrations, ORM annotations, repository implementation, API endpoints, UI screens, provider integrations, and MVP expansion.
