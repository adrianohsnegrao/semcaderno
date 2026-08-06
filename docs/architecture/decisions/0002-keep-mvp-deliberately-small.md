# ADR 0002: Keep the MVP Deliberately Small

## Status

Accepted.

## Context

Sem Caderno's value is replacing the notebook with a simple digital workflow. Adding ERP, accounting, integration, inventory, or automation features too early would make the product harder for the target merchant to adopt and validate.

## Decision

The MVP is limited to customer management, product management with optional photo, paid or unpaid sales, customer history, partial and full debt payments, basic expenses, manual Pix or WhatsApp collection, essential reports, basic user and business access control, and supporting mobile functions for photos, collections, and report consultation.

Excluded features must not enter the MVP without a later specification and explicit scope decision.

## Consequences

- The first release can focus on daily merchant workflows.
- Reports must stay practical and avoid advanced accounting terminology.
- Contributors must justify any proposed feature expansion.
- Some useful features will be intentionally deferred.

## Alternatives Considered

- Build a small ERP from the start. Rejected because it conflicts with product positioning and user simplicity.
- Include integrations and automation early. Rejected because manual flows are enough to validate the first product promise.

## Follow-up Work

- Create specifications for each MVP workflow before implementation.
- Revisit exclusions only when user evidence supports a scope change.
