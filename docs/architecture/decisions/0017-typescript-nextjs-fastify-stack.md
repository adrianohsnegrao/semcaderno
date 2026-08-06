# ADR 0017: Use TypeScript, Next.js, and Fastify on Node.js LTS

## Status

Accepted.

## Context

The project needs an accessible responsive web client, an explicit authoritative server, transport-neutral application contracts, deterministic runtime validation, and a maintainable stack for a small team. The stack must support current browsers, transactional server orchestration, idempotency, unknown-outcome recovery, and tests from domain to browser.

## Decision

Use:

- TypeScript as the primary implementation language.
- Node.js 24 LTS as the initial runtime baseline, pinned to a supported patch during scaffolding.
- Next.js 16 App Router with React for the responsive web presentation.
- Fastify 5 for the server transport and composition edge.
- Zod 4 for framework-neutral runtime validation of untrusted contract information.

Next.js does not own financial or authorization authority and does not connect directly to PostgreSQL. Fastify adapters translate transport concerns; framework-independent application and domain modules own accepted behavior. Zod validates shape and allowed values but does not replace domain rules, authorization, persistence constraints, or concurrency control.

## Consequences

- One language spans web, server, contracts, domain, adapters, and tests.
- Next.js provides a maintained rendering and build baseline while the separate server preserves client-independent authority.
- Fastify remains a thin, testable edge instead of becoming the domain architecture.
- Runtime inputs are validated even though TypeScript types disappear at runtime.
- Major framework and runtime upgrades require compatibility, browser, security, accessibility, and regression review.

## Alternatives Considered

- React Router with Vite. Credible, but not selected because Next.js provides the integrated rendering and build baseline desired for authenticated entry and responsive operational surfaces.
- NestJS. Credible, but not selected because its module, decorator, and dependency-injection model would duplicate application boundaries already specified by the repository.
- Next.js as the only server. Rejected because future supporting clients and one explicit authoritative application boundary require a separate server contract.
- Another server language/runtime. Rejected because no accepted requirement justifies the additional toolchain and contract-mapping burden.

## Risks and Revisit Triggers

- Risk: framework server features could blur authority. Mitigate with package boundaries and no direct database access from web.
- Risk: ecosystem churn. Mitigate with supported LTS lines, pinned lockfiles, security review, and deliberate major upgrades.
- Risk: automated accessibility tooling creates false confidence. Mitigate with manual keyboard, screen-reader, zoom, and merchant validation.
- Revisit if support ends, merchant browser evidence falls outside the baseline, or framework coupling repeatedly violates dependency rules.

## Relationship to Existing Decisions and Specifications

This ADR implements ADR 0003 and the complete web responsibilities from Cycles 008 and 009 while preserving ADRs 0012 through 0015 and the Application Contracts Specification.

## Follow-up Work

- Pin compatible patch versions during scaffolding.
- Define transport mapping, browser policy, and architecture checks.
- Implement automated and manual accessibility validation only in later cycles.
