# ADR 0003: Make Web the Primary Client and Mobile a Supporting Client

## Status

Accepted.

## Context

The product needs a primary operational interface for recording sales, customer debts, payments, expenses, and reports. Some merchants may use phones at the counter, but the mobile application has a narrower initial role.

## Decision

The responsive web application is the primary operational client. The mobile application is a supporting client for taking and uploading product photos, sending collection requests, and viewing essential reports or business information.

## Consequences

- Web workflows must be designed for counter use and responsive screens.
- Mobile scope remains intentionally narrow.
- Web and mobile may share contracts and domain concepts, but are not required to share UI components.
- Mobile point-of-sale behavior is outside the initial scope unless specified later.

## Alternatives Considered

- Mobile-first point-of-sale. Deferred because the current product boundary names web as the primary operational interface.
- Shared UI component system across web and mobile. Not selected now because it may add complexity before product workflows are validated.

## Follow-up Work

- Specify responsive web workflows for the first critical user journey.
- Specify mobile photo, collection, and report responsibilities separately before implementation.
