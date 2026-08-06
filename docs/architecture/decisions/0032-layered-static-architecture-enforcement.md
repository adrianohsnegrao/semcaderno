# ADR 0032: Enforce Workspace Boundaries with Layered Static Checks

## Status

Accepted.

## Context

ADR 0019 requires enforceable module boundaries. Workspace layout alone cannot stop framework leakage, deep imports, dependency cycles, raw SQL outside adapters, provider SDK leakage, or server-only code entering browser packages. A large custom analyzer or task orchestrator would add complexity before implementation evidence exists.

## Decision

Use the smallest layered enforcement set:

1. package exports for supported cross-package entrypoints;
2. TypeScript project references for the build graph;
3. pnpm strict workspace dependency declarations and cycle rejection;
4. ESLint restricted-import rules for immediate file-level feedback;
5. dependency-cruiser for graph rules and cycle detection; and
6. a small repository-owned Node ESM validator for manifest, path, raw-SQL, provider-SDK, and browser/server policies not expressed clearly by the other tools.

All checks run from the root and block the first scaffold gate. Type-only imports follow the same rules. These checks are structural guardrails and never replace authorization, tenant-isolation, financial, persistence, or recovery tests.

## Consequences

- Violations receive local and CI feedback before integration.
- Each tool has a narrow responsibility; no task orchestrator is introduced.
- Some policy is represented in more than one layer to improve feedback and resilience.
- Configuration must be kept synchronized with accepted package ownership.
- Semantic authority still requires tests and review.

## Alternatives Considered

- Workspace layout and code review only. Rejected because prohibited imports remain mechanically possible.
- ESLint only. Rejected because cycles, package manifests, and whole-graph rules are not its strongest boundary.
- dependency-cruiser only. Rejected because editor-level feedback and repository-specific artifact rules remain weak.
- A large custom analyzer. Rejected as unnecessary maintenance and false precision.
- Madge. Not selected because dependency-cruiser covers the required policy graph as well as cycle detection.
- Turborepo or Nx boundary plugins. Deferred because no orchestrator is justified.

## Risks and Revisit Triggers

- Static success can create false confidence; semantic tests remain mandatory.
- Tool upgrades may parse ESM or TypeScript differently; version upgrades run architecture fixtures.
- Revisit the tool set if a required rule cannot be expressed reliably, validation becomes materially slow, or duplicate configuration causes recurring drift.

## Relationship to Existing Decisions and Specifications

This decision implements ADR 0019 and protects ADRs 0016–0018, 0021, and 0029. Exact rules and initial gate ownership are defined by the Cycle 013 workspace specification.

## Follow-up Work

- Create the minimal configurations and validator in Cycle 014.
- Add semantic architecture, tenant, financial, projection, and provider-boundary tests as implementation begins.
