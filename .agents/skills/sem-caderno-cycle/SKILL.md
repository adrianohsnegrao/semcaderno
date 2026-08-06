---
name: sem-caderno-cycle
description: Execute, implement, audit, validate, close, or hand off a Sem Caderno SDD cycle or task. Use when Codex is asked to continue the Sem Caderno SDD sequence, implement an authorized cycle slice, verify a completed cycle, close it with evidence, or prepare the next-cycle handoff.
---

# Sem Caderno Cycle

Follow the repository's current authority and use this Skill only as reusable workflow guidance.

## Preserve Authority

Apply this precedence:

1. Current user instructions and repository-level agent instructions.
2. Current accepted specifications and ADRs.
3. Current cycle and task authority.
4. Repository architecture, security, privacy, and test documentation.
5. This reusable workflow.

If this Skill conflicts with current repository authority, follow the repository and flag the Skill for later correction. Never change repository behavior merely to match stale Skill text.

## Execute The Cycle

1. Read `AGENTS.md` and inspect actual Git and workspace state. Preserve unrelated changes and never assume a branch or history shape.
2. Identify the exact requested cycle, task, scope, acceptance criteria, non-goals, and required report format. Do not start a later cycle.
3. Read the authoritative product, specification, ADR, architecture, security, privacy, quality, and task sources relevant to the requested slice. Verify prerequisite cycles from repository evidence.
4. Build a small authority matrix when decisions affect behavior, security, data, persistence, transport, or ownership. Mark each item authoritative, derivable, deferred, or blocking. Stop affected work instead of inventing missing semantics.
5. Inspect current package boundaries, dependency direction, public exports, configuration ownership, and existing tests before editing.
6. Implement only the smallest authorized slice. Keep product and domain rules in their accepted owners, preserve explicit boundaries, and avoid abstractions for hypothetical variation.
7. Add or update focused tests for behavior actually changed. Do not represent mocks as integration evidence or claim manual, browser, database, device, or production validation that was not executed.
8. Discover current validation commands from `package.json`, workspace manifests, `AGENTS.md`, the test strategy, and the active task or specification. Run focused gates first, then every broader gate required by current repository convention.
9. Apply relevant formatting, documentation, lint, type, architecture, test, integration, migration/database, build, browser-safety, data, secret, security, and privacy checks. Use only gates applicable to the task and report skipped gates honestly.
10. Classify invalid input, expected domain outcomes, infrastructure failure, configuration failure, and unexpected failure distinctly. Never introduce broad fail-open behavior to make validation pass.
11. Update only documentation materially affected by actual work. Keep cycle-specific decisions in specifications, ADRs, task records, or source rather than this Skill.
12. Inspect for generated output, sensitive data, forbidden artifacts, unfinished markers, unintended dependency changes, and architecture drift. Clean generated artifacts when repository convention requires it.
13. Re-run affected validation after corrections and perform the required clean-state validation. Record original failures, cause, correction, rerun result, blockers, deferrals, and not-applicable gates separately.
14. Inspect final Git status and diff. Do not commit, push, create branches, open pull requests, or discard unrelated work unless explicitly authorized.

## Close And Hand Off

- Report exactly what changed, why it changed, and every validation actually performed.
- State remaining risks and genuinely unresolved questions without disguising deliberate deferrals as blockers.
- Request or recommend manual/user testing only when the implemented behavior and current task require it.
- When a handoff is required, recommend exactly one next cycle and task with objective, rationale, satisfied dependencies, and explicit non-goals.
- Never begin the recommended cycle without explicit authorization.

Do not turn this workflow into a generic SDD framework, task DSL, orchestration layer, validation framework, reporting framework, or duplicate architecture/security specification.
