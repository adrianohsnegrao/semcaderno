# MVP Scope

## MVP Goal

The MVP should replace the core notebook workflow for a small Brazilian merchant:

1. Register customers and products.
2. Record paid, partially paid, or unpaid sales.
3. Track who owes money and what has already been paid.
4. Record basic expenses.
5. Share simple manual collection requests by Pix or WhatsApp.
6. View essential reports that answer practical questions.

The MVP must remain small enough to validate the product's core promise: "Vendas, fiados e despesas sem papel e sem confusão."

## Included in the MVP

- Simple customer management.
- Simple product management with optional photo.
- Recording a sale as paid or unpaid.
- Customer purchase and payment history.
- Partial and full debt payments.
- Basic expense recording.
- Manual Pix or WhatsApp collection flow.
- Essential reports.
- Basic user and business access control.
- Mobile support for photos, collections, and report consultation.

## Explicitly Excluded from the MVP

- Tax invoice issuance.
- Full accounting.
- DRE or advanced accounting terminology in the UI.
- iFood or marketplace integrations.
- Kitchen management.
- Complex table management.
- Printer integration.
- Loyalty programs.
- Artificial intelligence.
- Automatic payment reconciliation.
- A generic plugin or module system.
- Complex inventory or purchasing management.
- Multiple unnecessary configuration options.
- Features added solely to make the project appear more technically sophisticated.

## Web Boundary

The web application is the primary operational interface. It should eventually support:

- Customer registration.
- Product registration.
- Recording paid or unpaid sales.
- Customer purchase and payment history.
- Recording basic business expenses.
- Managing outstanding debts.
- Sending Pix or WhatsApp payment requests.
- Essential operational and financial reports.

The web application must be responsive because some merchants may not have a desktop computer at the counter.

Cycle 005 defines the first critical web journey: sign in, resolve the active business, record a fully paid, partially paid, or unpaid sale, create a customer during the sale when debt is involved, record later payments, prepare manual payment requests, and review debt and daily results.

The first journey does not require a product catalog before recording a sale. Ad hoc sale items are allowed so the merchant can start with notebook-like speed while still preserving sale item snapshots.

Cycle 006 maps these scope choices into logical records without adding new product features: fully paid counter sales may be anonymous, partial and unpaid sales require a customer, customer contact data remains optional and non-unique, and debt remains derived from sales, payments, and allocations rather than from an editable balance.

Cycle 007 maps the same scope into technology-independent application commands and queries. It does not add product features: it clarifies that Sale, Payment, Payment Request, Expense, report, Customer, Product, Membership, and onboarding behavior must pass through server-authoritative contracts that preserve tenant isolation, safe money arithmetic, idempotency, and understandable errors.

Cycle 008 translates those accepted responsibilities into a merchant-facing UX contract without adding implementation or features. It defines plain Brazilian Portuguese copy, navigation and screen responsibilities, financial review, duplicate protection, unknown-outcome recovery, responsive web behavior, supporting mobile behavior, accessibility, and sensitive-data presentation. Provisional terminology, Staff/Manager visibility, mobile mutation scope, fractional quantity, drafts, and provider-specific delivery remain validation questions.

## Mobile Boundary

The mobile application is a supporting client, not the primary point-of-sale interface.

Its initial responsibilities are limited to:

- Taking and uploading product photos.
- Sending Pix payment requests.
- Viewing essential reports and business information.

The mobile scope must not expand beyond this without a future specification.

Cycle 005 keeps mobile supporting rather than primary point-of-sale. Mobile may sign in, select a business, view essential reports, support collection requests, and support product-photo work in later specifications. Mobile sale, payment, expense, and correction recording remain deferred product-validation questions.

## Pix Boundary

### MVP

In the MVP, Sem Caderno may generate or share a payment message containing:

- Amount to collect.
- Pix key, when configured by the business.
- Pix Copia e Cola payload, if later specified.
- Plain-language message suitable for WhatsApp.

Payment confirmation is manual. A user must record that payment happened.

### Future Integration

A future version may create dynamic Pix charges through a bank or payment provider and reconcile payments automatically. This is outside the MVP.

The domain must not be tightly coupled to a specific bank or provider. A future abstraction such as `PaymentRequestProvider` should be evaluated before any integration work begins.

## Success Criteria

- The merchant can identify "Quem está devendo" without calculating manually.
- The merchant can record payment history without losing past events.
- The merchant can answer "Quanto entrou", "Quanto saiu", and "Quanto sobrou este mês" without accounting terminology.
- The system supports the minimum access control needed for a business owner and authorized users.
- The product does not introduce excluded ERP-like features.

## Scope Change Rule

Any new feature must have:

1. A product reason.
2. A specification or ADR when the decision affects architecture.
3. A task entry with explicit scope and non-goals.
4. Validation evidence after implementation.
