# ADR 0019: Use a pnpm Workspace with Enforced Module Boundaries

## Status

Accepted.

## Context

Sem Caderno needs separate web and server applications plus framework-independent domain, application, contract, persistence, integration, and test-support boundaries. A small team needs reproducible dependencies without premature build-platform complexity.

## Decision

Use one pnpm workspace and one lockfile. Internal package references use the pnpm `workspace:` protocol. Begin without Turborepo, Nx, or another build orchestrator; use pnpm task filtering/recursion and each selected tool's native build or test command.

The conceptual boundaries are web, server composition, domain, application, contracts, PostgreSQL persistence, external integration adapters, test support, and documentation. Scaffolding may create only the boundaries needed by the first slice, but dependency direction is mandatory:

- Domain depends on no application framework or infrastructure.
- Application depends on domain and ports.
- Adapters depend inward and are wired by the server composition root.
- Web depends on public contract semantics, not repositories or domain internals.
- Production packages never depend on test support.
- Circular dependencies are prohibited.

## Consequences

- One lockfile and package manager support reproducible local and CI environments.
- Shared code follows explicit semantic ownership instead of a generic shared package.
- The workspace remains understandable without a second task-graph product.
- Static import-boundary and cycle checks become required quality gates.
- A build orchestrator may be added later without changing domain/application boundaries.

## Alternatives Considered

- Multiple repositories. Rejected because contracts and coordinated changes would carry unnecessary versioning and release overhead.
- pnpm plus Turborepo. Deferred because no measured build-cache or task-graph problem exists.
- Nx. Deferred because its project graph and boundary features are useful at larger scale but add configuration and governance not yet justified.
- npm or Yarn workspaces. Capable, but pnpm's explicit workspace protocol and existing project direction provide a clear local-package boundary.

## Risks and Revisit Triggers

- Risk: shared packages become catch-all modules. Mitigate with narrow ownership and dependency rules.
- Risk: native task execution becomes slow. Revisit when measured CI duration or task complexity justifies caching/orchestration.
- Risk: workspace-level dependency updates create broad regressions. Mitigate with lockfile review and full architecture/test gates.

## Relationship to Existing Decisions and Specifications

This ADR operationalizes the framework-independent boundaries required by ADR 0001, ADR 0002, ADR 0003, ADR 0004, ADR 0013, ADR 0014, ADR 0015, and the Cycle 006/007 specifications.

## Follow-up Work

- Define exact package names, module format, scripts, and import-boundary checks during scaffolding.
- Add reproducible runtime and package-manager pinning without adding an orchestrator unless evidence requires one.
