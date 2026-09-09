# Sem Caderno

> Sales, customer credit and expenses without paper or confusion.

[Versão principal em português](README.md)

Sem Caderno is a web MVP for Brazilian microbusinesses that still run daily operations in paper
notebooks, loose sheets, or memory. It organizes sales, customer debt, payments, and expenses without
forcing a merchant to learn accounting vocabulary or operate an ERP.

The product is designed for the counter: few steps, everyday Brazilian Portuguese, mobile-friendly
reading, and financial history that is never silently erased.

## What works

- account and establishment onboarding;
- secure sign-in and sign-out;
- practical dashboard for money received, expenses, simple remainder, and outstanding debt;
- customer and product creation and editing;
- per-business duplicate protection for normalized product names and WhatsApp numbers;
- automatic BRL currency masks and simple stock quantities;
- transactional stock decrement on sale and restoration on cancellation;
- fully paid, partially paid, and unpaid sales;
- searchable product suggestions that only accept active, registered, in-stock products;
- server-authoritative catalog descriptions and prices;
- customer purchase history and later partial/full payments;
- overpayment prevention;
- expense recording;
- user-reviewed WhatsApp reminder with an optional Pix key;
- explicit separation between a collection reminder and a received payment;
- auditable activity history and history-preserving cancellation;
- first-use tutorial and realistic sample data;
- responsive desktop, tablet, and phone interface.

## Two-minute demo

Requirements: Node.js `24.19.x` and Corepack/pnpm `11.20.x`.

```bash
pnpm install --frozen-lockfile
pnpm dev:api
```

In another terminal:

```bash
pnpm dev:web
```

Open [http://localhost:3000](http://localhost:3000) and use:

- email: `demo@semcaderno.app`
- password: `semcaderno`

The demo profile uses in-memory sample data and resets when the API restarts. It is intentionally
identified in the UI and is not represented as production persistence.

## Persistent production-like path

Docker Compose starts PostgreSQL 18, runs ordered migrations, and serves both applications:

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000), choose **Ainda não tenho conta**, and create
your establishment. Data remains in the `sem-caderno-data` volume.

See the [Portuguese README](README.md) for environment configuration, architecture, security,
quality gates, domain decisions, and product limitations.

## Architecture at a glance

```text
apps/web                      Next.js + React merchant experience
apps/server                   Fastify HTTP/session/CSRF composition
packages/contracts            stable contracts and schemas
packages/application          use cases and application ports
packages/domain               framework-independent business rules
packages/persistence-postgres PostgreSQL adapters
tools/database                ordered checksum-verified migrations
docs                          product, UX, ADR, privacy, and specifications
```

Production fails closed when `DATABASE_URL` is missing. Money uses integer BRL cents, tenant context
comes from the authenticated session, state-changing requests are idempotent, related PostgreSQL
writes are transactional, and financial corrections preserve history.

Sales lock the selected catalog rows, verify aggregated stock, resolve current prices on the server,
and decrement inventory in the same transaction. Database constraints reinforce product-name and
WhatsApp uniqueness. Cancelling a sale preserves its history and restores its catalog quantities.

## Applied AI portfolio connection

Sem Caderno deliberately has no decorative chatbot or unnecessary model call. It reuses the
engineering discipline proven by the surrounding Applied AI portfolio: typed contracts, human
authority, idempotency, auditable trajectories, explicit degraded states, golden-path regression
tests, and bounded operations. Knowing when **not** to use an AI model is also a product-engineering
decision.

## Validation

```bash
pnpm validate
```

The gate covers runtime, documentation, formatting, lint, strict TypeScript, architecture rules,
contracts, application behavior, HTTP/session security, MVP business rules, PostgreSQL integration,
all builds, and migration order/checksums. Persistence tests create isolated PostgreSQL instances
in disposable containers during CI.

Direct WhatsApp sending is intentionally deferred. The MVP opens a user-reviewed `wa.me` message;
the documented production path uses Meta's official Cloud API only after business onboarding,
customer consent, an approved template, a public webhook, and an explicit cost decision. See
[ADR 0036](docs/architecture/decisions/0036-whatsapp-direct-delivery.md).

## Project use

This is a portfolio project. A public license remains an explicit author decision before external
reuse is accepted.
