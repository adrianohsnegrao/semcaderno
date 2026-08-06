# ADR 0008: Preserve Financial History Through Cancellation and Reversal

## Status

Accepted.

## Context

Small merchants need trustworthy records of sales, debts, payments, and expenses. Silent mutation or deletion of financial history can create disputes, hide mistakes, and make reports impossible to explain.

## Decision

Financial meaning must not be silently changed after creation. Incorrect sales and expenses are handled through cancellation plus replacement when needed. Incorrect payments are handled through reversal plus replacement when needed. Hard deletion of financial records is not normal MVP behavior.

## Consequences

- Balances and reports can be explained from preserved history.
- Sensitive corrections require actor, tenant, timestamp, target, and reason.
- The MVP avoids a generic event-sourcing platform while still preserving auditability.
- User-facing correction workflows must be designed carefully so this does not feel complex.

## Alternatives Considered

- Allow editing amounts in place. Rejected because it destroys financial explanation.
- Hard-delete mistakes. Rejected because it hides history and weakens auditability.
- Full event sourcing. Rejected because it is unnecessary enterprise complexity for the MVP.

## Follow-up Work

- Specify correction user journeys in the relevant web workflow specification.
- Add domain tests for cancellation, reversal, replacement, and report exclusion rules.
- Specify retention and privacy deletion behavior separately.
