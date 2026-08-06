# ADR 0021: Use Responsive Web as the Initial Supporting-Mobile Delivery

## Status

Accepted.

## Context

ADR 0003 makes web the complete operational client and mobile a supporting client. Cycles 008 and 009 define mobile-browser support for summaries, reports, history, debt visibility, Business switching, and session security while leaving mobile financial mutations, offline synchronization, product-photo details, and provider delivery behavior unresolved.

## Decision

Deliver the initial supporting-mobile experience through the responsive Next.js web application in mobile browsers. Do not create a separate mobile application, native shell, installable-web commitment, or mobile workspace initially.

Responsive mobile surfaces use the same Fastify application boundary, Business context, authorization, financial definitions, idempotency, unknown-outcome recovery, projection freshness, and privacy rules as desktop web. Smaller screens never weaken confirmation or authorization.

A dedicated mobile client requires merchant and device evidence that responsive web cannot meet an accepted need.

## Consequences

- The MVP has one presentation implementation and no premature mobile release pipeline.
- Mobile-browser report and security behavior can be validated early.
- Native photo, sharing, notification, and offline capabilities are not assumed.
- No new mobile Sale, Payment, Expense, correction, or team-management scope is created.
- A later mobile client can be added against the same transport and application contracts.

## Alternatives Considered

- Cross-platform mobile application. Deferred because accepted supporting responsibilities do not yet justify another client and release lifecycle.
- Thin native shell. Deferred because no validated native capability requirement exists.
- Installable web experience. Deferred because installation, update, caching, and offline expectations require separate evidence.
- Fully native applications. Rejected for the MVP because cost and scope are disproportionate.

## Risks and Revisit Triggers

- Risk: browser photo, sharing, session, or connectivity behavior may not meet merchant needs. Mitigate with real-device and merchant validation.
- Risk: users infer offline capability from browser installation. Avoid installability claims until behavior is specified.
- Revisit when validated product-photo, operating-system sharing, notification, security, performance, or offline requirements cannot be met responsibly by responsive web.

## Relationship to Existing Decisions and Specifications

This ADR narrows the initial implementation of ADR 0003 without changing its product responsibility. It preserves the Cycle 008 and Cycle 009 cross-client, responsive, accessibility, privacy, and unknown-outcome requirements.

## Follow-up Work

- Validate supporting mobile behavior on intended devices and browsers.
- Reassess dedicated mobile delivery only after merchant and operational evidence.
