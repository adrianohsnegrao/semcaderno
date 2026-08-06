# ADR 0016: Use a Modular Authoritative Server with Separate Web Presentation

## Status

Accepted.

## Context

Sem Caderno needs a complete responsive web journey, a future supporting mobile client, one authoritative application boundary, transactional financial behavior, server-validated tenant authorization, and post-commit external work. A small team must deliver the MVP without distributed-system overhead.

## Decision

Use a modular monolith application server as the authoritative application boundary, with a separately deployable web presentation application and one PostgreSQL persistence engine.

The web application is an untrusted presentation client. It does not access PostgreSQL directly and does not own authoritative financial, tenant, session, Membership, or capability decisions. The server composes framework-independent domain and application modules with persistence, session, projection, audit, idempotency, and integration adapters.

Projection processing and post-commit work begin as modules and alternate entrypoints in the same codebase. They do not become separate services until operational evidence requires independent deployment or scaling.

## Consequences

- Web and future mobile clients use the same authoritative application behavior.
- Financial transactions, authorization, idempotency, and unknown-outcome recovery have one server authority.
- The system has separate web and server deployment units but no domain microservices.
- Transport compatibility must be specified explicitly between the web and server boundaries.
- Future decomposition remains possible because domain and application modules do not depend on web, transport, persistence, or providers.

## Alternatives Considered

- Full-stack Next.js with direct persistence access. Rejected because presentation framework boundaries could become the only API and obscure client-independent authority.
- Domain microservices. Rejected because distributed transactions, deployment, and observability complexity are unsupported by MVP scale or team needs.
- Service-oriented modules with separate databases. Rejected because no independent ownership or scaling requirement exists.

## Risks and Revisit Triggers

- Risk: duplicated server behavior could appear in Next.js rendering code. Mitigate by forbidding direct database access and business-rule ownership in web packages.
- Risk: two deployables require disciplined contract compatibility. Mitigate with a transport specification and contract tests.
- Revisit if measured scaling, deployment isolation, regulatory separation, or independent team ownership requires a different topology.

## Relationship to Existing Decisions and Specifications

This ADR implements the topology implied by ADR 0002, ADR 0003, ADR 0012, ADR 0013, ADR 0014, ADR 0015, the Application Contracts Specification, and the Cycle 008/009 UX specifications. Those documents remain authoritative for behavior.

## Follow-up Work

- Specify the transport boundary between web and server.
- Specify the PostgreSQL physical model and repository transactions.
- Add dependency-boundary and cross-client contract tests after scaffolding.
