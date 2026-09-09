# MVP Release Implementation Specification

## Status

Accepted for implementation.

## Objective

Deliver the first complete, recruiter-testable Sem Caderno web MVP while preserving the
accepted product promise: a digital replacement for the small merchant's notebook, not a
miniature ERP.

## Release slice

The release must let one owner:

1. create an account and an establishment;
2. sign in and sign out safely;
3. register and edit customers and products;
4. record paid, partially paid, and unpaid sales using active catalog products;
5. see who owes money and the immutable purchase/payment history;
6. record later partial or full payments without overpayment;
7. record expenses;
8. prepare a manual WhatsApp/Pix collection message without marking it as paid;
9. answer how much entered, left, and remained in plain Brazilian Portuguese;
10. inspect a concise activity history for financial confidence;
11. see the available quantity of each product and prevent a sale from exceeding stock.

## Implementation decisions

- The existing modular-monolith boundaries remain authoritative.
- PostgreSQL is the production source of truth.
- A seeded local demonstration adapter is permitted only for zero-setup portfolio review. It
  must identify itself visibly and must not be described as durable production storage.
- Financial values use integer BRL cents from input validation through persistence and reports.
- Financial records are never hard-deleted. Sale cancellation and payment reversal preserve
  history and require a reason.
- Every state-changing request carries an idempotency key. Replays return the original result;
  the same key with different intent is rejected.
- The API resolves the establishment from the authenticated session. Tenant identifiers sent
  by the browser never grant access.
- Mutations produce an audit entry and return an authoritative result.
- Manual collection creates only a message and activity entry. It never creates a payment.
- Product names and customer WhatsApp numbers are unique inside one establishment after
  normalization. The same values may exist in different establishments.
- A sale item receives only a product identifier and integer quantity from the browser. The API
  resolves the authoritative name, current price, availability, and stock inside the sale
  transaction.
- Confirming a sale decrements stock. Cancelling that sale restores its item quantities in the
  same transaction; editing historical sale-item snapshots remains forbidden.
- Product and customer edits preserve identity and creation time. Product stock changes are
  recorded in the activity history.

## User interface

- Brazilian Portuguese is primary.
- Navigation uses `Início`, `Nova venda`, `Clientes`, `Produtos`, `Despesas`, and `Atividade`.
- The home view prioritizes practical answers and a prominent `Registrar venda` action.
- The interface is responsive down to a narrow phone viewport, keyboard usable, high contrast,
  and does not rely on color alone for financial states.
- Empty, loading, success, validation, conflict, and degraded states provide a clear next step.
- A guided first-use tour and realistic sample data are available in demonstration mode.
- Money inputs format digits as Brazilian reais while the user types; punctuation is not required.
- Product selection in a sale is a searchable catalog control. Price and available stock are
  read-only consequences of the selected product, and quantity immediately updates the total.

## Production boundary

- Configuration is environment based and secrets are not committed.
- The repository includes reproducible PostgreSQL and application startup instructions,
  health checks, migrations, seed/demo guidance, CI, tests, and bilingual documentation.
- Development may run without PostgreSQL through the explicit demo adapter. Production must
  fail closed when its PostgreSQL configuration is absent or invalid.

## Explicit non-goals

- Artificial intelligence, automatic Pix reconciliation, fiscal documents, accounting/DRE,
  inventory purchasing or supplier workflows, delivery marketplaces, kitchen/table management, loyalty, native
  mobile applications, or multi-role team administration.
- Automatic WhatsApp sending in this release. The official Meta Cloud API is feasible but requires
  a Meta business portfolio, WhatsApp Business Account, registered business phone number, access
  token/permissions, message-policy compliance, delivery webhooks, and potentially paid template
  messages. Until those business assets and operating consent are available, the safe MVP keeps a
  user-reviewed `wa.me` handoff. The decision is documented separately rather than using an
  unofficial WhatsApp automation library.
- Silent edits or deletion of financial history.

## Acceptance evidence

- Unit and HTTP tests cover the paid, partial, unpaid, later-payment, overpayment, normalized
  duplicates, stock decrement/restoration/shortage, editing, cancellation, expense,
  tenant-isolation, and report paths.
- Production build, type checking, linting, formatting, architecture checks, and migration
  validation pass.
- The main journeys pass browser-level checks on desktop and phone-sized viewports.
- A new reviewer can understand, start, and test the product from the README without private
  knowledge.
