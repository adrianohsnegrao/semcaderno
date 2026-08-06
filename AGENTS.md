# Agent Instructions

These instructions apply to all future coding agents working on Sem Caderno.

## Product Direction

Sem Caderno is a simple management system for small Brazilian businesses that currently rely on notebooks or informal records for sales, customer debts, expenses, and payments. It is not a smaller ERP. It is a digital replacement for the notebook.

Preserve these product principles:

- Use everyday Brazilian Portuguese in the user interface.
- Avoid accounting, tax, and technical terminology when a simpler expression exists.
- Keep common operations short and obvious.
- Make reports answer practical business questions.
- Prioritize accessibility, clarity, and ease of use over visual sophistication.
- Keep the MVP deliberately small.
- Treat security, privacy, auditability, and LGPD concerns as baseline requirements.
- Keep domain rules independent from UI frameworks and third-party providers.
- Let web and mobile clients share contracts and domain concepts without requiring shared UI components.
- Do not add MVP features without an approved specification and scope decision.

Preferred UI language examples:

- Use "Quem está devendo" instead of "Contas a receber".
- Use "Quanto entrou" instead of "Receita bruta".
- Use "Quanto saiu" instead of "Despesas operacionais".
- Use "Quanto sobrou este mês" instead of "Resultado líquido" or "DRE".

## Before Editing

- Read the relevant product, architecture, quality, security, and specification documents before changing code.
- Inspect the repository state with Git before editing.
- Preserve existing user changes. Do not revert, overwrite, or discard unrelated work.
- Understand the current project structure before adding files.
- If behavior is not specified, create or update the relevant specification before implementing it.

## Scope Control

- Do not expand the MVP without an approved specification.
- Do not implement excluded features unless a later documented scope decision explicitly changes the MVP.
- Keep tasks small, traceable, and connected to a product requirement, specification, implementation change, and validation evidence.
- Do not introduce speculative abstractions, module systems, integrations, or configuration options to make the project look more sophisticated.

## Architecture Rules

- Keep domain logic framework-independent.
- Keep provider integrations behind domain boundaries.
- Do not couple payment request behavior directly to a bank or payment provider.
- Do not finalize unresolved technology choices without an ADR.
- Do not create database migrations before the domain and tenancy specification is approved.
- Represent money safely using integer minor units or a safe decimal representation. Never use binary floating point for monetary values.
- Preserve auditability for financial records. Favor append-only events or explicit adjustments over silent mutation.

## Quality Rules

- Add or update tests for changed behavior.
- Run relevant validation commands before declaring work complete.
- If validation tooling does not exist yet, state that clearly.
- Never claim that tests, device QA, integrations, user validation, or production behavior passed unless they were actually executed.
- Update documentation when decisions, behavior, or scope change.

## Git Rules

- Do not commit, push, open pull requests, or perform destructive Git operations unless the user explicitly asks.
- Avoid destructive commands such as `git reset --hard` or checkout-based reverts unless explicitly requested.
- If the worktree contains unrelated changes, leave them untouched.

## Completion Report

At the end of every task, report:

- Changed files.
- Validation commands or inspections actually performed.
- Unresolved risks or open questions.
- Recommended next task.
