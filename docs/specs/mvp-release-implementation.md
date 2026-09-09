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
3. register customers and optional products;
4. record paid, partially paid, and unpaid sales with ad hoc or catalog items;
5. see who owes money and the immutable purchase/payment history;
6. record later partial or full payments without overpayment;
7. record expenses;
8. prepare a manual WhatsApp/Pix collection message without marking it as paid;
9. answer how much entered, left, and remained in plain Brazilian Portuguese;
10. inspect a concise activity history for financial confidence.

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

## User interface

- Brazilian Portuguese is primary.
- Navigation uses `Início`, `Nova venda`, `Clientes`, `Produtos`, `Despesas`, and `Atividade`.
- The home view prioritizes practical answers and a prominent `Registrar venda` action.
- The interface is responsive down to a narrow phone viewport, keyboard usable, high contrast,
  and does not rely on color alone for financial states.
- Empty, loading, success, validation, conflict, and degraded states provide a clear next step.
- A guided first-use tour and realistic sample data are available in demonstration mode.

## Production boundary

- Configuration is environment based and secrets are not committed.
- The repository includes reproducible PostgreSQL and application startup instructions,
  health checks, migrations, seed/demo guidance, CI, tests, and bilingual documentation.
- Development may run without PostgreSQL through the explicit demo adapter. Production must
  fail closed when its PostgreSQL configuration is absent or invalid.

## Explicit non-goals

- Artificial intelligence, automatic Pix reconciliation, fiscal documents, accounting/DRE,
  inventory purchasing, delivery marketplaces, kitchen/table management, loyalty, native
  mobile applications, or multi-role team administration.
- Automatic WhatsApp sending. The MVP prepares a user-reviewed link/message.
- Silent edits or deletion of financial history.

## Acceptance evidence

- Unit and HTTP tests cover the paid, partial, unpaid, later-payment, overpayment, duplicate,
  cancellation, expense, tenant-isolation, and report paths.
- Production build, type checking, linting, formatting, architecture checks, and migration
  validation pass.
- The main journeys pass browser-level checks on desktop and phone-sized viewports.
- A new reviewer can understand, start, and test the product from the README without private
  knowledge.
