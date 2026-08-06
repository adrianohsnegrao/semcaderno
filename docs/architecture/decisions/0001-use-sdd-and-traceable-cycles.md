# ADR 0001: Use Spec-Driven Development and Traceable Delivery Cycles

## Status

Accepted.

## Context

Sem Caderno must stay simple and avoid silent scope expansion. The product serves merchants who need a clear notebook replacement, not a broad ERP. Future agents and contributors need a shared process for turning product needs into validated implementation work.

## Decision

Use Spec-Driven Development with cycle-based task planning. Every meaningful behavior change must trace from product requirement to specification, task, implementation, and validation evidence.

## Consequences

- Scope decisions become explicit before implementation.
- Future work can be reviewed against product intent.
- Documentation must be kept current when decisions or behavior change.
- Small changes may require specification updates before code changes.

## Alternatives Considered

- Implement directly from high-level ideas. Rejected because it increases the risk of ERP-like scope growth and inconsistent terminology.
- Create only architecture documentation. Rejected because product scope, validation, and delivery tasks also need traceability.

## Follow-up Work

- Create focused specification cycles before feature implementation begins.
- Keep `docs/tasks.md` updated with validation evidence.
