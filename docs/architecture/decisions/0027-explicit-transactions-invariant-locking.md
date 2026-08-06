# ADR 0027: Use Explicit Transactions with Invariant-Specific Locking

## Status

Accepted.

## Context

Sale confirmation, Payment allocation, cancellation, reversal, Expense correction, Invitation acceptance, Business deactivation, and last-active-Owner changes span multiple rows. Optimistic UI state, ETags, idempotency, and row checks cannot alone protect cross-row financial and authorization invariants.

## Decision

Use PostgreSQL `READ COMMITTED` as the baseline command isolation level with explicit row locks and stable serialization rows for each invariant. Use optimistic `version` values for current-record edits, unique constraints for identity races, and a deterministic lock order beginning with command execution and Business, followed by Membership and aggregate roots.

Serialize Owner changes on the Business row; Payments on Customer and eligible Sales; cancellation/Payment races on the same Customer/Sale rows; Invitation acceptance on Invitation and Membership uniqueness; and corrections on their original financial root. Use `SERIALIZABLE` only when a later invariant cannot be protected coherently with explicit rows, and retry the complete transaction on deadlock or serialization failure using the same intent and idempotency identity.

## Consequences

- Transactions remain short, explicit, and aligned with application consistency boundaries.
- Aggregate invariants are re-read under lock rather than represented as invalid cross-row `CHECK` constraints.
- One `node-postgres` client must carry the entire transaction.
- Lock ordering and whole-transaction retry become mandatory implementation/test responsibilities.
- ETag detects stale review but never replaces aggregate revalidation.

## Alternatives Considered

- Serializable for every command. Rejected initially because known invariants have stable roots and universal serialization retries add cost without evidence.
- Optimistic concurrency only. Rejected because concurrent allocation and last-Owner changes can both validate stale aggregates.
- Advisory locks for domain invariants. Rejected because they are convention-based and do not provide referential ownership.
- Database triggers for all invariants. Rejected because hidden orchestration would duplicate application behavior and complicate testing/repair.

## Risks and Revisit Triggers

- Risk: inconsistent lock order causes deadlocks. Mitigate with one documented order and real concurrency tests.
- Risk: a new write path omits an invariant lock. Mitigate with transaction ports and operation-level integration tests.
- Revisit isolation for a specific invariant when predicate races cannot be anchored to stable rows or measured contention becomes unacceptable.

## Relationship to Existing Decisions and Specifications

This ADR implements ADRs 0007, 0008, 0011, 0012, 0018, and Cycle 007 consistency boundaries while preserving Cycle 011 ETag/idempotency distinctions.

## Follow-up Work

- Implement transaction helpers that pin one client and translate retryable PostgreSQL failures.
- Test every transaction/race listed in the physical persistence specification.
