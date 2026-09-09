# ADR 0036: Keep WhatsApp delivery manual until official Cloud API onboarding

## Status

Accepted for the current MVP.

## Context

The merchant wants to send a collection reminder without leaving Sem Caderno. Meta provides the
official WhatsApp Cloud API and a `/{phone-number-id}/messages` endpoint for text, media, and
template messages. Production use requires a Meta business portfolio, a WhatsApp Business Account,
a registered business phone number, an access token with `whatsapp_business_messaging`, customer
consent and policy-compliant messaging. Message status is asynchronous and must be reconciled from
webhooks. Depending on category, destination and current pricing rules, business-initiated template
messages can have a delivery cost.

Sources:

- [Meta WhatsApp Cloud API official Postman collection](https://www.postman.com/meta/whatsapp-business-platform/collection/wlk6lh4/whatsapp-cloud-api)
- [Meta message endpoint and prerequisites](https://www.postman.com/meta/whatsapp-business-platform/folder/13382743-ba8d099d-007e-4b52-b9f2-3cf3c60e4fbc)

## Decision

Keep the current user-reviewed `wa.me` handoff in the MVP. Do not use browser automation,
WhatsApp Web scraping or unofficial reverse-engineered libraries. They would create account-ban,
privacy and delivery-reliability risks.

Direct delivery will be implemented only after the product owner supplies or explicitly chooses:

1. an approved Meta business and WhatsApp Business Account;
2. a dedicated registered phone number and production access token;
3. the approved Portuguese collection template and consent wording;
4. a budget/charging decision;
5. a public HTTPS webhook endpoint and retention policy for delivery events.

The future adapter must run after the authoritative collection intent commits, use a durable outbox,
be idempotent, store only provider identifiers and delivery states, and never mark a debt as paid.

## Consequences

- The current MVP remains usable at practically zero operating cost.
- The user explicitly reviews every message before WhatsApp receives personal and financial data.
- Direct sending is technically feasible and has a documented production path, but cannot be
  truthfully demonstrated without external business credentials and policy setup.
