# ADR 0014: Treat Canonical Records as Authoritative and Derived Projections as Rebuildable

## Status

Accepted.

## Context

Sem Caderno must preserve financial trust while answering practical questions such as "Quem está devendo" and "Quanto sobrou". Balances and reports are useful, but they must remain explainable from Sales, Payments, Allocations, Expenses, and correction history.

## Decision

Canonical domain records are the persistence authority. Derived balances, report totals, and cached projections are subordinate and rebuildable from canonical records. If a derived projection disagrees with canonical records, canonical records win.

## Consequences

- Reports can be optimized later without becoming source of truth.
- Balance repair can rebuild projections from preserved history.
- Future persistence and API specs must distinguish stored facts from derived values.
- Some report reads may require consistency boundaries or documented live-read limitations.

## Alternatives Considered

- Store customer balance as manually editable source of truth. Rejected because it hides payment history and conflicts with explicit allocations.
- Treat cached reports as authoritative. Rejected because cache corruption could rewrite financial meaning.
- Adopt full event sourcing. Rejected because it is unnecessary complexity for the MVP.

## Follow-up Work

- Define logical data model for canonical financial records and derived projections.
- Add tests for projection rebuild and report consistency.
