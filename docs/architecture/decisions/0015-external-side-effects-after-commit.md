# ADR 0015: Separate External Side Effects from Authoritative Commits

## Status

Accepted.

## Context

Future behavior may send invitation emails, recovery emails, WhatsApp messages, Pix requests, export files, product-photo storage operations, analytics, audit forwarding, or provider acknowledgments. These side effects should not create partial authoritative tenant or financial state.

## Decision

Authoritative domain transactions commit before dependent external side effects are attempted. Post-commit side effects must be retryable and idempotent where possible. External provider state is evidence, not automatically internal source of truth.

## Consequences

- A valid financial transaction is not rolled back merely because notification delivery fails.
- Duplicate side effects must be reduced through idempotency evidence.
- Future provider callbacks must be authenticated, mapped to tenant-owned records, and deduplicated before producing internal effects.
- A transactional outbox or equivalent remains a candidate implementation pattern, not a selected technology.

## Alternatives Considered

- Include external providers in authoritative transactions. Rejected because it creates partial failure and coupling risks.
- Treat provider callbacks as internal financial truth immediately. Rejected because tenant mapping and deduplication are required first.
- Ignore side-effect failures. Rejected because merchants need understandable retry and delivery behavior.

## Follow-up Work

- Specify post-commit work handling during API and infrastructure planning.
- Add tests for duplicate command retries, post-commit failure, and provider callback deduplication.
