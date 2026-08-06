# ADR 0005: Represent Money Safely Without Floating Point

## Status

Accepted.

## Context

Sem Caderno records sales, payments, customer debts, expenses, and reports. Financial values must remain accurate and explainable. Binary floating point can introduce rounding errors that are unacceptable for money.

## Decision

Monetary values must be represented using integer minor units, such as centavos, or a safe decimal representation. Binary floating point must not be used for monetary values in domain rules, persistence, API contracts, reports, or tests.

## Consequences

- Financial calculations can be tested and explained consistently.
- API contracts and persistence must choose an explicit representation.
- Formatting for Brazilian currency becomes a presentation concern.
- Contributors must avoid JavaScript `number` for unsafe monetary arithmetic unless the value is known to be an integer minor-unit amount and handled accordingly.

## Alternatives Considered

- Use binary floating point with rounding. Rejected because it is error-prone for money.
- Decide the exact persistence type now. Deferred because ORM and database schema decisions have not been specified.

## Follow-up Work

- Specify the exact money representation in domain contracts.
- Add domain tests for sale totals, payments, partial payments, and reports.
- Document formatting rules for displaying BRL amounts.
