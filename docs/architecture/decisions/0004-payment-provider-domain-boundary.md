# ADR 0004: Keep Payment Providers Behind a Domain Boundary

## Status

Accepted.

## Context

The MVP supports manual Pix or WhatsApp collection. A future version may create dynamic Pix charges through a bank or payment provider and reconcile payments automatically. Coupling the domain to a provider too early would make the system harder to change and would add integration complexity before the manual flow is validated.

## Decision

Payment request behavior must be represented in the domain without depending on a specific bank, payment provider, or SDK. Future automatic Pix integration should be introduced through a boundary such as `PaymentRequestProvider` after a dedicated specification.

## Consequences

- MVP collection can stay manual and simple.
- Future providers can be evaluated without rewriting core domain rules.
- The project must avoid provider-specific assumptions in domain concepts.
- Automatic reconciliation remains outside the MVP.

## Alternatives Considered

- Integrate directly with one bank or Pix provider in the MVP. Rejected because it expands scope and increases operational risk.
- Ignore future payment integration entirely. Rejected because the domain should avoid choices that would block a future provider boundary.

## Follow-up Work

- Specify the manual Pix and WhatsApp collection flow.
- Specify `PaymentRequest` lifecycle and audit requirements.
- Create a provider abstraction only when automatic integration becomes approved scope.
