# Architecture Decision Records

This directory contains Architecture Decision Records for Sem Caderno.

## ADR Template

Each ADR should use this structure:

```markdown
# ADR NNNN: Title

## Status

Accepted, Proposed, Superseded, or Rejected.

## Context

The product, technical, or operational situation that requires a decision.

## Decision

The decision being made.

## Consequences

Expected benefits, tradeoffs, and constraints.

## Alternatives Considered

Other options considered and why they were not selected now.

## Follow-up Work

Specification, implementation, validation, or future decision work created by this ADR.
```

## Accepted ADRs

- [ADR 0001: Use Spec-Driven Development and Traceable Delivery Cycles](0001-use-sdd-and-traceable-cycles.md)
- [ADR 0002: Keep the MVP Deliberately Small](0002-keep-mvp-deliberately-small.md)
- [ADR 0003: Make Web the Primary Client and Mobile a Supporting Client](0003-web-primary-mobile-supporting-client.md)
- [ADR 0004: Keep Payment Providers Behind a Domain Boundary](0004-payment-provider-domain-boundary.md)
- [ADR 0005: Represent Money Safely Without Floating Point](0005-safe-money-representation.md)
- [ADR 0006: Use Business as the Tenant Boundary](0006-business-as-tenant-boundary.md)
- [ADR 0007: Use Explicit Payment Allocations for Customer Debt](0007-explicit-payment-allocations.md)
- [ADR 0008: Preserve Financial History Through Cancellation and Reversal](0008-financial-history-cancellation-reversal.md)
- [ADR 0009: Use Business Time Zone for Operational Reporting](0009-business-time-zone-operational-reporting.md)
- [ADR 0010: Use Global User Identity with Tenant-Scoped Memberships](0010-global-user-tenant-memberships.md)
- [ADR 0011: Require Atomic First-Owner Business Bootstrap](0011-atomic-first-owner-business-bootstrap.md)
- [ADR 0012: Server-Validate Active Business Context for Sessions and Requests](0012-server-validated-active-business-context.md)
- [ADR 0013: Require Tenant Scope in Tenant-Owned Persistence Operations](0013-tenant-scope-persistence-operations.md)
- [ADR 0014: Treat Canonical Records as Authoritative and Derived Projections as Rebuildable](0014-canonical-records-derived-projections.md)
- [ADR 0015: Separate External Side Effects from Authoritative Commits](0015-external-side-effects-after-commit.md)
- [ADR 0016: Use a Modular Authoritative Server with Separate Web Presentation](0016-modular-server-separate-web.md)
- [ADR 0017: Use TypeScript, Next.js, and Fastify on Node.js LTS](0017-typescript-nextjs-fastify-stack.md)
- [ADR 0018: Use PostgreSQL with Explicit node-postgres Repository Adapters](0018-postgresql-node-postgres-access.md)
- [ADR 0019: Use a pnpm Workspace with Enforced Module Boundaries](0019-pnpm-workspace-module-boundaries.md)
- [ADR 0020: Use Application-Owned Revocable Server-Side Sessions](0020-application-owned-revocable-sessions.md)
- [ADR 0021: Use Responsive Web as the Initial Supporting-Mobile Delivery](0021-responsive-web-initial-mobile-delivery.md)
- [ADR 0022: Use Versioned JSON over HTTP with Explicit Command Resources](0022-versioned-json-http-explicit-commands.md)
- [ADR 0023: Use Same-Origin Opaque Cookie Sessions with Layered CSRF Protection](0023-same-origin-cookie-session-csrf.md)
- [ADR 0024: Carry Business Context in Tenant-Scoped API Paths and Revalidate It](0024-business-context-in-tenant-paths.md)
- [ADR 0025: Use Idempotency Keys with First-Class Command-Outcome Recovery](0025-idempotency-key-command-outcome-recovery.md)
- [ADR 0026: Use a Shared Schema with UUIDv7 and Tenant-Aware Relational Keys](0026-shared-schema-uuidv7-tenant-aware-keys.md)
- [ADR 0027: Use Explicit Transactions with Invariant-Specific Locking](0027-explicit-transactions-invariant-locking.md)
- [ADR 0028: Persist Durable Command Executions and Final Outcomes](0028-durable-command-execution-outcomes.md)
- [ADR 0029: Use a PostgreSQL Transactional Outbox for Post-Commit Effects](0029-transactional-outbox-post-commit-effects.md)
- [ADR 0030: Use ESM, TypeScript Project References, and Explicit Package Exports](0030-esm-typescript-project-references-exports.md)
- [ADR 0031: Use node-pg-migrate in a Dedicated Database Tool Workspace](0031-node-pg-migrate-dedicated-tool.md)
- [ADR 0032: Enforce Workspace Boundaries with Layered Static Checks](0032-layered-static-architecture-enforcement.md)
- [ADR 0033: Use Zod as the Executable Transport Source and Derive Types and OpenAPI](0033-zod-contract-source-types-openapi-derived.md)
- [ADR 0034: Use Explicit Session Evidence with Keyed Digest Resolution](0034-explicit-session-evidence-keyed-digest-resolution.md)
- [ADR 0035: Use Local Email-Password Verification with Split Session and CSRF Issuance](0035-local-email-password-session-csrf-issuance.md)

## Open Decisions

- Exact maintained Argon2id package/version and native supply-chain profile for the accepted local verifier.
- Product photo storage provider and access pattern.
- Deployment target and production infrastructure.
- PostgreSQL Row-Level Security remains deferred defense in depth; adoption and policy mechanics require later threat-tested evidence.
- Fractional quantity scale and rounding mode if fractional quantities are required.
- Email delivery provider.
- Session/HMAC key rotation/cutover, cleanup/retention, sign-out/revocation commands, and protected-operation CSRF implementation under ADRs 0034-0035.
- OpenAPI generator selection, cursor encoding, and correlation-header spelling.
- Cache, queue/broker, outbox dispatcher, and derived-projection implementation details.
- Backup vendor, restore procedure, and operational recovery targets.
- Executable scaffold creation and observed lockfile/build compatibility under the accepted Cycle 013 version baseline.
- Executable DDL, checksum-ledger details, backfill batches, lock/statement timeouts, and schema-drift implementation.
