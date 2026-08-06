# ADR 0029: Use a PostgreSQL Transactional Outbox for Post-Commit Effects

## Status

Accepted.

## Context

Verification, Invitation delivery, account recovery, and Payment Request delivery depend on committed internal facts but external providers cannot participate in PostgreSQL financial transactions. Provider failure must remain visible and retryable without rolling back valid domain commits or proving Payment.

## Decision

Persist provider-neutral external-effect intent in PostgreSQL inside the authoritative transaction that creates or requests the effect. After commit, a dispatcher claims eligible effects, performs provider I/O outside the authoritative transaction, and appends delivery-attempt evidence with pending, succeeded, failed, or unknown state.

No broker, queue product, worker framework, communication provider, payment provider, or deployment topology is selected. Payment Request creation/delivery remains independent of Payment and debt. Provider correlations and destinations are digested, encrypted, masked, or omitted according to need.

## Consequences

- A valid canonical commit survives provider failure.
- Effects can be retried and reconciled from durable intent/attempt history.
- Duplicate external delivery remains possible unless a provider supports idempotency; attempt identity and reconciliation reduce risk.
- A dispatcher/background entrypoint is required later but can remain in the modular monolith codebase.

## Alternatives Considered

- Call provider inside the domain transaction. Rejected because external latency/failure cannot join PostgreSQL atomicity safely.
- Best-effort call after commit without durable intent. Rejected because process failure can lose required delivery.
- Select a broker now. Deferred because volume/availability evidence does not justify another infrastructure dependency.
- Treat provider success as Payment. Rejected by accepted financial semantics.

## Risks and Revisit Triggers

- Risk: duplicate or unknown delivery. Mitigate with attempt identity, provider-neutral state, safe retries, and later provider reconciliation.
- Risk: outbox backlog delays communication. Mitigate with lag metrics and operational alerts once implemented.
- Revisit a broker or independent worker only when measured throughput, availability, or deployment isolation requires it.

## Relationship to Existing Decisions and Specifications

This ADR implements ADRs 0004 and 0015 within the ADR 0016 modular monolith and preserves Cycle 007/011 Payment Request, delivery, audit, privacy, and recovery semantics.

## Follow-up Work

- Specify provider adapter contracts, retry limits, and callback verification only after provider selection.
- Add outbox claim, duplicate delivery, unknown attempt, retry, redaction, and financial-independence tests.
