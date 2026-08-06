# ADR 0028: Persist Durable Command Executions and Final Outcomes

## Status

Accepted.

## Context

ADR 0025 requires identical-intent replay, changed-intent rejection, unknown-outcome recovery, and authoritative no-commit before resubmission. Process memory, cache, logs, recent lists, or the absence of a record cannot prove these states after crashes or lost responses.

## Decision

Persist a `command_executions` claim containing scoped idempotency-key digest, server canonical intent fingerprint, canonicalization version, and execution lease. Persist at most one immutable `command_outcomes` row containing `COMMITTED`, stable `REJECTED`, or authoritative `NO_COMMIT` plus a typed result/error reference.

Write a committed domain root and its `COMMITTED` outcome in the same authoritative transaction. A recovery transaction may write `NO_COMMIT` only after the lease is invalid, the execution is exclusively locked, and no canonical root references it. Store raw keys, request payloads, fingerprints, session secrets, and financial/contact payloads nowhere in these records.

## Consequences

- Identical replay reconstructs the original canonical result and is distinguishable from first creation.
- Changed intent cannot reuse the scoped key.
- A timeout remains unknown until durable evidence classifies it.
- Stuck executions require lease monitoring and audited recovery.
- Outcome retention is an operational/legal requirement and cannot be shorter than realistic retry/dispute needs.

## Alternatives Considered

- Cache-only idempotency. Rejected because eviction/restart can duplicate financial facts.
- Key column only on each financial table. Rejected because it cannot represent rejection, in-progress work, global commands, or authoritative no-commit coherently.
- Persist full request/response JSON. Rejected because it duplicates sensitive data and couples storage to transport versions.
- Heuristic recent-record lookup. Rejected because similarity does not prove command identity or absence.

## Risks and Revisit Triggers

- Risk: stale leases are incorrectly declared no-commit. Mitigate with exclusive lock, canonical root checks, executor fencing, and repair tests.
- Risk: fingerprint canonicalization changes. Mitigate with stored version and API-major scope.
- Revisit storage partitioning/archival when measured volume and accepted retention justify it; semantic outcomes remain unchanged.

## Relationship to Existing Decisions and Specifications

This ADR physically specializes ADRs 0011, 0014, 0018, and 0025 and the Cycle 007-011 replay/recovery contracts.

## Follow-up Work

- Define executable constraints and transaction code in later migration/repository cycles.
- Test crash boundaries, concurrent duplicates, changed intent, replay, and no-commit proof with PostgreSQL.
