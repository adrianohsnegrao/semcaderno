# Physical Persistence Model Specification

## 1. Status, Purpose, Scope, and Authority

Status: Accepted for planning.

Cycle: 012 - Physical Persistence Model Specification.

Task: 001 - Define the PostgreSQL Schema, Constraints, Transactions, Concurrency, and Migration Strategy for the Critical Journey.

Date: 2026-08-01.

Scope: documentation and architecture planning only. No executable SQL, migration, source schema, repository, database, dependency, configuration, or test is created.

This cycle follows the accepted logical model, application contracts, low-fidelity states, implementation architecture, and transport contract. It is now appropriate because transport-visible identity, idempotency, error, concurrency, and recovery semantics are stable enough to map into durable PostgreSQL evidence without allowing storage details to invent product behavior.

Authority descends from the [MVP Scope](../product/mvp-scope.md), [Domain and Tenancy Specification](domain-and-tenancy.md), [Authentication and Business Onboarding Specification](authentication-and-business-onboarding.md), [Data Persistence and Tenant Enforcement Specification](data-persistence-and-tenant-enforcement.md), [First Critical User Journey](first-critical-user-journey.md), [Logical Data Model](logical-data-model.md), [Application Contracts](application-contracts.md), [Critical Journey UX](critical-journey-ux-flow.md), [Low-Fidelity Interaction](low-fidelity-interaction-screen-state-spec.md), [Implementation Architecture](implementation-architecture-technology-selection.md), [Transport and API Contract](transport-api-contract-specification.md), and accepted ADRs. The domain defines meaning, the application boundary defines authoritative behavior, the transport maps it externally, this specification maps it physically, and presentation remains subordinate to all four.

Future migrations and `node-postgres` repositories must implement this model. Physical rows do not create new product semantics, transport DTOs are not row models, and a database constraint complements rather than replaces current User, Business, Membership, capability, and lifecycle authorization.

Decided here:

- PostgreSQL organization, tables, columns, types, keys, relationships, constraints, indexes, canonical/projection boundaries, transaction and concurrency policies, durable idempotency/outcome evidence, session evidence, outbox-style delivery handoff, migration policy, and architectural backup/repair requirements.

Deferred:

- Executable DDL and SQL; migration runner and files; exact package versions; repository code; credential/provider storage; product-photo storage; provider callbacks; deployment; retention durations; encryption/key-management product; backup vendor and objectives; and all guarded product boundaries identified later.

## 2. Persistence Principles

| Principle | Physical consequence | Repository authority |
| --- | --- | --- |
| Server and database authority | Authoritative commands use explicit PostgreSQL transactions; web state and DTOs never write around Fastify/application behavior. | ADRs 0016-0018; Cycles 007 and 011 |
| Business tenancy | Every tenant record carries non-null `business_id`; child references repeat it. | ADRs 0006, 0012, 0013 |
| Global User, tenant Membership | `users` is global; `memberships` is Business-owned and historically retained. | ADR 0010 |
| Current authorization | Persistence supports current state reads and locks, but capability decisions remain application authorization. | ADR 0012; Cycle 007 |
| Deactivation | Lifecycle state blocks ordinary application work without deleting history. | Cycles 003, 006, 007 |
| Financial history | Financial facts are immutable after commit except current lifecycle markers changed together with append-only correction evidence. | ADR 0008 |
| Financial atomicity | Sale, Payment, Allocation, Expense, audit, idempotency outcome, and projection-change evidence share accepted transaction boundaries. | Cycles 004, 006, 007 |
| Exact money | BRL minor units use signed 64-bit integers and checked BigInt application arithmetic, never floating point. | ADR 0005 |
| Business-local dates | UTC instants, local `date`, and event-time IANA zone are stored separately on financial facts. | ADR 0009 |
| Canonical over projection | Projection rows are disposable and rebuildable; canonical rows decide money and history. | ADR 0014 |
| Idempotency and recovery | Key digest, canonical intent fingerprint, execution lease, and final outcome survive lost responses. | ADR 0025 |
| Audit, not event sourcing | Minimal append-only audit evidence accompanies sensitive commits; canonical tables remain source of truth. | ADR 0008; Cycle 006 |
| Side effects after commit | External-effect intent is durable before dispatch; delivery attempts cannot change debt. | ADR 0015 |
| Referential integrity | Primary, unique, check, and tenant-aware foreign keys reject malformed relationships before application interpretation. | Cycles 004 and 006 |
| Migration safety | Ordered immutable migrations, expand-and-contract compatibility, validation, and roll-forward recovery are required. | ADR 0001; ADR 0018 |
| Backup and repair | Restore preserves canonical identity, tenant links, outcomes, audit, local dates, and projection rebuildability. | Cycles 004 and 006 |
| Minimal sensitive data | Bearer evidence is stored only as keyed digest; payload duplication and broad JSON are prohibited. | Privacy specification; ADRs 0020, 0023 |

## 3. PostgreSQL Organization Strategy

- Use one PostgreSQL database and one application-owned schema named `sem_caderno`; do not create a schema per Business.
- Use plural `snake_case` table names and `snake_case` columns. Name primary keys `pk_<table>`, foreign keys `fk_<child>__<parent>`, unique constraints `uq_<table>__<purpose>`, checks `ck_<table>__<rule>`, and indexes `ix_<table>__<access_path>`.
- Schema-qualify production SQL. Pin a trusted `search_path`; runtime and migration roles must not trust user-writable schemas. The runtime role cannot create schema objects, and the migration owner is not the ordinary runtime role.
- Store stable technical states as `text` with named checks. PostgreSQL enums are rejected initially because adding or revising provisional lifecycle and capability values would couple product validation to type migrations. Reference tables are used only for capability groups/capabilities.
- Permit `jsonb` only for bounded, versioned, non-authoritative safe metadata in `command_outcomes`, `audit_events`, and external-effect evidence. Canonical money, relationships, states, contacts, dates, and identifiers never hide in JSON.
- Do not use arrays for relationships. Use relational child rows.
- No generated column is initially required. Add one only for deterministic row-local derivation with a measured query benefit.
- Avoid database functions and triggers for ordinary orchestration. Cross-row invariants use explicit transactions and locks; append-only privileges and later constraint triggers may be reconsidered only if integration tests prove an invariant cannot be reliably guarded otherwise.
- No extension is required initially. Prefix search uses normalized text and B-tree access paths; `pg_trgm` is a measured-search revisit, not a default.
- RLS remains deferred defense in depth. Tenant-aware keys, scoped repositories, current application authorization, restricted database roles, and cross-Business tests are mandatory now. If RLS is later selected, policies, table ownership, worker/repair roles, pooled-connection context, and `FORCE ROW LEVEL SECURITY` require a separate threat-tested design.

PostgreSQL warns that adding an untrusted schema to `search_path` trusts users who can create objects there, and that table owners and `BYPASSRLS` roles normally bypass RLS. These behaviors support the selected explicit-role and RLS posture. See [PostgreSQL schemas](https://www.postgresql.org/docs/18/ddl-schemas.html) and [row security](https://www.postgresql.org/docs/18/ddl-rowsecurity.html).

## 4. Identifier Strategy

Use PostgreSQL `uuid` primary keys generated by PostgreSQL 18 `uuidv7()` defaults for every persisted record.

- UUIDv7 is globally unique for application purposes and time-ordered enough to reduce random B-tree insertion compared with UUIDv4. Time order is not business order, authorization, audit sequence, or proof of creation time.
- Database generation avoids sequences that expose cardinality and avoids adding an identifier package before scaffolding. `INSERT ... RETURNING` supplies new identities to the transaction.
- Transport continues to treat identifiers as opaque strings. Clients cannot generate authoritative record identity, infer tenancy, or authorize from an identifier.
- Every Business-owned parent has both primary key `id` and unique `(business_id, id)`. Business-owned children reference the composite pair even though `id` is globally unique; this physically rejects cross-Business references.
- Global-to-tenant references, such as Membership to User, use a global User FK plus non-null tenant ownership.
- Merchant-visible Sale and Payment numbering remains unresolved. No visible counter or sequence is introduced.
- A future database-major change must preserve UUID values. If application-side UUIDv7 generation later becomes necessary, it must produce RFC-compatible values and retain the same storage/transport representation.

PostgreSQL 18 natively stores UUIDs and generates UUIDv7 values. See the [UUID type](https://www.postgresql.org/docs/18/datatype-uuid.html) and [PostgreSQL 18 release notes](https://www.postgresql.org/docs/18/release-18.html).

## 5. Type System and Column Conventions

| Concept | PostgreSQL representation | Rules |
| --- | --- | --- |
| Identifier | `uuid` | PostgreSQL-generated UUIDv7; opaque externally. |
| Money | `bigint` | Integer minor units; positive for Sale totals, Payments, Allocations, Requests, and Expenses; zero allowed only for discounts/adjustments. |
| Currency | `text` | Named check equals `BRL` for release one. |
| Quantity | `bigint` | Positive whole units for the accepted first journey. Fractional scale and rounding remain open; no `numeric` scale is silently selected. |
| Instant | `timestamptz` | UTC semantic instant; application serializes RFC 3339. |
| Operational date | `date` | Business-local calendar date stored at event time. |
| Time zone | `text` | Validated IANA identifier; historical event rows retain the applied value. |
| Duration/expiry | `timestamptz` endpoints | Avoid ambiguous integer duration columns where an expiry instant is the requirement. |
| Boolean | `boolean` | Only genuine binary facts, not lifecycle substitutes. |
| State/code | `text` | Named checks for closed technical states; application/reference validation for provisional product codes. |
| Optimistic version | `bigint` | Starts positive and increments on accepted current-record mutation; maps to ETag without exposing raw semantics. |
| Email | `text` original plus `text` normalized | User normalized email is globally unique; Customer email is nullable and non-unique. |
| Phone | `text` original plus nullable normalized `text` | Customer phone remains non-unique. |
| Name/label | `text` plus normalized search `text` where queried | Non-empty after normalization; no Customer/Product uniqueness. |
| Correlation | `uuid` or bounded `text` | Generated independently from sessions, keys, and records; no personal data. |
| Secret/token evidence | `bytea` keyed digest | Raw bearer value is never stored. Digest version/key reference is retained. |
| Intent fingerprint | `bytea` keyed digest | Server canonicalization version is stored; no raw request payload. |
| Provider destination | encrypted `bytea`, digest, and masked hint | Exact encryption/key management deferred; plaintext lists/logs prohibited. |
| Safe metadata | bounded versioned `jsonb` | Allow-listed, non-authoritative, and free of secrets/full financial payloads. |

`bigint` values are mapped to application `bigint` or validated decimal strings, never JavaScript `number`. `date` values must use an explicit text parser because node-postgres otherwise maps date/time types through JavaScript `Date` and process time-zone behavior. UUIDs map to strings. See [node-postgres data types](https://node-postgres.com/features/types).

Every table has `created_at`. Mutable current records also have `updated_at` and `version`. Lifecycle timestamps (`deactivated_at`, `cancelled_at`, `reversed_at`, `expired_at`, `revoked_at`) are nullable only when the lifecycle event has not occurred and are validated against the state in the same row. `recorded_at` identifies persistence time; `occurred_at` identifies the accepted event time where those differ.

## 6. Tenant-Isolation Model

Global tables are `users`, pre-authentication challenge tables, and global command executions. Business-owned tables carry non-null `business_id`; operational tables carry nullable `business_id` only when they legitimately support both global and tenant work.

Rules:

1. Every tenant repository receives a validated authorization context, not a bare Business ID.
2. Every tenant query predicates on `business_id`, including detail lookup by globally unique UUID.
3. Every tenant parent exposes unique `(business_id, id)` and every tenant child repeats `business_id` in its FK.
4. Uniqueness is Business-scoped unless the concept is global identity or a technical global digest.
5. `ON DELETE RESTRICT` or `NO ACTION` is the default for canonical tenant relationships. Cascades are permitted only for short-lived secret evidence that has no historical meaning.
6. Membership suspension/removal and Business deactivation update lifecycle state; they never delete financial or historical actor references.
7. Cross-Business persistence violations are translated to the same non-disclosing application/transport family as inaccessible records. Constraint names and SQL detail never leave the adapter.

### Cross-Business Reference-Prevention Matrix

| Relationship | Physical prevention | Additional transaction check |
| --- | --- | --- |
| Business -> settings/Membership/Invitation/Customer/Product | Child `business_id` FK to Business; unique tenant parent key | Current Business state and capability. |
| Sale -> Customer | `(business_id, customer_id)` to Customer, nullable only for fully paid anonymous Sale | Customer required for partial/unpaid intent and active selection. |
| Sale Item -> Sale/Product | Composite FKs; Product nullable for ad hoc item | Product active at confirmation; snapshot remains immutable. |
| Payment -> Customer/Request | Composite FKs; both nullable only in accepted contexts | Anonymous initial Payment only for anonymous fully paid Sale; Request has no receipt authority. |
| Allocation -> Payment/Sale | Composite FKs include `business_id` | Same compatible Customer context, active lifecycle, amount limits. |
| Correction -> original/replacement | Both tenant-aware FKs | Lifecycle eligibility and one coherent correction plan. |
| Payment Request -> Customer/Sale | Composite FKs | Sale, when supplied, belongs to same Customer and eligible debt context. |
| Delivery attempt -> external effect/Request | Composite tenant FKs for Request effects | Provider-neutral state and retry eligibility. |
| Audit/projection -> Business/record reference | Business FK plus safe opaque target reference | Target disclosure filtered by current capability. |
| Command execution -> Business | Nullable global Business FK; unique scope treats null as one scope | Same User, API major, operation, Business, key digest, and intent fingerprint. |

Client-selected `businessId`, session-selected Business, tenant path, and `business_id` predicate are contextual inputs. Authorization still revalidates current User, Business, Membership, state, and capability.

## 7. Identity, Authentication, and Session Persistence

- `users` owns global normalized primary email, verification evidence, lifecycle, and version. It grants no Business access.
- Credential/provider material remains a guarded adapter boundary. No password verifier, external subject, provider table, or algorithm is invented before provider/credential selection.
- `email_verification_challenges`, `account_recovery_challenges`, and `pre_session_challenges` store only keyed token digests, purpose, expiry, attempt/consumption/revocation evidence, and minimal correlation. Generic responses prevent account enumeration.
- `sessions` stores User, unique session-token digest, CSRF-token digest, digest versions, issued/last-seen/idle/absolute expiry, rotation predecessor, revocation reason/time, optional remembered Business candidate, minimal device hint, and optimistic version. Raw cookie and CSRF values are never stored.
- Session rotation creates new digest evidence and revokes/replaces the old row atomically. Current-device sign-out revokes one row; lost/other-device revocation updates the authorized set. Expiry may be evaluated from timestamps without destructive deletion.
- Remembered Business is nullable contextual state and can reference a deactivated/inaccessible Business historically; each use revalidates current Membership and Business.
- Challenge and expired-session cleanup is retention-controlled. Cleanup never removes audit evidence required by policy.
- Security events produce minimal `audit_events`; secrets, credentials, raw email messages, and challenge values are excluded.

## 8. Business, Membership, Capability, and Invitation Persistence

`businesses` stores lifecycle, creation actor, deactivation evidence, and version. `business_settings_versions` stores Business name, IANA zone, BRL currency, `effective_from`, and nullable `effective_to`; one partial unique index permits one current version per Business. Financial rows snapshot local date and zone, so settings changes never reinterpret history.

`capability_groups` and `capability_group_capabilities` are application-owned reference data, not merchant-configurable RBAC. Migrations seed only groups and capabilities accepted for the release; provisional Manager exposure remains unresolved. `memberships` stores Business, User, group, lifecycle, activation/suspension/removal timestamps, and version. Unique `(business_id, user_id)` preserves one historical membership relationship that can be restored rather than duplicated.

`invitations` stores intended normalized email, intended group, expiry, lifecycle, keyed invitation-secret digest, creator, consumer, consumed time, cancellation evidence, and version. A partial unique index permits at most one pending unexpired-by-state Invitation per Business/email/group intent; time expiry is still checked transactionally because `now()` is not an immutable index predicate. Acceptance locks the Invitation, verifies digest and normalized verified email, creates/restores Membership, marks consumption, writes audit/outcome evidence, and commits atomically.

Declarative constraints guarantee references, allowed row states, unique Membership, and single pending-state shapes. The first active Owner, current authorization, concurrent acceptance, and last-active-Owner invariant require authoritative transactions. Owner-changing commands lock the Business row as the serialization point, then current Owner Membership rows, and reject any result with zero active Owners. Client checks are advisory only.

## 9. Customer Persistence

`customers` contains `business_id`, display name, normalized search name, optional phone/original-normalized pair, optional email/original-normalized pair, optional accepted notes, lifecycle, deactivation evidence, audit timestamps, and version.

- No unique constraint exists on display name, normalized name, phone, or email.
- Duplicate-like warnings query normalized fields inside one Business and never block creation.
- Contact edits update current Customer data and version but do not alter Sale snapshots, Payment facts, or Request history.
- Deactivation prevents future ordinary selection while retaining debt and history.
- Financial references use the stable Customer ID. Anonymization is a guarded future command; no destructive cascade or irreversible database default preempts legal review.
- Indexes support Business/name search and optional exact normalized phone/email lookup. They do not imply uniqueness.

## 10. Product Persistence

`products` contains `business_id`, current name, normalized search name, optional accepted description, current price in BRL minor units, lifecycle, deactivation evidence, audit timestamps, and version.

- Product names are not unique.
- No SKU, barcode, inventory quantity, supplier, or product-photo locator is introduced.
- Current price is positive `bigint`; a Product may be updated or deactivated with optimistic concurrency.
- A Sale Item may reference a Product, but description, unit price, quantity, discounts/adjustments, and line total are copied into immutable Sale Item facts at commit. Product edits never cascade into Sale history.
- Product-photo persistence is guarded until its workflow, storage, access, and retention are accepted.

## 11. Sale and Sale Item Persistence

`sales` stores Business, optional Customer, actor Membership/User, occurrence instant, recorded instant, Business-local operational date, applied IANA zone, BRL currency, non-negative Sale-level discount and adjustment, server-calculated positive `total_minor`, lifecycle (`ACTIVE`, `CANCELLED`, or `REPLACED`), version, and unique creating `command_execution_id`. Paid status and outstanding amount are not authoritative columns.

`sale_items` stores Business, Sale, stable item position, optional Product, required description snapshot, positive whole-unit quantity, positive unit-price snapshot, non-negative line discount/adjustment, and positive server-calculated line total. Rows become immutable when the Sale commits. The transaction recalculates each line and the Sale total with checked integer arithmetic; persisted totals are verified canonical calculation evidence and reconciliation must compare them with item/adjustment facts.

Rules by accepted intent:

- Fully paid anonymous: `sales.customer_id` is null; one Payment with null Customer and Allocations equal the total commit with the Sale.
- Fully paid identified: Customer is non-null; Sale, Payment, and Allocation Customer contexts match.
- Partially paid: Customer is non-null; initial Payment is positive and below total; remaining debt derives from active Allocations.
- Unpaid: Customer is non-null; no Payment or Allocation is invented.
- Product-backed and ad hoc lines both snapshot commercial facts; ad hoc lines have null Product.
- Product/Customer state is locked or revalidated at commit. A stale Product is never silently converted to ad hoc.

`sale_corrections` is append-only and records `CANCELLATION`, `REPLACEMENT`, or accepted non-financial correction evidence, reason, original Sale, optional replacement Sale, actor, command, and timestamp. A correction transaction also changes the current lifecycle marker on the original Sale. Amounts/items/Customer/date are never edited in place. Cancellation with effective Allocations must include a valid, reviewed companion allocation/Payment correction plan or reject; it cannot create unallocated customer credit.

Access paths support tenant detail, Customer history, local-date Sales reporting, recent activity, debt ordering, and correction links. Merchant-visible numbering remains absent.

## 12. Payment and Allocation Persistence

`payments` stores Business, optional Customer, optional originating Payment Request, actor, positive `amount_minor`, BRL, accepted method code, occurrence/recorded instants, Business-local date, applied zone, origin classification, lifecycle (`ACTIVE`, `REVERSED`, `REPLACED`), version, and unique creating command.

`payment_allocations` stores Business, Payment, Sale, positive allocated minor units, allocation order, actor/command evidence, and creation instant. It is distribution of one receipt, never another receipt. `payment_allocation_reversals` append a one-to-one effective reversal per Allocation and reference the governing Payment correction.

`payment_corrections` records `REVERSAL` or `REPLACEMENT`, original Payment, optional replacement Payment, reason, actor, command, and timestamp. Reversal changes Payment lifecycle and creates reversals for every effective Allocation in one transaction; debt then reappears from canonical formulas.

Declarative constraints enforce positive amounts, BRL, tenant-aware references, unique allocation order within a Payment, and one reversal per Allocation. Aggregate invariants require transaction logic:

```text
saleTotalMinor = sum(lineTotalMinor) - saleDiscountMinor + saleAdjustmentMinor
effectiveAllocatedToSaleMinor = sum(allocations) - sum(allocation reversals)
saleOutstandingMinor = max(0, saleTotalMinor - effectiveAllocatedToSaleMinor)
effectiveAllocatedFromPaymentMinor = sum(allocations) - sum(allocation reversals)
paymentUnallocatedMinor = paymentAmountMinor - effectiveAllocatedFromPaymentMinor
```

- Payment, Sale, Allocation, and Customer contexts share one Business.
- Both Customer references are equal, including both null only for the accepted anonymous-at-Sale case.
- A later Payment has a Customer and allocates selected Sale first, then eligible Sales ordered by operational date, recorded instant, and ID.
- Sum of effective Allocations cannot exceed Payment amount or active Sale outstanding amount.
- The accepted MVP leaves no active unallocated balance, overpayment, or Customer credit.
- Payment and all Allocations, audit, command outcome, and projection-change rows commit together.

## 13. Payment Request and Delivery-Attempt Persistence

`payment_requests` stores Business, Customer, optional Sale, positive requested BRL amount, provider-neutral channel category, encrypted destination, destination digest/masked hint, creation/expiry/cancellation facts, lifecycle (`ACTIVE` or `CANCELLED`, with effective expiry derived from `expires_at`), actor, version, and creating command.

`external_effects` is the durable post-commit intent boundary for Request delivery, verification, Invitation delivery, and recovery notices. It stores effect kind, optional Business and target references, state, availability time, deduplication digest, safe correlation, and no provider payload. `delivery_attempts` stores each dispatch attempt, provider adapter code, provider correlation digest, timestamps, status (`PENDING`, `SUCCEEDED`, `FAILED`, `UNKNOWN`), safe error classification, and encrypted/minimized response evidence when legally justified.

- Request creation does not reduce debt.
- Delivery intent/attempt/success does not reduce debt and never creates a Payment.
- A later verified Payment is a separate `payments` command and may reference the Request only for explanation.
- Request cancellation blocks new attempts but preserves attempt history.
- Unknown delivery outcome permits provider-neutral reconciliation/retry rules and is distinct from unknown financial commit outcome.
- RQ07 provider callback/reconciliation remains guarded: no callback table or payload is invented.
- Effect intent is inserted transactionally with the command that requests external work; provider access starts only after commit.

## 14. Expense Persistence

`expenses` stores Business, actor, positive BRL amount, accepted description, optional category code only after product acceptance, occurrence/recorded instants, Business-local date, applied zone, lifecycle (`ACTIVE`, `CANCELLED`, `REPLACED`), version, and unique creating command.

`expense_corrections` append `CANCELLATION` or `REPLACEMENT` evidence with original Expense, optional replacement Expense, reason, actor, command, and timestamp. Description-only correction may be represented as a safe correction record and current descriptive update; amount/date changes always cancel and replace.

Creation, correction, or cancellation writes Expense/correction, audit, final command outcome, and projection-change evidence atomically. Current daily reports include only active Expenses by stored local date. The accepted operational result remains `Payments received - Expenses`; it is not profit, DRE, or an accounting result.

## 15. Idempotency and Command-Outcome Persistence

`command_executions` stores one logical command identity:

- API major, operation code, actor User, nullable Business, keyed digest of `Idempotency-Key`, canonicalization version, keyed canonical intent fingerprint;
- execution state, lease digest/owner class, lease expiry, creation/start/last-check timestamps;
- unique scope across API major, operation, User, Business (nulls treated as one global scope), and key digest.

`command_outcomes` stores at most one final outcome per execution: `COMMITTED`, `REJECTED`, or authoritative `NO_COMMIT`; final error code; typed stable result reference; response contract version; bounded safe replay metadata; finalized time; and correlation. It never stores raw keys, raw requests, cookies, CSRF material, full financial payloads, provider payloads, or merchant contact data.

Acquisition and execution protocol:

1. An acquisition transaction inserts or reads the unique execution row and compares the server-generated fingerprint.
2. Different fingerprint returns `IDEMPOTENCY_INTENT_MISMATCH` and creates no fact.
3. An identical final outcome replays it; a committed result is reconstructed from canonical records and marked replayed.
4. An identical non-final execution returns unknown/in-progress and does not start a second worker while a valid lease exists.
5. The authoritative command transaction locks the execution, revalidates authorization/state, writes canonical facts, audit/projection changes, and final `COMMITTED` outcome together.
6. Stable rejection writes a `REJECTED` outcome only after the application can prove no domain commit.
7. A crash leaves no final outcome. Recovery may write `NO_COMMIT` only after the lease is no longer valid, the execution is exclusively locked, and no canonical root references that execution.

Canonical command-created roots carry unique `command_execution_id`: Business bootstrap result, Invitation acceptance/cancellation where duplicate-sensitive, Sale, correction record, Payment, Payment correction, Payment Request, Expense, Expense correction, and external-effect intent as applicable. This enables authoritative result discovery.

These records guarantee:

- identical intent cannot create a second financial fact;
- replay is distinguishable from first commit;
- changed intent cannot reuse the scope/key;
- timeout is not rejection;
- recovery can find committed/rejected/no-commit evidence;
- only persisted authoritative `NO_COMMIT` permits a safe resubmission.

Retention must exceed realistic disconnection, retry, dispute, and reconciliation windows. Duration and cleanup approval remain operational/legal questions. Cleanup cannot occur while referenced by canonical records, audit, open recovery, or provider reconciliation.

## 16. Unknown-Outcome Recovery Persistence

Recovery reads `command_executions`, `command_outcomes`, and canonical roots by `command_execution_id` under the same User/Business authorization scope.

| Durable state | Authoritative recovery result | Resubmission |
| --- | --- | --- |
| `COMMITTED` outcome and canonical reference | Return reconstructed original result. | Prohibited; this is replay. |
| `REJECTED` outcome | Return stable safe rejection. | Only a new reviewed intent/key after correction. |
| `NO_COMMIT` outcome | Return `notCommitted`, with preserved intent semantics. | Permitted according to Cycle 011, not automatic. |
| Valid in-progress lease, no outcome | Still unknown/in progress. | Prohibited. |
| Expired/abandoned lease, no outcome | Recovery transaction investigates roots and active executor evidence. | Prohibited until it writes `NO_COMMIT`. |
| Canonical root found but outcome absent | Integrity incident; repair finalizes outcome from canonical fact. | Prohibited. |

Process memory, logs, recent activity, empty query results, client cache, and heuristics cannot prove outcome. Session expiry requires reauthentication but does not alter execution identity. Business switching hides the recovery surface while preserving Business-bound evidence. Repair uses safe correlation and audited privileged action, never raw idempotency keys.

## 17. Transaction Boundaries

Baseline isolation is PostgreSQL `READ COMMITTED` with explicit row locks, unique constraints, tenant-aware FKs, and deterministic lock order. Use `SERIALIZABLE` only for a later invariant whose predicate cannot be protected by an explicit stable serialization row without excessive locking; callers must retry the whole transaction on serialization failure. `node-postgres` must use one checked-out client for every transaction.

Lock order is: command execution; Business; acting Membership; primary aggregate root (Customer, Invitation, Membership target, Sale, Payment, Expense, Request); related rows in stable ID order; then correction/effect/projection rows. Never wait on a provider while holding a transaction.

### Transaction Matrix

| Command | Read/write set and revalidation | Serialization/isolation | Idempotency, audit, outcome, and post-commit |
| --- | --- | --- | --- |
| First-owner bootstrap | User; write Business, settings version, Owner Membership | Lock command/User; `READ COMMITTED`; all-or-nothing | Required; audit/outcome same transaction; welcome effect recorded, dispatched later. |
| Membership capability/suspend/restore/remove | Business, actor/target Memberships, active Owners; update target | Lock Business then Memberships; optimistic version | Required per transport; last Owner checked; sessions revalidate after commit. |
| Invitation create/cancel | Business, pending Invitations; write/update Invitation | Business/Invitation lock plus partial uniqueness | Required; audit/outcome; delivery effect after commit. |
| Invitation accept | Invitation, User email, Business, Membership; consume/create/restore | Lock command, Invitation, Business, Membership; one winner | Required global; audit/outcome same transaction. |
| Business deactivation | Business, active Owner/actor; update Business | Exclusive Business row serialization | Required; audit/outcome; sessions revalidate after commit. |
| Customer create/update/deactivate | Business, Customer/similarity read; write Customer | Optimistic version for update; duplicates warning only | Idempotency for deactivation; audit where required; no external effect. |
| Product create/update/deactivate | Business, Product; write Product | Optimistic version; confirmation revalidates state | Idempotency for deactivation; audit; photo effect deferred. |
| Sale confirmation | Business/Membership, Customer/Product, command; write Sale/Items and optional Payment/Allocations | Lock Customer then selected Products in stable order; checked arithmetic; `READ COMMITTED` | Required; canonical, audit, outcome, projection changes atomic; no delivery dependency. |
| Sale cancellation/replacement | Sale, Allocations, related Payments/debt; write correction, lifecycle, optional replacement plan | Lock Sale then related Payments/Allocations; stale version rejects | Required; audit/outcome/projection atomic; unknown possible after dispatch. |
| Later Payment/Allocation | Customer, eligible Sales/Allocations; write Payment/Allocations | Lock Customer then eligible Sales oldest/stable order; current debt recomputed | Required; audit/outcome/projection atomic; overpayment rejects. |
| Payment reversal/replacement | Payment, effective Allocations, affected Sales; write correction/reversals/replacement | Lock Payment then affected Sales in stable order | Required; audit/outcome/projection atomic; debt reappears. |
| Payment Request create/cancel | Customer/optional Sale, Request | Lock Request for lifecycle; no debt write | Required; audit/outcome; delivery remains separate. |
| Delivery attempt request/state change | Request, external effect/attempt | Lock Request/effect; short transactions | Required attempt identity; effect intent commit precedes provider; attempt updates auditable. |
| Expense create | Business/Membership; write Expense | Business shared lifecycle lock; checked amount/date | Required; audit/outcome/projection atomic. |
| Expense correction/cancellation | Expense; write correction/replacement/lifecycle | Lock Expense; optimistic version | Required; audit/outcome/projection atomic. |
| Idempotency acquisition | execution scope/key/fingerprint | Unique constraint plus execution-row lock | Commits claim/lease only; no domain success. |
| Outcome publication | execution plus canonical root | Same domain transaction for commit; recovery transaction for proven no-commit | One final outcome; safe replay source. |
| Projection checkpoint advancement | ordered projection changes and target rows | One Business/family checkpoint lock | Idempotent change application; never changes canonical facts. |

PostgreSQL row locks block conflicting writers/lockers until transaction end, and `READ COMMITTED` can observe a newer row after waiting. Serializable work can fail and requires complete retry. See [explicit locking](https://www.postgresql.org/docs/18/explicit-locking.html), [transaction isolation](https://www.postgresql.org/docs/18/transaction-iso.html), and [node-postgres transactions](https://node-postgres.com/features/transactions).

## 18. Concurrency Strategy

- Mutable current records expose `version bigint`; conditional transport changes compare expected version and increment on success. A stale version maps to 412/409 without leaking internals.
- Financial commands re-read aggregate state under locks even when ETag is supplied. ETag, idempotency, and authorization solve different problems.
- Business deactivation locks the Business row exclusively. Ordinary authoritative tenant commands obtain a compatible lifecycle guard and recheck active state before writing.
- Owner changes serialize on Business, then active Owner rows. This prevents two concurrent demotions/removals from each observing another Owner.
- Payment commands serialize per Customer and lock affected Sales in allocation order. A concurrent Payment sees the committed reduced debt and either allocates the remainder according to reviewed intent or rejects; it never over-allocates silently.
- Sale cancellation and Payment use the same Business/Customer/Sale lock order. One coherent plan commits; the loser reloads and rejects.
- Invitation acceptance locks the Invitation and Membership uniqueness; only one consumes it.
- Expense corrections and Payment reversals lock their original root and version; one wins.
- Duplicate commands serialize on `command_executions`; they never execute two domain transactions for the same scope/key.
- Projection consumers lock one checkpoint per Business/family and apply ordered change IDs idempotently.
- Advisory locks are not used for domain invariants. They may later coordinate one migration runner or maintenance job because they are convention-based and not referential constraints.
- Deadlock risk is controlled by deterministic ordering, short transactions, no external I/O, bounded lock sets, and whole-transaction retry for recognized deadlock/serialization errors. Retry preserves the original intent and idempotency identity.

## 19. Constraint Catalogue

| Invariant | Enforcement class | Physical enforcement and reason |
| --- | --- | --- |
| Every row has identity | Declarative | UUID PK on every table. |
| Global User email | Declarative plus application | Unique normalized email; enumeration-safe application errors. |
| Customer/Product duplicate acceptance | Declarative absence | No uniqueness on tenant name, phone, or email. |
| Tenant child belongs to parent Business | Declarative | Composite `(business_id, parent_id)` FK. |
| Positive financial values/BRL | Declarative | `CHECK` positive/non-negative as appropriate and currency equals BRL. |
| Sale/line arithmetic | Transaction plus reconciliation | Cross-row aggregates cannot be reliable row checks; recompute and compare persisted totals. |
| Anonymous/Customer Sale rules | Transaction plus row checks | Aggregate Payment condition and Customer requirement cross tables. |
| Allocation amount limits/customer match | Transaction plus FKs/checks/reconciliation | Aggregate sums and lifecycle require locked reads. |
| No overpayment/credit | Transaction plus reconciliation | Lock Customer/Sales and require fully allocated Payment within debt. |
| Last active Owner | Transactional application plus database locks | Aggregate lifecycle invariant serialized on Business. |
| One Membership per User/Business | Declarative | Unique pair; lifecycle is historical state. |
| Invitation single consumption | Declarative plus transaction | Unique Membership, Invitation lock/state/version, token digest uniqueness. |
| One current settings version | Declarative | Partial unique index on Business where `effective_to` is null. |
| One correction/reversal relation | Declarative plus transaction | Unique original terminal correction where applicable; one reversal per Allocation. |
| Financial deletion prohibition | Privilege/policy plus monitoring | Runtime role lacks delete; FKs restrict; privileged repair is audited. |
| Idempotency scope/key | Declarative | Unique scope with null Business treated as same global scope. |
| Fingerprint consistency | Transactional | Existing row digest comparison before lease/execute. |
| One final outcome | Declarative | Outcome PK/FK equals execution ID. |
| Session/challenge expiry/revocation | Declarative row checks plus application | Timestamp consistency; current-time eligibility evaluated authoritatively. |
| Projection checkpoint | Declarative | Unique `(business_id, projection_family)`; monotonic application under lock. |
| Audit append-only | Database privilege plus operational monitoring | Runtime can insert/read only; no hidden event-sourcing trigger. |

PostgreSQL does not support reliable `CHECK` constraints over other rows and recommends unique, exclusion, or foreign keys where possible. Aggregate financial/Owner rules therefore remain explicit transactions and reconciliation targets. See [PostgreSQL constraints](https://www.postgresql.org/docs/18/ddl-constraints.html).

## 20. Indexing and Query Support

Primary and unique constraints create their required indexes. Every foreign-key child receives a matching leading-column index when parent lifecycle updates/deletes or joins require it.

| Index/access path | Leading columns and predicate | Accepted query/constraint | Cost and revisit trigger |
| --- | --- | --- | --- |
| User identity | `email_normalized` unique | Registration/sign-in identity lookup | Sensitive exact lookup; revisit alternate identities. |
| Session lookup | `token_digest` unique; `(user_id, revoked_at, expires_at)` | Current session, revocation, cleanup | Digest only; review active-session volume. |
| Accessible Businesses | `(user_id, state, business_id)` on Membership | ID10/BS02 | Write cost low; supports current authorization. |
| Active Owners | `(business_id, capability_group_code, state)` | Last-Owner transaction | Revisit only if capability model changes. |
| Current settings | partial unique `(business_id)` current | BS03-BS05 | One current row; historical reads use effective date index. |
| Invitations | token digest unique; `(business_id, state, expires_at)`; pending `(business_id, intended_email_normalized, intended_group)` | TM01-TM04 | Partial predicate must match query; expiry remains transactional. |
| Customer list/search | `(business_id, search_name, id)`; `(business_id, phone_normalized)`; `(business_id, email_normalized)` | CU05, duplicate warning | Non-unique; defer trigram until measured. |
| Product list/search | `(business_id, search_name, id)` | PR04 | Non-unique; no inventory index. |
| Sales period/recent | `(business_id, operational_date desc, recorded_at desc, id desc)` | SL06/RP02/activity | Write amplification justified by core report. |
| Customer Sales/debt order | `(business_id, customer_id, operational_date, recorded_at, id)` where active | CU07/RP05/allocation | Partial predicate must match active query; reconcile on lifecycle. |
| Sale Items | unique `(business_id, sale_id, position)`; Product reference index | SL05/history | Preserves order and Product-to-history lookup. |
| Sale corrections | `(business_id, original_sale_id, created_at)` | SL05/SL08-SL09 | Append-only, low update cost. |
| Payments period | `(business_id, operational_date desc, recorded_at desc, id desc)` | PA03/RP03/daily result | Allocations excluded from receipt index. |
| Customer Payments | `(business_id, customer_id, operational_date desc, id desc)` | Customer history/debt | Nullable Customer; anonymous rows excluded when useful. |
| Allocations | `(business_id, payment_id, allocation_order)` and `(business_id, sale_id, created_at)` | PA02/SL05/debt | Required for both aggregate directions. |
| Requests | `(business_id, customer_id, created_at desc)` and `(business_id, expires_at)` active | RQ03/list/expiry | Destination not indexed plaintext. |
| Expenses | `(business_id, operational_date desc, recorded_at desc, id desc)` | EX02/RP04/daily result | Core report path. |
| Command recovery | unique scope/key; `(state, lease_expires_at)`; `(business_id, created_at desc)` | REC-G/REC-B/reaper | Digests only; retention affects size. |
| Audit/support | `(business_id, occurred_at desc, id)`; `(command_execution_id)` | Authorized activity/support | No PII indexes; access tightly scoped. |
| External effects | `(state, available_at, id)` | Post-commit dispatcher | Hot partial pending index considered after workload. |
| Delivery attempts | unique `(external_effect_id, attempt_number)`; provider correlation digest | RQ03/RQ04/reconcile | No raw provider correlation. |
| Projection changes | `(business_id, id)` and unapplied processing path | Projection advancement | Append cost; prune only after all checkpoints/retention. |
| Projection tables | tenant PK plus report-specific local date/Customer order | RP01-RP07 | Disposable; measured indexes revised independently. |

Partial indexes are used only when predicates match stable lifecycle queries; PostgreSQL requires the query predicate to imply the index predicate. See [partial indexes](https://www.postgresql.org/docs/18/indexes-partial.html) and [multicolumn indexes](https://www.postgresql.org/docs/18/indexes-multicolumn.html).

## 21. Projection Persistence

Use a staged combination:

- Canonical detail, Sales, Payments, Expenses, and small-period calculations can initially query canonical tables with the documented indexes.
- `sale_debt_projections`, `customer_debt_projections`, `daily_operational_projections`, and `recent_activity_projections` support accepted high-frequency derived reads without becoming authority.
- Each authoritative transaction appends minimal `projection_changes` after canonical facts and before commit. It does not need to update projection rows synchronously.
- `projection_checkpoints` records Business, family, model version, last applied change, applied time, state, rebuild/reconciliation evidence, and error classification.
- Projection rows store `source_through_change_id`, computed time, and model version. Responses expose canonical/projected source and freshness as Cycle 011 requires.
- Rebuild truncates/replaces only one Business/family projection under controlled ownership; canonical rows remain untouched. Reconciliation compares totals and relationships, marks stale/unavailable on mismatch, and never returns false zero.
- Cancelled Sales/Expenses, reversed Payments, deactivated entities, local dates, and historical zone context are represented according to canonical lifecycle. Allocations affect debt only; Payments affect receipts only.
- Database views/materialized views are deferred because incremental Business-scoped freshness, per-family checkpoints, and explicit unavailable/rebuild states are clearer in application-maintained tables. Revisit after measured query and refresh behavior.

## 22. Audit and Historical Preservation

`audit_events` is append-only accountability evidence, not a financial ledger, event store, log sink, or analytics table. It stores UUID, optional Business, actor User/Membership, action/outcome codes, safe target type/reference, command correlation, occurrence instant, reason code/text where accepted, origin category, and bounded allow-listed metadata.

Audit is required for bootstrap/deactivation; verification/recovery/session revocation; Invitation lifecycle; Membership/capability changes and rejected last-Owner operations; financial creation/cancellation/replacement/reversal; allocation changes; idempotency misuse/recovery; Request/delivery lifecycle; and privileged repair. Rejected security-sensitive operations are included only when their security value and retention are accepted.

Canonical correction tables explain financial effects. Audit explains who requested and authorized them. Structured logs explain runtime behavior. None substitutes for another. Audit excludes raw credentials, token/key/fingerprint values, Customer contact payloads, provider payloads, complete Sale/Payment bodies, and secrets. Runtime database grants prohibit ordinary audit update/delete; privileged repair requires separate authorization and a new audit event. Cryptographic tamper-evident chains remain deferred pending threat/legal evidence.

## 23. External Side-Effect Reliability

A transactional outbox-style boundary is required. The authoritative transaction writes `external_effects` with the canonical fact that justifies work. A dispatcher later claims eligible effects using short leases, writes `delivery_attempts`, calls the provider outside the financial transaction, and records provider-neutral result evidence.

Applicable effects are Payment Request delivery, email verification, Invitation delivery, and account recovery. Product photos, exports, analytics, and provider callbacks remain guarded or separate until accepted.

- Effect identity and deduplication digest reduce duplicate dispatch but cannot guarantee provider exactly-once delivery.
- Retry eligibility depends on canonical Request/challenge/Invitation state and prior attempt outcome.
- An uncertain provider response becomes `UNKNOWN`, not success or financial failure.
- Correlation uses safe IDs/digests; provider secrets and full payloads are not persisted in outbox/audit/logs.
- Reconciliation may inspect provider evidence later, but delivery success never records Payment.
- No queue, broker, worker framework, provider, or deployment unit is selected.

## 24. Deactivation, Cancellation, Reversal, Correction, and Deletion

| Record | Accepted lifecycle behavior | Physical/historical consequence | Query/projection consequence |
| --- | --- | --- | --- |
| User | Recovery restriction/deactivation unresolved | Preserve actor identity; anonymization legally guarded | No automatic cascade to tenant facts. |
| Business | Deactivation accepted; reactivation guarded | State/timestamp/reason; all data retained | Ordinary operations blocked; historical/export policy guarded. |
| Membership | Suspend, restore, remove | One retained relationship with lifecycle timestamps | Inactive cannot authorize; actor history remains. |
| Invitation | Consume, cancel, expire | Current state/timestamps; secret digest retained by policy then cleaned | Never authorizes until Membership active. |
| Customer | Deactivate; anonymization guarded | Contact/current profile retained/minimized by future policy | No new ordinary debt; history/debt remains. |
| Product | Deactivate; restore deferred | Current catalog state changes; Sale Item snapshots unchanged | Hidden by default; history remains. |
| Sale | Cancel or replace; descriptive correction only if non-financial | Append `sale_corrections`; original row/items remain | Cancelled excluded from ordinary totals/debt; visible historically. |
| Payment | Reverse or replace | Append correction and allocation reversals; original remains | Receipt/debt projections use effective active facts. |
| Allocation | Reverse only through accepted correction | Append one reversal; no hard delete or silent reassignment | Not a receipt; effective amount recalculated. |
| Payment Request | Cancel or expire | State/timestamps and all delivery attempts retained | Never affects debt or receipt totals. |
| Expense | Cancel or replace; descriptive correction if non-financial | Append correction; original remains | Only effective active Expense affects result. |
| Session/challenge | Revoke, consume, expire | Security evidence retained for bounded policy then eligible for cleanup | Never deletes domain/audit history. |
| Command/outcome | Finalize, expire retention later | Immutable final outcome while recoverable/referenced | Cleanup cannot break replay/recovery. |
| Projection | Mark stale/unavailable, rebuild, replace | Disposable derived rows | Canonical source remains available or report blocks. |

Ordinary runtime roles cannot hard-delete Sales, Sale Items, Payments, Allocations, financial corrections, Expenses, Payment Requests with history, audit events, or referenced command outcomes. Physical deletion is limited to approved retention cleanup for short-lived security evidence and rebuildable projections. Anonymization is not deletion and cannot sever required financial relationships.

## 25. Sensitive Data, Privacy, and Retention

| Data class | Minimum stored form and access | Retention/deletion boundary |
| --- | --- | --- |
| User email | Original plus normalized plaintext for identity; global identity access only | Duration/anonymization legally unresolved; backups included. |
| Customer contacts | Optional plaintext/original plus normalized lookup inside Business | Capability-filtered; no uniqueness; anonymization/export unresolved. |
| Customer debt/financial facts | Exact canonical rows; no duplication into audit | Financial retention unresolved; ordinary deletion prohibited. |
| Session/CSRF/pre-session evidence | Keyed digest, digest/key version, expiry/revocation | Raw bearer prohibited; bounded cleanup after security/legal need. |
| Verification/recovery/Invitation secret | Keyed digest only; attempt/expiry evidence | Raw bearer prohibited; cleanup duration unresolved. |
| Idempotency key/fingerprint | Keyed digests and canonicalization version | Must outlive realistic recovery/dispute; no logs/support disclosure. |
| Provider destination | Encrypted ciphertext, digest, masked hint | Key-management and delivery-metadata retention unresolved. |
| Provider correlation | Digest; encrypted raw only if dispute evidence requires it | Provider/legal retention unresolved; never Payment proof. |
| Audit | Safe codes/references/minimal metadata | Retention unresolved; no secret/full payload. |
| Correlation/log data | Independent opaque correlation, redacted structured fields | Operational policy unresolved; no raw record/contact/key values. |
| Financial local dates/zones | Canonical date, instant, zone | Preserved with financial history. |

Encryption at rest for database/backups is required operationally. Application-field encryption is required for delivery destinations and any provider evidence whose plaintext is not needed for ordinary querying. Exact cipher, key service, rotation, and searchable-encryption design are deployment/provider decisions. Hashing is used only where equality proof is sufficient; encryption is used where authorized recovery of the original value is required.

This specification does not claim complete LGPD compliance or invent retention periods. Support/admin access, export after deactivation, data-subject handling, backup expiry, and screenshot/analytics redaction remain separately authorized responsibilities.

## 26. Backup, Restore, Reconciliation, and Repair

- Production requires full PostgreSQL backup plus write-ahead-log retention sufficient for point-in-time recovery; provider, cadence, RPO, and RTO remain deployment decisions. PostgreSQL documents PITR from a base backup plus archived WAL in [continuous archiving](https://www.postgresql.org/docs/18/continuous-archiving.html).
- Restore validation uses an isolated environment and checks schema version, tenant-aware FKs, active Owner invariants, financial formulas, command outcomes, audit continuity, external effects, session policy, and projection rebuild.
- Canonical tables, command executions/outcomes, audit, local dates/zones, and delivery evidence are in backup scope. Projection rows may be restored but must be eligible for discard/rebuild.
- After restore, all sessions may be revoked or forced to reauthenticate according to the incident plan; the choice is operational/security policy. Idempotency evidence must not be discarded, or clients could duplicate recovered facts.
- Reconciliation recomputes Sale totals, effective Allocations, Payment allocated amount, outstanding debt, daily result, and projection values from canonical records.
- Repair is fail-closed, authorized separately from merchant operations, uses one Business scope unless a system incident requires broader scope, records before/after safe evidence, and never silently deletes history.
- Orphaned canonical roots/outcomes, stuck command leases, failed projection changes, and unknown delivery attempts have explicit repair queues or reports later; logs alone are insufficient.
- Backup custody, key custody, cross-region storage, restore authorization, disaster exercises, and objectives remain deployment/legal decisions.

## 27. Migration Strategy

- One migration history applies to the `sem_caderno` schema. A dedicated migration role owns DDL; application runtime roles cannot migrate.
- Migration files will be ordered, immutable after shared use, reviewed with the specification/ADR/task, and recorded in a schema-version table by the future runner.
- Prefer forward-only production evolution and roll-forward repair. A down migration is allowed only when it is demonstrably lossless and safe; destructive production rollback restores application compatibility or backup rather than pretending dropped data can be recreated.
- Use expand-and-contract: add nullable/new structures, deploy dual-compatible readers/writers where needed, backfill in bounded batches, verify, validate constraints, switch reads, then remove old structures in a later approved release.
- Transactional DDL is preferred. Operations that cannot run in one transaction, such as concurrent index construction, are isolated with explicit pre/post validation and restart behavior.
- Add large-table FKs/checks in a way that controls lock duration, then validate separately where PostgreSQL supports it. Every migration reviews lock level, timeout, table rewrite, disk/WAL growth, replica/backup impact, and compatibility window.
- Backfills are idempotent, Business-bounded where possible, resumable, observable without PII, and reconcile counts/totals before a constraint becomes authoritative.
- Seed only stable reference capability codes through versioned migrations. Merchant data is never seed data.
- Projection schema/model changes increment projection version and trigger controlled rebuild; canonical migrations never depend on a projection being current.
- Test environments build from zero through all migrations and test upgrades from the previous supported schema. Drift detection compares expected migration history/object catalogue to the target.
- Production evidence includes backup/restore readiness, dry-run or representative rehearsal, row counts/checksums or safe aggregates, constraint status, query plan/lock review, and rollback/roll-forward decision.
- Exact migration runner remains deferred until initial migration implementation; it must support PostgreSQL 18, one-writer locking, TypeScript/pnpm operation or a documented external runner, transactional control, and drift visibility without becoming schema authority.

## 28. Repository-Adapter Implications

- Domain/application modules depend on repository and transaction ports, never `pg`, SQL, table names, or row types.
- Every tenant repository is constructed with validated Business and authorization context; no unscoped tenant method is exported.
- One transaction context owns one checked-out node-postgres client and propagates to all repositories participating in the command. `pool.query` is not used inside a transaction.
- Canonical and projection repositories are distinct. A projection result carries source/freshness; no projection repository can perform financial mutation.
- Row mappers validate nullability/state, convert UUID/date/`bigint` explicitly, and fail closed on unexpected data. Transport Zod schemas are not row mappers.
- Queries are parameterized. Dynamic identifiers are prohibited in runtime repository input; allow-listed sort/filter fragments are static adapter code.
- Constraint names map to stable application errors; raw SQLSTATE, SQL text, constraint names, row values, or driver errors do not leave infrastructure.
- Optimistic conflict, last-Owner conflict, overpayment/allocation conflict, and tenant-reference failure have separate translation paths.
- Idempotency/recovery/audit/outbox access occurs only through application-controlled ports and transaction context.
- Test doubles prove application orchestration only. Tenant, constraints, locks, isolation, crash boundaries, and migrations require real PostgreSQL integration tests.

## 29. Validation and Testing Responsibilities

Future implementation must include:

- migration-from-zero, upgrade, drift, rollback/roll-forward, and constraint-validation tests;
- table/bootstrap and row-mapping tests against PostgreSQL 18;
- tenant-aware FK and cross-Business direct/child/aggregate denial tests;
- Customer non-unique name/phone/email tests;
- Sale arithmetic, snapshot immutability, Payment/Allocation, overpayment, no-credit, cancellation, reversal, replacement, and daily-result tests;
- first-owner bootstrap, last-Owner, Invitation acceptance, Business deactivation, and authorization-race tests;
- idempotency acquisition, identical replay, changed fingerprint, concurrent duplicate, crash-before/after commit, stale lease, no-commit proof, and recovery tests;
- session/challenge digest, rotation, revocation, expiry, and CSRF-state tests without raw-secret logging;
- projection change/checkpoint, stale/unavailable, rebuild, reconciliation, and canonical disagreement tests;
- outbox claim, duplicate dispatch, unknown delivery, retry, and Payment Request/Payment separation tests with fake providers;
- audit append-only/access/redaction and privileged repair tests;
- retention cleanup tests that prove referenced outcome/history survives;
- backup/restore exercises that recompute financial and tenant invariants;
- node-postgres transaction tests using one client and Testcontainers PostgreSQL; and transport-to-persistence contract tests for all mapped operations.

No test is implemented in this cycle.

## 30. Decision Matrices

Official technical evidence was checked on 2026-08-01. Repository semantics remain higher authority than technology defaults.

| Choice | Serious candidates | Accepted approach | Why / rejected or deferred | Risk, mitigation, revisit |
| --- | --- | --- | --- | --- |
| Schema organization | one app schema; domain schemas; schema per tenant | one `sem_caderno` schema | Lowest operational complexity; tenant schemas conflict with shared User/multi-Business access. | Large catalogue: consistent naming/modules; revisit only with ownership/scale evidence. |
| Identifier | numeric; UUIDv4; UUIDv7; ULID | PostgreSQL UUIDv7 | Opaque, global, native PG18, better insertion locality than v4; numeric enumeration and new ULID dependency rejected. | Timestamp ordering leaks coarse creation time; never authorize/order business facts. |
| State | PG enum; lookup; text/check | text/check for technical lifecycle; capability references | Avoid enum rigidity while keeping closed technical states. | Drift: named checks and mapping tests; revisit truly stable large references. |
| Money | `money`; `numeric`; `bigint` | `bigint` minor units | Matches BRL integer authority and transport strings; no locale/scale ambiguity. | Overflow: checked BigInt arithmetic and DB overflow rejection. |
| Quantity | `bigint`; scaled integer; `numeric` | positive `bigint` for accepted first journey | Fractional quantity is unresolved; no guessed scale/rounding. | Requires additive migration if validated; revisit on merchant evidence. |
| Tenant keys | global IDs/filter; composite tenant FKs; RLS only | global UUID plus repeated Business/composite FKs | Physically rejects cross-Business child links; filtering alone and RLS-only are insufficient. | More columns/indexes; standardized pattern and tests. |
| RLS | mandatory; deferred; none ever | deferred defense in depth | Existing ADR posture; pooled auth context and bypass roles need threat-tested design. | Repository omission: composite FKs/scoped APIs/tests; revisit before production security review. |
| JSONB | broad document rows; metadata only; none | narrow safe metadata only | Relational invariants remain visible; some versioned outcome/audit evidence benefits from bounded metadata. | Schema drift/PII: allow-lists, size limits, contract versions. |
| Audit | full snapshots; event sourcing; minimal event rows | append-only minimal audit table plus canonical corrections | Accountability without duplicating secrets/financial payloads or changing architecture. | Tampering: restricted role/backup; revisit cryptographic chaining after threat evidence. |
| Idempotency | key on fact; cache; execution/outcome tables | durable execution plus immutable final outcome | Supports leases, rejection, no-commit, replay, and crash recovery. | Stuck leases/retention: recovery transactions, monitoring, legal policy. |
| Projections | live only; views/MV; app tables | staged canonical queries plus app projection tables/checkpoints | Explicit per-Business freshness/rebuild and no false authority. | Write/change-log cost: measure and collapse unused projections. |
| Concurrency | optimistic only; serializable all; row locks; advisory | optimistic metadata plus invariant-specific row locks at Read Committed | Smallest explicit strategy for known aggregates; serializable-all adds retries/overhead. | Deadlocks: lock order, short work, whole-transaction retry. |
| Outbox | direct provider call; broker transaction; DB outbox | PostgreSQL external-effect intent and attempts | Preserves commit/side-effect separation without broker/distributed transaction. | Duplicate delivery: adapter idempotency/reconciliation; provider-specific rules later. |
| Migration | reversible-first; forward-only; manual drift | ordered immutable expand-contract, roll-forward default | Protects data/history and version compatibility. | Tool not selected: resolve before initial migration implementation. |
| Deletion | cascade; soft state; archive DB | lifecycle/correction state, restricted deletion | Preserves financial/audit history and tenant relationships. | Growth/retention: legal policy, partition/archive only after measured need. |

PostgreSQL evidence used: [UUID](https://www.postgresql.org/docs/18/datatype-uuid.html), [types](https://www.postgresql.org/docs/18/datatype.html), [constraints](https://www.postgresql.org/docs/18/ddl-constraints.html), [schemas](https://www.postgresql.org/docs/18/ddl-schemas.html), [RLS](https://www.postgresql.org/docs/18/ddl-rowsecurity.html), [locking](https://www.postgresql.org/docs/18/explicit-locking.html), [isolation](https://www.postgresql.org/docs/18/transaction-iso.html), [indexes](https://www.postgresql.org/docs/18/indexes.html), [ALTER TABLE](https://www.postgresql.org/docs/18/sql-altertable.html), and [PITR](https://www.postgresql.org/docs/18/continuous-archiving.html). Driver evidence: [node-postgres transactions](https://node-postgres.com/features/transactions), [queries](https://node-postgres.com/features/queries), and [types](https://node-postgres.com/features/types).

## 31. Required Physical-Model Matrices

### 31.1 Table Catalogue

Every table uses UUIDv7 `id` unless the primary key is explicitly the parent's identity. Important columns are logical physical names, not executable DDL.

| # | Table / purpose / class | Scope, key, and important columns | Relationships, constraints, lifecycle, sensitivity, and indexes | Retention |
| --- | --- | --- | --- | --- |
| 1 | `users`: global identity; canonical | Global; PK `id`; email/original-normalized, verification, lifecycle, version, timestamps | Unique normalized email; no Business access; sensitive identity index | Identity/legal policy; actor references retained |
| 2 | `businesses`: tenant root; canonical | Global root; PK `id`; lifecycle, creator, deactivation reason/time, version | PK is the tenant identity referenced as `business_id`; lifecycle check; no merchant-data cascade | Business/financial retention |
| 3 | `business_settings_versions`: effective settings; canonical | Business; PK `id`; `business_id`, name, zone, BRL, effective range, version | FK Business; unique `(business_id,id)` and partial one-current; name sensitive only as Business data | Historical settings retained |
| 4 | `capability_groups`: accepted role groups; reference | Global reference; PK `id`; stable code/display key | Unique code; seeded only when accepted; no merchant configuration | Release-reference lifetime |
| 5 | `capability_group_capabilities`: group grants; reference | Global; composite PK group/capability code | FK group; unique pair; application still revalidates | Release-reference lifetime |
| 6 | `memberships`: User-to-Business access; canonical | Business; PK `id`; Business/User/group/state, lifecycle times, version | FKs Business/User/group; unique Business/User; active-owner index; no delete cascade | Historical access retained |
| 7 | `invitations`: pending access intent; canonical | Business; PK `id`; target normalized email/group, token digest, expiry/state, actors, version | Tenant FK; unique token digest and pending intent; consume/cancel timestamps; secret digest | Policy-defined; lifecycle/audit retained |
| 8 | `customers`: current Customer profile; canonical | Business; PK `id`; name/search, optional phone/email pairs, lifecycle/version | Unique `(business_id,id)` only; contact/name deliberately non-unique; search/contact indexes | Contact policy; financial links retained |
| 9 | `products`: current catalog; canonical | Business; PK `id`; name/search, description, price, BRL, lifecycle/version | Name non-unique; positive price; no inventory/photo/SKU; search index | Product/history policy |
| 10 | `sales`: committed Sale root; canonical financial | Business; PK `id`; Customer?, actor, dates/zone, discount/adjustment/total, lifecycle/version, command | Tenant FKs; positive total/BRL; unique command; period/customer indexes | Financial history; no ordinary delete |
| 11 | `sale_items`: immutable snapshots; canonical financial | Business; PK `id`; Sale, position, Product?, description, quantity, prices/adjustments/total | Tenant FKs; unique Sale/position; positive quantity/amount; immutable runtime grants | Financial history; no ordinary delete |
| 12 | `sale_corrections`: cancellation/replacement evidence; canonical financial | Business; PK `id`; original, replacement?, kind, reason, actor, command, time | Tenant FKs; correction eligibility/uniqueness; append-only; original index | Financial/audit history |
| 13 | `payments`: one receipt fact; canonical financial | Business; PK `id`; Customer?, Request?, amount/method, dates/zone, origin, lifecycle/version, command | Tenant FKs; positive amount/BRL; unique command; date/customer indexes | Financial history; no ordinary delete |
| 14 | `payment_allocations`: Payment destination; canonical financial | Business; PK `id`; Payment, Sale, amount, order, actor/command | Tenant FKs; positive amount; unique Payment/order; Payment/Sale indexes | Financial history; no ordinary delete |
| 15 | `payment_allocation_reversals`: ineffective-allocation evidence; canonical financial | Business; PK `id`; Allocation, Payment correction, amount/time | Tenant FKs; one reversal per Allocation; append-only | Financial history |
| 16 | `payment_corrections`: reversal/replacement evidence; canonical financial | Business; PK `id`; original/replacement?, kind, reason, actor, command | Tenant FKs; unique terminal correction as applicable; append-only | Financial/audit history |
| 17 | `payment_requests`: collection request, not receipt; canonical | Business; PK `id`; Customer, Sale?, amount, destination evidence, expiry/cancellation, version, command | Tenant FKs; positive BRL; lifecycle/date/customer indexes; encrypted sensitive destination | Communication/legal policy; financial links retained |
| 18 | `expenses`: operational outflow; canonical financial | Business; PK `id`; amount, description, category?, dates/zone, lifecycle/version, command | Positive BRL; tenant/actor FKs; unique command; period index | Financial history; no ordinary delete |
| 19 | `expense_corrections`: cancel/replace evidence; canonical financial | Business; PK `id`; original/replacement?, kind, reason, actor, command | Tenant FKs; append-only; original index | Financial/audit history |
| 20 | `email_verification_challenges`: verification evidence; operational security | Global; PK `id`; User?, email digest, token digest/version, expiry/consumption/attempts | Unique token digest; no raw token; expiry index | Bounded security/legal policy |
| 21 | `account_recovery_challenges`: recovery evidence; operational security | Global; PK `id`; User?, identity digest, token digest/version, expiry/consumption/revocation | Unique token digest; generic lookup behavior | Bounded security/legal policy |
| 22 | `pre_session_challenges`: pre-auth CSRF state; operational security | Global; PK `id`; token digest/version, purpose, expiry/consumption, safe origin class | Unique digest; short-lived; no identity disclosure | Short bounded security policy |
| 23 | `sessions`: revocable server session; operational security | Global; PK `id`; User, session/CSRF digests, expiries, rotation, revocation, Business candidate, device hint, version | Unique session digest; User/active index; raw bearer prohibited | Session/security policy |
| 24 | `command_executions`: idempotency claim/lease; operational integrity | Global or Business; PK `id`; API/operation/User/Business, key digest, fingerprint/version, lease/state/times | Unique null-safe scope/key; fingerprint immutable; recovery indexes; sensitive digests | Recovery/dispute policy; referenced rows retain |
| 25 | `command_outcomes`: final command result; operational integrity | PK/FK `command_execution_id`; outcome, error/result reference, contract version, safe metadata/time | One final result; no raw request; immutable final state | At least execution/canonical retention |
| 26 | `audit_events`: accountability; operational history | Global or Business; PK `id`; actor, action/outcome, target reference, command, reason, metadata, time | Business/command indexes; append-only privileges; minimal sensitive data | Audit/legal policy |
| 27 | `external_effects`: transactional outbox intent; operational reliability | Global or Business; PK `id`; kind/target, state, available/lease times, dedupe digest, correlation | Tenant target FKs where concrete; pending dispatch index; no provider payload | Delivery/reconciliation policy |
| 28 | `delivery_attempts`: provider-neutral attempt history; operational reliability | Global or Business; PK `id`; effect, attempt number, adapter, correlation digest, state/times/error/evidence | FK effect; unique effect/attempt; Payment Request tenant link where applicable | Communication/provider policy |
| 29 | `projection_changes`: canonical-to-projection change log; operational projection | Business; PK `id`; Business, family/entity/ref, canonical version/time | Tenant FK; ordered Business index; no full payload | Until all checkpoints plus repair window |
| 30 | `projection_checkpoints`: freshness/rebuild state; operational projection | Business/family composite key; model version, last change, state/times/error | Unique Business/family; locked by consumer | Operational; rebuildable but history useful |
| 31 | `sale_debt_projections`: Sale outstanding read model; projection | Business/Sale key; Customer, total/allocated/outstanding, lifecycle, source version | Tenant key; outstanding/date indexes; no authority | Rebuildable |
| 32 | `customer_debt_projections`: Customer debt read model; projection | Business/Customer key; outstanding, oldest debt, source version/time | Tenant key; debt/name query support; no contact duplication | Rebuildable |
| 33 | `daily_operational_projections`: local-day totals; projection | Business/date key; Sales recorded, Payments received, Expenses, result, source version | Exact integer totals; separate measures; no Allocation/Request receipt | Rebuildable |
| 34 | `recent_activity_projections`: authorized activity feed; projection | Business/activity key; safe type/ref/time/actor label key, source version | Capability-filtered reads; no secret/contact/full financial payload | Rebuildable |

Count: 19 canonical/reference tables, 11 operational/security/integrity tables, and 4 projection tables; 34 proposed tables total. Credential-provider identities, Product photos, exports, provider callbacks, Customer anonymization workflows, and forced Request expiration are guarded future boundaries and have no proposed table.

### 31.2 Relationship and Tenant-Integrity Matrix

| Parent -> child | Cardinality / Business scope | FK and cross-Business prevention | Delete/lifecycle and historical implication |
| --- | --- | --- | --- |
| User -> Membership | 1:N; Membership tenant-owned | Global User FK plus Business FK; unique Business/User | User deletion restricted; inactive Membership retained. |
| Business -> settings versions | 1:N; same Business | `(business_id)` Business FK; one current partial unique | Settings close effective range, never rewrite event dates. |
| Business -> all tenant roots | 1:N | Non-null Business FK and unique `(business_id,id)` on each root | Business deactivation, not cascade delete. |
| Capability group -> Membership/grants | 1:N | Global reference FKs | Seed evolution through migration; historical code remains resolvable. |
| Invitation -> Membership acceptance | 0..1 outcome | Transaction uses Business/User uniqueness; outcome reference | Invitation consumed; Membership active; both retained. |
| Customer -> Sale | 1:N, Sale optional Customer | Composite `(business_id, customer_id)` FK | Customer deactivation does not alter Sale. |
| Customer -> Payment | 1:N, Payment optional Customer | Composite tenant FK | Null only accepted anonymous initial receipt. |
| Customer -> Payment Request | 1:N, required | Composite tenant FK | Request retained through Customer deactivation. |
| Product -> Sale Item | 1:N, optional Product | Composite tenant FK | Product changes/deactivation never modify snapshot. |
| Sale -> Sale Item | 1:N, required at commit | Composite tenant FK; unique position | Restrict delete; immutable history. |
| Sale -> Allocation | 1:N | Composite tenant FK | Cancellation must resolve/reject active allocation effects. |
| Payment -> Allocation | 1:N | Composite tenant FK | Reversal appends allocation reversals. |
| Allocation -> Allocation reversal | 1:0..1 | Composite tenant FK plus unique Allocation | Original retained; effective amount becomes zero. |
| Sale -> Sale correction/replacement | 1:N history, terminal plan constrained | Original/replacement composite tenant FKs | Original lifecycle changes; replacement is new Sale. |
| Payment -> Payment correction/replacement | 1:N history, terminal plan constrained | Original/replacement composite tenant FKs | Original retained; debt recalculates. |
| Expense -> Expense correction/replacement | 1:N history, terminal plan constrained | Original/replacement composite tenant FKs | Original retained; projection uses active replacement. |
| Payment Request -> Payment | 1:N optional explanatory link | Composite tenant FK | Request/delivery never causes Payment. |
| Payment Request -> effect/attempt | 1:N | Concrete composite tenant target plus effect FK | Attempt history retained independently of debt. |
| Command execution -> outcome | 1:0..1 | Outcome PK/FK | Absence can mean in progress/unknown, never failure. |
| Command execution -> canonical root | 1:0..N depending compound command | Unique/root FKs and typed outcome reference | Result recovery and replay; root cannot outlive evidence cleanup. |
| Canonical change -> projection change/checkpoint | 1:N / ordered per Business | Business FK and monotonic IDs | Projection disposable; canonical unchanged. |
| Business/User/Membership -> audit | 1:N | Optional direct FKs plus safe target reference | Audit append-only; deletion restricted/minimized. |

### 31.3 Application-Operation Persistence Matrix

`R` means read, `W` write, `I` idempotency required, `C` optimistic/multi-record concurrency, and `A` audit. Reserved operations remain explicitly guarded rather than receiving speculative tables.

| Cycle 011 IDs / accepted family | Canonical/operational read -> write; projection read | Transaction, idempotency, concurrency, audit, effect, and recovery |
| --- | --- | --- |
| ID00 browser bootstrap | R/W `pre_session_challenges` | Short security transaction; no domain fact; no Business. |
| ID01, ID02, ID03 registration/verification | R/W `users`, `email_verification_challenges`, `external_effects`, `audit_events` | Enumeration-safe transactions; provider credential boundary guarded; verification email post-commit. |
| ID04 authenticate | R `users` plus guarded credential adapter; W `sessions`, audit | Session rotation transaction; current Membership not cached as authority. |
| ID05 current/revalidate session | R `sessions`, `users`, `memberships`, `businesses` | Query/current auth; candidate Business only; no projection. |
| ID06, ID07 sign-out/revoke sessions | R/W `sessions`; W audit for sensitive revocation | Transactional revocation/version; session token digest lookup. |
| ID08, ID09 account recovery | R/W `account_recovery_challenges`, `users`, `sessions`, `external_effects`, audit | Guarded credential adapter; revoke sessions; recovery secret digest only. |
| ID10 accessible Businesses | R `users`, `memberships`, `businesses`, current settings | Canonical query; active only; tenant non-disclosure. |
| BS01 bootstrap | R User/command; W Business/settings/Owner Membership/outcome/audit/projection change/effect | Atomic `I`; lock User/command; REC-G. |
| BS02 active Business selection | R session/Business/Membership; W session candidate/version | Current auth transaction; selection is not authorization. |
| BS03, BS04, BS05 readiness/settings | R Business/current settings/Membership; W new settings version for BS05 | BS05 `C/A`; close old/open new version; historical event dates unchanged. |
| BS06 deactivation | R/W Business, Memberships, sessions as policy; W outcome/audit/projection changes | `I/C/A`; Business lock; REC-B; ordinary operations blocked. |
| BS07 export | No table/operation | Guarded until legal/operational contract; no speculative export job. |
| TM01, TM02 Invitation create/cancel | R/W Invitation/Business; W command outcome/audit/effect | `I/C/A`; uniqueness/row lock; delivery post-commit. |
| TM03 Invitation acceptance | R/W Invitation/Membership/Business; W outcome/audit | Atomic global `I/C/A`; one consumer; REC-G. |
| TM04, TM05 list Invitations/Memberships | R canonical tables; optional recent activity projection | Tenant/capability query; secret omitted. |
| TM06, TM07, TM08, TM09 Membership lifecycle | R/W Business/Memberships; R active Owners; W outcomes/audit | `I/C/A`; Business serialization; sessions revalidate; last Owner protected. |
| CU01 Customer create | R similar Customers; W Customer/audit as applicable | Transaction; duplicate warning non-blocking; no uniqueness. |
| CU02 inline Customer | R/W Customer inside SL03/SL04 | No independent success; inherits Sale `I/C/A/recovery`. |
| CU03, CU04 Customer update/deactivate | R/W Customer; W outcome/audit for deactivation | `C`; CU04 `I`; historical facts untouched. |
| CU05, CU06, CU07 Customer list/detail/debt | R Customer/Sales/Payments/Allocations/corrections; read debt projections when fresh | Canonical detail/debt authority; projection freshness explicit. |
| CU08 anonymize | No table/operation | Guarded legal/privacy boundary; financial IDs must survive. |
| PR01 Product create | W Product/audit as applicable | Transaction; no uniqueness/inventory. |
| PR02, PR03 Product update/deactivate | R/W Product; W outcome/audit for deactivate | `C`; PR03 `I`; Sale Items unaffected. |
| PR04, PR05 Product list/detail | R Products | Canonical/current query; deactivated filter; tenant scoped. |
| PR06 Product photo | No table/operation | Guarded workflow/provider/retention boundary. |
| SL01, SL02, SL03, SL04 Sale variants | R Business/Membership/Customer/Product/command; W Sale/Items and optional Payment/Allocations/outcome/audit/projection changes | Atomic `I/C/A`; server calculation; REC-B; unknown supported. |
| SL05, SL06 Sale detail/list | R Sales/Items/Payments/Allocations/corrections; projection lists when fresh | Canonical detail; projected list/freshness; no status authority in cache. |
| SL07 descriptive correction | R/W Sale descriptive version/evidence; W Sale correction/audit | `C/A`; no financial field mutation. |
| SL08, SL09 Sale cancel/replace | R Sale/debt/Payments/Allocations; W correction/lifecycle and optional replacement records/outcome/audit/projection changes | `I/C/A`; balanced correction plan; REC-B. |
| SL10 recovery | R command execution/outcome and Sale root | No mutation except audited stale-execution resolution; REC-B. |
| PA01 later Payment/Allocations | R Customer/debt/Sales/command; W Payment/Allocations/outcome/audit/projection changes | Atomic `I/C/A`; Customer/Sale locks; overpayment rejects; REC-B. |
| PA02, PA03 Payment detail/list | R Payments/Allocations/corrections; projected period list when fresh | Allocation not receipt; canonical detail. |
| PA04, PA05 Payment reverse/replace | R Payment/Allocations/Sales; W correction/allocation reversals/replacement/outcome/audit/projection changes | Atomic `I/C/A`; debt reappears; REC-B. |
| RQ01 Payment Request create | R Customer/optional Sale; W Request/outcome/audit | `I/A`; no debt change; delivery not implied. |
| RQ02, RQ04 delivery/retry | R Request/effects/attempts; W effect/outcome then attempts | `I/C/A`; provider call post-commit; unknown delivery distinct. |
| RQ03 status | R Request/effects/attempts | Canonical lifecycle plus operational delivery history; no Payment inference. |
| RQ05 cancel Request | R/W Request; W outcome/audit | `I/C/A`; no debt change; blocks new attempts. |
| RQ06 expire Request | R Request expiry | Derived lifecycle; no merchant mutation/table invented. |
| RQ07 provider reconcile | No callback table/operation | Guarded provider authentication/dedup/dispute boundary. |
| RQ08 verified later Payment | Same as PA01 with optional Request FK | Separate `I/C/A` financial command; Request never proves receipt. |
| EX01 Expense create | R Business/Membership/command; W Expense/outcome/audit/projection change | Atomic `I/A`; REC-B. |
| EX02 Expense read/list | R Expenses/corrections; projected period/daily when fresh | Capability-sensitive canonical/detail and projection reads. |
| EX03 descriptive correction | R/W Expense description/evidence; W audit | `C/A`; amount/date immutable. |
| EX04, EX05 replace/cancel | R Expense; W correction/replacement/lifecycle/outcome/audit/projection change | Atomic `I/C/A`; REC-B; result recalculated. |
| RP01 daily summary | R Payments/Expenses/Sales/corrections or `daily_operational_projections`/checkpoint | Query only; canonical formula; stale/unavailable explicit. |
| RP02, RP03, RP04 period reports | R canonical Sales/Payments/Expenses or fresh projections/checkpoints | Tenant/date indexes; separate measures; no double count. |
| RP05, RP06 outstanding/debt | R Sales/Allocations/reversals/corrections or debt projections/checkpoint | Canonical authority; oldest order; Request excluded. |
| RP07 recent activity | R canonical/audit-safe events or `recent_activity_projections` | Capability-filtered; recovery links omit key/PII. |
| RP08 projection status | R checkpoints/change lag/reconciliation state | No mutation; canonical disagreement blocks totals. |
| REC-G/REC-B outcome recovery | R/lock executions/outcomes and canonical roots; possibly W `NO_COMMIT`/repair audit | Same User/Business scope; only authoritative no-commit permits resubmit. |

All Cycle 007 command/query families represented by Cycle 011 IDs ID00-ID10, BS01-BS07, TM01-TM09, CU01-CU08, PR01-PR06, SL01-SL10, PA01-PA05, RQ01-RQ08, EX01-EX05, RP01-RP08, REC-G, and REC-B are covered. Guarded boundaries deliberately have no table.

### 31.4 Financial-Invariant Enforcement Matrix

| Accepted invariant | Records | Declarative enforcement | Transaction/serialization | Reconciliation, failure, recovery, and test |
| --- | --- | --- | --- | --- |
| BRL integer minor units | All financial roots/items | `bigint`, currency check, positive/non-negative checks | Checked BigInt arithmetic | Overflow/invalid rejects no commit; boundary tests. |
| Sale has items/positive total | Sale/Items | Positive row checks; item FK/position unique | Create all rows and sum in one transaction | Recompute total; mismatch blocks/repairs; atomicity tests. |
| Client total is preview | Sale/Items | None trusts DTO preview | Server recomputes before write | Recalculation conflict; transport/DB tests. |
| Anonymous only fully paid | Sale/Payment/Allocation | Nullable Customer shapes only | Verify total equals receipt/allocations and Customer null together | Reject no commit; all four Sale variants tests. |
| Partial/unpaid require Customer | Sale/Customer/Payment | Tenant Customer FK when present | Intent-specific required check under Customer lock | `CUSTOMER_REQUIRED_FOR_DEBT`; no Payment for unpaid. |
| Item snapshot survives Product edits | Item/Product | Snapshot non-null; Product FK optional | Item immutable after commit | Compare historical view after rename/deactivate. |
| Payment is receipt | Payment | Positive amount/BRL/lifecycle | Commit Payment once with outcome | Period report sums active Payments only. |
| Allocation is distribution | Allocation/Payment/Sale | Positive amount and tenant FKs | Sum limits under locks | Reports never sum Allocation as receipt. |
| Same Business/Customer allocation | Payment/Sale/Customer/Allocation | Composite tenant FKs | Customer equality including accepted null context | Invalid context rejects non-disclosing; tenant tests. |
| Selected then oldest allocation | Sales/Allocations | Stable indexes | Lock/order by local date, recorded time, ID | Compare exact destinations; ordering tests. |
| No overpayment/credit/unallocated balance | Payment/Allocation/Sales | Positive rows only | Lock Customer/Sales; require allocations equal Payment and <= debt | Reject and roll back; concurrent Payment tests. |
| Fully/partially paid state derived | Sale/Payment/Allocation/reversals | No authoritative paid-status column | Compute effective allocation | Projection reconciliation; reversal/debt tests. |
| Reversal restores debt | Payment correction/allocation reversals | One reversal per Allocation | Reverse Payment and allocations atomically | Recompute debt/report; recovered outcome test. |
| Sale cancellation preserves/balances history | Sale correction/Allocations/Payments | Original/replacement FKs | Lock and require balanced companion plan or reject | No active allocation to cancelled Sale; race tests. |
| Expense correction preserves history | Expense/correction | Original/replacement FKs | Cancel/replace atomically | Daily result uses active replacement; test +200 example. |
| Request/delivery has no debt effect | Request/effects/attempts | No FK path that creates Allocation/Payment | Separate commands/transactions | Debt before/after equal; delivery tests. |
| Daily result | Payments/Expenses/local dates | Exact types/date fields | Consistent canonical read or fresh projection | `payments - expenses`; 5000-1200=3800 test. |
| Sales recorded != Payments received | Sales/Payments | Separate tables/dates | Separate projection measures | Old debt Payment changes receipts only. |
| History not hard-deleted | Financial/correction/audit | Restricted FKs/role privileges | Authorized lifecycle commands only | Deletion attempts fail; repair audit. |
| Duplicate intent creates once | Command execution/outcome/root | Unique scope/key and root command FK | Command row lock and same-transaction final outcome | Replay original; crash-boundary tests. |
| Changed intent rejected | Command execution | Immutable fingerprint | Compare before execution | No new fact; mismatch audit/test. |
| Unknown is not failure | Execution/outcome/root | Final outcome cardinality | Recovery lock/lease protocol | No resubmit until persisted no-commit; crash tests. |
| Business-local history stable | Financial facts/settings versions | `date`, `timestamptz`, zone non-null | Derive at commit from authoritative setting/intent | Time-zone change leaves history; boundary tests. |

### 31.5 Critical-Journey Persistence Coverage

Each Cycle 008 walkthrough appears exactly once. `Proj` identifies projection impact; `Audit` identifies required or security-value evidence; `I/R` means idempotency/outcome recovery.

| # | Walkthrough | Primary records and transaction | I/R, projection, audit, lifecycle, and sensitive-data impact |
| --- | --- | --- | --- |
| 1 | Register and verify | User, verification challenge, external effect, session after auth | Secret digest only; generic lookup; security audit; no Business. |
| 2 | Create first Business | Atomic Business, settings version, Owner Membership | I/R required; audit and readiness projection change; no partial tenant. |
| 3 | Bootstrap timeout after commit | Execution/outcome references Business bootstrap roots | Recover committed result; no duplicate Business; safe correlation only. |
| 4 | Returning User, one Business | Session, Membership, Business/current settings read | No write beyond session candidate; inactive filtered; no tenant cache authority. |
| 5 | Returning User, two Businesses | User/Membership/Business read, session candidate update | Current authorization for each; no cross-Business operational data. |
| 6 | Remembered Business unavailable | Session candidate plus current Business/Membership read | Clear client context; optional security audit; no existence leak. |
| 7 | Switch Businesses | Session candidate transaction after target validation | No canonical tenant mutation; old Business data not cached/returned. |
| 8 | Membership suspended while open | Membership lifecycle/version and session revalidation | Suspension audit; no later command commit; historical actor retained. |
| 9 | Business deactivated during confirmation | Business lock/state versus command transaction | Deactivation wins or outcome recovered; no ordinary fact; audit. |
| 10 | Owner invites member | Invitation plus external effect after commit | I; audit; token digest/encrypted destination; delivery independent. |
| 11 | Invitation accepted | Invitation consumption plus Membership in one transaction | I/R global; audit; active access only after commit. |
| 12 | Invitation accepted twice | Invitation/command/Membership uniqueness and locks | One commit; replay/consumed result; no duplicate Membership. |
| 13 | Invitation email mismatch | Invitation digest/User normalized email read | Rejected outcome/audit as justified; no Business/account disclosure. |
| 14 | Last Owner removal | Business and active Owner Membership locks | Reject; audit; no lifecycle change; concurrency test. |
| 15 | Create Customer | Customer insert | Similarity read warning only; optional audit; contacts non-unique/minimal. |
| 16 | Same-name warning | Tenant-scoped Customer search | No uniqueness/no required write; no cross-Business candidates. |
| 17 | Inline Customer in Sale | Customer inserted inside Sale transaction | Inherits Sale I/R; rollback with Sale; contact minimization. |
| 18 | Create Product | Product insert | No inventory/SKU; optional audit; photo boundary guarded. |
| 19 | Rename Product after Sale | Product version update; Sale Items untouched | Audit current catalog change; historical snapshot remains. |
| 20 | Product deactivated after preparation | Product lifecycle/version rechecked during Sale | Conflict/no Sale; prepared intent outside DB preserved; audit deactivation. |
| 21 | Fully paid anonymous Sale | Atomic Sale/Items/Payment/Allocation | I/R; projections/audit; null Customers; 2500=2500, debt 0. |
| 22 | Fully paid identified Sale | Same plus Customer tenant FK | I/R; Customer history/debt projection; contacts omitted from financial rows. |
| 23 | Partial Sale | Sale/Items/Payment/Allocation with Customer | I/R; 4000-1500=2500 debt; projection/audit. |
| 24 | Unpaid Sale | Sale/Items only with Customer | I/R; no Payment/Allocation; 1800 debt projected; audit. |
| 25 | Ad hoc item | Sale Item with null Product and complete snapshot | Inherits Sale transaction/I/R; no inventory record. |
| 26 | Sale validation rejection | Execution may finalize stable rejection; no Sale roots | Prepared work stays client-side; no financial audit payload; correction allowed. |
| 27 | Duplicate Sale replay | Existing execution/outcome/Sale roots read | Mark replay; no new fact/projection/audit duplicate. |
| 28 | Same key, changed Sale items | Existing execution fingerprint mismatch | Reject/no fact; safe misuse audit; original outcome preserved. |
| 29 | Sale response timeout | Execution/outcome/root queried | Unknown until durable evidence; no new key/intent; safe correlation. |
| 30 | Committed Sale recovered | Committed outcome reconstructs Sale/Payment result | No new projection/fact; recovered audit if useful. |
| 31 | Sale remains unknown | In-progress execution/lease, no final outcome | No retry; recovery monitoring; no sensitive key in activity/support. |
| 32 | Cancel Sale | Sale correction plus balanced Payment/Allocation plan | I/R; lifecycle/projections/audit; original retained. |
| 33 | Cancellation races with Payment | Shared Sale/Customer/Allocation locks | One transaction wins; other conflict; no invalid active allocation. |
| 34 | Later Payment to one Sale | Payment and one Allocation atomic | I/R; debt/receipt projections/audit; 2500 destination once. |
| 35 | One Payment covers Sales | Payment plus ordered Allocations | I/R; 3000+500=3500, 1500 remains; receipt counted once. |
| 36 | Overpayment attempted | Locked Customer debt read; no Payment write | Rejected outcome; 1500>1200; no credit; preserve safe amount. |
| 37 | Concurrent Payments | Customer/Sale locks and current allocations | One may commit; other rejects/reviews; no over-allocation. |
| 38 | Reverse Payment | Payment correction and allocation reversals atomic | I/R; 1500 debt reappears; receipt/debt projections/audit. |
| 39 | Request delivered, not paid | Request, effect, successful attempt | Debt projections unchanged; destination minimized; delivery audit. |
| 40 | Request delivery fails | Existing Request plus failed/unknown attempt | Retry delivery I; financial outcome unaffected; provider detail redacted. |
| 41 | Verified Payment later | Separate Payment/Allocations, optional Request reference | Financial I/R; receipt once; Request status does not prove it. |
| 42 | Record Expense | Expense/outcome/audit/projection change atomic | I/R; amount 1200; capability revalidated; result decreases. |
| 43 | Correct Expense | Expense correction plus replacement 1000 atomic | I/R; original retained; result rises 200; reason/audit. |
| 44 | Old debt paid today | Payment local date today; old Sale unchanged | Today receipts +5000; today Sales unchanged; I/R/audit. |
| 45 | View daily summary | Canonical Payment/Expense/Sale or fresh daily projection | 5000-1200=3800; separate Sales; capability-filtered. |
| 46 | Projection stale | Checkpoint/change lag read | No false zero; canonical detail or wait/rebuild; operational evidence. |
| 47 | Projection disagreement | Reconciliation marks unavailable/stale | Canonical wins; projection rebuilt; integrity audit/repair. |
| 48 | Deactivate Customer with history | Customer lifecycle/version update | I where dispatched; Sales/Payments/debt remain; minimal PII. |
| 49 | Cross-tenant Customer submitted | Composite tenant lookup/FK fails before Sale commit | Non-disclosing error; suspicious audit if justified; no fact. |
| 50 | Web/mobile daily consistency | Same canonical/projection rows/checkpoint | Identical formula/freshness/capability; mobile gains no mutation. |
| 51 | Shared-device sign-out | Session row revoked and client cache cleared | Security telemetry/audit; token digest only; back data not reusable. |
| 52 | Lost mobile session revoked | Target Session revocation transaction | Audit safe device hint; all later access reauthenticates. |

Coverage method: the primary rows are numbered `1..52` and must be mechanically compared with the Cycle 008 source and Cycle 009 coverage matrix. No scenario is represented as a second primary row.

## 32. ADR Assessment

Four new durable, cross-cutting decisions require ADRs:

- [ADR 0026](../architecture/decisions/0026-shared-schema-uuidv7-tenant-aware-keys.md): one application schema, PostgreSQL UUIDv7, tenant-aware composite foreign keys, and deferred RLS.
- [ADR 0027](../architecture/decisions/0027-explicit-transactions-invariant-locking.md): `READ COMMITTED` baseline with explicit invariant-specific locks, versions, and deterministic retry.
- [ADR 0028](../architecture/decisions/0028-durable-command-execution-outcomes.md): durable execution claims and immutable command outcomes for replay and authoritative recovery.
- [ADR 0029](../architecture/decisions/0029-transactional-outbox-post-commit-effects.md): PostgreSQL transactional outbox intent and attempt history for post-commit external effects.

Projection table details, migration process, ordinary columns/indexes, and audit fields remain adequately governed by ADRs 0014/0018 and this specification; separate ADRs would add restatement without another architecture boundary.

## 33. Risks and Revisit Triggers

| Risk | Current control | Revisit trigger |
| --- | --- | --- |
| Schema drifts from domain/transport | Operation and invariant matrices; contract tests later | Table or DTO becomes business authority. |
| Cross-Business reference defect | Repeated tenant key, composite FKs, scoped repositories | Any isolation test/incident fails. |
| RLS deferral creates false confidence | Explicitly not selected; restricted roles and defense tests | Pre-production threat review finds repository/FK controls insufficient. |
| Nullable fields encode ambiguity | Intent-specific transaction checks and named null rules | Repeated invalid-state defects suggest normalized subtype tables. |
| Money overflow | `bigint`, BigInt arithmetic, overflow tests | Valid merchant amounts approach bound or aggregate overflow observed. |
| Fractional quantity uncertainty | Whole-unit `bigint` only for accepted journey | Merchant evidence requires weighed/decimal goods. |
| Text state drift | Named checks/reference mappings | Stable lifecycle makes stricter lookup/type beneficial. |
| UUIDv7 locality/visibility | Native generation; no business ordering inference | Index measurements regress or coarse timestamp exposure is harmful. |
| Too many/missing indexes | Every index mapped; query-plan tests | Write cost, table growth, or latency crosses measured target. |
| Projection mistaken for canonical | Separate repositories, checkpoint/freshness, reconciliation | UI/report bypasses freshness or disagreement handling. |
| Aggregate invariant assumed declarative | Enforcement classification and transaction matrix | New write path bypasses locks/rechecks. |
| Deadlock/serialization retry duplicates | Lock order and same idempotency identity | Deadlock rate or retry defect appears in load tests. |
| Stuck command executions | Lease/recovery/no-commit protocol | Recovery cannot classify within operational target. |
| Outcome retention too short | References and policy gate cleanup | Merchant retry/dispute exceeds configured retention. |
| History mutated in place | Correction tables and restricted privileges | Any financial UPDATE lacks companion correction evidence. |
| Allocation/Request semantic drift | Separate tables/formulas/reports | Report or provider path counts Allocation/Request as receipt. |
| Outbox duplicate delivery | Attempt identity/digest and reconciliation | Provider lacks idempotency or merchant reports duplicate harm. |
| Audit leaks PII/secrets | Allow-list metadata and restricted fields | Redaction/security review finds payload duplication. |
| Token evidence recoverable | Keyed digests only; encryption where retrieval needed | Key rotation/threat review changes requirements. |
| Destructive migration | Expand-contract, rehearsal, roll-forward | Migration requires rewrite/drop without compatibility window. |
| Restore loses outcomes/projections | Full scope plus reconciliation/rebuild | Restore exercise finds duplicate/recovery ambiguity. |
| Premature provider/deployment coupling | Guarded boundaries/no provider columns | Accepted integration needs durable provider-specific evidence. |
| PostgreSQL/node-postgres version churn | Supported minor policy and integration suite | EOL, security issue, or changed UUID/driver behavior. |

## 34. Open Questions and Deferred Choices

### 34.1 Product and Merchant-Validation Questions

- Fractional quantity scale and rounding; provisional Sale/debt/correction/reversal/replacement/role terminology; same-name warning timing; accepted Payment method codes; merchant-visible Sale/Payment numbers; SKU/barcode; durable drafts; Expense categories; Staff/Manager permissions; mobile mutations; Product photos; Request delivery; correction-date presentation; shareable summaries; Home emphasis; and debt wording.
- A fractional decision may require additive quantity representation and recalculation rules. It must not be implemented by silently changing `quantity_units` or a database default.

### 34.2 Operational, Legal, Privacy, and Security Questions

- Session/challenge/audit/idempotency/financial/communication/backup retention; User/Customer anonymization; export after deactivation; support/admin/repair access; shared/lost-device policy; reauthentication; debt-collection wording; provider disputes; Product-photo retention; screenshot/analytics redaction; and legal/fiscal summary wording.
- Encryption/key custody and rotation; backup custody; restore authorization; RPO/RTO; incident revocation; tamper-resistance expectations; security audit retention; and whether RLS is required as pre-production defense in depth.

### 34.3 Persistence Decisions Required Before Scaffolding

- Exact migration runner package, if scaffolding includes it; exact schema-history table convention; supported PostgreSQL 18 minor; and local/CI PostgreSQL provisioning.
- Exact initial workspace package names, ESM/module settings, architecture checks, and patch versions remain Cycle 010 scaffold decisions.
- Whether credential implementation is local or provider-backed must remain outside the first persistence package; no credential table should be scaffolded prematurely.

### 34.4 Choices Deferred to Migration Implementation

- Executable DDL; exact constraint/index expressions; maximum text/request sizes; canonicalization digest algorithm/key handling; migration lock mechanism; statement/lock timeouts; batch sizes; query plans; initial reference rows; and production rehearsal format.

### 34.5 Choices Deferred to Provider Integrations

- Credential verifier/provider subject storage; email/message/payment provider; destination encryption implementation; callback authentication/deduplication; provider correlation retention; Product-photo object storage; and provider dispute evidence.

### 34.6 Choices Deferred to Projection Implementation

- Projection consumer schedule/process, batch size, lag threshold, exact row payload, rebuild orchestration, canonical fallback thresholds, and whether measured workloads justify fewer/more projection tables.

### 34.7 Choices Deferred to Deployment, Backup, and Infrastructure

- Managed PostgreSQL/cloud, network/TLS/secrets, database/runtime roles, connection pool sizing, read replicas, queue/worker hosting, observability provider, backup/PITR vendor and schedule, encryption service, disaster recovery, alerting, and capacity targets.

### 34.8 Choices Deferred to Implementation

- SQL text, repository signatures, row mappers, TypeScript `bigint`/date adapters, ETag encoding, transaction helper, retry count/backoff, constraint-to-error mapping, cleanup jobs, support tools, OpenAPI/Zod source workflow, and all application/UI code.

## 35. Implementation-Sequence Implications

This specification closes the physical decisions needed to plan a first implementation slice. The dependency order is:

1. Specify the concrete workspace scaffold, package names, supported patch lock, module rules, migration runner boundary, local PostgreSQL/Testcontainers approach, and architecture gates.
2. Scaffold only those accepted boundaries.
3. Implement transport schema sources and initial migrations from the accepted contracts/model.
4. Implement transaction/repository ports and a PostgreSQL integration harness.
5. Implement identity/session mechanics after credential choice and threat review.

### Cycle 017 implementation-readiness finding

Cycle 017 did not implement the documented `sessions` table. The physical catalogue establishes the intended table, UUIDv7 key, User relationship, unique keyed session-token digest, CSRF digest evidence, expiry endpoints, revocation evidence, optional remembered Business candidate, and lookup index. It does not establish the request-scoped source of the opaque session value, digest algorithm/key handling, effective expiry returned to the application, deterministic time source, exact active-row predicate, or current-session outcome when evidence is absent, revoked, expired, attached to a disabled User, or carries an invalid Business candidate.

Those unresolved semantics affect the migration checks, query predicate, adapter input, error boundary, and integration assertions. Creating executable DDL or SQL before they are closed would turn storage defaults into product/security behavior. The first session migration and PostgreSQL adapter remain blocked; unrelated physical tables are not introduced merely to claim integration progress.

### Cycle 018 session-resolution refinement

Cycle 018 resolves the Cycle 017 blockers and narrows the first executable session row. The server edge will parse a `v1` opaque credential containing 32 CSPRNG bytes, derive a domain-separated HMAC-SHA-256 digest with a server-held key, and pass only digest version, canonical digest evidence, and one explicit evaluation instant inward. PostgreSQL stores the 32-byte digest as `bytea`; raw bearer material and the HMAC key are prohibited.

The first session migration may include only UUIDv7 `id`, digest version and unique digest, User, nullable selected-Business candidate, `created_at`, fixed absolute `expires_at`, nullable `revoked_at`, `updated_at`, and positive optimistic `version`, with the constraints and query semantics in the [Session Credential Resolution and Lifecycle Specification](session-credential-resolution-lifecycle-specification.md). Because the repository has no executable tables, ordered minimal `users` and `businesses` parent migrations are required first; their permitted fields and boundaries are defined there. Idle/last-seen state, CSRF evidence, rotation chain, device/IP/user-agent data, revocation reason/actor, and arbitrary metadata are deferred. Active resolution requires an unrevoked row, `evaluatedAt < expires_at`, and an existing User with null `disabled_at`. Zero active rows becomes anonymous; database or mapping failure remains failure. Business/Membership authorization is not part of this query.
6. Implement the first critical journey, then projections and external delivery adapters.
7. Select deployment/backup infrastructure from implemented runtime and operational evidence.

Recommended next cycle: **Cycle 013 - Workspace Scaffolding and Tooling Specification**.

Recommended task: **Task 001 - Define the Initial pnpm Workspace, Package Boundaries, Version Baseline, Migration Tooling Boundary, and Validation Gates**.

Why next: Cycles 010-012 now fix topology, stack, transport, and physical persistence. The remaining pre-scaffold decisions are concrete package/module names, compatible patches, ESM/build conventions, architecture checks, migration runner boundary, and local PostgreSQL/test harness. Stabilizing those choices prevents generated structure or tooling from becoming accidental architecture.

Explicit non-goals: no scaffold, manifest, lockfile, dependency installation, generated project, application/API/UI/repository/migration code, SQL, running database/container, provider integration, deployment, automated test implementation, product expansion, mobile mutation expansion, or commit.

### 35.1 Acceptance Criteria

- [x] Documentation-only; authoritative sources and Cycle 011 inspected.
- [x] One coherent PostgreSQL physical model, 34-table catalogue, type/identifier strategy, tenant keys, lifecycle, constraints, indexes, transactions, concurrency, migrations, backup/repair, privacy, and adapter responsibilities defined.
- [x] Money uses exact integer minor units; fractional quantity remains explicit; Customer contact/name remains non-unique.
- [x] Financial history, Sale snapshots, Payment/Allocation/Request distinctions, daily result, local dates, canonical/projection authority, and no-credit rule preserved.
- [x] Last Owner, allocation, cancellation, Invitation, deactivation, reversal, correction, duplicate, and unknown-outcome races have authoritative strategies.
- [x] Raw bearer evidence prohibited; durable outcomes, audit, outbox, projection freshness, and recovery defined.
- [x] Every Cycle 007/011 operation family, all 52 Cycle 008 walkthroughs, and accepted financial invariants mapped.
- [x] Four durable ADRs identified; guarded boundaries remain table-free.
- [x] No executable SQL, migration, code, schema source, dependency, configuration, test, provider, deployment artifact, or commit introduced.

### 35.2 Traceability

Primary repository sources are linked in Section 1. Physical decisions specialize ADRs 0005-0015, 0018, 0020, and 0023-0025 without superseding their semantics. Future implementation traceability must connect operation ID, application command/query, transport contract, table/constraint/transaction, repository adapter, test evidence, and merchant-visible state.

## 36. Cycle 019 Executable Identity and Session Foundation

Cycle 019 implements only the Cycle 018-authorized prerequisite subset of this physical model. Three UTC-ordered TypeScript migrations create `sem_caderno.users`, `sem_caderno.businesses`, and `sem_caderno.sessions` in dependency order. PostgreSQL 18 supplies UUIDv7 defaults. Named checks enforce nonblank normalized identity, accepted Business lifecycle shape, exact digest version/length, unique digest lookup, timestamp ordering, positive versions, and fixed absolute expiry. User, Business-creator, and nullable selected-Business foreign keys use restrictive deletion behavior.

The migration tool also owns `sem_caderno.schema_migrations` and `sem_caderno.schema_migration_checksums`. The reviewed wrapper uses node-pg-migrate transactional ordering, the published migration advisory-lock identity in fail-fast mode, and SHA-256 source checksums. Production environment policy, timeouts, deployment serialization, backfills, and destructive-change rehearsal remain later operational work.

`PostgresSessionResolutionAdapter` owns one parameterized statement. It receives digest version, decoded digest bytes, and explicit `evaluatedAt`; joins only the referenced usable User; and selects only User ID, absolute expiry, and nullable selected-Business context. It performs no Business/Membership authorization join, transaction, mutation, renewal, cleanup, or implicit current-time evaluation. Zero rows means no active session; query/connection/mapping failure remains failure.

Real PostgreSQL 18.4 execution proves migration-from-zero, repeated migration execution, history/checksum evidence, UUIDv7 generation, exact table inventory, digest and lifecycle constraints, foreign keys, active/revoked/expired/equal-expiry handling, disabled User, selected Business context, and fail-closed database behavior. No other table in the 34-table catalogue is implemented by Cycle 019.
