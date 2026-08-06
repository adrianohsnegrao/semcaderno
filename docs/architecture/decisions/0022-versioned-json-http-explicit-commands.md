# ADR 0022: Use Versioned JSON over HTTP with Explicit Command Resources

## Status

Accepted.

## Context

ADR 0016 separates the Next.js presentation from the authoritative Fastify server. Cycle 007 distinguishes queries from authoritative commands, while Cycles 008 and 009 require stable errors, explicit financial confirmation, safe recovery, and future supporting-client compatibility. A framework-only boundary or generic CRUD contract would obscure those semantics.

## Decision

Use a versioned, resource-oriented JSON-over-HTTP API with explicit intent-named command resources for financial, authorization-sensitive, lifecycle, and recovery operations.

The initial namespace is `/api/v1`. `GET` reads canonical resources or projections. Ordinary creation uses `POST`; replacement of session context may use `PUT`; narrowly accepted descriptive edits may use conditional `PATCH`. Financial cancellation, reversal, replacement, allocation, delivery, and recovery are explicit subresources or operations rather than generic updates or deletes.

Use RFC 9457 Problem Details with stable Sem Caderno error codes for rejected requests. Describe the implemented wire contract in OpenAPI 3.2, while accepted application contracts remain authoritative for business meaning. Runtime Zod validation and any future generated artifacts must conform to that contract and cannot become domain authority.

## Consequences

- Web and future supporting clients receive the same transport semantics.
- HTTP methods retain standard safety and caching meaning while explicit commands preserve business intent.
- A major path version isolates breaking transport changes; compatible additions remain in `v1`.
- Financial behavior cannot be represented as silent CRUD mutation.
- OpenAPI and runtime schemas require synchronization and contract tests after implementation begins.

## Alternatives Considered

- Pure resource CRUD. Rejected because cancellation, reversal, allocation, idempotency, and recovery are commands with consequences that generic updates hide.
- RPC-only JSON. Not selected because canonical resources, lists, caching rules, and HTTP semantics remain useful.
- GraphQL. Deferred because one explicit command/query HTTP boundary is sufficient and GraphQL adds schema, authorization, caching, and operational complexity without accepted need.
- Next.js Server Actions as the only contract. Rejected because Fastify is the authoritative boundary and future clients require framework-independent semantics.

## Risks and Revisit Triggers

- Risk: command paths become inconsistent. Mitigate with one operation inventory and contract review.
- Risk: OpenAPI and Zod drift. Mitigate with future schema-conformance and integration tests.
- Risk: endpoint granularity grows unnecessarily. Mitigate by adding operations only for accepted application responsibilities.
- Revisit if validated real-time, bulk, or partner-integration needs cannot be expressed coherently in this profile.

## Relationship to Existing Decisions and Specifications

This ADR implements ADRs 0016, 0017, and 0019 and transports the accepted Application Contracts, UX Flow, and Low-Fidelity specifications without changing their semantics.

## Follow-up Work

- Implement and validate the OpenAPI/Zod wire contract only after physical persistence and scaffolding specifications.
- Add compatibility, error-mapping, and Fastify transport tests when implementation begins.
