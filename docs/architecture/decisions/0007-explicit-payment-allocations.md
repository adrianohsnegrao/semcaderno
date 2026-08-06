# ADR 0007: Use Explicit Payment Allocations for Customer Debt

## Status

Accepted.

## Context

The MVP must support paid, partially paid, and unpaid sales; multiple payments; multiple outstanding sales for one customer; reliable balance calculation; understandable reporting; and future reconciliation without coupling to a payment provider.

## Decision

Represent money received as `Payment` records and connect them to one or more sales through explicit `PaymentAllocation` records. The MVP records payments through a simple workflow and allocates automatically by selected sale or oldest outstanding sale first.

## Consequences

- Payment history remains visible.
- Sale-level paid, partially paid, and unpaid status can be derived.
- Customer outstanding balance can be explained from sales and allocations.
- Corrections and reversals can make previous payments ineffective without destroying history.
- The model is slightly more complex than a customer-level balance, but it remains smaller and safer than broad accounting.

## Alternatives Considered

- Payment directly tied to one sale. Rejected because one customer may pay multiple outstanding sales at once.
- Customer-level payment without allocation. Rejected because it makes sale-level status and debt explanation weaker.
- Manual allocation for all payments. Deferred because it adds UI friction before merchant validation.

## Follow-up Work

- Specify API and persistence representation for payments and allocations.
- Add domain tests for allocation ordering, partial payments, multiple sales, reversal, and overpayment rejection.
