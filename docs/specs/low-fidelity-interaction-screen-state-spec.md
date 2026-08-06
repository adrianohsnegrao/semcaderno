# Low-Fidelity Interaction and Screen-State Specification

## Status and Metadata

Status: Accepted for planning.

Cycle: 009 - Low-Fidelity Interaction and Screen-State Specification.

Task: 001 - Define Low-Fidelity Screen Structures, Interaction Sequences, and State Transitions for the Web Critical Journey.

Date: 2026-08-01.

Scope: documentation-only, framework-independent low-fidelity interaction behavior.

Implementation status: no application code, UI code, prototype, framework, component, route, transport contract, persistence structure, provider integration, visual system, or automated test is introduced by this specification.

## 1. Purpose, Audience, and Authority

This specification turns the accepted behavioral UX contract from [Critical Journey UX Flow Specification](critical-journey-ux-flow.md) into low-fidelity structures that can be reviewed with merchants before implementation. It defines conceptual surfaces, content order, actions, navigation, interaction sequences, state transitions, responsive responsibilities, accessibility annotations, and preservation rules. It does not define final geometry or appearance.

The primary audience is small-business owners and trusted staff who may work at a counter, experience frequent interruptions, share devices, use lower-resolution screens, encounter unstable connectivity, and need immediate confidence about money and debt. These conditions describe the work environment rather than user ability.

Authority order:

1. Accepted ADRs and domain specifications define tenancy, identity, authorization, money, history, dates, and financial invariants.
2. [Application Contracts Specification](application-contracts.md) defines authoritative commands, queries, errors, idempotency, and unknown outcomes.
3. [Critical Journey UX Flow Specification](critical-journey-ux-flow.md) defines merchant-facing meaning, copy direction, accessibility, and client responsibility.
4. This document arranges those accepted behaviors into testable low-fidelity surfaces and transitions.

If a low-fidelity structure conflicts with an earlier authority, the earlier accepted rule wins. This document does not decide framework components, routes, APIs, persistence, providers, pixel dimensions, exact breakpoints, typography, color, icons, animation, high-fidelity layout, or new mobile mutation scope.

## 2. Interaction Principles

- Keep the current establishment visible before tenant-owned content and actions.
- Prefer recognition: show Customer clues, selected records, dates, and amounts instead of requiring memorized identifiers.
- Present one clear primary action at each decision point; secondary actions must not compete with it.
- Keep Sale value, received money, remaining debt, Request delivery, and daily result verbally distinct.
- Separate preparation, review, authoritative confirmation, committing, and result surfaces.
- Recalculate financial facts authoritatively; client arithmetic remains labeled as preview.
- Preserve entered work after correctable validation, session interruption, or conflict when the same Business and authorization can be safely revalidated.
- Block duplicate activation while a financial command is validating or committing.
- Treat unknown outcome as uncertainty, not failure; withhold a new financial intent until recovery resolves the prior one.
- Use calm, specific errors with a safe next action and no cross-tenant existence disclosure.
- Make status understandable through text and structure, never color alone.
- Keep the frequent path short without hiding financial consequences or weakening confirmation on smaller screens.
- Keep web as the complete operational client and mobile as supporting only.

## 3. Global Application Frame

### 3.1 Conceptual Reading Order

Every tenant-owned surface follows this conceptual order unless a global identity flow makes Business context inapplicable:

```text
1. Page identity and current establishment
2. Session, access, connectivity, freshness, or interruption notice
3. Primary task information
4. Editable content or authorized read content
5. Financial or consequence summary
6. Primary action, then secondary actions
7. Related history or contextual navigation
8. Polite or assertive status-announcement region
```

This is reading order, not a grid or component prescription.

### 3.2 Frame Responsibilities

| Region | Responsibility | Withheld or replaced behavior | Accessibility and privacy |
| --- | --- | --- | --- |
| Page identity | Descriptive title and task scope | Never use a generic title such as `Detalhes` without subject | Main heading receives focus after navigation |
| Active Business | Show `Estabelecimento atual: {nome}` and switch entry when authorized | No previous-Business value may remain during switching | Programmatically associated with tenant-owned main content |
| Global navigation | Expose frequent authorized destinations | Sensitive destinations may be omitted; hidden controls do not authorize | Landmarked, keyboard operable, stable order |
| User/session access | Show current identity context and visible `Sair` | No session secret or excessive identity detail | Accessible name identifies current-device versus all-device action |
| Interruption notices | Explain session, Membership, Business, connectivity, or projection state | Do not render stale sensitive content behind a blocking notice | Status priority matches impact; no repeated announcements |
| Main content | Present one task or question | Previous tenant content is removed before new content loads | Main landmark; logical headings and focus order |
| Supporting actions | Back, cancel, help, related records | Destructive actions separated from routine navigation | Named actions; no icon-only ambiguity |

### 3.3 Responsive Responsibilities

- Desktop may keep navigation and task context simultaneously visible, but reading order remains linear and keyboard-efficient.
- Tablet may collapse navigation or move secondary information after the main task, but current Business and primary action remain discoverable.
- Mobile browser uses a single reading flow, replaces wide tables with labeled records, and keeps financial review complete. It does not gain native-mobile or unsupported mutation scope.
- No viewport may hide Business context, financial consequence, error summary, unknown-outcome state, or safe exit.

## 4. Screen Inventory and Responsibility Map

The inventory uses `Global` when no tenant context is required. Capability names are conceptual and remain server-authoritative. Common states are defined in Section 6; each row lists the states that materially change the surface.

### 4.1 Identity, Session, and Business Surfaces

| Surface | Goal, entry, context, capability | Ordered information and editable content | Actions, exit, and key states | Client, privacy, and accessibility |
| --- | --- | --- | --- | --- |
| Registration | Establish User identity; public entry; Global | Title, purpose, normalized email and accepted identity inputs, verification explanation | Primary `Criar conta`; sign-in secondary; loading, invalid, generic rejection, success | Web/mobile; avoid enumeration; labels, error summary, focus first error |
| Email verification | Verify identity; registration/invitation continuation; Global | Destination explanation, verification state, resend boundary | `Continuar` after verified; resend if accepted; pending, expired, success | Web/mobile; no secret display; status announced |
| Sign-in | Authenticate returning User; Global | Identifier, accepted credential concept, recovery entry | `Entrar`; registration/recovery secondary; loading, rejection, session success | Web/mobile; generic errors; focus and keyboard complete |
| Session expired | Restore valid session; interruption from any surface; Global until revalidated | Reason, preservation limitation, current-device context | `Entrar novamente`; sign-out secondary; session invalid | Both; no tenant detail; assertive announcement |
| First-Business onboarding | Create first tenant; verified User/no Business | Name, time zone explanation, BRL, Owner consequence, review | `Criar estabelecimento`; back/cancel; invalid, committing, unknown, success | Web required; mobile optional; no duplicate; heading/focus/status |
| Business selection | Enter one authorized Business; after sign-in/switch | Authorized Business names and safe status | Select one; sign-out; loading, empty, unavailable | Both; no inaccessible Business detail; keyboard list |
| Business switch | Replace tenant context; global frame | Current Business, target authorized Businesses, discard/preserve explanation | `Trocar estabelecimento`; cancel; validating, unavailable, success | Both; remove previous data first; focus new page title |
| Session/device security | End/revoke sessions; account area | Current device, safe device clues, consequence | `Sair deste aparelho`, revoke affected session; success/conflict | Both; minimal device data; destructive action named |

### 4.2 Home, Customer, and Product Surfaces

| Surface | Goal, entry, context, capability | Ordered information and editable content | Actions, exit, and key states | Client, privacy, and accessibility |
| --- | --- | --- | --- | --- |
| Home/daily overview | Start work and understand today; post-selection | Business/date, quick action, Payments, Expenses/result if allowed, Sales, debt, activity | `Nova venda` on web; report/debt links; loading, empty, stale, unavailable | Web complete/mobile read; hide sensitive metrics entirely; labeled values |
| Customer list/search | Find Customer; navigation/Sale/Payment | Search, minimal identity clues, debt clue if authorized, status | Open/create; clear search; empty/searching/no results/deactivated | Web; mobile debt read; no uniqueness claim; results announced |
| Customer creation | Create recognizable Customer; list or inline Sale | Name required; phone/email optional; similar-Customer warning | `Criar cliente`; cancel returns origin; invalid/warning/success | Web; preserve origin; minimal PII; field associations |
| Customer details | Understand profile/debt/history | Name/contact by capability, status, outstanding total, Sales, Payments, Requests | Record Payment/request, edit/deactivate; loading/stale/historical | Web/mobile read; minimize contacts; headings for sections |
| Customer edit/deactivation | Update profile or stop new use | Current profile, retained-history explanation, reason if required | `Salvar alterações` or `Desativar cliente`; cancel | Web; no financial-history deletion; named confirmation |
| Customer debt | Understand and act on open debt | Customer identity, total, eligible Sales oldest first, Requests separate | `Registrar pagamento`, prepare Request, open Sale | Web/mobile read; debt sensitive; list/table alternative |
| Product list/search | Find optional catalog item | Search, name, current price clue, active status, optional photo | Open/create/select in Sale; empty/search/no results | Web; mobile photo support; no inventory fields |
| Product creation | Add catalog Product | Name, accepted price concept, optional photo intent | `Criar produto`; cancel to origin; invalid/warning/success | Web; photo provider deferred; labels and error focus |
| Product details/edit/deactivation | Maintain current Product | Current data, historical-snapshot explanation, active status | Save/deactivate; photo intent; conflict/historical | Web/mobile photo support; no historical rewrite; status text |

### 4.3 Sale and Payment Surfaces

| Surface | Goal, entry, context, capability | Ordered information and editable content | Actions, exit, and key states | Client, privacy, and accessibility |
| --- | --- | --- | --- | --- |
| Sale preparation | Build Sale intent; Home/navigation | Business, Customer, items, quantities, unit values, adjustments, payment intent/date, preview totals | `Revisar venda`; discard/return; editing/invalid/conflict | Web only; preserve work; keyboard row order and summary labels |
| Inline Customer creation | Add required Customer without leaving Sale | Sale context summary, minimal Customer fields, similar records | `Criar e usar cliente`; cancel returns Sale; invalid/warning/success | Web; no Sale loss; focus returns to selected Customer |
| Sale review | Understand exact intended consequence | Business, Customer, item snapshots, preview and authoritative recalculation, received/open amounts, date/method | `Registrar venda de R$ X`; `Voltar e editar`; conflict | Web; no generic confirm; review heading and amount pronunciation |
| Sale commit progress | Wait for authoritative result | Frozen reviewed intent, progress, no editable fields | No duplicate action; safe leave only as specified; committing/unknown | Web; assertive once; do not imply success |
| Sale result | Confirm committed outcome | Business, Sale total, Customer, received, open amount, date, status | New Sale/details/debt; safe replay uses same surface | Web; mobile history read; focus result heading |
| Unknown Sale outcome | Resolve uncertain commit | Original reviewed summary, uncertainty, recovery status | `Conferir resultado`; no new Sale intent | Web; mobile may later show result; assertive then polite updates |
| Sale details | Explain committed history | Snapshots, Customer, Payment/Allocation effect in merchant language, lifecycle, related corrections | Debt, correction/cancellation if allowed | Web/mobile history read; historical status text |
| Sale cancellation/correction | Preserve history while fixing | Current Sale, reason, Payment/debt effects, replacement relation | `Cancelar venda`; create corrected Sale after accepted result | Web; correction capability; conflict/unknown; no delete language |
| Later Payment preparation | Record money received | Customer, debt, selected/eligible Sales, amount, method, date | `Revisar pagamento`; cancel; invalid/stale/overpayment | Web only; mobile mutation deferred; preserve fields |
| Allocation preview | Explain destination of Payment | Received amount once, selected Sale first, oldest eligible next, remaining debt | Continue review/back; no direct cash duplication | Web; use `Onde o pagamento será usado`; accessible grouped list |
| Later Payment review | Confirm receipt and destination | Business, Customer, amount, date/method, covered Sales, remaining debt | `Registrar pagamento de R$ X`; edit | Web; named action; conflict and unknown transitions |
| Later Payment result | Confirm Payment | Payment amount once, covered Sales, remaining Customer debt, report date | Details/debt/new Payment where eligible | Web/mobile report read; no Allocation as receipt |
| Payment details | Explain receipt/history | Amount, Customer, method/date, covered Sales, reversal status | Reverse/correct if authorized; related Sale/Customer | Web/mobile read; sensitive values capability-filtered |
| Payment reversal/correction | Reverse without deleting | Original Payment, affected Sales, debt reappearance, reason, date semantics notice | `Desfazer pagamento`; back; conflict/unknown/success | Web; financial correction only; assertive consequence |

### 4.4 Request, Expense, Report, Team, and Settings Surfaces

| Surface | Goal, entry, context, capability | Ordered information and editable content | Actions, exit, and key states | Client, privacy, and accessibility |
| --- | --- | --- | --- | --- |
| Payment Request preparation | Prepare collection request | Customer, optional Sale, amount, safe destination clue, debt unchanged notice | `Criar pedido de pagamento`; cancel | Web/mobile support; no provider choice; contact minimized |
| Payment Request details | Understand request versus Payment | Request amount/context, delivery state, `Pagamento ainda não recebido`, related Payment if later | Request delivery/cancel; record separate Payment on web | Both; never label paid from delivery |
| Request delivery status/retry | Track post-commit delivery | Pending/sent/failed, debt unchanged, attempt time where safe | `Tentar enviar novamente` only when eligible | Both; no provider internals; live status |
| Request cancellation/expiration | End request use | Current state, no debt effect, history | `Cancelar pedido` when eligible; back | Web/supporting mobile; retained history; named status |
| Expense list | Understand money out | Period filters, authorized amounts/descriptions, effective status | Create/open/filter; empty/stale/unavailable | Web; mobile report only; hidden from unauthorized Staff |
| Expense creation | Record basic Expense | Amount, occurrence date, description/category concept, result consequence | `Registrar saída de R$ X`; edit/cancel | Web only; review/commit/unknown; labels and amount announcement |
| Expense details | Explain Expense/history | Amount/date/description/actor where allowed, lifecycle | Correct/cancel; report link | Web/mobile report read if allowed; sensitive |
| Expense correction/replacement | Preserve correction history | Original, corrected intent, reason, daily-result effect | `Registrar saída corrigida`; cancel | Web; conflict/unknown; original retained |
| Expense cancellation | Stop effective Expense | Original, reason, report consequence | `Cancelar saída`; back | Web; named destructive action; no hard delete |
| Daily operational summary | Answer what entered/left/remained | Business-local period, Payments, Expenses, result, Sales separate | Filters/details/refresh | Web/mobile; sensitive fields omitted; stale states explicit |
| Sales report | Review Sales recorded | Period/filter/sort, active/cancelled treatment | Open Sale/change filters | Web/mobile optional; not cash receipt; accessible records |
| Payment report | Review money received | Period/filter/sort, reversal treatment | Open Payment/change filters | Web/mobile; Allocation not extra row total |
| Expense report | Review money out | Period/filter/sort, effective/cancelled entries | Open Expense/change filters | Web/mobile if authorized; Staff hidden |
| Outstanding Sales | Find open debt | Customer/Sale/date/outstanding, oldest ordering | Open Customer/Sale/record Payment | Web/mobile read; debt sensitive |
| Customer outstanding balance | Explain one Customer debt | Total plus Sale-level explanation and Payments | Payment/Request/details | Web/mobile read; no editable balance |
| Recent operational activity | Find outcomes and recovery | Safe recent Sales, Payments, Expenses, Requests, corrections, unknown recovery entries | Open result or `Conferir resultado` | Both; capability-filtered; no secret correlation |
| Team member list | Manage access | Active/suspended/removed members, role labels, last-Owner context | Invite/change/suspend/restore/remove | Web; mobile admin deferred; identity minimized |
| Pending Invitations | Manage invitation lifecycle | Intended email, group, expiry/state, delivery state | Create/cancel/resend where accepted | Web; no secret; state announced |
| Invitation creation | Invite matching identity | Email, access group, expiry/consequence review | `Enviar convite`; cancel | Web; Manager exposure provisional; no enumeration |
| Invitation acceptance | Join Business | Business name, intended access, verified-email requirement | `Aceitar convite`; see Businesses | Web/mobile entry; safe mismatch/consumed errors |
| Capability-group change | Change access safely | Member, current/new capability summary, affected access | `Alterar acesso`; cancel | Web; revalidation at commit; last-Owner protection |
| Suspend/restore/remove access | Manage current access | Member, state, session consequence, history retention | Named action for each state | Web; no client-only authorization; assertive result |
| Business settings | Maintain accepted settings | Name, current time zone, BRL, readiness, historical-date explanation | Save accepted settings | Web; mobile read/switch; current values capability-filtered |
| Business deactivation | Stop ordinary operation | Business, reason, session/operation consequence, history retention | `Desativar estabelecimento`; back | Web Owner only; conflict/unknown; no deletion claim |

## 5. Navigation Model

### 5.1 Primary Relationships

```text
Registration -> Email verification -> Accessible Businesses
  -> no Business: First-Business onboarding -> Home
  -> one valid Business: Home
  -> multiple valid Businesses: Business selection -> Home

Home -> New Sale -> Review -> Commit -> Result -> Sale details / Customer debt / New Sale
Home -> Customers -> Customer details -> Debt -> Later Payment -> Review -> Result
Home -> Products -> Product details
Home -> Reports -> Authorized canonical detail
Home -> Settings -> Team / Business / Session security
Recent activity -> Result detail or unknown-outcome recovery
```

### 5.2 Back and Interruption Rules

- Back from creation returns to the originating list or workflow and preserves safe unsent values where specified.
- Back from inline Customer creation returns to the same Sale preparation with all Sale data intact.
- Back from review returns to editable preparation; committed result never returns to an editable pre-commit state.
- Details link to correction, cancellation, reversal, and related history only when capability allows.
- Customer debt leads to later Payment; Sale details may lead to Customer debt; Request details lead to a separately recorded Payment, never auto-confirm it.
- Report entries link to canonical detail only within validated Business scope and capability.
- Session invalidation interrupts tenant navigation and returns to sign-in. Any preserved intent is restored only after the same Business and capability revalidate.
- Membership suspension or Business deactivation clears ordinary tenant navigation and sensitive content.
- Business switching removes previous-Business content before target validation. Browser back cannot restore it as active content.

## 6. Screen-State Model

`Commit` values are `no`, `prior`, or `possible`. Retry is always scoped to the original validated Business and intent.

| State | Visible content; primary / secondary action | Withheld and preserved work | Freshness, retry, commit | Focus, announcement, Business behavior |
| --- | --- | --- | --- | --- |
| Initial | Title, Business, task; begin / back | No unsupported action; no work yet | Current context required; safe; no | Main heading; none/polite; validated Business only |
| Loading | Stable labels, neutral placeholders; cancel if safe | No stale values/actions; preserve prior safe filters | Fresh read; query retry; no | Heading remains; polite once; no previous tenant |
| Empty | Explanation; create or change filter / back | No false zero or unavailable action | Fresh enough; safe; no | Empty heading/message; polite; current Business |
| Populated | Authorized current content; task action / related navigation | Forbidden fields omitted | Current or freshness-labeled; action-specific; no | Main heading; none; current Business |
| Searching | Query and progress; refine / clear | No cross-tenant suggestions; preserve query | Re-read; safe; no | Search control/results; polite |
| No results | Query and no-match copy; clear/create if allowed | No uniqueness conclusion | Fresh search; safe; no | Results heading; polite |
| Editing | Labels, values, help; review/save / discard | Commit action until valid; preserve all valid inputs | Server revalidation later; safe local edits; no | First field or heading; none |
| Locally invalid | Error summary and fields; correct / discard | No submit; preserve values | No fresh read unless state-related; safe after correction; no | Summary then first invalid; assertive summary |
| Authoritatively validating | Frozen intent and progress; wait | Duplicate activation and editing | Fresh authoritative checks; do not retry concurrently; possible only after dispatch | Status region; polite/assertive once |
| Reviewing | Complete facts/consequence; named confirm / edit | No generic confirm or hidden facts; preserve intent | Revalidate on confirm; safe before dispatch; no | Review heading; consequence readable |
| Confirming | Final decision surface; named confirm / return | Background mutation and duplicate action | Current preview only; confirm revalidates; no | Confirmation heading; no trap if non-modal |
| Committing | Frozen reviewed intent; wait | Navigation that creates new intent; preserve exact intent | Authoritative; no retry; possible | Status region; assertive once; Business fixed |
| Successful | Committed result; next safe action / details | No editing of committed facts | Fresh result; no retry; prior | Result heading; polite success; same Business |
| Safe replay | Original result; view result / continue | No new duplicate fact | Original authoritative result; no retry; prior | Result heading; polite success |
| Rejected | Specific reason; correct/review / cancel | No success claim; preserve correctable work | Freshness depends on reason; retry only after correction; no | Error summary; assertive |
| Capability denied | Safe denial; back / another Business | Forbidden content/action; preserve no newly forbidden data | Refresh optional; not safe until capability changes; no | Notice; assertive; no existence leak |
| Business unavailable | Neutral unavailability; choose another / sign out | All tenant data/actions | Fresh Businesses required; not safe unchanged; no | Notice; assertive; clear tenant state |
| Session invalid | Session-ended copy; sign in / sign out | Tenant data and commits | Full revalidation; retry after sign-in; no for rejected action | Notice; assertive; clear sensitive state |
| Conflict | Safe changed-state summary; reload / cancel | Stale confirmation; preserve intent for comparison | Fresh target required; new review; no | Notice; assertive |
| Concurrent modification | Updated-safe facts; refresh/review / cancel | Last-write-wins and stale commit | Fresh read mandatory; new intent; no for rejected command | Changed values heading; assertive |
| Connectivity degraded | Connection notice and known local state; retry query / leave | New authoritative mutation unless explicitly safe | Freshness uncertain; financial retry prohibited after dispatch; possible | Persistent notice; polite then assertive on action |
| Projection stale | Labels plus freshness warning; refresh / canonical detail if allowed | Unlabeled precision | Rebuild/read required; query retry safe; no mutation | Warning heading; polite |
| Projection unavailable | No untrusted total; retry / canonical detail | False zero and stale total | Fresh projection required; query retry safe; no | Notice; polite/assertive by importance |
| External delivery pending | Request summary, debt unchanged; check status | `Pago` and duplicate delivery intent | Request fresh state; poll safe; Request prior, Payment no | Status; polite |
| External delivery failed | Request exists, debt unchanged; retry delivery / cancel if eligible | Financial rollback or Payment claim | Re-read Request; side-effect retry only; Request prior | Failure heading; assertive |
| Unknown authoritative outcome | Original review and uncertainty; recover | New financial intent and failure claim; preserve exact intent | Recovery required; new retry unsafe; possible | Recovery heading; assertive; Business fixed |
| Recovery in progress | Same intent, progress; wait / leave safely | New intent | Authoritative lookup; no parallel retry; possible | Status; polite updates |
| Recovered committed result | Original result; view / continue | Duplicate creation | Fresh result; no retry; prior | Result heading; polite success |
| Recovered rejection | Confirmed rejection and reason; correct / cancel | Success claim | Fresh reason; retry after correction only; no | Error summary; assertive |
| Recovered no-commit result | Explicit no-record result; retry same reviewed intent / edit | Changed intent under old identity | Authoritative no-commit; retry now safe; no | Result heading; assertive then polite |
| Deactivated record | Historical label and retained facts; view history / accepted reactivation if any | Ordinary new use | Fresh lifecycle; action-specific; prior history | Record heading; polite status |
| Read-only historical state | Snapshots and correction links; navigate history | In-place financial edit | Canonical history; no mutation retry | History heading; no color-only state |

## 7. Critical Interaction Sequences

Each sequence uses the same low-fidelity contract: starting surface and preconditions; user action and transition; authoritative operation; success/rejection/conflict/unknown branches; preserved work; focus/announcement; financial and Business consequence; web/mobile responsibility; future validation.

### 7.1 Identity, Business, Customer, and Product Sequences

| Sequence | Start and interaction | Authoritative branches and preservation | Accessibility, clients, validation |
| --- | --- | --- | --- |
| Registration and verification | Registration, Global; submit identity -> validating -> verification pending -> verified continuation | Identity/verification operations; generic rejection preserves safe identifier; no Business data | Focus errors/status; web/mobile; test enumeration and continuation |
| First-owner bootstrap | Onboarding, verified User/no Business; edit -> review -> `Criar estabelecimento` -> committing | Atomic Business/settings/Owner/audit/idempotency; rejection preserves fields; unknown enters recovery | Announce commit/result; web required; test readiness and confidence |
| Bootstrap timeout/recovery | Committing interrupted -> unknown surface -> `Conferir resultado` | Found Business -> Home; no commit -> safe same-intent retry; still unknown blocks new Business | Assertive uncertainty; web/mobile semantics; test no duplicate Business |
| One-Business return | Sign-in -> loading accessible Businesses -> automatic validated selection -> Home | Invalidated state branches to no-access selection; no tenant flash | Focus Home; both; test automatic continuation |
| Multiple-Business return | Sign-in -> authorized selection -> validate choice -> Home | Choice failure clears target and remains global; no unauthorized detail | Keyboard selection; both; test correct context |
| Invalid remembered Business | Session revalidation -> unavailable notice -> authorized choices | Discard remembered context and all tenant-local state | Assertive notice; both; test stale-context clearing |
| Business switching | Global frame -> choose target -> neutral clearing/loading -> target Home | Validate target; failure leaves no target data; source draft remains tied to source only | Focus new title; both; test browser-back isolation |
| Customer creation | List/Sale -> edit -> optional similar warning -> create | Create scoped Customer; validation preserves fields; cross-tenant input generic reject | Error focus; web; test optional contacts |
| Same-name warning | Customer edit -> warning with safe clues -> choose existing or `Criar mesmo assim` | Warning is non-blocking and not uniqueness | Warning announced; web; merchant-test timing |
| Product creation | Product list -> edit -> create -> result/detail | Scoped Product; invalid preserves data; no inventory | Focus result; web/mobile photo support; test comprehension |
| Product deactivation/stale use | Product details deactivate, or Sale prepared then Product becomes inactive | Historical Sales unchanged; Sale confirmation conflict preserves line for review; no silent ad hoc conversion | Conflict announced; web; test snapshot and stale Product |

### 7.2 Sale Sequences

| Sequence | Start and interaction | Authoritative branches and preservation | Accessibility, clients, validation |
| --- | --- | --- | --- |
| Fully paid anonymous Sale | Sale workspace, no Customer; items/payment full -> review -> named confirm | Atomic Sale/Items/Payment/Allocation; reject invalid; conflict reload; unknown recovery | Amounts announced; web only; test anonymous full-payment rule |
| Fully paid identified Sale | Workspace with Customer; same progression | Same atomic records linked to Customer; debt `0` | Customer context readable; web; test identified result |
| Partial Sale | Customer required; total/received/open preview -> review -> confirm | Atomic Sale/Items/Payment/Allocation; open debt derived; missing Customer rejection preserves Sale | Focus Customer error; web; test R$ 40/R$ 15/R$ 25 example |
| Unpaid Sale | Customer required; received `0` -> review -> confirm | Sale/Items only; no Payment/Allocation; full debt derived | Result says open amount; web; test no invented receipt |
| Ad hoc Sale Item | Workspace -> `Adicionar item avulso` -> description/quantity/price | Snapshot committed without Product; invalid line stays editable | Field grouping; web; test no catalog prerequisite |
| Inline Customer | Sale workspace -> create Customer surface -> warning/create -> return | Customer committed in same Business; Sale preparation remains untouched and selects new Customer | Focus selected Customer; web; test interruption preservation |
| Sale validation rejection | Workspace/review -> authoritative validation rejects | No commit; return to editing with valid data and safe errors | Focus summary/field; web; test preservation |
| Authoritative recalculation conflict | Review preview differs from server calculation | No silent commit; show updated amount -> fresh review required | Announce changed total; web; test preview-versus-fact comprehension |
| Duplicate Sale replay | Repeated same intent -> validating -> safe replay result | Return original Sale; no duplicate Payment or Sale | Result focus; web; test replay language |
| Changed intent reuse | Same identity, changed items -> reject | Preserve changed preparation but require new review/command identity | Assertive review notice; web; test idempotency distinction |
| Unknown Sale outcome | Commit interrupted -> unknown -> recovery | Found, rejected, no-commit, or still unknown branches; exact reviewed intent preserved | Assertive then polite; web; mobile later history; test no retry temptation |
| Sale result recovery | Recent activity/recovery entry -> check authoritative result | Found commit opens result; no-commit enables safe same-intent retry | Focus outcome; both semantics; test leave/return |
| Sale cancellation | Sale details -> correction surface -> reason/consequence review -> `Cancelar venda` | Atomic lifecycle/correction plan; history retained; stale Payment conflict; unknown recovery | Named destructive action; web; test debt explanation |
| Cancellation versus Payment | Two operations race from Sale/debt surfaces | One commits; other conflict -> reload canonical state; no active allocation to cancelled Sale | Conflict announced; web; test concurrency |

### 7.3 Payment, Request, Expense, Report, and Access Sequences

| Sequence | Start and interaction | Authoritative branches and preservation | Accessibility, clients, validation |
| --- | --- | --- | --- |
| Payment to one Sale | Customer debt/Sale -> Payment edit -> destination preview -> review -> confirm | Atomic Payment/Allocation; rejection/conflict/unknown supported; result shows receipt once | Amount/destination labels; web; test selected Sale first |
| Payment across Sales | Customer debt -> amount covers selected/oldest Sales -> preview -> confirm | Same-Business/Customer allocations; remaining debt derived; no extra receipt | Grouped list; web; test R$ 35 split R$ 30/R$ 5 |
| Overpayment | Payment edit amount exceeds debt -> validation/rejection | No Payment; current max shown; other fields preserved | Focus amount; web; test no credit |
| Concurrent Payment | Stale debt -> confirm -> conflict | One commit only; rejected User refreshes debt and creates newly reviewed intent | Assertive changed-debt notice; web; test no over-allocation |
| Payment reversal | Payment details -> reversal review/reason -> named confirm | Reversal preserves Payment, makes allocations ineffective, debt reappears; conflict/unknown paths | Consequence announced; web; test report/debt change |
| Request creation/delivery | Debt/Customer -> prepare/review -> create Request -> delivery pending/sent | Request commit has no debt effect; delivery separate; no Payment created | Distinct statuses; web/mobile support; test `sent` is not `paid` |
| Delivery failure/retry | Request details pending -> failed | Request remains; retry same delivery attempt when eligible; debt unchanged | Failure announced; both; test safe side-effect retry |
| Later verified Payment | Request details/Customer debt -> separate Payment sequence | Payment records receipt; Request may correlate but never proves it | Separate heading/action; web mutation, mobile read; test separation |
| Expense creation | Expense list -> edit -> review -> named confirm | Expense/audit/idempotency commit; rejection/conflict/unknown; daily result changes | Amount consequence; web; test Staff denial and duplicate protection |
| Expense correction/replacement | Expense details -> correction reason/review -> confirm | Original retained, replacement effective; conflict/unknown | History readable; web; test result delta |
| Expense cancellation | Expense details -> cancellation review -> confirm | Original retained/cancelled; report updates; no hard delete | Named action; web; test report treatment |
| Daily summary/report | Home/report -> filters -> loading -> populated | Query canonical/projection data under capability; no mutation | Labels/table alternative; web/mobile; test semantic distinction |
| Stale/inconsistent projection | Report -> stale warning or disagreement | Retry/rebuild; hide untrusted total; canonical detail wins where available | Polite/important notice; both; test false-zero prevention |
| Invitation creation/acceptance | Team -> invite review/send; recipient -> acceptance | Invitation and delivery separate; acceptance matches verified email and activates Membership | No secret; web/admin and both acceptance; test mismatch/expiry |
| Concurrent Invitation acceptance | Two acceptance attempts | One commit; second consumed/safe result; no duplicate Membership | Safe non-enumerating copy; both; test race |
| Last Owner protection | Team -> change/remove Owner -> review | Authoritative boundary rejects leaving zero active Owners | Explain required responsible access; web; test concurrent Owners |
| Membership/capability changes while open | Any tenant surface becomes stale | Next query/confirm revalidates; clear forbidden data; no unauthorized commit | Assertive access change; both; test in-flight revocation |
| Business deactivation during confirm | Financial review/commit while Business deactivates | Ordinary command rejects or unknown recovery if dispatch uncertain; tenant navigation clears | Assertive notice; both; test no post-deactivation operation |
| Shared-device sign-out | Global user access -> `Sair deste aparelho` | Session ends, tenant state cleared, back navigation cannot reveal data | Focus sign-in; both; test browser history |
| Lost-device revocation | Session security -> choose affected session -> revoke | Revocation authority updates; lost client must reauthenticate/revalidate | Safe device clues; web/mobile; test bounded access loss |

## 8. Sale Workspace

### 8.1 Conceptual Anatomy and Reading Order

```text
1. `Nova venda` and current establishment
2. Customer context
   - optional while fully paid
   - required before partial or unpaid review
   - search, select, or create without losing Sale
3. Sale Items
   - Product search/select or `Adicionar item avulso`
   - description snapshot, integer quantity, unit value
   - accepted adjustment/discount concept
   - line preview and edit/remove before confirmation
4. Payment condition
   - paid now, paid in part, or left open
   - amount received now, method, Business-local date
5. Preview summary
   - Sale total preview
   - received-now preview
   - `Falta pagar` preview
6. Validation summary
7. `Revisar venda`; secondary `Descartar venda`
```

Preview values are explicitly non-authoritative. The transition to review invokes authoritative recalculation. If totals or referenced Customer/Product state changed, the review shows fresh values and requires a new decision rather than committing silently.

### 8.2 Preservation and Interruption

- Local and authoritative validation preserve valid Customer, items, quantity, values, date, method, and payment intent.
- Inline Customer creation returns to the same workspace and selects the new Customer.
- Product deactivation preserves the prepared line for merchant review but prevents commit as that Product. Conversion to ad hoc requires explicit reviewed intent.
- Membership/capability change or Business deactivation withholds confirmation. Newly forbidden data is removed; safe local work may be recoverable only after the same context revalidates.
- Discard asks `Descartar esta venda?` and offers `Continuar preenchendo` before `Descartar venda`.
- Durable drafts and browser-refresh persistence remain deferred.

### 8.3 Responsive and Accessible Interaction

Desktop may show item editing and summary concurrently; tablet and mobile browser place summary after items in reading order. The primary review action remains reachable without covering errors or totals. Each item is a labeled group with predictable keyboard order. Adding/removing a line announces the change politely. Error summary links to fields. Amounts have meaningful accessible names, and status never depends on color.

## 9. Financial Review and Confirmation

The same low-fidelity review structure applies to Sale, later Payment, Payment reversal, Sale cancellation, Expense creation/correction/cancellation, and Business deactivation.

| Ordered region | Required content |
| --- | --- |
| Identity | Action title and current establishment |
| Subject | Customer, Sale, Payment, Expense, or Business being affected |
| Facts | Items/record, authoritative amounts, method, Business-local operational date |
| Consequence | Money received, debt created/restored, daily-result effect, access/session effect, or retained history |
| Reason | Required for cancellation, reversal, correction, or deactivation |
| Decision | Specifically named primary action and `Voltar e editar` or `Voltar` |
| Status | Validating, committing, success, rejection, conflict, or unknown outcome |

Examples of named actions: `Registrar venda de R$ 40,00`, `Registrar pagamento de R$ 35,00`, `Desfazer pagamento`, `Cancelar venda`, `Registrar saída de R$ 12,00`, `Cancelar saída`, and `Desativar estabelecimento`. A generic `Confirmar` is prohibited for these actions.

After activation, the reviewed intent is frozen and repeated activation is blocked. Navigation that could create another financial intent is withheld during commit. Timeout transitions to unknown outcome; it never returns directly to editable preparation or failure. Focus moves to the result, error summary, conflict notice, or unknown-outcome heading. Announcements state the financial consequence once and preserve the original intent for recovery.

## 10. Unknown-Outcome Recovery Surface

### 10.1 Low-Fidelity Structure

```text
Title: `Ainda estamos conferindo este registro`
Current establishment
Original action summary: type, Customer when relevant, amount, date
Explanation:
  `Ainda não sabemos se este registro foi concluído.`
  `Não tente registrar novamente agora, pois isso pode duplicar a informação.`
Primary action: `Conferir resultado`
Secondary action: `Sair e conferir depois`
Recovery status region
Safe support guidance without secret or internal command identifiers
```

### 10.2 Recovery Transitions

| Recovery result | Copy and action | Financial meaning |
| --- | --- | --- |
| In progress | `Conferindo se foi registrado...` | Commit remains possible; no new intent |
| Committed found | `Encontramos o registro. Nenhum novo registro foi criado.` -> `Ver resultado` | Original commit is authoritative |
| Rejection found | `Confirmamos que o registro não foi concluído.` plus accepted reason -> correct/review | No commit; correction may create a reviewed retry |
| No prior commit | `Confirmamos que não foi registrado.` -> `Tentar registrar novamente` | Same reviewed intent may now retry safely |
| Still unknown | `Ainda não foi possível confirmar. Tente conferir novamente mais tarde.` | Commit remains possible; new intent withheld |

Leaving keeps a safe recovery entry in recent activity. Returning requires the same User, Business, and capability validation. Switching Business removes the current recovery details from view but does not erase evidence; returning to the original Business revalidates access. Session expiration requires sign-in before recovery. Screen readers receive an assertive initial uncertainty announcement and polite progress updates. Supporting mobile may show a subsequently recovered result or recovery status, but does not gain financial mutation scope.

## 11. Reports and Projection States

### 11.1 Shared Report Anatomy

```text
1. Report question/title and current establishment
2. Business-local period and active filters
3. Freshness or integrity notice
4. Summary values with plain-language definitions
5. Sorted records or accessible grouped list
6. Pagination/load-more concept where needed
7. Empty, stale, unavailable, or reconciliation action
8. Authorized canonical-detail links
```

| Report | Summary and records | Exclusions and historical treatment | Mobile/accessibility |
| --- | --- | --- | --- |
| Daily summary | `Quanto entrou`, `Quanto saiu`, `Quanto sobrou`, Sales separate | Allocation and Request not receipts; reversed/cancelled effective rules | Mobile supported; each value has text definition |
| Sales recorded | Active Sales by Business-local Sale date | Payment received separately; cancelled labeled/excluded from ordinary total | Labeled list alternative |
| Payments received | Active Payments by occurrence date | Allocation not another receipt; reversed Payment labeled/excluded | Mobile supported; totals and rows distinct |
| Expenses | Effective Expenses by occurrence date | Corrections/replacements linked; cancelled excluded from ordinary total | Capability-sensitive; Staff hidden by default |
| Outstanding Sales | Customer, date, original/open amount, oldest order | Cancelled Sales in history, not active debt | Mobile read; debt-sensitive |
| Customer debt | Derived total plus Sale/Payment explanation | Request does not reduce balance; no editable balance | Customer context announced |
| Recent activity | Safe event/result links, including recovery entries | Capability-filtered; historical actors do not grant access | Mobile supported; no secret correlation |

The accepted formula remains:

```text
dailyResultMinor = paymentsReceivedTodayMinor - expensesTodayMinor
```

Example: `5000 - 1200 = 3800`, displayed as `R$ 50,00 - R$ 12,00 = R$ 38,00`. It is not profit, DRE, bookkeeping, or accounting result.

Stale projection shows `Valores em atualização` and a refresh action. Unavailable projection shows no misleading zero. Known canonical disagreement hides the untrusted summary and offers `Tentar atualizar` or authorized canonical detail. Historical Business-local dates do not change when current time zone changes. Charts, if introduced later, require textual equivalents; this cycle does not require charts.

## 12. Capability-Sensitive Structures

| Presentation mode | Use | Low-fidelity behavior |
| --- | --- | --- |
| Available | User may understand and perform the task | Show action; authoritative validation still runs at confirmation |
| Visible but unavailable | Existence is not sensitive and explanation helps | Show disabled/unavailable state with reason and safe next step |
| Omitted | Destination, value, or action existence is sensitive | Do not render label, placeholder, total, loading skeleton, or error detail |
| Read-only | User may understand history but not mutate it | Show facts and status; omit mutation controls |
| Interrupted by capability change | Open surface became stale | Remove forbidden content, block commit, show safe notice, refresh context |
| Interrupted by Membership suspension/removal | User no longer has tenant access | Clear tenant content and offer another Business/sign-in path |
| Interrupted by Business deactivation | Ordinary tenant use stopped | Clear ordinary navigation and show accepted global recovery path only |

Staff does not receive Expense, sensitive daily-result, export, team-management, Business-setting, deactivation, or financial-correction capability by default. Manager exposure remains provisional. Last-active-Owner protection is explained in the team surface but enforced authoritatively under concurrency. Cross-Business identifiers resolve only inside validated scope and receive a generic non-disclosing result.

## 13. Responsive Behavior

| Surface category | Desktop responsibility | Tablet responsibility | Mobile-browser responsibility |
| --- | --- | --- | --- |
| Global frame | Navigation and Business may remain visible with task | Preserve Business/title; secondary nav may collapse | Single reading order; Business and session action remain reachable |
| Dense lists | Table or grouped records with labeled columns | Fewer simultaneous columns; preserve sort/filter meaning | Labeled record groups; no horizontal dependence |
| Search/selection | Search and results may share view | Results follow search in order | Search, selected item, then results; keyboard does not cover choice/action |
| Sale Items | Efficient repeated-line entry and summary | Items first or alongside summary when readable | One item group at a time; summary follows all items |
| Financial summary | May remain visible while editing | Must remain near decision in reading order | Full summary immediately before review/confirm action |
| Review/confirmation | Complete facts and consequence together | Same content, sequential if needed | No abbreviated review; named action after consequence |
| Filters | Visible or disclosed near report title | Compact but active choices summarized | Disclosed controls followed by active-filter summary |
| Tables | Headers and associations | Reflow or grouped alternatives | Accessible list alternative; no clipped financial columns |
| Persistent action | May stay reachable without moving layout | Must not cover errors or content | Must remain above keyboard and not invite accidental double activation |

All surfaces tolerate orientation change, browser zoom, text enlargement, and reflow without losing Business context, totals, errors, or actions. Touch targets follow the future verified accessibility standard; exact dimensions are not decided. Financial activation requires deliberate named action, separation from cancel/destructive neighbors, and duplicate suppression on every viewport.

## 14. Accessibility Annotations

Accessibility annotations are normative for every inventory row, sequence, and state:

- Reading order follows the conceptual region order; visual rearrangement cannot change meaning.
- Each surface has a descriptive page title, one main heading, appropriate landmarks, and programmatic control names.
- Labels persist outside placeholders. Required/optional status, format guidance, help, and errors are programmatically associated.
- Validation failure focuses the error summary or first invalid field; summary links to fields.
- Navigation focuses the main heading. Returning from inline creation focuses the selected Customer. Closing review returns focus to the invoking control unless a result surface replaces it.
- Keyboard operation reaches every action in logical order with visible focus and no trap.
- Loading and recovery progress use polite announcements. Commit success, blocking rejection, conflict, access loss, and initial unknown outcome use concise assertive announcements without repetition.
- Request delivery pending/failure announces delivery only, never Payment.
- Financial amounts expose meaningful Brazilian pronunciation; dates include unambiguous day/month/year and Business-local context where needed.
- State has text labels and cannot rely only on color, icon, placement, motion, or sound.
- Text resize and reflow preserve content/action; reduced-motion preferences are respected.
- Dense tables have headers and equivalent grouped-list presentation.
- Entered values remain after correctable errors, reducing memory burden and repeated work.
- Plain language, stable terminology, short instructions, and one primary decision support cognitive accessibility.

No certification or complete standards conformance is claimed. Target standard/version, tooling, assistive-technology matrix, and acceptance thresholds remain operational decisions.

## 15. Brazilian Portuguese Copy Inventory

The document remains English; merchant-facing examples remain Brazilian Portuguese. `Provisional` terms require merchant validation.

| Surface/state | Proposed copy | Status |
| --- | --- | --- |
| Registration title | `Criar conta` | Accepted direction |
| Verification | `Confirme seu e-mail para continuar.` | Accepted direction |
| Sign-in title/action | `Entrar` | Accepted direction |
| Session expiration | `Sua sessão terminou. Entre novamente para continuar.` | Accepted direction |
| Onboarding title/action | `Criar estabelecimento` | Accepted direction |
| Business context | `Estabelecimento atual: {nome}` | Accepted direction |
| Business switch | `Trocar estabelecimento` | Accepted direction |
| Home title | `Início` | Accepted direction |
| Customer empty | `Nenhum cliente cadastrado.` | Accepted direction |
| No search results | `Nenhum cliente encontrado.` | Accepted direction |
| Similar Customer | `Já existem clientes parecidos. Confira antes de criar outro.` | Provisional timing/copy |
| Product empty | `Nenhum produto cadastrado. Você também pode vender um item avulso.` | Accepted direction |
| Sale title | `Nova venda` | Provisional noun validation |
| Sale review | `Revise antes de registrar` | Accepted direction |
| Full Sale action | `Registrar venda de R$ {valor}` | Accepted direction |
| Customer-required debt | `Escolha um cliente para deixar valor em aberto.` | Accepted direction |
| Sale success | `Venda de R$ {valor} registrada.` | Provisional status wording |
| Safe replay | `Esta venda já tinha sido registrada. Nenhuma venda nova foi criada.` | Accepted direction |
| Changed intent | `Os dados mudaram. Revise a venda antes de tentar novamente.` | Accepted direction |
| Conflict | `Os valores mudaram desde que você abriu esta tela. Confira os dados atualizados.` | Accepted direction |
| Unknown outcome | `Ainda não sabemos se este registro foi concluído.` | Accepted direction |
| Recovery action/progress | `Conferir resultado` / `Conferindo se foi registrado...` | Accepted direction |
| Recovered commit | `Encontramos o registro. Nenhum novo registro foi criado.` | Accepted direction |
| Recovered rejection | `Confirmamos que o registro não foi concluído.` | Accepted direction |
| Recovered no commit | `Confirmamos que não foi registrado.` | Accepted direction |
| Customer debt | `Falta pagar` / `Quem está devendo` | Provisional by context |
| Payment review/action | `Revise o pagamento` / `Registrar pagamento de R$ {valor}` | Accepted direction |
| Allocation explanation | `Onde o pagamento será usado` | Accepted direction |
| Overpayment | `O valor recebido é maior do que a dívida deste cliente.` | Accepted direction |
| Payment reversal | `Desfazer pagamento` | Provisional correction term |
| Request title | `Pedido de pagamento` | Provisional |
| Delivery pending | `Envio em andamento. Isso ainda não confirma pagamento.` | Accepted direction |
| Delivery failed | `O pedido foi criado, mas não foi possível enviar. A dívida não mudou.` | Accepted direction |
| Expense title/action | `Saídas` / `Registrar saída de R$ {valor}` | Provisional noun validation |
| Daily result | `Quanto sobrou hoje` | Accepted with disclaimer |
| Daily disclaimer | `Este valor é um resumo do dia, não é lucro.` | Accepted direction |
| Projection stale | `Valores em atualização.` | Accepted direction |
| Projection unavailable | `Não foi possível mostrar um valor confiável agora.` | Accepted direction |
| Capability denial | `Você não tem acesso para fazer esta ação neste estabelecimento.` | Accepted direction |
| Business unavailable | `Este estabelecimento não está disponível para operações agora.` | Accepted direction |
| Deactivated record | `Este registro está desativado e foi mantido no histórico.` | Accepted direction |
| Sale cancellation | `Cancelar venda` | Provisional correction term |
| Expense cancellation | `Cancelar saída` | Provisional correction term |
| Sign-out | `Sair deste aparelho` | Accepted direction |

Technical terms prohibited by Cycle 008 remain prohibited: tenant, Membership, capability, Allocation, projection, idempotency, canonical record, command, query, provider callback, payload, and commit. Request delivery never uses `Pago`, and daily result never uses `Lucro`, `DRE`, or accounting-result language.

## 16. Coverage Matrix

The matrix maps every numbered Cycle 008 walkthrough to an entry surface, Section 7 sequence, state path, result/recovery surface, client responsibility, and merchant-validation target. A mechanically checked one-to-one numbering set is required before completion.

| # | Cycle 008 scenario | Entry -> sequence | States -> result/recovery | Web / mobile | Validation target |
| --- | --- | --- | --- | --- | --- |
| 1 | Register and verify | Registration -> identity sequence | Editing, validating, pending, success -> Business resolution | Both | Verification comprehension |
| 2 | Create first Business | Onboarding -> bootstrap | Review, committing, success -> Home | Web / optional support | Readiness and Owner meaning |
| 3 | Bootstrap timeout after commit | Commit progress -> bootstrap recovery | Unknown, recovery, recovered commit -> Home | Web / semantic visibility | No duplicate Business |
| 4 | Returning User with one Business | Sign-in -> one-Business return | Loading, success -> Home | Both | Automatic continuation |
| 5 | Returning User with two Businesses | Business selection -> multi-Business return | Populated, validating, success -> Home | Both | Correct Business choice |
| 6 | Remembered Business unavailable | Session revalidation -> invalid remembered Business | Business unavailable -> selection | Both | Stale context clearing |
| 7 | Switch Businesses | Global frame -> Business switching | Validating, loading, success -> target Home | Both | No prior-tenant flash |
| 8 | Membership suspended while open | Any tenant surface -> access interruption | Membership denial -> global recovery | Both | Immediate comprehension |
| 9 | Business deactivated during confirmation | Financial review -> deactivation race | Committing, rejection/unknown -> unavailable/recovery | Both | No false success |
| 10 | Owner invites member | Team -> invitation creation | Editing, review, success/delivery state -> Invitations | Web / admin deferred | Access consequence |
| 11 | Invitation accepted | Acceptance -> invitation acceptance | Reviewing, committing, success -> Business selection | Both entry | Matching identity |
| 12 | Invitation accepted twice | Acceptance -> concurrent acceptance | Committing, safe replay/consumed -> Businesses | Both | No duplicate access |
| 13 | Invitation email mismatch | Acceptance -> invitation rejection | Rejected -> safe account action | Both | Non-enumerating copy |
| 14 | Last Owner removal | Team -> last-Owner protection | Review, rejected -> team list | Web | Safeguard comprehension |
| 15 | Create Customer | Customer list -> Customer creation | Editing, validating, success -> details/origin | Web / read support | Optional contacts |
| 16 | Same-name warning | Customer creation -> warning | Editing, warning, success/cancel -> details/origin | Web | Warning timing |
| 17 | Inline Customer | Sale workspace -> inline Customer | Editing, warning, success -> preserved Sale | Web | No Sale-data loss |
| 18 | Create Product | Product list -> Product creation | Editing, validating, success -> details | Web / photo support | Catalog optionality |
| 19 | Rename Product after Sale | Product details -> update | Editing, success -> Product; Sale history read-only | Web / history read | Snapshot understanding |
| 20 | Product deactivated after Sale preparation | Sale workspace -> stale Product | Review, conflict -> preserved workspace | Web | Explicit reselection |
| 21 | Fully paid anonymous Sale | Sale workspace -> anonymous Sale | Editing, review, commit, success -> Sale result | Web / history read | Anonymous full-payment rule |
| 22 | Fully paid identified Sale | Sale workspace -> identified Sale | Editing, review, commit, success -> Sale result | Web / history read | Customer context |
| 23 | Partial Sale | Sale workspace -> partial Sale | Editing, review, commit, success -> open debt | Web / debt read | Total/received/open meaning |
| 24 | Unpaid Sale | Sale workspace -> unpaid Sale | Editing, review, commit, success -> full debt | Web / debt read | No Payment created |
| 25 | Ad hoc item | Sale workspace -> ad hoc item | Editing, review, success -> Sale result | Web | No catalog prerequisite |
| 26 | Sale validation fails | Workspace/review -> rejection | Invalid/rejected -> preserved workspace | Web | Error recovery |
| 27 | Duplicate Sale safe replay | Sale commit -> replay | Validating, safe replay -> original result | Web | No duplicate perception |
| 28 | Sale identity changed intent | Sale commit -> changed-intent rejection | Rejected -> new review | Web | Idempotency versus editing |
| 29 | Sale timeout | Sale commit -> unknown | Unknown -> recovery surface | Web | Failure versus uncertainty |
| 30 | Committed Sale recovered | Recovery -> result recovery | Recovery, recovered commit -> Sale result | Web / later read | Result rediscovery |
| 31 | Sale remains unknown | Recovery -> unresolved recovery | Recovery, still unknown -> recent activity | Both status | Safe waiting/no retry |
| 32 | Cancel Sale | Sale details -> cancellation | Review, commit, success/unknown -> history/recovery | Web | History preservation |
| 33 | Cancellation races with Payment | Sale/debt -> concurrency race | Commit, conflict -> fresh details | Web | Canonical refresh |
| 34 | Payment to one Sale | Customer debt -> Payment | Editing, review, commit, success -> Payment result | Web / read support | Selected destination |
| 35 | Payment across Sales | Customer debt -> multi-Sale Payment | Preview, review, success -> split result | Web / read support | Receipt counted once |
| 36 | Overpayment | Payment preparation -> rejection | Invalid/rejected -> preserved Payment | Web | Maximum amount/no credit |
| 37 | Concurrent Payments | Payment review -> conflict | Commit, conflict -> fresh debt | Web | No over-allocation |
| 38 | Payment reversal | Payment details -> reversal | Review, commit, success -> debt/history | Web / read support | Debt reappearance |
| 39 | Request delivered without Payment | Request details -> delivery | Pending, delivered -> Request details | Both support | Sent is not paid |
| 40 | Request delivery fails | Request details -> retry | Delivery failed -> retry status | Both support | Debt unchanged |
| 41 | Verified Payment later | Request/Customer -> separate Payment | Payment review/commit -> Payment result | Web / read support | Separate authoritative operation |
| 42 | Record Expense | Expense list -> creation | Editing, review, commit, success -> Expense result | Web / report support | Result consequence/permission |
| 43 | Correct Expense | Expense details -> replacement | Review, commit, success -> linked history | Web / report support | Effective amount change |
| 44 | Old debt paid today | Customer debt -> Payment/report | Payment success -> daily summary | Web / mobile report | Payment date versus Sale date |
| 45 | View daily summary | Home/report -> daily summary | Loading, populated -> summary | Both | Payments minus Expenses |
| 46 | Projection stale | Report -> stale projection | Stale -> refresh/current report | Both | Warning versus zero |
| 47 | Projection disagrees | Report -> reconciliation | Unavailable -> canonical detail/retry | Both | Canonical authority |
| 48 | Deactivate Customer with history | Customer details -> deactivation | Review, success -> historical details | Web / read support | History retained |
| 49 | Cross-tenant Customer submitted | Any scoped selection -> denial | Not found/denied -> valid selection | Both semantics | No existence leakage |
| 50 | Web/mobile daily semantics | Daily summary on both | Populated/stale equivalently -> summary | Both | Same totals/permissions |
| 51 | Shared-device sign-out | Global frame -> current-device sign-out | Confirming, success -> sign-in | Both | No back-navigation data |
| 52 | Lost mobile session revoked | Session security -> revocation | Reviewing, success -> revoked client sign-in | Both | Bounded loss response |

Coverage result: all 52 Cycle 008 walkthroughs are represented exactly once; validation must compare the integer set `1..52` with this table and report any duplicate or gap.

## 17. Merchant-Validation Plan

No sessions are conducted by this cycle. Future low-fidelity validation should use realistic but synthetic data and avoid collecting unnecessary personal or financial information.

| Validation activity | Task and evidence sought | Failure signal to record without inventing findings |
| --- | --- | --- |
| Navigation comprehension | Find New Sale, debt, reports, and sign-out without instruction | Wrong destination, hesitation, or need for ERP terminology |
| Business visibility/switching | Identify current establishment and switch safely | Prior-Business data expected or overlooked |
| Customer/Product creation | Create records and recognize optional fields | Contact treated as required/unique; inventory expected |
| Same-name Customers | Choose between similar Customers | Warning blocks valid creation or does not aid recognition |
| Sale types | Prepare anonymous paid, identified paid, partial, and unpaid Sales | Customer rule or payment condition misunderstood |
| Preview versus confirmed | Explain whether preview is already recorded | Preview mistaken for committed fact |
| Financial review | State total, received, open debt, and consequence before action | Ambiguous amount or generic action interpretation |
| Duplicate prevention/replay | React to repeated activation and safe replay | User believes two records exist or retries unnecessarily |
| Unknown outcome/recovery | Explain uncertainty and choose `Conferir resultado` | User treats it as failure or starts a new intent |
| Later Payment destination | Explain one receipt covering one/multiple Sales | Allocation mistaken for extra receipt |
| Request versus Payment | Interpret sent, failed, and paid states | Delivery mistaken for received money |
| Daily result | Explain `Quanto entrou`, `Quanto saiu`, and `Quanto sobrou` | Result called profit or Sales confused with Payments |
| Capability restriction | Understand unavailable/omitted actions | Disabled control assumed to be security authority |
| Keyboard/screen reader | Complete representative flows with keyboard and assistive technology | Focus loss, unlabeled amount, unannounced state |
| Mobile browser | Read reports, switch Business, and understand support boundary | Mutation assumed or critical review omitted |
| Terminology | Compare provisional Sale/debt/correction/role terms | Terms feel technical, blaming, or ambiguous |

Validation planning must define participant profile, consent, accessibility accommodations, script, synthetic scenarios, observation method, and decision thresholds before execution. Findings must be reported as evidence, not retroactively invented in this specification.

## 18. Open Questions and Deferred Choices

### 18.1 Product and Merchant-Validation Questions

- Integer versus fractional quantity.
- Final terms for Sale states, debt, cancellation, correction, replacement, reversal, and roles.
- Same-name Customer warning timing and identifying clues.
- Initial payment-method labels, visible Sale/Payment numbering, SKU/barcode, and Expense categories.
- Durable Sale drafts, browser-refresh recovery, printed/shareable Sale summaries, and Home emphasis.
- Staff Expense/report permissions, Manager exposure, and final mobile mutation scope.
- Product-photo and Payment Request delivery workflows and historical correction-date presentation.

### 18.2 Operational and Legal-Validation Questions

- Retention, anonymization, export after deactivation, support/admin access, shared-device timeout, and lost-device procedure.
- Audit, idempotency, communication, Product Photo, screenshot, analytics, backup, and restore policies.
- Provider disputes, debt-collection wording, Customer-contact visibility, fiscal/legal Sale-summary wording, and accessibility validation process.

### 18.3 Low-Fidelity Interaction Questions

- Whether Business selection should precede or follow recovery of a pending global bootstrap outcome.
- Whether Customer similarity warning works best inline, after leaving the name field, or at review.
- Whether the Sale workspace needs a separate payment-condition decision before item entry or after totals are visible.
- Whether all financial actions benefit from a full-page review or whether some can use an equally complete contextual review surface.
- How recent activity should prioritize unresolved outcomes without implying they committed.
- Which canonical details remain useful when a report projection is unavailable.
- Whether lists should default to grouped records or tables at intermediate widths.
- Which safe Customer clues best distinguish same-name people while minimizing contact data.

These questions may change low-fidelity ordering, not accepted financial or authorization rules.

### 18.4 Intentionally Deferred Implementation Choices

- Language, application/frontend/mobile frameworks, components, design system, routing, state, form, and validation libraries.
- Authentication/session implementation, API protocol, routes, methods, status mapping, DTOs, serialization, and versioning.
- Physical schema, identifiers, ORM/query layer, repositories, idempotency/audit storage, transactions, locking, RLS, projections, caches, queues, outboxes, and workers.
- Providers, object storage, analytics, cloud, deployment, observability, offline sync, push notifications, and browser persistence.
- Final visual hierarchy, dimensions, breakpoints, typography, colors, icons, animation, high-fidelity layouts, prototypes, and accessibility tooling.

## 19. UX Evolution

- Stable financial meaning outranks visual or navigation convenience.
- Error categories may gain clearer copy but cannot change retry, commit, or non-disclosure meaning without specification review.
- In-progress confirmations retain original Business, actor, intent, amount, and recovery semantics across client changes.
- Unknown outcomes cannot be downgraded to ordinary failure by a newer client.
- Business switching continues to remove previous-tenant content before target rendering.
- Web/mobile version skew may change density but not authorization, totals, dates, freshness, or state meaning.
- Accessibility regressions in critical surfaces block acceptance.
- Historical details retain links among cancellation, reversal, correction, replacement, and external delivery attempts.
- Provisional terminology may change after merchant evidence, with traceability and consistency updates across web/mobile copy.
- Future transport, persistence, and implementation specifications must map to these surfaces without treating them as framework components.

## Acceptance Criteria

- [x] The cycle remains documentation-only and repository authorities remain unchanged.
- [x] Purpose, audience, authority, interaction principles, global frame, navigation, and responsive responsibilities are explicit.
- [x] The complete accepted web surface inventory is documented without final layout choices.
- [x] Reusable screen states and transitions include visible content, actions, withheld behavior, preservation, freshness, retry, commit uncertainty, focus, announcements, and Business behavior.
- [x] Critical interaction sequences distinguish preparation, review, confirmation, commit, result, conflict, safe replay, and unknown recovery.
- [x] Sale workspace, inline Customer creation, authoritative recalculation, and responsive/accessibility behavior are explicit.
- [x] Financial review uses named actions and blocks duplicate activation.
- [x] Unknown outcome has a first-class recovery surface and safe no-commit retry rule.
- [x] Reports preserve Sales, Payments, Allocations, debt, Requests, Expenses, daily result, dates, projection freshness, and canonical authority distinctions.
- [x] Capability-sensitive structures do not replace server authorization or reveal cross-tenant records.
- [x] Accessibility annotations appear across surfaces, states, sequences, financial actions, reports, and responsive behavior.
- [x] Brazilian Portuguese copy is inventoried and provisional terms are labeled.
- [x] All 52 Cycle 008 walkthroughs are mapped exactly once.
- [x] Merchant-validation activities are planned but not executed or fabricated.
- [x] Open questions remain separate from accepted rules and implementation choices remain deferred.
- [x] No code, prototype, dependency, framework, route, transport, schema, provider, automated test, or scaffold is introduced.
- [x] Exactly one next cycle is recommended and no commit is created.

## Traceability

Product and UX:

- [Product Vision](../product/vision.md)
- [MVP Scope](../product/mvp-scope.md)
- [Personas](../product/personas.md)
- [UX Principles](../product/ux-principles.md)
- [Critical Journey UX Flow Specification](critical-journey-ux-flow.md)

Domain and application authority:

- [Domain and Tenancy](domain-and-tenancy.md)
- [Authentication and Business Onboarding](authentication-and-business-onboarding.md)
- [Data Persistence and Tenant Enforcement](data-persistence-and-tenant-enforcement.md)
- [First Critical User Journey](first-critical-user-journey.md)
- [Logical Data Model](logical-data-model.md)
- [Application Contracts](application-contracts.md)

Architecture, security, quality, and planning:

- [Architecture Baseline](../architecture/architecture.md)
- [Domain Model Baseline](../architecture/domain-model.md)
- [ADR Index](../architecture/decisions/README.md)
- [Privacy and LGPD](../security/privacy-and-lgpd.md)
- [Test Strategy](../quality/test-strategy.md)
- [Tasks](../tasks.md)

Related ADRs: ADRs 0001 through 0015. No new ADR is required because this specification represents accepted behavior without creating a durable architectural decision.

## Recommended Follow-up Specification

Recommended next cycle: Cycle 010 - Implementation Architecture and Technology Selection Specification.

Recommended task: Task 001 - Select the Initial Application Architecture, Technology Stack, and Workspace Boundaries.

Objective: evaluate and decide the minimum web, application/API, mobile-support, persistence-access, validation, testing, and workspace technologies needed to implement the accepted contracts and low-fidelity journey, recording durable choices in ADRs before scaffolding.

Why next: Cycles 002 through 009 now stabilize product scope, domain rules, tenancy, identity, persistence invariants, application contracts, merchant-facing behavior, and low-fidelity interaction states. Technology selection is now constrained by concrete requirements and should precede transport mapping, physical persistence, or implementation scaffolding so those artifacts use one coherent architecture.

Explicit non-goals: no application scaffold, package installation, production code, physical schema, migration, transport endpoint, UI component, provider integration, deployment, automated test implementation, or MVP expansion.
