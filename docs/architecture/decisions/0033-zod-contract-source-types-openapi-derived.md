# ADR 0033: Use Zod as the Executable Transport Source and Derive Types and OpenAPI

## Status

Accepted.

## Context

Cycle 011 defines the canonical `/api/v1` transport semantics and reserves OpenAPI 3.2 as a future machine-readable description. Cycle 013 selects Zod for runtime boundary validation but leaves the authoring relationship among Zod, TypeScript, and OpenAPI open. Maintaining handwritten definitions in all three forms would create competing sources and make drift likely before routes exist.

The semantic application contracts remain authoritative for business behavior. This decision concerns only executable wire-shape ownership.

## Decision

Reviewed Zod schemas in `@sem-caderno/contracts` are the single executable source for `/api/v1` runtime transport validation. Public TypeScript transport types are inferred from those schemas. Future OpenAPI output must be derived from or mechanically checked against the reviewed Zod source; a second handwritten OpenAPI model is prohibited.

The contracts package remains browser-safe, framework-independent, and outside domain and application authority. Request schemas reject unknown properties where Cycle 011 requires an allow-list. Response schemas accept additive object properties and expose only the current reviewed shape to preserve `v1` forward compatibility. Package-root exports are the only supported entrypoint until a demonstrated consumer justifies a reviewed subpath.

## Consequences

- Runtime validation and compile-time transport types evolve together.
- Fastify, Next.js, domain, application, and persistence packages cannot become competing contract owners.
- OpenAPI generation remains deferred until a maintained generator can preserve the accepted semantics deterministically.
- Zod syntax and version upgrades require contract regression tests and generated-description compatibility review.
- Product rules, authorization, recalculation, idempotency execution, recovery execution, and persistence invariants still belong to their accepted authoritative boundaries.

## Alternatives Considered

- OpenAPI-first with generated Zod and TypeScript. Deferred because no generator has been selected or validated against Zod 4 and OpenAPI 3.2, and adding it now would exceed the source-schema baseline.
- Handwritten OpenAPI plus handwritten Zod. Rejected because it creates duplicate executable descriptions.
- Handwritten TypeScript types plus separate Zod schemas. Rejected because runtime and compile-time shapes can drift.
- Framework-owned Fastify schemas. Rejected because they would couple the shared browser-safe contract to the server edge.

## Risks and Revisit Triggers

- Revisit if a maintained OpenAPI-first tool proves materially better while preserving browser safety, exact wire semantics, deterministic output, and application-contract precedence.
- Revisit the root-only export surface when a real consumer demonstrates that a stable subpath reduces bundle or ownership cost without enabling deep imports.
- A Zod or TypeScript upgrade that changes inferred input/output behavior requires explicit compatibility review.
- Contract tests passing does not prove business, authorization, financial, persistence, privacy, or recovery correctness.

## Relationship to Existing Decisions and Specifications

This decision implements the runtime-validation boundary selected by ADR 0017, preserves the transport architecture in ADR 0022, and uses the ESM/export and static-enforcement model in ADRs 0030 and 0032. The Cycle 007 application contracts and Cycle 011 transport specification remain semantic authorities.

## Follow-up Work

- Implement exact operation DTOs in reviewed contract slices before their Fastify routes.
- Evaluate deterministic OpenAPI 3.2 derivation only after the executable source and first route integration are stable.
- Keep wire compatibility tests synchronized with accepted transport changes.
