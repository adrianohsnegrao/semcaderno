# Critical Journey UX Flow Specification

## 1. Status and Metadata

Status: Accepted for planning.

Cycle: 008 - Critical Journey UX Flow Specification.

Task: 001 - Specify Merchant-Facing Screen Flow, Copy, States, and Accessibility for the Critical Journey.

Date: 2026-08-01.

Scope: documentation-only, implementation-independent UX behavior.

Implementation status: no application code, route, transport contract, physical schema, component, prototype, provider integration, visual system, or automated test is introduced by this specification.

## 2. Context

Cycles 002 through 007 define the domain, tenancy, authentication, persistence authority, critical journey, logical records, and semantic application contracts. This specification translates those accepted rules into what a merchant sees, understands, does, and can recover from on web and supporting mobile clients.

Sem Caderno replaces a notebook rather than imitating an ERP. The experience must support quick counter work, frequent interruption, shared devices, unstable connectivity, and understandable financial history without weakening authorization or financial safeguards.

## 3. Goals

- Define the information architecture and conceptual screen responsibilities for the accepted MVP.
- Make the active establishment, Customer identity, financial consequence, and authoritative result clear.
- Define end-to-end journeys for identity, onboarding, Sales, debt, Payments, Payment Requests, Expenses, reports, team access, settings, and recovery.
- Translate Cycle 007 error categories into safe Brazilian Portuguese copy and actions.
- Prevent accidental duplicate financial records and provide first-class unknown-outcome recovery.
- Define responsive web, supporting mobile, accessibility, privacy, and future usability-test obligations.
- Preserve accepted domain and application semantics without choosing implementation technology or final visual design.

## 4. Non-Goals

- No application, UI, API, persistence, provider, report, audit, idempotency, or test implementation.
- No package, dependency, workspace, framework, component library, routing, state-management, form, validation, authentication, session, ORM, queue, cache, storage, analytics, cloud, or deployment choice.
- No URL, HTTP method, status code, DTO, JSON, schema, SQL, migration, identifier, lock, or isolation-level definition.
- No high-fidelity mockup, prototype, final layout, brand color, font, icon set, spacing token, animation, or pixel-perfect breakpoint.
- No mobile Sale, Payment, Expense, correction, or full team-management expansion.
- No inventory, supplier, purchasing, accounts payable, fiscal document, bookkeeping, DRE, billing, subscription, automatic reconciliation, or other MVP expansion.
- No final legal retention, anonymization, support-access, or provider behavior.

## 5. Sources and Inherited Decisions

Authoritative sources are the product documents, ADRs 0001 through 0015, and Cycles 002 through 007 specifications. In particular:

- Business is the tenant root; an active Membership and capability are required for tenant access.
- Selected or remembered Business context is input, never authorization. Every authoritative action revalidates User, session, Business, Membership, capability, and referenced records.
- Web owns the complete operational journey. Mobile supports reports, collection assistance, product photos, Business switching, and device/session safety.
- BRL integer minor units are authoritative. Client totals are previews; the application recalculates before commit.
- Fully paid counter Sales may be anonymous. Partial and unpaid Sales require a Customer.
- Catalog and ad hoc Sale Items are supported, and committed snapshots do not change with Product edits.
- Payment is received money; Allocation explains which debt it covers; Payment Request is neither.
- Overpayment and Customer credit are excluded.
- Financial changes preserve history through cancellation, reversal, replacement, or audited descriptive correction.
- Canonical records win over stale or inconsistent projections.
- Idempotent replay, concurrency conflict, confirmed rejection, and unknown outcome have different meanings.
- External delivery happens outside financial commit and cannot prove Payment.
- Daily result is `paymentsReceivedTodayMinor - expensesTodayMinor`, not profit, DRE, or accounting.

No contradiction was found that requires changing a prior specification. Product-validation questions remain open and are labeled as provisional below.

## 6. UX Terminology

Internal terms remain precise in specifications. Merchant-facing screens use simpler terms.

| Domain concept | Preferred merchant-facing term | Alternatives | Typical use | Status | Avoid |
| --- | --- | --- | --- | --- | --- |
| Business | Estabelecimento | Negócio, loja | Global context, onboarding | Accepted | Tenant |
| Owner | Responsável pelo estabelecimento | Dono, proprietário | Team and safeguards | Provisional | Super admin |
| Manager | Gerente | Responsável | Team | Provisional; release-one exposure open | Manager as technical policy |
| Staff | Atendente | Funcionário, equipe | Team | Provisional | Operador, usuário básico |
| Membership | Acesso à equipe | Vínculo | Team and access messages | Accepted direction | Membership |
| Invitation | Convite para a equipe | Convite de acesso | Team | Accepted | Token de convite |
| Customer | Cliente | Pessoa | Customers and debt | Accepted | Devedor as identity |
| Product | Produto | Item cadastrado | Products and Sale | Accepted | SKU unless later accepted |
| Ad hoc Sale Item | Item avulso | Item sem cadastro | New Sale | Provisional | Item ad hoc |
| Sale | Venda | Anotação de venda | Sale screens and history | Provisional validation | Transação, lançamento |
| Fully paid Sale | Venda paga | Pago na hora | Sale result | Provisional | Receita liquidada |
| Partially paid Sale | Pago em parte | Venda com parte em aberto | Debt and history | Provisional | Parcialmente liquidada |
| Unpaid Sale | Venda em aberto | Venda fiada | Debt and history | Provisional | Inadimplente |
| Outstanding amount | Falta pagar | Valor em aberto | Sale and Customer debt | Accepted direction | Saldo devedor técnico |
| Debt | Quem está devendo / dívida do cliente | Fiado em aberto | Navigation and Customer | Provisional by context | Contas a receber |
| Payment | Pagamento recebido | Valor recebido | Payment and reports | Accepted | Liquidação |
| Allocation | Onde o pagamento foi usado | Vendas cobertas | Payment review | Accepted direction | Alocação |
| Payment Request | Pedido de pagamento | Lembrete de pagamento | Collection | Provisional | Cobrança automática |
| Delivery status | Situação do envio | Envio | Request details | Accepted direction | Callback, status do provider |
| Payment status | Pagamento recebido / ainda não recebido | Situação do pagamento | Request and debt | Accepted direction | Pago when only delivered |
| Expense | Saída | Despesa | Navigation and records | Provisional | Despesa operacional |
| Daily result | Quanto sobrou hoje | Resultado do dia | Home and reports | Accepted with disclaimer | Lucro, DRE |
| Cancellation | Cancelar registro | Desfazer venda | Financial correction | Provisional | Excluir |
| Correction | Corrigir registro | Ajustar | History | Provisional | Editar valor silently |
| Replacement | Novo registro corrigido | Substituição | Correction explanation | Provisional | Sobrescrever |
| Reversal | Desfazer pagamento | Estornar pagamento | Payment correction | Provisional | Apagar pagamento |
| Deactivation | Desativar | Tirar de uso | Customer, Product, Business | Accepted direction | Excluir when retained |
| Restore | Reativar acesso | Restaurar | Membership | Provisional | Undelete |
| Active Business | Estabelecimento atual | Estabelecimento selecionado | Shell | Accepted direction | Tenant ativo |
| Recorded date | Registrado em | Data do registro | History | Accepted direction | Timestamp |
| Payment date | Data do pagamento | Recebido em | Payment | Accepted direction | Data de liquidação |
| Sale total | Total da venda | Valor da venda | Sale | Accepted | Gross revenue |
| Amount received | Recebido agora | Valor pago | Sale and Payment | Accepted direction | Crédito |
| Amount still due | Falta pagar | Ficou em aberto | Review and result | Accepted direction | Recebível |
| Unknown outcome | Estamos confirmando se foi registrado | Resultado ainda não confirmado | Recovery | Accepted direction | Commit desconhecido |
| Projection stale | Valores em atualização | Resumo temporariamente desatualizado | Reports | Accepted direction | Projection stale |
| Projection unavailable | Não foi possível mostrar um valor confiável agora | Resumo indisponível | Reports | Accepted direction | Erro de projeção |

Terms marked provisional require moderated merchant testing. The interface must never expose `tenant`, `capability`, `allocation`, `projection`, `idempotency`, `canonical record`, `consistency boundary`, `command`, `query`, `provider callback`, `payload`, or `commit`.

## 7. Target Users and Operating Context

Primary users are owners, family helpers, and trusted employees of small Brazilian establishments. They may know the business through a notebook, messages, and memory rather than formal software. This is operating context, not a judgment of ability.

The experience must account for counter speed, frequent interruptions, shared workspaces, lower-resolution screens, unstable connectivity, stress around debt and end-of-day values, similar Customer names, and the need to know whether a financial action actually succeeded. Accessibility needs may be permanent, temporary, or situational, including reduced vision, limited dexterity, noise, glare, fatigue, one-handed use, or interrupted attention.

## 8. Experience Principles

- Use merchant language before system language and show the next useful action.
- Keep the current establishment and financial consequence visible.
- Separate editable preparation, review, authoritative confirmation, and committed result.
- Never show success before authoritative confirmation.
- Never invite a new financial attempt while the prior outcome is unknown.
- Explain what happened, what remains unchanged, and what the merchant can do next.
- Preserve valid entered data after correctable errors and avoid losing Sale preparation.
- Prefer recognition over memorization, especially for Customers with similar names.
- Show Customer identity clearly whenever debt is created, paid, or requested.
- Keep recorded Sale value, money received, debt, and request delivery visually and verbally distinct.
- Use progressive disclosure for uncommon, sensitive, or history-changing actions.
- Explain unavailable actions without implying that client visibility is authorization.
- Do not show technical errors, internals, provider details, or internal identifiers.
- Do not use color alone, unnecessary motion, false precision, or blame-oriented language.

## 9. Information Architecture

| Destination | User goal and information | Main actions | Capability and sensitivity | Placement | Web / mobile |
| --- | --- | --- | --- | --- | --- |
| Início | Understand today and continue work | New Sale, Customers owing, recent activity | Metrics filtered by report capability | Primary | Web; supporting mobile summary |
| Nova venda | Record a paid, partial, or unpaid Sale | Add Customer/items, review, record | `sales.record`; financial | Persistent primary action on web | Web required; mobile deferred |
| Vendas | Find Sale history and outcomes | View, filter, correct/cancel if allowed | Operational read; corrections sensitive | Primary or contextual from Home | Web; mobile history read optional |
| Clientes | Find people, debt, Sales, and Payments | Create, edit, deactivate, record Payment | `customers.manage`; contact/debt sensitive | Primary | Web; mobile debt read supported |
| Produtos | Maintain optional catalog | Create, edit, deactivate, photo intent | `products.manage`; photo private | Primary or secondary | Web; mobile photo support |
| Quem está devendo | Act on outstanding debt | Search Customer, record Payment, prepare request | Payment capability; debt sensitive | Primary | Web; mobile collection assistance/read |
| Saídas | Record and understand Expenses | Create, filter, correct/cancel | `expenses.record`; hidden from Staff by default | Primary only for allowed users | Web; mobile report-only, mutation open |
| Relatórios | Answer period questions | View Sales, Payments, Expenses, result | Operational or sensitive report capability | Primary or secondary | Web and mobile |
| Equipe | Manage who can access | Invite, change, suspend, restore, remove | `members.manage`; sensitive | Settings | Web; mobile admin deferred |
| Estabelecimento | Review settings and status | Update accepted settings, deactivate | Settings/deactivation capability | Settings | Web; mobile read/switch only |
| Minha conta | Manage identity and sessions | Sign out, recovery, revoke sessions | Global identity | Global user menu | Web and mobile |

Not every destination must be a top-level item. Frequent work gets priority: Home, New Sale, Customers/debt, and Sales. Team, establishment settings, and sensitive corrections remain contextual or under settings.

## 10. Cross-Client Responsibility Model

- Responsive web supports the full accepted operational journey.
- Supporting mobile supports authentication, Business selection, Home/report consultation, debt visibility, recent activity, Payment Request assistance, product-photo intent, and session/device safety.
- Mobile Sale, later Payment, Expense, correction, and full team administration remain deferred.
- Both clients use the same Business context, authorization, totals, statuses, dates, errors, idempotency, freshness, and privacy semantics.
- A presentation difference cannot weaken confirmation or create a different financial meaning.

## 11. Global Application Shell and Navigation

The shell always shows the current establishment by name before tenant-owned content. Users with multiple Businesses receive a clear switch action. The current User menu contains a prominent `Sair`, especially on shared devices.

Every view has a descriptive title, primary task, contextual back destination, and capability-appropriate actions. During Business switching, previous-Business data is removed before new content loads; a neutral loading state shows only the new validated Business name when safe. Browser history, stale cache, drafts, search results, and recent records from the previous Business cannot flash or remain actionable.

Expired session, lost authorization, or Business deactivation interrupts authoritative actions with a clear reason and safe next step. Connectivity degradation is visible without claiming failure. Projection freshness is shown only when it changes trust or actionability.

## 12. Entry, Authentication, and Session Flows

Registration asks only for the accepted global identity information, explains email verification, and uses generic duplicate/account guidance to avoid enumeration. Verification success continues to accessible Businesses, Invitation acceptance, or first-Business onboarding.

Sign-in uses the accepted conceptual identifier without exposing whether another identity exists. While authenticating, controls prevent repeated submission and announce progress. Success resolves Businesses. Failure preserves the identifier where safe and focuses an error summary or first invalid field.

Session revalidation is quiet when successful. Expired or revoked sessions show `Sua sessão terminou. Entre novamente para continuar.` Entered tenant work may be offered for recovery only after the same Business and permission revalidate. Current-session sign-out confirms completion and clears sensitive tenant state. Revoking other sessions explains affected devices without revealing secrets. Shared-device guidance uses `Sair deste aparelho` as a visible action. Lost-device guidance directs the User to revoke affected sessions; exact support process remains deferred.

Authentication loading and status changes use polite screen-reader announcements. Errors never include passwords, verification codes, Invitation secrets, session data, or account-existence details.

## 13. First-Business Onboarding and Readiness

The first-owner path requires a verified User, establishment name, and explicitly confirmed operational time zone. Currency is shown as `Real (R$)` and fixed for release one. The time-zone suggestion may use `America/Manaus` for the initial context but is never silently universal; merchant copy should explain it as `Horário usado para separar os dias nos relatórios`.

Before confirmation, review shows establishment name, local time context, and that the User will be its responsible Owner. The action label is `Criar estabelecimento`, not generic `Confirmar`.

During authoritative creation, repeated activation is blocked and progress is announced. If committed, Business, settings, Owner access, audit, and idempotency evidence exist together, followed by Home with `Seu estabelecimento está pronto para usar`. Customer, Product, Pix key, photos, categories, and provider setup are skippable.

If no commit is confirmed, entered information remains. If the response times out after possible commit, show the unknown-outcome pattern and search for the created Business using the same command intent. Never offer `Criar outro estabelecimento` until authoritative recovery confirms no prior commit. A post-commit welcome-message failure does not change readiness.

## 14. Returning-User and Active-Business Selection

- No accessible Business: show account-level guidance to create a Business or use a valid matching Invitation; no tenant data.
- One accessible Business: continue automatically after revalidation.
- Multiple Businesses: use a valid remembered Business after revalidation or show explicit selection with only authorized Businesses.
- Remembered Business inaccessible or inactive: discard it, clear tenant state, explain `Este estabelecimento não está disponível para seu acesso` without revealing another tenant, and offer authorized choices.
- Membership suspended or removed: stop tenant actions, clear sensitive view state, and offer another Business or sign-out.
- Capability changed: refresh visible actions and revalidate on confirmation; no stale button can authorize.
- Business deactivated: block ordinary operation and present only accepted account-level recovery paths.

Historical references to a User do not imply current access and are not shown as a way back into an inaccessible Business.

## 15. Home and Daily Operational Overview

Home answers `O que preciso fazer agora?` and `Como está o dia?` without presenting an accounting dashboard.

The accepted calculation remains:

```text
dailyResultMinor = paymentsReceivedTodayMinor - expensesTodayMinor
```

Recommended hierarchy:

1. Current establishment and Business-local date.
2. Quick action `Nova venda` for capable web users.
3. `Quanto entrou hoje`, from active Payments received today.
4. `Quanto saiu hoje`, from active Expenses today, only with permission.
5. `Quanto sobrou hoje`, calculated as received minus Expenses, only with sensitive-report permission and a note `Este valor é um resumo do dia, não é lucro.`
6. `Vendas registradas hoje`, separate from money received.
7. `Quem está devendo` and recent activity, capability-filtered.

Examples: Payments `5000` display `R$ 50,00`; Expenses `1200` display `R$ 12,00`; daily result `3800` displays `R$ 38,00`. A Sale of `3000` recorded today without Payment increases Sales recorded but not `Quanto entrou`. An Allocation never adds receipt, and a delivered Request never appears as money received.

Empty states say `Nenhum pagamento recebido hoje`, `Nenhuma saída registrada hoje`, or `Nenhuma venda registrada hoje`. Loading retains labels without stale numbers. Stale projections say `Valores em atualização` and show the last-known time only if reliable. Untrusted disagreement hides the affected total and offers `Tentar atualizar`; canonical detail may be used where available.

## 16. Customer Journeys

Customer list and search show the minimum needed to distinguish people: display name and, only when useful and authorized, a partial contact clue or debt status. Search is scoped to the active Business and does not imply uniqueness.

Create Customer requires `Nome do cliente`; `Telefone` and `E-mail` are explicitly optional. Same name, phone, or email never blocks creation by itself. A non-blocking warning may say `Já existem clientes parecidos. Confira antes de criar outro.` with actions `Ver clientes parecidos` and `Criar mesmo assim`. Warning timing remains provisional.

Customer details separate current profile from financial history. `Falta pagar` derives from canonical records; related Sales and Payments retain their original facts after profile edits. Inline creation from a Sale preserves all Sale preparation, returns the new Customer selected, and announces success.

Deactivation requires explanation: `O cliente não aparecerá nas novas vendas, mas o histórico será mantido.` It does not erase debt or history. Deactivated Customers are read-only in ordinary selection and clearly labeled in history. Future anonymization remains guarded and unspecified.

## 17. Product Journeys

Product list/search supports recognition without implying inventory. Create and update use current name, price information accepted by later contracts, and optional photo intent. Similar Products may produce a warning but not an unsupported hard uniqueness rule.

During Sale preparation, the merchant can select an active Product or `Adicionar item avulso`. Deactivated Products cannot be selected for a new committed Sale. If a Product becomes inactive after preparation, confirmation returns a conflict and preserves the line for review; automatic conversion to ad hoc is not allowed because that would change intent without explicit merchant review.

Product rename or deactivation never changes historical Sale lines. Product details explain this where relevant: `As vendas antigas continuam com o nome e o valor registrados na época.` Product photos remain optional, tenant-isolated, and minimized in lists. Inventory, suppliers, SKU, and barcode are not introduced.

## 18. Sale Preparation and Recording Journeys

`Nova venda` begins an ephemeral preparation in the active Business. Durable drafts are deferred. The view supports optional Customer selection, inline Customer creation, catalog Products, ad hoc items, integer quantity, unit price, accepted discount/adjustment, line totals, total preview, payment intent, amount received now, method, Business-local operational date, review, and abandon.

Correctable validation keeps all valid data. Leaving with unsent changes asks `Descartar esta venda?` with `Continuar preenchendo` and `Descartar venda`. Browser-refresh recovery remains an implementation question and cannot promise durable storage.

Four intents:

| Intent | Customer | Review and consequence | Authoritative result | Success copy |
| --- | --- | --- | --- | --- |
| Fully paid anonymous counter Sale | Optional and absent | Total equals received now; no debt | Sale, Items, Payment, Allocation, audit/idempotency where required | `Venda de R$ X registrada como paga.` |
| Fully paid identified Sale | Selected or inline-created | Customer named; total equals received | Same records linked to Customer | `Venda paga registrada para {cliente}.` |
| Partially paid Sale | Required | Shows total, received now, and `Falta pagar` | Sale, Items, Payment, Allocation; debt derived | `Venda registrada. Ainda faltam R$ X.` |
| Unpaid Sale | Required | Shows full amount in open debt | Sale and Items; no Payment/Allocation | `Venda registrada. Ficaram R$ X em aberto.` |

All intents allow catalog and ad hoc items. Empty, zero, negative, and overpaid values are rejected. Client totals are labeled as review values and recalculated on confirmation. If the authoritative total differs, the action does not silently commit; the merchant sees the updated values and reviews again. Product snapshots become historical facts only at commit. Payment Request delivery is never part of Sale financial atomicity.

## 19. Sale Result, Recovery, and History Journeys

Committed result is a dedicated state, not merely a disappearing form. It shows establishment, Sale total, Customer when present, paid/open status, amount received, amount still due, date, and next actions: `Nova venda`, `Ver venda`, or `Ver dívida do cliente`.

Safe replay returns the original result and says `Esta venda já tinha sido registrada. Nenhuma venda nova foi criada.` A different-intent idempotency conflict preserves the preparation but requires a newly reviewed submission. Validation rejection returns to editable preparation. Customer/Product, authorization, or financial conflict requires fresh state before another confirmation.

Unknown outcome withholds `Registrar venda` and enters authoritative recovery. Found commit displays the committed result; confirmed no-commit restores review and allows a safe same-intent retry; still unknown retains recovery entry from recent activity. Sale history visibly distinguishes active, paid, in part, open, cancelled, and replacement relationships without relying only on color.

## 20. Sale Correction and Cancellation Journeys

Correction begins from current Sale details after fresh-state read. Harmless descriptive correction is allowed only where accepted and audited. Wrong Customer, item, quantity, or amount uses cancellation and replacement, with the original retained.

The review names the Sale, reason, active Payments/Allocations, debt consequence, and replacement plan. `Cancelar venda` and `Criar venda corrigida` are explicit labels. Cancellation cannot silently move received money. If a later Payment or concurrent change makes the plan stale, reject and reload.

Successful cancellation shows `A venda foi cancelada. O histórico foi mantido.` Replacement is linked as `Registro corrigido`. Accidental cancellation is not restored in place; create a replacement where safe. Final terms for cancellation, reversal, and replacement remain provisional for merchant testing.

## 21. Later Payment and Allocation Journeys

Entry comes from Customer debt, an outstanding Sale, or `Quem está devendo`. The view identifies the Customer, total outstanding, eligible Sales ordered oldest first, selected Sale when applicable, amount received, payment method, and occurrence date.

The review says where the received amount will be used, for example: `R$ 30,00 na venda de 10/07 e R$ 5,00 na venda de 15/07.` The domain term Allocation is not required. Selected Sale is covered first; remaining amount follows oldest eligible debt for the same Business and Customer.

Example: debts are `3000` and `2000`; Payment `3500` produces `3000` to the selected/oldest Sale and `500` to the next, leaving `1500`. The interface shows `R$ 35,00 recebido` once, never again as separate allocations.

Confirmation label is `Registrar pagamento de R$ X`. Overpayment says `O valor recebido é maior do que a dívida deste cliente. O máximo que pode ser registrado agora é R$ X.` No Payment commits. Concurrent debt changes, Sale cancellation, wrong Customer/Business, or lost authorization require fresh state. Timeout enters unknown-outcome recovery; safe replay returns the original Payment result.

## 22. Payment Reversal and Correction Journeys

Entry from Payment details requires `financial.correct`. The view shows original amount, Customer, covered Sales, method, occurrence date, and current effect. A reason is required.

Review explains `Ao desfazer este pagamento, R$ X voltará a ficar em aberto.` The action is `Desfazer pagamento`, never `Excluir`. Successful reversal retains the Payment and displays the debt reappearance and report consequence. Wrong amount, Customer, or method may require a replacement Payment after reversal.

Concurrent Payment, Sale correction, or debt changes produce conflict and fresh-state reload. Unknown result uses the same financial recovery pattern. Whether reversal/correction should restate past operational summaries or appear on a current correction date remains open; the UI must not imply a settled rule.

## 23. Payment Request Journeys

The journey supports preparing a Request for a Customer, optional Sale context, amount, safe contact destination review, and delivery intent without choosing a provider.

Distinct states and copy:

- Created: `Pedido de pagamento preparado. A dívida não mudou.`
- Delivery requested/pending: `Envio em andamento. Isso ainda não confirma pagamento.`
- Delivered: `Pedido enviado. O pagamento ainda não foi confirmado.`
- Failed: `O pedido foi criado, mas não foi possível enviar. A dívida não mudou.`
- Cancelled/expired: clearly unavailable for delivery, with debt unchanged.
- Later verified Payment: shown as a separate `Pagamento recebido` operation.

Retry acts only on delivery for the same Request and respects cancellation/expiration. A provider notification is evidence requiring verification and reconciliation, never immediate proof. No Pix, WhatsApp, email, or SMS provider is selected.

## 24. Expense Journeys

Authorized Users can list, filter, read, record, correct/replace, and cancel basic Expenses. Staff has no Expense mutation or sensitive visibility by default. Record requires positive amount, Business-local occurrence date, description, and accepted category behavior.

Review names amount, date, and effect: `Esta saída será descontada de Quanto sobrou no dia.` Confirmation is `Registrar saída de R$ X`. Duplicate and unknown outcomes use idempotency/recovery. Wrong financial meaning requires cancellation and replacement; descriptive correction may be edited with audit when accepted.

Empty copy is `Nenhuma saída registrada neste período.` Historical records remain after correction. Mobile may report Expenses only when capability allows; mobile mutation remains open. Suppliers, accounts payable, receipts, and accounting are excluded.

## 25. Reporting Journeys

| Report | Question answered | Semantics and treatment | Access and mobile |
| --- | --- | --- | --- |
| Daily summary | Quanto entrou, saiu e sobrou hoje? | Payments minus Expenses; Sales separate; reversed/cancelled excluded according to canonical rules | Sensitive fields capability-filtered; mobile supported |
| Sales by period | Quanto foi vendido no período? | Active Sales by stored Business-local Sale date; not cash | Operational report; mobile optional |
| Payments by period | Quanto entrou no período? | Active Payments by occurrence date; Allocation not extra receipt | Capability-sensitive; mobile supported |
| Expenses by period | Quanto saiu no período? | Active Expenses by occurrence date; corrections preserve history | Sensitive; mobile supported where allowed |
| Outstanding Sales | Quem está devendo e quanto falta? | Active debt from Sales and effective Allocations | Debt-sensitive; mobile supported |
| Customer balance | O que este cliente ainda deve? | Sale-level history and Payments; Requests separate | Customer/debt capability; mobile supported |
| Recent activity | O que foi registrado ou corrigido? | Safe references to canonical actions | Capability-filtered; mobile supported |

Reports use Business-local periods and preserve historical time-zone context. Filters are conceptual; long lists need stable sorting and pagination without selecting mechanics. Empty, loading, stale, and unavailable states do not show misleading zeroes. A stale projection may show `Valores em atualização`; a known disagreement hides untrusted totals and offers rebuild/retry. Canonical facts remain authoritative.

Payment for old debt received today appears in today's Payments, not today's Sales. `Quanto sobrou` is never `lucro`. Export appears only for authorized scope already accepted and remains operationally deferred.

## 26. Team, Invitation, and Membership Journeys

Team view separates active/suspended/removed access from pending/expired/cancelled Invitations. Owner can invite by normalized email and intended access group, cancel pending Invitation, change capability group, suspend, restore, or remove access where allowed.

Invitation review shows establishment, intended email, access description, expiration expectation, and `Enviar convite`. Delivery failure does not invalidate a committed Invitation. Acceptance requires a matching verified email and active Business. Expired, cancelled, mismatched, already consumed, concurrent reuse, or existing-Membership conflicts receive safe messages without account enumeration.

Owner changes require fresh state. Attempting to remove/demote the last active Owner shows `Este estabelecimento precisa ter pelo menos um responsável com acesso ativo.` Concurrent Owner changes are authoritatively rechecked; the client rule is advisory only. Suspension/removal triggers session revalidation. Invitation secrets never appear in routine screens, copied support text, logs, or audit views. Manager exposure and role labels remain provisional.

## 27. Business Settings and Deactivation Journeys

Settings show current name, operational time zone, fixed BRL currency, and readiness. Time-zone help says future records use the new local day while historical dates remain as originally recorded.

Updating accepted settings requires capability, review where consequence is material, and authoritative confirmation. Deactivation is Owner/high-risk only, requires reason and explicit `Desativar estabelecimento`. Review states that ordinary operations and affected sessions will stop, while financial history remains.

Unknown deactivation outcome uses recovery; no ordinary action is re-enabled until state is known. Reactivation, export after deactivation, and permanent deletion remain deferred unless accepted elsewhere.

## 28. Form Behavior and Input Guidance

- Every field has a persistent label; placeholders are examples, never the only instruction.
- Required and optional status is explicit, with optional contact fields labeled `opcional`.
- BRL displays as `R$ 1.234,56`; storage details stay hidden. Input parsing cannot rely on binary floating-point authority.
- Dates explain establishment-local context. Recording time and occurrence date are distinguished only when useful.
- Phone/email validation checks format without claiming uniqueness.
- Quantity is integer in this journey; fractional behavior remains open.
- Unit price, discounts, and adjustments show line and Sale preview, then authoritative recalculation.
- Validate obvious local issues on blur or submission without interrupting typing; authoritative rules run on confirmation.
- Failed submission shows a summary, associates each field error programmatically, focuses the summary or first invalid field, and preserves valid values.
- Financial submit disables repeated activation while preserving status. Discarding meaningful preparation asks for confirmation.
- Durable autosave/drafts and refresh recovery are not promised until specified.
- Mobile input should request appropriate keyboards conceptually without weakening validation.

## 29. Financial Preview and Confirmation Pattern

Every financial action uses this sequence:

```text
Prepare editable intent
-> review Business, Customer, records, amounts, date, method, and consequence
-> explicitly confirm named action
-> commit in progress with duplicate activation blocked
-> committed success, confirmed rejection, conflict, or unknown outcome
-> safe next action or authoritative recovery
```

Review is visibly labeled `Revise antes de registrar`. It includes establishment, Customer when relevant, affected items/records, BRL amounts, operational date, method, debt/result consequence, and warnings. Buttons name the action: `Registrar venda`, `Registrar pagamento`, `Registrar saída`, `Cancelar venda`, or `Desfazer pagamento`; never generic `OK` or ambiguous `Confirmar`.

Preview and committed result use explicit text, not appearance alone. A conflict requires fresh state. An unknown result withholds a new intent and preserves the original command identity. Safe retry is offered only after authoritative recovery permits it.

## 30. Loading, Empty, Success, Error, Conflict, and Degraded States

The following catalogue applies to each major journey where relevant.

| State | What is shown and preserved | Allowed / withheld actions | Copy, announcement, and next step |
| --- | --- | --- | --- |
| Initial | Task purpose and current Business | Begin or navigate back | Descriptive title; focus at main heading |
| Loading | Stable structure without stale sensitive data | Cancel navigation when safe | Polite `Carregando`; avoid repeated announcements |
| Empty | Why the list is empty | Relevant create action | Plain empty message; no false error |
| Populated | Current authorized data | Capability-allowed actions | Status in text and color if used |
| Searching | Query and progress | Edit/cancel search | Polite announcement |
| No results | Search term, no inferred uniqueness | Clear search/create where allowed | `Nenhum cliente encontrado` |
| Editing | Entered values and help | Save/review/discard | No hidden destructive gesture |
| Locally invalid | Field errors, values retained | Correct fields | Error association and summary |
| Authoritatively validating | Original intent retained | No duplicate submit | `Conferindo os dados` |
| Confirming | Complete review | Named confirm/back | Focus contained if modal pattern later used |
| Committing | Frozen reviewed intent | No new financial action | Assertive once: `Registrando...` |
| Successful | Authoritative result and consequence | Safe next actions | Success announced and focus moved to result heading |
| Safe replay | Original committed result | View result; no duplicate | `Já tinha sido registrado` |
| Rejected | Confirmed no commit, specific correction | Correct/retry if safe | Preserve values; focus error |
| Capability denied | No forbidden detail | Back, switch, request help | `Você não tem acesso para fazer esta ação.` |
| Business unavailable | No tenant data | Select another/sign out | Clear tenant state |
| Session invalid | No sensitive detail | Sign in | Preserve work only after same-context revalidation |
| Conflict | Fresh-state explanation | Reload/review | No silent overwrite |
| Concurrent modification | What changed at safe level | Fetch current state | `Os valores mudaram desde que você abriu esta tela.` |
| Connectivity degraded | Offline/unstable notice | Read cached non-sensitive data only if later safe | Do not claim command failure |
| Projection stale | Last trusted status where justified | Refresh/wait | `Valores em atualização` |
| Projection unavailable | No misleading total | Retry/details if canonical read available | `Não foi possível mostrar um valor confiável agora.` |
| Delivery pending | Request exists; debt unchanged | Check status | `Envio em andamento` |
| Delivery failed | Request exists; debt unchanged | Retry delivery if eligible | Separate delivery from Payment |
| Unknown outcome | Reviewed intent and uncertainty | Recover only | Assertive explanation; commit may exist |
| Recovery in progress | Same intent being checked | Wait/leave safely | `Conferindo se foi registrado` |
| Recovered commit | Original result | View/continue | No duplicate |
| Recovered no commit | Confirmed no record | Safe same-intent retry | Explicitly says not registered |
| Deactivated record | Historical information and label | Read only or accepted reactivation | Explain retained history |
| Read-only history | Snapshot and correction links | No mutation without capability | Text status, preserved references |

### 30.1 Error Translation from Cycle 007

In the table below, `none` means the rejected action did not commit. `Prior` means an earlier authoritative result exists. `Possible` means recovery must determine whether a commit exists. Entered work is preserved only inside the same revalidated Business and authorization context.

| Application category | Proposed merchant copy | Primary / secondary action | Retry, refresh, commit, and preservation | Navigation, disclosure, and announcement |
| --- | --- | --- | --- | --- |
| Unauthenticated | `Entre na sua conta para continuar.` | `Entrar` / return | Retry after sign-in; refresh context; none; preserve non-sensitive intent conditionally | Go to sign-in; no tenant detail; assertive |
| Session invalid or revoked | `Sua sessão terminou. Entre novamente para continuar.` | `Entrar novamente` / `Sair` | Reauthenticate; fresh state required; none for rejected action; preserve only after same-context validation | Clear sensitive view; no tenant detail; assertive |
| Email not verified | `Confirme seu e-mail antes de usar o estabelecimento.` | `Ver como confirmar` / `Sair` | Retry after verification; refresh identity; none; preserve safe onboarding intent | Verification flow; avoid account/invitation detail; assertive |
| Business context required | `Escolha o estabelecimento em que você quer trabalhar.` | `Escolher estabelecimento` | Retry after selection; fresh context; none; preserve global intent only | Business selector; no resource detail; polite |
| Business unavailable or inactive | `Este estabelecimento não está disponível para operações agora.` | `Escolher outro estabelecimento` / `Sair` | Do not retry unchanged; refresh Businesses; none; clear tenant work from view | Leave tenant area; avoid ownership/existence detail; assertive |
| Membership unavailable or inactive | `Seu acesso a este estabelecimento não está ativo.` | `Escolher outro estabelecimento` / `Sair` | Retry only after access changes; refresh Membership; none; clear sensitive work | Leave tenant area; no hidden record detail; assertive |
| Capability denied | `Você não tem acesso para fazer esta ação neste estabelecimento.` | `Voltar` / seek authorized person | Not safely retryable without permission change; optional refresh; none; preserve non-sensitive view | Stay or back; omit forbidden details; assertive for blocked confirmation |
| Resource not found within authorized scope | `Não foi possível encontrar este registro neste estabelecimento.` | `Voltar para a lista` / `Pesquisar novamente` | Re-read authorized list; none; preserve unrelated input | Do not reveal another Business; polite unless confirmation blocked |
| Validation failed | Specific field copy, such as `Escolha um cliente para deixar valor em aberto.` | `Corrigir dados` | Retry after correction; refresh only if state-related; none; preserve all valid fields | Stay on form; safe field detail only; assertive summary then field associations |
| State conflict | `Este registro mudou e a ação não pode continuar com os dados antigos.` | `Ver dados atualizados` / `Cancelar` | Fresh state mandatory; new review before retry; none; preserve original intent for comparison | Stay in context; no foreign detail; assertive |
| Concurrent modification conflict | `Os valores mudaram desde que você abriu esta tela.` | `Atualizar valores` / `Cancelar` | Re-read and form a new reviewed intent; none for rejected command; preserve editable inputs | Stay in flow; no silent overwrite; assertive |
| Duplicate command safely replayed | `Este registro já tinha sido concluído. Nenhum novo registro foi criado.` | `Ver resultado` / continue | No retry needed; optional refresh; prior commit; discard duplicate form only after showing result | Navigate to original result; same scope only; polite success |
| Idempotency identity reused with different intent | `Esta tentativa não corresponde mais ao que foi revisado. Revise os dados e tente como uma nova ação.` | `Revisar dados` / `Cancelar` | Never retry changed intent under same identity; fresh review; no new commit; preserve changed preparation | Stay on review; no internal identity shown; assertive |
| Unknown prior outcome | `Ainda não sabemos se foi registrado. Confira o resultado antes de tentar novamente.` | `Conferir resultado` / leave safely | Do not create new intent; recover same identity; possible commit; preserve reviewed intent | Recovery state; no secret/reference exposure; assertive |
| Overpayment rejected | `O valor recebido é maior do que a dívida deste cliente. O máximo agora é R$ X.` | `Usar R$ X` or `Corrigir valor` | Retry after amount correction and fresh debt; none; preserve other Payment fields | Stay on Payment; authorized Customer only; assertive summary |
| Outstanding debt requires Customer | `Escolha um cliente para deixar valor em aberto.` | `Escolher cliente` / `Criar cliente` | Retry after selection; no refresh unless stale; none; preserve Sale | Return focus to Customer control; no tenant leak; assertive summary |
| Invalid allocation context | `Não foi possível usar este pagamento nas vendas escolhidas. Atualize a dívida e confira novamente.` | `Atualizar dívida` / `Cancelar` | Fresh eligible Sales required; none; preserve amount/method for new review | Payment flow; no foreign Sale detail; assertive |
| Last-active-Owner protection | `Este estabelecimento precisa ter pelo menos um responsável com acesso ativo.` | `Adicionar outro responsável` / `Voltar` | Retry only after another active Owner; refresh team; none; preserve reason only | Team view; same Business only; assertive |
| Invitation invalid | `Este convite não pode ser usado.` | `Pedir novo convite` / `Ver meus estabelecimentos` | No retry of same invitation; refresh safe account state; none | Account-level; no identity enumeration; assertive |
| Invitation expired | `Este convite venceu. Peça um novo convite para a equipe.` | `Pedir novo convite` / `Ver meus estabelecimentos` | No retry of same invitation; refresh; none | Account-level; no extra details; assertive |
| Invitation cancelled | `Este convite foi cancelado e não pode mais ser usado.` | `Pedir novo convite` / `Ver meus estabelecimentos` | No retry of same invitation; refresh; none | Account-level; no actor detail unless authorized; assertive |
| Invitation already consumed | `Este convite já foi usado. Confira os estabelecimentos disponíveis para sua conta.` | `Ver estabelecimentos` | Re-read Businesses; no new commit; preserve no secret | Account-level; do not disclose who used it; polite |
| Projection unavailable or stale | `Os valores estão em atualização.` or `Não foi possível mostrar um valor confiável agora.` | `Tentar atualizar` / view canonical details if allowed | Query retry allowed; refresh projection; no mutation; preserve filters | Stay on report; no false zero or tenant detail; polite |
| External delivery pending | `O envio está em andamento. Isso ainda não confirma pagamento.` | `Ver situação do envio` | Poll/re-read; do not duplicate delivery intent blindly; domain Request commit may exist; preserve Request | Request details; minimize recipient; polite |
| External delivery failed | `O pedido foi criado, mas não foi possível enviar. A dívida não mudou.` | `Tentar enviar novamente` / `Cancelar pedido` if eligible | Retry side effect only; refresh Request state; authoritative Request commit remains; preserve Request | Request details; no provider internals/contact excess; assertive |
| Internal failure | `Não foi possível concluir esta ação agora.` plus a safe next step based on known outcome | `Tentar novamente` only when no commit is proven, otherwise `Conferir resultado` | Retry depends on commit certainty; refresh; none or possible; preserve safe intent | Stay/recover; no internals, stack, payload, or identifier; assertive |

Error messages intentionally converge where precise wording could reveal another Business, person, Invitation owner, or forbidden record. A disabled action or local copy never replaces authoritative authorization.

## 31. Unknown-Outcome and Authoritative Recovery Pattern

Trigger: confirmation was sent, then timeout, connection interruption, app closure, or an internal result could not prove commit state.

Immediate copy:

> Ainda não sabemos se este registro foi concluído. Não tente registrar novamente agora, pois isso pode duplicar a informação. Vamos conferir o resultado.

The primary action is `Conferir resultado`; a new financial confirmation is withheld. Recovery reuses the same logical command identity and original intent.

Outcomes:

- Commit found: `Encontramos o registro. Nenhum novo registro foi criado.` Show authoritative result.
- Confirmed rejection found: explain the accepted error and return preserved intent for correction.
- No prior result found: `Confirmamos que não foi registrado.` Offer `Tentar registrar novamente` with the same reviewed intent.
- Still unknown: `Ainda não foi possível confirmar. Tente conferir novamente mais tarde.` Keep recovery entry in recent activity and do not offer a new intent.

Leaving is safe because the recovery reference remains associated with the same User/Business where applicable. Business switching clears the visible tenant state but does not discard recovery evidence; returning requires revalidation. Session expiration requires sign-in before recovery. Support guidance uses a safe, non-secret reference if later accepted. Screen readers receive one assertive announcement at uncertainty and polite updates during recovery. Mobile reports can show a subsequently recovered committed result under the same semantics.

## 32. Permission and Capability-Sensitive Behavior

- Fully available: visible and enabled after current context is loaded, still revalidated at commit.
- Visible but unavailable: use when the task is understandable and an explanation helps, such as Owner-only deactivation.
- Omitted: use when even existence or content is sensitive, such as expense totals for unauthorized Staff.
- Read-only: show historical facts only when the capability allows viewing.
- Capability removed while open: remove/disable actions, clear newly forbidden fields, and revalidate before any commit.
- Membership suspended or Business deactivated during confirmation: stop with no financial commit and clear tenant state after safe messaging.
- Owner safeguard: explain last-Owner rule, but rely on authoritative concurrency-safe validation.
- Staff: no Expenses, `Quanto sobrou`, exports, team management, settings, or financial correction by default.
- Manager: group remains defined but release-one exposure is not assumed.

Hidden or disabled actions never replace server authorization. Cross-tenant denial uses generic scoped-not-found or access language without exposing ownership.

## 33. Business Switching and Tenant-State Replacement

Switching starts from the visible current establishment. Before showing the target Business, validate it server-side. Then replace Customer/Product searches, Sale preparation, debt, Payments, Expenses, reports, recent activity, permissions, and pending local selections.

An unsent preparation belongs to its original Business and cannot cross the boundary. It may be recoverable only after returning and revalidating; durable draft persistence remains deferred. No previous-Business name, amount, image, list row, search suggestion, browser-history snapshot, or error detail may flash in the new context.

Failure to select the target leaves no target data and offers authorized choices. Remembered context is revalidated on every return. Every subsequent authoritative operation independently validates access.

## 34. Responsive Web Behavior

- Desktop prioritizes efficient keyboard entry, visible context, and comparison of items/totals without dense ERP tables.
- Tablet and small-screen web preserve task order and named confirmation, with summaries adjacent in reading order rather than visual-only side panels.
- Dense tables transform into accessible row groups or lists while retaining labels and sorting meaning.
- Financial summaries keep labels with values and never rely on position alone.
- Sale entry supports repeated lines without horizontal overflow; review remains complete before confirmation.
- Search and selection expose Customer clues without excessive personal data.
- Filters remain reachable and summarize active choices.
- Primary actions may remain persistently reachable, but cannot cover content or move unpredictably.
- Touch targets meet accepted accessibility guidance; destructive actions are separated from frequent actions.
- On-screen keyboard, orientation change, zoom, 200% text enlargement, and reflow must not hide totals, errors, or confirmation controls.
- Smaller screens use the same authorization and financial safeguards. Print is deferred.

## 35. Supporting Mobile Behavior

Required supporting responsibilities: sign-in/session safety, authorized Business selection and switching, Home summary, essential reports, Customer debt visibility, recent activity, Payment Request assistance, product-photo intent, and current/other-session revocation where accepted.

Mobile uses identical semantics for daily result, dates, freshness, permissions, errors, unknown recovered results, and sensitive data. It clears prior-Business state during switching and never treats a deep link as authorization.

Deferred: recording Sales, later Payments, Expenses, corrections, full team administration, offline authoritative mutation, and offline synchronization. Mobile does not gain these actions for parity. Product-photo and Request delivery details require later provider-specific specifications.

## 36. Accessibility Requirements

- Use semantic structure, one logical page heading, consistent heading order, landmarks, and descriptive page titles.
- Every control has a programmatic label; instructions do not rely on placeholder, color, position, shape, or gesture alone.
- Required fields, errors, help, and units are programmatically associated.
- Failed submission focuses the error summary or first invalid field; navigation focuses the main heading; closing review/confirmation restores focus to the invoking control or result.
- Loading uses polite announcements; committed success, blocking error, authorization loss, and unknown outcome use appropriately assertive but non-repeating announcements.
- Keyboard-only operation supports all web actions with visible focus, logical order, and no trap.
- Text and controls maintain sufficient contrast; status always has text. Text can resize and reflow without losing information or action.
- Touch targets follow current accepted accessibility guidance; exact sizing is deferred until a verified standard is adopted.
- Respect reduced-motion preferences and avoid motion required to understand status.
- Session timeout warnings are perceivable and allow continuation where security policy permits.
- Destructive and financial actions use named confirmation and do not depend on timed interaction.
- Currency is announced with Brazilian meaning, such as `vinte e cinco reais`, and dates include unambiguous day/month/year context where needed.
- Tables have headers and an equivalent readable list on narrow screens. Charts, if later added, require textual totals and explanations.
- Cognitive accessibility favors short sentences, stable terms, visible context, limited choices, recognition, and preserved data after errors.
- Accessibility applies to every state and walkthrough, not only completed happy paths. No conformance or certification is claimed in this planning cycle.

## 37. Content Design and Brazilian Portuguese Copy

Voice is direct, respectful, calm, specific, action-oriented, non-technical, consistent, and free of blame. Copy states whether money was received, whether a record committed, and what happens next.

| Pattern | Preferred example |
| --- | --- |
| Page title | `Nova venda`, `Quem está devendo`, `Quanto entrou hoje` |
| Field label | `Nome do cliente`, `Valor recebido`, `Data do pagamento` |
| Help | `Use um nome que ajude sua equipe a reconhecer o cliente.` |
| Empty | `Nenhuma venda registrada hoje.` |
| Review title | `Revise antes de registrar` |
| Financial action | `Registrar pagamento de R$ 35,00` |
| Destructive action | `Cancelar venda` / `Desfazer pagamento` |
| Success | `Pagamento de R$ 35,00 registrado.` |
| Validation | `Escolha um cliente para deixar valor em aberto.` |
| Conflict | `A dívida mudou desde que você abriu esta tela. Confira os valores atualizados.` |
| Unknown | `Ainda não sabemos se foi registrado. Confira o resultado antes de tentar novamente.` |
| Retry | `Conferir resultado` or `Tentar enviar novamente`, according to safe scope |
| Permission | `Você não tem acesso para fazer esta ação neste estabelecimento.` |
| Deactivated | `Este registro está desativado e foi mantido no histórico.` |
| Stale projection | `Valores em atualização. Tente atualizar em instantes.` |
| Delivery failed | `O pedido foi criado, mas o envio falhou. A dívida não mudou.` |

Avoid `Algo deu errado` without a next step, `Erro 500`, `Operação inválida`, technical idempotency/tenant/allocation/projection/commit/callback/payload language, `Pago` because a Request was delivered, `Lucro` for daily result, shame-inducing debt language, excessive exclamation, and ambiguous destructive `Confirmar`.

## 38. Sensitive-Data Presentation

- Lists return only information needed for recognition and action; full phone/email, detailed debt, Expenses, and audit context are capability-sensitive.
- Customer contact clues may be partially masked in lists and fully shown only in authorized details where justified.
- Debt and Payment Request screens avoid unnecessary Customer data and warn before copying/sharing sensitive content.
- Product photos are tenant-owned and are not public by default.
- Expense amounts and `Quanto sobrou` remain hidden from unauthorized Staff, including loading placeholders and errors.
- Invitation screens show safe state, never secret material after initial use.
- Audit-related activity uses actor/target references and safe summaries rather than raw financial or personal payloads.
- Business switching removes prior-tenant content before rendering new context.
- Shared-device and mobile views minimize sensitive data in persistent shells, notifications, recent screens, and support text.
- Errors never reveal another Business, identity existence, internal identifiers, secrets, or full payloads.
- Export, anonymization, screenshots, analytics redaction, support access, and legal retention remain unresolved operational/legal concerns.

This specification defines design controls and does not claim complete LGPD compliance.

## 39. Cross-Client Semantic Consistency

Web and mobile may present different navigation and density, but they share definitions of Business, Customer, Sale, Payment, Allocation, Request, Expense, debt, report period, daily result, status, error, idempotent replay, unknown result, projection freshness, and authorization.

Client previews never outrank authoritative outcomes. The same Business-local period and capability yield the same trusted totals. Supporting mobile does not invent mutation flows, loosen confirmation, or hide freshness/conflict meaning. Version skew must fail safely when a client cannot represent a new required semantic state.

## 40. UX Compatibility and Evolution

- Additive changes may add optional information or safe actions without changing established financial meaning.
- Changes to Sale/Payment/debt wording, confirmation consequence, error meaning, or status semantics are breaking UX changes and require traceable validation.
- Web/mobile version skew cannot convert unknown into failure, Request delivery into Payment, or stale projection into authority.
- New capability groups default to least privilege and require specification.
- New projection fields remain optional until clients can display freshness and sensitivity correctly.
- Validated terminology changes need migration guidance and usability evidence.
- In-progress confirmations and delivery attempts retain their original intent semantics through rollout.
- Accessibility regressions block acceptance of affected critical journeys.
- Deprecated journeys remain traceable so historical audit explanations retain meaning.

## 41. Examples and Journey Walkthroughs

Each row includes the required goal; actor/capability and active Business; entry/preconditions; shown information and action; review/authoritative operation; state/result/recovery; financial and Business consequences; privacy/accessibility; client responsibility; and future test obligation. `Web` means complete responsibility; `mobile support` means read, report, collection, photo, Business, or session responsibility only.

| # | Scenario and context | Experience and authoritative outcome | Recovery, consequences, accessibility, clients, and test |
| --- | --- | --- | --- |
| 1 | Register and verify: new User, global context, registration entry, valid email. | Show minimal identity, verification guidance, progress; establish identity and verification evidence. | Generic safe errors; no tenant/secret data; focus/announce status; web/mobile; test enumeration and verification. |
| 2 | Create first Business: verified User, no Business, bootstrap entry. | Show name/time zone/BRL and Owner review; `Criar estabelecimento`; atomic bootstrap. | Success enters Home; no partial tenant; announce result; web required, mobile onboarding optional; test readiness/atomicity. |
| 3 | Bootstrap timeout after commit: same User/intent. | Show unknown state, disable new creation, recover same command. | Found Business opens it; no duplicate; safe reference only; announce recovery; web/mobile semantics; test timeout replay. |
| 4 | Returning User with one Business: active Membership. | Revalidate and continue automatically; show establishment before data. | If invalid, clear state; no financial effect; focus Home; both clients; test single-Business continuation. |
| 5 | Returning User with two Businesses: active Memberships. | Show authorized names or valid remembered choice; User selects. | Revalidate; no cross-tenant detail; accessible selector; both clients; test multi-Business selection. |
| 6 | Remembered Business unavailable: stale context. | Do not render old data; explain unavailable and list authorized options. | Clear tenant state; no existence leakage; assertive notice; both; test invalidation. |
| 7 | Switch Businesses: active in A and B. | Confirm/select B, clear A state, load B under validation. | Draft stays tied to A; no flash; focus new heading; both; test previous-tenant clearing/history. |
| 8 | Membership suspended while view open. | Remove actions and sensitive data; next query/command rejects. | Offer another Business/sign-out; no commit; assertive access notice; both; test live revocation. |
| 9 | Business deactivated during confirmation. | In-progress action revalidates and rejects; no success. | Clear ordinary tenant actions; preserve safe intent only for explanation; both; test no commit/deactivation. |
| 10 | Owner invites member: `members.manage`. | Show email/access/expiry review; create Invitation, then delivery status. | Delivery failure retries only sending; secret hidden; web; mobile admin deferred; test invitation/audit. |
| 11 | Invitation accepted: matching verified User, active Business. | Show establishment/access; accept authoritatively; active Membership result. | Continue after Business validation; announce; web/mobile entry; test acceptance. |
| 12 | Invitation accepted twice concurrently. | One acceptance commits; second sees already used/safe replay. | Re-read Businesses; no duplicate Membership; no other-user detail; test concurrency. |
| 13 | Invitation email mismatch. | Show `Este convite não pode ser usado com esta conta.`; no target details. | Sign in with matching identity/request new invite; no commit; high-priority error; both; test mismatch. |
| 14 | Last Owner removal attempted: Owner/team view. | Review role/access; authoritative rule rejects. | Explain another active responsible Owner is needed; no access change; web; test concurrent last-Owner safeguard. |
| 15 | Create Customer: `customers.manage`, active Business. | Name required, contacts optional; review only if warning; create. | Preserve fields on error; minimal list data; focus success; web; mobile read support; test optional contacts. |
| 16 | Same-name warning. | Show similar Customer clues and non-blocking `Criar mesmo assim`. | Merchant chooses existing or proceeds; no uniqueness claim; accessible warning; web; test timing/comprehension. |
| 17 | Inline Customer in Sale. | Preserve Sale, collect minimal Customer, return selected. | On failure return with Sale intact; no cross-tenant data; focus Customer summary; web; test context preservation. |
| 18 | Create Product: `products.manage`. | Name/current commercial info, optional photo intent; create. | Similar warning non-blocking; no inventory; web, mobile photo support; test catalog. |
| 19 | Rename Product after Sale. | Current Product changes; Sale history keeps snapshot. | Historical view explains original name; no financial change; both reads; test snapshot comprehension. |
| 20 | Product deactivated after Sale preparation. | Confirmation revalidates and conflicts; line preserved for review. | Reselect or explicitly create reviewed ad hoc intent; no silent conversion; web; test stale Product. |
| 21 | Fully paid anonymous Sale: `sales.record`. | Items, total `2500`/R$ 25,00, received `2500`, no Customer; review and record Sale+Payment+Allocation. | Success paid; replay no duplicate; announce amount; web; test atomic anonymous case. |
| 22 | Fully paid identified Sale. | Customer shown with items/total/received; commit linked records. | Success names Customer; debt `0`; protect contacts; web; test identified atomic case. |
| 23 | Partial Sale. | Customer required; total `4000`, received `1500`, open `2500`; named review. | Commit Sale+Payment+Allocation; show R$ 25,00 open; web; test arithmetic/customer requirement. |
| 24 | Unpaid Sale. | Customer required; total `1800`, received `0`; review full open amount. | Commit Sale/Items only; no Payment; show debt; web; test no invented receipt. |
| 25 | Ad hoc item. | `Item avulso`, description, integer quantity, price; snapshot preview. | Commit snapshot without Product; no inventory; web; test ad hoc rules. |
| 26 | Sale validation fails. | Show field summary, retain preparation, focus first error; no commit. | Correct and review again; no audit payload; web; test preservation/accessibility. |
| 27 | Duplicate Sale safely replayed. | Return original result: `já tinha sido registrada`. | No new Sale/Payment; result focus; web; test idempotent replay. |
| 28 | Same Sale identity, changed items. | Reject changed intent and show fresh review requirement. | Use new reviewed command only; preserve draft; audit safe correlation; web; test different-intent rejection. |
| 29 | Sale timeout after possible commit. | Enter unknown state; withhold `Registrar venda`; recover same intent. | No duplicate; no failure claim; assertive uncertainty; web; test interrupted response. |
| 30 | Committed Sale recovered. | Recovery finds original Sale and shows authoritative result. | Continue to details/new Sale; financial facts unchanged; announce found result; both history; test rediscovery. |
| 31 | Sale remains unknown. | Show recovery pending and recent-activity entry. | Retry recovery later, not new Sale; safe support reference; both semantics; test persistent uncertainty. |
| 32 | Cancel Sale: `financial.correct`. | Show Sale, reason, Payments/debt impact; `Cancelar venda`. | Commit cancellation plan or conflict; history retained; web; test audit/replacement. |
| 33 | Cancellation races with later Payment. | Authoritative boundary lets one commit; other gets fresh-state conflict. | Reload Sale/debt; no active allocation to cancelled Sale; announce conflict; web; test race. |
| 34 | Later Payment to one Sale. | Customer/Sale debt `2500`, amount/date/method; review destination; record Payment+Allocation. | Success reduces debt once; replay safe; web; mobile mutation deferred; test allocation. |
| 35 | One Payment covers multiple Sales. | Debts `3000` and `2000`, Payment `3500`; review R$ 30,00 + R$ 5,00. | Leaves `1500`; receipt shown once; web; test ordering/no double count. |
| 36 | Overpayment attempted. | Debt `1200`, entered `1500`; explain maximum before commit. | No Payment; retain editable amount; focus error; web; test no credit. |
| 37 | Concurrent Payments target same debt. | Preview becomes stale; one commits, other conflicts/recalculates. | Reload debt and review new intent; no over-allocation; web; test concurrency. |
| 38 | Reverse Payment: correction capability. | Show original `1500`, covered Sales, reason, debt reappearance; `Desfazer pagamento`. | Commit reversal; R$ 15,00 debt returns; history retained; web; test reports/debt. |
| 39 | Request delivered without Payment. | Show Customer/amount, `Pedido enviado`, and `Pagamento ainda não recebido`. | Debt unchanged; mobile/web collection support; announce delivery separately; test no debt effect. |
| 40 | Request delivery fails after creation. | Show Request exists, sending failed, debt unchanged. | Retry delivery only; no financial rollback; minimal contact; both support; test side-effect failure. |
| 41 | Verified Payment recorded later. | Enter separate Payment journey from Customer debt; review and commit. | Request may reference outcome but does not cause it; report receipt once; web; test separation. |
| 42 | Record Expense: authorized Owner/Manager. | Amount `1200`, date, description; review daily-result effect; record. | Success reduces result by R$ 12,00; Staff hidden; web; test permission/idempotency. |
| 43 | Correct Expense. | Original `1200`, replacement `1000`, reason; cancel/replace. | Daily result increases `200`/R$ 2,00; history retained; web; test correction. |
| 44 | Old debt paid today. | Sale date old, Payment `5000` today; Payment review/commit. | Today's `Quanto entrou` +R$ 50,00; today's Sales unchanged; both reports; test date distinction. |
| 45 | View daily summary. | Authorized Business/day; show Payments `5000`, Expenses `1200`, result `3800`, Sales separate. | R$ 50,00 - R$ 12,00 = R$ 38,00; not profit; accessible labels; both; test comprehension. |
| 46 | Projection stale. | Show `Valores em atualização`, freshness context, no false zero. | Refresh/wait or canonical details; no mutation; polite announcement; both; test stale handling. |
| 47 | Projection disagrees. | Hide untrusted total; explain reliable value unavailable; initiate reconciliation. | Canonical records win; no misleading report; both; test rebuild/block. |
| 48 | Deactivate Customer with history. | Explain no new selection and retained Sales/Payments; confirm named action. | Profile deactivated, history/debt retained; minimal PII; web; mobile read; test preservation. |
| 49 | Cross-tenant Customer identity submitted. | Resolve only in active Business; generic not-found/access message. | No record/commit, no existence leak; focus valid selection; both contracts; test IDOR defense. |
| 50 | Web/mobile daily-result consistency. | Same Business/day/capability sees same Payments, Expenses, result, freshness. | Presentation may differ, semantics cannot; accessible equivalents; test cross-client totals. |
| 51 | Shared-device sign-out. | Visible `Sair deste aparelho`; end session and clear tenant data. | Return to sign-in, no sensitive back-navigation content; both; test session clearing. |
| 52 | Lost mobile session revoked. | User selects affected session/device from accepted security flow. | Revoke/revalidate mobile; no tenant data afterward; safe device clues; web/mobile; test revocation. |

## 42. Future Acceptance, Accessibility, and Usability-Test Targets

Future tests must cover:

- Navigation comprehension, current-Business visibility, switching, previous-tenant clearing, single-Business continuation, multi-Business selection, and remembered-Business invalidation.
- Session expiration, shared-device sign-out, lost-device revocation, Membership suspension, capability change, and Business deactivation during confirmation.
- First-Business onboarding, readiness, duplicate protection, timeout, unknown outcome, and result rediscovery.
- Customer creation, optional/non-unique contacts, same-name warning, inline creation, preserved Sale context, search, and deactivation history.
- Product search, ad hoc items, snapshot comprehension, rename/deactivation conflict, and inventory exclusion.
- Anonymous/identified fully paid, partial, and unpaid Sale journeys; Customer requirement; preview arithmetic; server-authoritative recalculation; review; confirmation; duplicate prevention; safe replay; changed-intent rejection; unknown result; and rediscovery.
- Later Payment destination comprehension, selected/oldest ordering, multi-Sale split, overpayment, concurrent conflict, reversal, Sale cancellation race, Request-versus-Payment distinction, and external-delivery retry.
- Expense permission, recording, correction, cancellation, and daily-result effect.
- Daily-result formula and comprehension; Sales-versus-Payments; Allocation and Request exclusion; old-debt Payment date; stale/unavailable/disagreeing projections.
- Invitation expiration/cancellation/replay/mismatch/concurrency, last-Owner protection, capability-sensitive visibility, and non-leaking errors.
- Form-state preservation, error recovery, keyboard-only use, screen-reader navigation, focus management, labels, error/unknown-outcome announcements, text resize/reflow, contrast, non-color status, touch targets, reduced motion, and responsive list/table alternatives.
- Mobile report semantic consistency, supporting scope boundaries, sensitive-field filtering, tenant deep-link denial, and Business switching.
- Plain-language comprehension, provisional terminology, low-digital-literacy moderated sessions, financial-action confidence, accidental duplicate prevention, and ability to distinguish recorded, received, sent, failed, and still unknown.

These are future obligations. No automated test, accessibility audit, usability session, device QA, or conformance certification occurs in this cycle.

## 43. Rejected or Deferred Alternatives

Rejected now:

- ERP-style navigation or accounting terminology.
- Product catalog or Customer setup as a universal first-Sale prerequisite.
- Client totals, cached capability, selected Business, or projection as authority.
- Generic financial confirmation and success before authoritative result.
- Treating timeout as failure, enabling a new intent during unknown outcome, or treating delivery as Payment.
- Hard-delete correction, mobile parity, offline financial mutation, inventory, and provider-specific UX.
- High-fidelity design or implementation component inventory in this cycle.

Deferred:

- Durable Sale drafts, browser persistence, print/share summaries, final mobile mutation scope, product-photo workflow, Payment Request channel flow, exact role/payment/status labels, fractional quantity, SKU/barcode, Sale/Payment numbering, and correction-date presentation.
- Physical UI, transport, persistence, provider, session, idempotency, audit, projection, observability, and deployment mechanisms.

## 44. Open Questions

### Product and Merchant-Validation Questions

- Integer versus fractional quantities.
- Final terms for Sale; paid, partly paid, unpaid; debt; cancellation, correction, replacement, reversal; and role names.
- Same-name Customer warning timing and identifying clues.
- Initial payment-method labels.
- Tenant-visible Sale and Payment numbering.
- Product SKU or barcode.
- Durable Sale drafts and browser-refresh recovery.
- Whether every financial command needs an explicit review or only the accepted high-risk set.
- Expense category as free text or controlled labels.
- Staff Expense permission and access to portions of daily result.
- Manager exposure in release one.
- Mobile Sale, later-Payment, and Expense recording.
- Product-photo and Payment Request delivery workflows.
- Historical correction-date presentation.
- Printed/shareable Sale summaries.
- Whether Home emphasizes cash received, Sales recorded, debt, or the proposed balanced combination.
- Whether internal and Customer-facing debt language should differ.

### Operational and Legal-Validation Questions

- Retention periods; User/Customer anonymization; financial-history retention; and export after Business deactivation.
- Support/admin access, shared-device session duration, lost-device handling, and long-term rejected-operation audit.
- Audit, idempotency, communication metadata, Product Photo, screenshot, analytics, and backup retention/redaction/custody.
- Restore authorization, RPO, RTO, and provider-callback disputes.
- Legal review for debt-collection communication, contact-data visibility, and any fiscal/legal Sale-summary wording.
- Accessibility validation process and target standard/version before implementation acceptance.

### Intentionally Deferred Implementation Choices

- Programming language; application, frontend, and mobile frameworks; design system; components; routes; state, form, and validation libraries.
- Authentication provider, session storage, API protocol, HTTP mapping, DTOs, serialization, and versioning mechanism.
- Physical schema, identifier, ORM/query layer, repositories, idempotency/audit storage, transactions, locking, RLS, cache, projection storage, queue/outbox, and workers.
- External providers, object storage, analytics, cloud, deployment, observability, offline sync, push notifications, and concrete browser persistence.
- Visual tokens, fonts, colors, icons, high-fidelity layouts, exact breakpoints, animation implementation, and concrete accessibility tooling.

## 45. Acceptance Criteria

- [x] Cycle remains documentation-only and preserves authoritative domain/application contracts and MVP scope.
- [x] Target merchant, operating context, clarity principles, and low-training requirements are explicit.
- [x] Information architecture, screen responsibilities, navigation, Business visibility, and tenant-state replacement are defined without final layouts.
- [x] Web owns the complete journey; mobile remains supporting with identical semantics.
- [x] Identity, session, onboarding, bootstrap recovery, returning User, and Business-selection journeys are explicit.
- [x] Home and daily overview distinguish Sales, Payments, Allocations, Requests, Expenses, debt, and daily result.
- [x] Customer and Product journeys preserve optional/non-unique contacts, same-name Customers, ad hoc items, snapshots, and inventory exclusion.
- [x] Fully paid anonymous/identified, partial, and unpaid Sale journeys and Customer requirements are explicit.
- [x] Preview, authoritative recalculation, review, confirmation, duplicate replay, changed-intent rejection, conflict, and unknown recovery are distinct.
- [x] Sale correction/cancellation, later Payment/Allocation, reversal, Request, Expense, report, team, and settings journeys preserve accepted history and permissions.
- [x] Error categories, retry safety, state preservation, and authoritative recovery are translated into merchant-facing behavior.
- [x] Loading, empty, success, rejection, conflict, degraded, stale, unavailable, and historical states are documented.
- [x] Capability-sensitive presentation does not replace authorization or leak cross-tenant existence.
- [x] Responsive web, accessibility, focus, announcements, keyboard, screen-reader, text reflow, touch, motion, and non-color requirements are explicit.
- [x] Brazilian Portuguese terminology/copy is documented and provisional terms remain visibly open.
- [x] Sensitive-data minimization, shared/lost-device risks, cross-client consistency, and UX evolution are explicit.
- [x] All 52 required walkthroughs and future UX/accessibility/usability tests are documented.
- [x] Open questions are separated from decisions and exactly one next cycle is recommended.
- [x] No framework, component, route, protocol, DTO, schema, SQL, migration, ORM, provider, prototype, UI/test implementation, or scaffold is introduced.
- [x] No commit is created.

## 46. Traceability

Product sources:

- [Product Vision](../product/vision.md)
- [MVP Scope](../product/mvp-scope.md)
- [Personas](../product/personas.md)
- [UX Principles](../product/ux-principles.md)

Specifications:

- [Domain and Tenancy](domain-and-tenancy.md)
- [Authentication and Business Onboarding](authentication-and-business-onboarding.md)
- [Data Persistence and Tenant Enforcement](data-persistence-and-tenant-enforcement.md)
- [First Critical User Journey](first-critical-user-journey.md)
- [Logical Data Model](logical-data-model.md)
- [Application Contracts](application-contracts.md)

Architecture, quality, security, and tracking:

- [Architecture Baseline](../architecture/architecture.md)
- [Domain Model Baseline](../architecture/domain-model.md)
- [ADR Index](../architecture/decisions/README.md)
- [Privacy and LGPD](../security/privacy-and-lgpd.md)
- [Test Strategy](../quality/test-strategy.md)
- [Tasks](../tasks.md)

Related ADRs: ADRs 0001 through 0015. No new architectural decision is required by this cycle; the UX rules apply existing accepted boundaries.

Future implementation must trace product requirement -> domain/application contract -> this UX behavior -> future interaction/transport/physical specification -> implementation -> validation evidence.

## 47. Recommended Follow-up Specification

Recommended next cycle: Cycle 009 - Low-Fidelity Interaction and Screen-State Specification.

Recommended task: Task 001 - Define Low-Fidelity Screen Structures, Interaction Sequences, and State Transitions for the Web Critical Journey.

Objective: turn this behavioral UX contract into reviewable low-fidelity screen structures and state-transition artifacts for the responsive web journey, while preserving accessibility, copy, authorization, financial confirmation, and unknown-outcome rules.

Why next: Cycle 008 defines what every journey and state must mean, but merchant review will benefit from concrete low-fidelity structures before transport mapping, technology selection, or physical persistence. This is the smallest next abstraction that can validate navigation, information hierarchy, copy, and financial confidence without starting implementation.

Explicit non-goals: no high-fidelity visual design, final branding, component library, framework, code, clickable prototype, routes, transport API, DTOs, physical schema, migrations, provider integration, automated tests, mobile scope expansion, or MVP expansion.
