# ADR 0025: Use Idempotency Keys with First-Class Command-Outcome Recovery

## Status

Accepted.

## Context

The accepted application and UX contracts require duplicate-safe financial commands, equivalent-intent replay, rejection of changed intent, and authoritative recovery after a timeout or lost response. HTTP method idempotency alone cannot make `POST` financial commands safe, and an unknown outcome cannot be treated as failure.

## Decision

Require an `Idempotency-Key` request header on every duplicate-sensitive command identified by the Application Contracts Specification. Treat the key as untrusted opaque input scoped by API version, logical operation, authenticated User, Business where applicable, and canonicalized business intent.

Equivalent-intent reuse returns the original committed result or stable prior rejection and marks the response as a replay. Different-intent reuse returns a stable conflict and creates no new authoritative facts. In-progress or unresolved commands return a non-final outcome with retry guidance.

Provide a first-class `POST .../command-outcomes/resolve` recovery operation. It receives the same key in the header and the logical operation identity in the body, avoiding sensitive recovery evidence in URLs. Recovery may return committed result, confirmed rejection, authoritative no-commit, or still unknown. Only authoritative no-commit permits safe resubmission, using the preserved reviewed intent and key semantics defined by the result.

The current IETF `Idempotency-Key` work is an expired Internet-Draft as of 2026-08-01, so Sem Caderno treats the field as a project contract and must review future standardization before implementation or a major compatibility change.

## Consequences

- Timeouts and duplicate activation do not duplicate Sales, Payments, Expenses, reversals, cancellations, replacements, or delivery attempts.
- Safe replay is distinct from new creation in response metadata and status semantics.
- Recovery works after navigation or session renewal, subject to the same User and Business authorization.
- Physical key, fingerprint, retention, transaction, and storage design remain for the persistence cycle.

## Alternatives Considered

- Rely on `POST` retry behavior. Rejected because `POST` is not inherently idempotent.
- Put a command identifier in every JSON payload. Not selected as the primary carriage because one header convention applies consistently and keeps business payloads focused; operation identity remains in the recovery body.
- Query for recently created records heuristically. Rejected because similar records do not prove command identity or no-commit.
- Allow a new key immediately after timeout. Rejected because the prior command may already have committed.

## Risks and Revisit Triggers

- Risk: canonical intent comparison drifts between versions. Mitigate with versioned canonicalization and contract tests.
- Risk: retention expires before merchant recovery. Mitigate with an explicit operational retention requirement and persistence review.
- Risk: draft standard semantics change. Revisit when the IETF publishes a successor draft or RFC, while preserving `v1` compatibility.

## Relationship to Existing Decisions and Specifications

This ADR transports Cycle 007 idempotency and unknown-outcome semantics, Cycle 008 recovery behavior, Cycle 009 recovery surfaces, and ADRs 0011, 0014, 0015, 0016, and 0020.

## Follow-up Work

- Specify physical idempotency, intent fingerprint, result, retention, and transaction representation.
- Add duplicate, changed-intent, unknown-outcome, and recovery integration tests after implementation begins.
