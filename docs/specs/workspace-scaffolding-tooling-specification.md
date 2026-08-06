# Workspace Scaffolding and Tooling Specification

## 1. Status, purpose, scope, and authority

Status: Accepted for implementation planning on 2026-08-04.

Cycle: 013 — Workspace Scaffolding and Tooling Specification.

Task: 001 — Define the Initial pnpm Workspace, Package Boundaries, Version Baseline, Migration Tooling Boundary, and Validation Gates.

This specification closes the workspace and tooling decisions that must be stable before executable scaffolding. Cycles 010, 011, and 012 already selected the implementation topology, transport contract, and physical PostgreSQL model. This cycle turns those decisions into exact future workspace members, dependency rules, compatible version baselines, module conventions, migration ownership, test-database boundaries, validation gates, and a bounded Cycle 014 file plan.

The product, domain, application, UX, transport, persistence, security, privacy, accessibility, and quality documents remain authoritative for behavior. Tooling cannot redefine financial facts, authorization, Business tenancy, mobile scope, merchant copy, or retention policy. In particular:

- [Implementation Architecture and Technology Selection](implementation-architecture-technology-selection.md) owns the selected topology and technology families.
- [Transport and API Contract](transport-api-contract-specification.md) owns wire semantics.
- [Physical Persistence Model](physical-persistence-model-specification.md) owns physical records, constraints, transactions, and migration policy.
- [Application Contracts](application-contracts.md) owns framework-independent commands, queries, errors, idempotency, and recovery semantics.
- [Critical Journey UX Flow](critical-journey-ux-flow.md) and [Low-Fidelity Interaction and Screen-State](low-fidelity-interaction-screen-state-spec.md) own merchant-facing behavior.
- [Architecture](../architecture/architecture.md), [Security and Privacy](../security/privacy-and-lgpd.md), and [Test Strategy](../quality/test-strategy.md) remain cross-cutting authority.

This is documentation only. It does not create a workspace, dependency declaration, lockfile, executable configuration, source file, migration, SQL, test, database, container, provider integration, deployment artifact, or commit.

## 2. Repository evidence and prerequisites

Repository inspection found documentation only. Cycle 010 is complete and selects the separate Next.js presentation, authoritative Fastify modular server, TypeScript/Node.js, PostgreSQL/node-postgres, pnpm workspaces, and future testing direction. Cycle 011 is complete and selects versioned JSON/HTTP, same-origin cookie sessions and CSRF, explicit Business context without tenant trust, stable errors, idempotency, and outcome recovery. Cycle 012 is complete and selects the `sem_caderno` schema, UUIDv7, tenant-aware foreign keys, exact minor-unit money, explicit transactions, durable command outcomes, transactional outbox, projections, and ordered roll-forward migrations.

No contradiction blocks scaffolding. Product questions such as fractional quantity, credential provider, mobile mutation scope, and provider choice remain outside tooling defaults.

## 3. Workspace topology

The first scaffold has seven private workspace members. Root configuration and architecture scripts are repository tooling, not publishable packages.

| Path | Package name | Kind | Responsibility and public API | Allowed dependencies | Forbidden dependencies | Build/runtime | Test ownership | Cycle 014 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `apps/web` | `@sem-caderno/web` | Private application | Complete responsive Next.js presentation; consumes public transport contracts and maps server states to accessible UI | `@sem-caderno/contracts`, Next.js, React, browser-safe presentation dependencies | application, domain, persistence, Fastify, `pg`, provider SDKs | Next production build; Node 24 build/runtime | presentation, accessibility, responsive, client integration | Create |
| `apps/server` | `@sem-caderno/server` | Private application and composition root | Fastify transport edge; composes application use cases, PostgreSQL adapters, session boundary, projections, and later integration adapters | application, contracts, persistence, Fastify, server-only dependencies | web or React; direct domain bypass for use cases; raw SQL | TypeScript build to ESM JavaScript; Node 24 runtime | transport, composition, auth/tenant integration | Create |
| `packages/domain` | `@sem-caderno/domain` | Private library | Framework-independent entities, value concepts, invariant logic, and domain outcomes exported only through package exports | JavaScript/TypeScript standard library only initially | application, contracts, frameworks, Zod, `pg`, providers | Declaration and ESM JavaScript output; no independent runtime | domain unit/property tests | Create |
| `packages/application` | `@sem-caderno/application` | Private library | Use cases, authorization context, command/query contracts, ports, transaction orchestration intent, and stable application errors | domain | contracts, web frameworks, Fastify, `pg`, SQL, provider SDKs | Declaration and ESM JavaScript output; no independent runtime | use-case, authorization, idempotency semantics with fakes | Create |
| `packages/contracts` | `@sem-caderno/contracts` | Private browser-safe library | Versioned transport DTO schemas, stable wire codes, parsing/serialization helpers, and public contract types; no domain behavior | Zod and browser-safe standard APIs | domain, application, persistence, Fastify, Node-only APIs, provider SDKs | Declaration and ESM JavaScript output usable by browser/server | serialization and schema contract tests | Create |
| `packages/persistence-postgres` | `@sem-caderno/persistence-postgres` | Private server library | node-postgres repositories, row mapping, transaction adapter, constraint/error translation, idempotency/outcome, outbox, and projection persistence | application, domain, `pg` | contracts, web, Fastify route concerns, provider SDKs | Declaration and ESM JavaScript output; Node 24 only | real PostgreSQL repository, transaction, tenant, recovery tests | Create |
| `tools/database` | `@sem-caderno/database-migrations` | Private tool application | Owns ordered physical migrations and the reviewed node-pg-migrate runner boundary | `node-pg-migrate`, `pg`, narrow local config validation | product packages, web, Fastify, provider SDKs | Node 24 executable tool; no reusable public API | migration bootstrap, ordering, drift, upgrade tests | Create |

Deferred boundaries:

- No `apps/mobile`: ADR 0021 selects responsive web as initial mobile delivery. A separate client requires an accepted scope change.
- No projection worker: projection code remains an alternate server entrypoint/module until measured isolation or scale requires another process.
- No provider-adapter package: create one only when a provider contract is accepted; provider SDKs stay inside that adapter.
- No test-support package: helpers remain package-local until at least two packages need the same stable helper without crossing authority boundaries.
- No configuration package: each executable boundary parses only its own environment and passes typed values inward.
- No generic `shared`, `common`, or `utils` package.

## 4. Dependency direction

```text
                         @sem-caderno/contracts
                         ^                    ^
                         |                    |
@sem-caderno/web --------+        @sem-caderno/server (composition root)
                                              |
                   +--------------------------+-------------------+
                   v                          v                   v
       @sem-caderno/application    @sem-caderno/persistence-postgres
                   |                          |
                   v                          v
            @sem-caderno/domain <-------------+

@sem-caderno/database-migrations is an isolated tool over node-pg-migrate/pg.
```

### 4.1 Allowed dependency matrix

| Consumer | Domain | Application | Contracts | Persistence | Web | Server | Database tool |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Web | No | No | Yes | No | Self | No | No |
| Server | Through application; direct types only when composition requires | Yes | Yes | Yes | No | Self | No |
| Domain | Self | No | No | No | No | No | No |
| Application | Yes | Self | No | No | No | No | No |
| Contracts | No | No | Self | No | No | No | No |
| Persistence | Yes | Yes | No | Self | No | No | No |
| Database tool | No | No | No | No | No | No | Self |

The server may import domain types only at its composition boundary when the application public API requires them; route handlers must invoke application use cases rather than domain methods directly.

### 4.2 Forbidden-import matrix

| Rule | Enforcement intent |
| --- | --- |
| Domain or application imports Fastify, Next.js, React, Zod, `pg`, SQL, browser APIs, or provider SDKs | Fail architecture validation |
| Web imports server, application, domain, persistence, Node-only modules, or database tooling | Fail architecture validation and browser build |
| Contracts imports domain/application/persistence or Node-only modules | Fail architecture validation |
| Presentation or transport imports raw SQL or repository implementation files | Fail architecture validation |
| Persistence imports DTOs, Fastify handlers, or React | Fail architecture validation |
| Any package imports another package's unexported path | Fail export/import validation |
| Provider SDK appears outside a future provider adapter | Fail package/path policy |
| Projection read types are used as canonical financial command inputs | Fail semantic tests; static checks can only flag known imports |

Type-only imports obey the same direction as runtime imports. They are not a boundary bypass. Workspace dependencies use `workspace:*`, package exports are the only cross-package entrypoints, and relative paths cannot cross package roots. Shared utilities stay with their owning concept; extraction requires a named responsibility and an allowed dependency direction. Workspace cycles fail installation and architecture validation.

## 5. Package-boundary candidate decisions

| Decision | Serious candidates | Selected approach | Evidence, costs, and revisit trigger |
| --- | --- | --- | --- |
| Domain/application | Combined; separate | Separate packages | Cycle 007 separates invariant behavior from use-case contracts and ports. Extra build unit is accepted for enforceable dependency direction. Combine only if measured ceremony exceeds boundary value without leakage. |
| Contracts | Inside API; dedicated package | Dedicated browser-safe package | Separate web/server clients need one wire vocabulary; transport DTOs remain independent of domain. Revisit if generated wire artifacts become canonical and replace the hand-authored package. |
| Persistence | Inside server; dedicated adapter | Dedicated adapter package | ADR 0018 requires replaceable node-postgres adapters and integration-test isolation. Cost is another package. Revisit only if package separation blocks transaction composition. |
| Migration runner | API script; dedicated tool; external binary | Dedicated `tools/database` workspace | Prevents runtime server dependencies and privileges from owning schema evolution. Revisit if deployment requires a standalone audited binary. |
| Configuration | Universal package; shared primitives; local | Executable-boundary-local schemas | Avoids browser/server secret leakage and a universal configuration object. Extract only non-secret parsing primitives after duplicated stable need appears. |
| Test helpers | Dedicated package now; local helpers | Local first | Prevents premature shared fixtures from coupling layers. Create `packages/test-support` only after proven reuse. |
| Mobile | Immediate app; responsive web | Defer package | Required by ADR 0021 and accepted scope. |
| Projection process | Separate worker; server entrypoint | Defer package/process | ADRs 0014/0029 allow internal modular entrypoints. Split on measured throughput, reliability, or deployment isolation evidence. |

## 6. Runtime and version baseline

Version evidence was checked on 2026-08-04 through official project documentation, Node release metadata, npm registry package metadata, and the official PostgreSQL container registry. Exact versions are pinned in the first lockfile; application manifests use exact direct versions unless a framework requires a peer range.

| Runtime/tool | Initial baseline | Compatibility evidence and rationale | Upgrade policy/revisit trigger |
| --- | --- | --- | --- |
| Node.js | `24.19.0`; supported line `24.x LTS` | Official Node release index marks 24.19.0 LTS; selected in ADR 0017. It satisfies every selected engine floor. | Pin exact developer/CI patch; review monthly and promptly for security. New major requires full gate. |
| Corepack | `0.35.0` bootstrap tool, outside project dependencies | Current package supports Node 24; pnpm documents using current Corepack and exact package-manager activation. | Pin in environment setup; reassess when Node/pnpm changes. |
| pnpm | `11.20.0`; `packageManager: "pnpm@11.20.0"` | pnpm 11 supports Node 24 and supplies workspace cycles, one lockfile, frozen CI, release-age, and build-script controls. pnpm 12 is beta in current docs. | Exact pin; same version writes lockfile locally/CI. Major upgrade is reviewed. |
| TypeScript | `6.0.3` | Current 6.x stable supports NodeNext/ESM. TypeScript 7.0.2 is not selected because `typescript-eslint` 8.66.0 currently declares `<6.1.0`. | Exact pin; move to 7 only after lint/build/Next compatibility. |
| Next.js | `16.3.0` | Current official package requires Node >=20.9 and accepts React 19; Node 24 satisfies it. | Exact patch in lockfile; patch upgrades through full web/contract gates. |
| React / React DOM | `19.2.8` | Current matching releases satisfy Next 16 peer support. | Keep identical versions; review with Next release notes. |
| Fastify | `5.11.2` | Current Fastify 5 within ADR 0017 direction and Node 24 runtime. | Patch updates with transport/injection tests. |
| Zod | `4.4.3` | Current Zod 4 matches Cycle 010/011 boundary-validation direction. | Patch updates with serialization/schema compatibility tests. |
| OpenAPI | Specification `3.2.0`; no implementation package yet | Cycle 011 selects the wire-description standard but leaves OpenAPI/Zod source ownership unresolved. Installing a generator now would decide that open contract question accidentally. | Select tooling before contract implementation, then require deterministic conformance. |
| node-postgres (`pg`) | `8.22.0` | Current package supports Node >=16; node-pg-migrate 9 requires `pg <9`. | Pin exact; major 9 requires migration-adapter review. |
| PostgreSQL | Server `18.4`; image `postgres:18.4-bookworm` pinned by digest for tests | Current PostgreSQL 18 minor and official multi-architecture image; preserves ADR 0018/Cycle 012 major. | Developer/test/CI major must match; adopt supported 18.x minors after migration/integration gates. |
| Vitest / coverage | `4.1.10` | Current engine supports Node >=24 and TypeScript workspace tests. | Keep runner and coverage plugin identical. |
| Testcontainers / PostgreSQL module | `12.1.0` / `12.1.0` | Current engine requires Node >=22.22; Node 24.19 satisfies it. | Install when PostgreSQL harness begins; image and library changes require integration gates. |
| React Testing Library | `16.3.2`; DOM `10.4.1`; jest-dom `7.0.0` | Current packages support React 19 testing responsibilities. | Install with first web interaction tests. |
| Playwright | `1.62.1` | Current package satisfies future browser/E2E direction and Next peer range. | Install with first browser gate; pin browser artifacts through its lock behavior. |
| axe-core / Playwright adapter | `4.12.1` / `4.12.1` | Matching current releases support automated accessibility checks. | Install with browser accessibility tests; never replaces manual review. |
| ESLint / `@eslint/js` | `9.39.5` / `9.39.5` | ESLint 10.8.0 is current, but `eslint-plugin-jsx-a11y` 6.10.2 supports only through ESLint 9. | Use flat configuration; revisit ESLint 10 when accessibility plugin peer support closes. |
| `typescript-eslint` | `8.66.0` | Current version supports TypeScript `<6.1.0`, selecting TypeScript 6.0.3. | Upgrade lint stack as a tested unit. |
| Next/React/a11y lint plugins | Next `16.3.0`; React Hooks `7.1.1`; JSX a11y `6.10.2` | Current compatible releases; direct ESLint replaces removed framework lint wrapper. | Review peers together. |
| Prettier | `3.9.6` | Current formatter; one responsibility, deterministic formatting. | Exact pin; formatting-only update in isolated change. |
| dependency-cruiser | `18.1.1` | Current engine explicitly supports Node 24 and detects cycles/dependency rules. | Exact pin; revisit if TS/module graph support becomes inadequate. |
| node-pg-migrate | `9.0.0` | Current release supports TypeScript migration loading, node-postgres 8, transactions, ordering, and advisory locking. | Exact pin; major upgrade requires migration rehearsal. |
| `tsx` | `4.23.5` | Current development-only ESM TypeScript execution for Fastify and repository scripts. Production executes compiled JavaScript. | Remove if Node native TS or another already-required tool fully replaces it. |

Supporting packages are versioned compatibly when installed: `jsdom 30.0.1`, `@types/node 24.13.3`, `@types/react 19.2.18`, `@types/react-dom 19.2.4`, and `@vitest/coverage-v8 4.1.10`. Capacitor is not selected or installed because no mobile workspace exists.

Primary evidence: [Node releases](https://nodejs.org/en/about/previous-releases), [pnpm installation](https://pnpm.io/installation), [pnpm CI](https://pnpm.io/continuous-integration), [TypeScript 6.0](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html), [Next.js support policy](https://nextjs.org/support-policy), [Fastify LTS](https://fastify.dev/docs/latest/Reference/LTS/), [OpenAPI 3.2.0](https://spec.openapis.org/oas/v3.2.0.html), [PostgreSQL 18.4](https://www.postgresql.org/docs/release/18.4/), [Testcontainers PostgreSQL](https://node.testcontainers.org/modules/postgresql/), and [node-pg-migrate](https://salsita.github.io/node-pg-migrate/).

## 7. Node.js, pnpm, and dependency policy

- The root later declares `engines.node` for 24.x and exact `packageManager: "pnpm@11.20.0"`; a version preflight rejects drift before installation or scripts.
- Current Corepack is installed and activated by the developer/CI environment; it is not an application dependency. npm, Yarn, Bun, and ad hoc `npx` installs are unsupported.
- One committed root `pnpm-lock.yaml` is authoritative. CI runs frozen installation and fails on lockfile changes or a newer incompatible lockfile.
- Internal edges use `workspace:*`; external direct dependencies are exact versions. Dependency catalogs may centralize exact shared versions but must not hide package ownership.
- Root dev dependencies are repository-wide tools only. Runtime dependencies belong to the package that imports them. Hoisting never excuses an undeclared dependency.
- `disallowWorkspaceCycles` and strict peer handling are enabled. Peer dependencies are used only for a package that truly accepts a consumer-provided runtime; private application packages do not shift dependencies to peers for convenience.
- Overrides require a documented defect or security advisory, exact scope, test evidence, and removal trigger. They are not used to silence incompatible peers.
- `minimumReleaseAge: 1440`, `minimumReleaseAgeStrict: true`, `minimumReleaseAgeIgnoreMissingTime: false`, `trustLockfile: false`, and `blockExoticSubdeps: true` are enabled. Security exceptions are exact-version, reviewed, and temporary.
- Dependency lifecycle scripts are denied unless an exact package/version is reviewed in pnpm `allowBuilds`; `strictDepBuilds` remains enabled. Native dependencies require explicit need, supported-platform evidence, and CI coverage.
- Automated dependency-update service selection is deferred. Updates remain small, lockfile-reviewed changes that run the full relevant gates.

## 8. ESM and TypeScript conventions

- All workspace packages use ESM and later declare `"type": "module"`. CommonJS is allowed only inside an unavoidable external dependency.
- Node libraries, server, and database tool use `module` and `moduleResolution` `NodeNext`, ES2024 target/library, `.ts` source, `.js` emitted output, and `.js` suffixes in relative source imports.
- The web uses Next's supported ESM/bundler resolution and `noEmit`; Next may augment its application config but cannot weaken strictness.
- Root bases enable `strict`, `verbatimModuleSyntax`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `useUnknownInCatchVariables`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, and `noUncheckedSideEffectImports`. Each environment declares explicit ambient `types`.
- `import type` is required for type-only edges. JSON imports are package-local, non-secret, and use standards-compatible import attributes; JSON does not become a business-rule store.
- Domain, application, contracts, and persistence use composite project references and emit ESM, declarations, declaration maps, and source maps to package-local `dist`. Server emits executable ESM to `dist`. Web emits only through Next. Incremental metadata remains ignored.
- Internal imports use package names and declared exports. Root aliases that only TypeScript/editor tooling understands are prohibited. Relative imports cannot cross package roots.
- Browser-safe and server-only exports are separated. A server-only module cannot be re-exported through contracts or web packages.
- Tests compile through Vitest using the owning package's TypeScript semantics. Production Fastify runs compiled JavaScript; development may use `tsx` watch. No separate runtime transpiler is introduced.

These durable conventions are recorded in ADR 0030.

## 9. Build and development model

Root script intents are stable even though Cycle 014 will create their exact manifest entries:

| Intent | Root responsibility | Execution model |
| --- | --- | --- |
| Install | Verify Node/pnpm, resolve one workspace, produce/reuse exact lockfile | `pnpm install`; frozen in CI |
| Development | Run web and server only; package libraries are watched through dependency-aware build/type processes | pnpm filters/parallel only for long-running independent processes |
| Build | Build libraries before server/web and fail on undeclared order | recursive topological execution plus project references |
| Type-check | Check every member with no output except allowed incremental metadata | recursive/package references |
| Lint | Run flat ESLint over source/config/scripts | root-owned configuration |
| Format check | Check supported source/config/docs without rewriting | root Prettier plus documentation checks |
| Unit/contract tests | Run deterministic non-database suites | Vitest per owner |
| Integration/database tests | Start pinned PostgreSQL Testcontainer, migrate from zero, run repository/transaction suites | dedicated filtered gate |
| Architecture | Validate manifests, exports, imports, cycles, package/path policies | dependency-cruiser + ESLint + repository script |
| Migration validation | Check name/order/immutability, compile runner, migrate empty database | database tool |
| Full validation | Execute ordered blocking matrix in Section 17 | root composition only |
| Clean | Remove only reproducible outputs/caches within owned paths | package-local clean intents |

No Turborepo, Nx, or other task orchestrator is needed. pnpm recursive/filter execution and TypeScript project references are sufficient for seven members. Revisit only after measured CI duration or graph complexity demonstrates a caching/scheduling need. Builds consume package exports from built `dist`; Next does not compile arbitrary inner-package source as an implicit architecture shortcut.

## 10. Linting and formatting boundary

- ESLint 9 flat configuration is root-owned, with environment-specific file blocks.
- Type-aware `typescript-eslint` rules apply to application source. Syntax-only rules may cover simple tooling files where project-service cost has no semantic value.
- Next, React Hooks, and JSX accessibility rules apply only to `apps/web`. Node/Fastify rules apply only to server and tool files.
- Required rules cover unused imports/values, floating promises, rejected-promise handling, unsafe async patterns, exhaustive discriminated states where practical, and restricted imports.
- Security-sensitive behavior relies primarily on review/tests. Lint may forbid direct secret logging, raw SQL locations, and provider imports, but is not described as authorization or financial proof.
- Prettier 3 formats executable source/config created later. Existing product documentation is not bulk-reformatted; Markdown validation checks tables, links, trailing whitespace, final newlines, and draft markers.
- Generated outputs, lockfile, build outputs, coverage, and vendor artifacts are excluded from formatting/lint as appropriate.

## 11. Architecture enforcement

The first scaffold uses a layered combination:

1. Package `exports` prevent supported deep imports.
2. TypeScript project references expose the intended build graph.
3. pnpm rejects workspace cycles and undeclared access.
4. ESLint restricted-import rules give immediate file-level feedback.
5. dependency-cruiser validates cross-package dependency rules and cycles.
6. A small root-owned Node ESM validation script checks manifest ownership, forbidden package classes, raw SQL placement, provider SDK placement, browser/server boundaries, and absence of unaccepted mobile/worker packages.

First-scaffold checks are framework exclusion from domain/application, web exclusion from inner/server/persistence packages, contracts browser safety, public-export-only imports, cycles, undeclared dependencies, raw SQL only in persistence/migrations, and provider SDKs only in future adapters. Later semantic tests verify that selected Business, DTOs, ETags, projections, or UI state never become authority.

Static checks cannot prove tenant isolation, authorization, financial correctness, unknown-outcome recovery, or projection semantics. They are guardrails plus tests and review, not a security boundary. ADR 0032 records this approach.

## 12. Testing topology

| Test class | Owner | Environment / PostgreSQL | First scaffold | Parallel/determinism and root gate |
| --- | --- | --- | --- | --- |
| Domain unit/property | domain | Node; no DB | Runner configured, substantive tests later | Parallel, deterministic; unit gate |
| Application/use-case/auth | application | Node fakes; no DB | Runner configured | Parallel with deterministic clocks/IDs; unit gate |
| Contract schemas/errors | contracts | Node and browser-compatible validation; no DB | Runner configured | Parallel; contract gate |
| Fastify transport | server | Fastify injection; DB fakes initially | Harness later with routes | Parallel when state isolated; contract/integration gate |
| Next presentation/accessibility | web | jsdom/RTL, then Playwright/axe | Dependencies deferred until first UI tests | Parallel by isolated browser context; web gate |
| PostgreSQL repositories/migrations | persistence and database tool | Real PostgreSQL 18.4 Testcontainer | Testcontainers dependency/harness deferred to database implementation cycle | Unique database per worker; database gate |
| Transactions, concurrency, idempotency, recovery | persistence/server integration | Real multi-connection PostgreSQL | Later | Controlled interleavings, bounded retries; database gate |
| Projection/reconciliation | persistence/server | Real PostgreSQL | Later | Deterministic checkpoints; database gate |
| Cross-Business non-disclosure | server + persistence | Fastify and real PostgreSQL | Later | Isolated tenants; security gate |
| Architecture | root | Static repository graph | Yes | Deterministic; architecture gate |
| End-to-end critical journeys | root/system | built web/server/PostgreSQL, Playwright | Later | Isolated environment; E2E gate |
| Mobile support | web | mobile browser viewport and assistive checks | Later; no native package | Same semantics; responsive gate |
| Backup/restore exercises | operations/deployment | disposable PostgreSQL environment | Deferred | Not parallel with shared environment; release/operations gate |

No empty test is added merely to make a command green. Cycle 014 may configure Vitest and prove package imports/builds; substantive behavioral tests begin with the corresponding implementation.

## 13. Local PostgreSQL and Testcontainers strategy

- Ordinary development may use a developer-managed PostgreSQL 18.4 instance or an independently managed local container. No Compose or container configuration is committed in the first scaffold.
- Repository/migration integration tests use `testcontainers 12.1.0` and `@testcontainers/postgresql 12.1.0` with official `postgres:18.4-bookworm` pinned to digest `sha256:1961f96e6029a02c3812d7cb329a3b03a3ac2bb067058dec17b0f5596aca9296`.
- One ephemeral container serves an integration run; each Vitest worker/suite receives a uniquely named database. Transaction rollback alone is not isolation because concurrency and multiple connections are under test.
- Tests apply every migration from an empty database. Tests own and remove their data/databases; the container stops after the run. Reuse is disabled in CI and by default locally.
- Random host ports and generated test credentials are used. Integration code rejects non-test database names, unexpected hosts, and production-like environment markers. Testcontainers tests do not consume the ordinary development `DATABASE_URL`.
- A missing compatible Docker API/container runtime causes the database gate to fail with setup guidance. Unit gates may run, but full validation cannot pass. Rootless Podman or another runtime is supported only after its preflight succeeds; it is not assumed equivalent.
- Linux, macOS, and Windows are supported only to the extent Node, pnpm, and a Testcontainers-compatible runtime meet the same gate. Platform exceptions require evidence, not weaker tests.
- Container logs and failure output must redact credentials, contact data, financial payloads, and tokens.

## 14. Migration-tooling boundary

Select `node-pg-migrate 9.0.0` in `tools/database`. This preserves ADR 0018 because it uses node-postgres rather than introducing an ORM or a second data-access model. Official documentation confirms TypeScript migration loading, ordered execution, transaction defaults, and advisory-lock support.

- Migration owner: `@sem-caderno/database-migrations`; directory `tools/database/migrations`.
- Names: UTC fourteen-digit timestamp, hyphenated intent, `.ts`; applied order is filename order and `checkOrder` is required.
- History: runner-owned `sem_caderno.schema_migrations`; a companion runner-owned checksum ledger records migration name and SHA-256. Applied file content is immutable.
- Execution: one reviewed wrapper configures the application schema/history, refuses unsafe environments, acquires fail-fast advisory lock, and applies pending migrations in one transaction by default.
- Exception: a non-transactional migration must be isolated, explicitly approved, rehearsed, have pre/postconditions and a roll-forward repair plan, and cannot be mixed casually with transactional work.
- Production policy: roll forward. `down` is development/test-only and only when lossless; fake/mark-applied behavior is prohibited in production.
- Changes use expand-and-contract, staged backfills, later constraint validation, and explicit lock/time review. Destructive changes require architecture/security/data-owner approval and backup/restore evidence.
- Stable reference capabilities may be introduced by idempotent migrations. Merchant/test/demo seed data is not part of production migrations.
- Drift validation compares ordered files/checksums/history and later expected schema objects. Test databases always migrate from zero.
- Cycle 014 creates the tool boundary and empty migration directory, but no migration or schema-history table. The initial migration implementation is a later cycle.

`dbmate` was rejected because its SQL-first external binary adds a second toolchain and weaker TypeScript/node-postgres integration. A custom runner was rejected because ordering, locking, transaction, and history behavior would be hand-rolled. ORM-owned migration systems contradict ADR 0018. ADR 0031 records the durable selection.

## 15. Environment and configuration boundaries

- `apps/server`, `apps/web`, and `tools/database` own separate Zod startup schemas. Libraries receive explicit typed values through constructors/use-case inputs and never read process environment directly.
- Server-only configuration includes database connection, session/CSRF/cryptographic evidence, audit/telemetry policy, and future provider credentials. Browser variables are absent initially; any future `NEXT_PUBLIC_*` value is reviewed as public data.
- Startup fails before listening or mutating if required configuration is absent, malformed, contradictory, or unsafe. Defaults are limited to harmless local behavior, never secrets or production security.
- `.env` variants containing values are ignored. Reviewed `.env.example` files are committed with names, purpose, safe placeholders, and no real credentials. Production secrets are injected by a future deployment boundary.
- Test configuration is generated per run. Migration tooling requires explicit environment acknowledgement and refuses production-like targets for destructive/development operations.
- Configuration values and validation errors are redacted; universal config objects, secret dumping, and passing all environment variables across package boundaries are prohibited.

## 16. Generated artifacts and repository hygiene

| Artifact | Policy |
| --- | --- |
| Root/workspace manifests, lockfile, TypeScript/lint/format source configs, migration source files | Commit; authoritative reviewed source |
| `dist`, `.next`, coverage, test reports, TypeScript build info, caches, temporary files | Ignore; reproducible output |
| `pnpm-lock.yaml` | Commit exactly once at root; generated but authoritative dependency evidence |
| Declarations/source maps | Generate to `dist`; do not commit initially |
| OpenAPI document/client | Do not generate in Cycle 014. Future source/generated ownership must be decided before contract implementation; reproducible derivative output is not canonical by default |
| Migration files | Commit and never rewrite once applied; not treated as disposable generated output |
| Local database/container data | Ignore; never commit |
| `.env.example` | Commit safe placeholders; `.env*` values ignored except approved examples |
| Mobile/native build output | Ignore if a future accepted mobile package exists; none now |
| IDE/OS files and local validation scratch | Ignore |

Generated output must not produce an unexplained working-tree diff. Validation ends with a generated-diff check in repositories with a `HEAD`; before the first commit it compares the explicit expected scaffold inventory.

## 17. Ordered validation gates

| Order | Gate and intent | Owner / input | Environment | First scaffold | Blocking |
| --- | --- | --- | --- | --- | --- |
| 1 | Repository shape and forbidden-artifact inventory | Root; workspace paths/manifests | Local + CI | Yes | Yes |
| 2 | Node 24.19.0 and pnpm 11.20.0 preflight | Root; runtime metadata | Local + CI | Yes | Yes |
| 3 | Frozen dependency install and lockfile consistency | Root; manifests/lockfile | CI; local verification | Yes | Yes |
| 4 | Generated-diff/lockfile stability | Root | Local + CI | Yes | Yes |
| 5 | Format and Markdown checks | Root; authored text/config | Local + CI | Yes | Yes |
| 6 | ESLint | Root/package source | Local + CI | Yes | Yes |
| 7 | Type-check/project-reference graph | Every workspace member | Local + CI | Yes | Yes |
| 8 | Architecture checks | Root graph, exports, imports, manifests | Local + CI | Yes | Yes |
| 9 | Unit tests | Domain/application/contracts and package-local units | Local + CI; no DB | Runner yes; behavior as implemented | Yes when tests exist |
| 10 | Contract tests | Contracts/server/web mapping | Local + CI; no DB initially | Framework prepared, schemas later | Yes when contracts exist |
| 11 | Package/library build | Domain/application/contracts/persistence | Local + CI | Yes | Yes |
| 12 | Fastify production build | Server | Local + CI | Yes | Yes |
| 13 | Next.js production build | Web | Local + CI | Yes | Yes |
| 14 | Migration filename/order/checksum/compile validation | Database tool/migrations | Local + CI; no DB for static part | Yes | Yes |
| 15 | PostgreSQL bootstrap and migrations from zero | Database tool; pinned container | Local + CI with runtime | Later initial migration cycle | Yes for full database gate |
| 16 | Repository/transaction/tenant/integrity tests | Persistence/server; migrated container | Local + CI with runtime | Later | Yes |
| 17 | Security/redaction/cache/non-disclosure tests | Server/web/persistence | Local + CI | Later | Yes |
| 18 | Browser E2E, responsive, and axe checks | Built web/server/DB | CI + targeted local | Later | Yes for affected journeys |
| 19 | Mobile-support build | Responsive web build only | Same as web | Web gate covers it; no native gate | Yes through web |
| 20 | Final clean-worktree/generated-diff check | Root | Local + CI | Yes | Yes |

`validate` runs gates in this order and stops on prerequisite failure. Database-independent feedback stays early. A container runtime is required only from gate 15. No gate may silently skip because a dependency or runtime is missing.

## 18. Planned initial scaffold

Cycle 014 may create only the following categories. “Minimal” means importable/buildable boundaries with no business use case, route, schema, SQL, migration, UI journey, provider, or persistence behavior.

| Planned artifact | Purpose / minimum content | Deliberately absent | Expected validation |
| --- | --- | --- | --- |
| `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` | Private root, exact package manager/engines, seven member globs, exact dependencies and root script intents | product scripts, provider/deployment config | gates 1–4 |
| `.gitignore`, `.editorconfig`, `.prettierignore` | Repository hygiene and basic editor neutrality | secrets or environment values | format/repository gate |
| `tsconfig.base.json`, `tsconfig.node.json`, `tsconfig.web.json`, root references | Strict shared settings and environment-specific module models | domain-specific paths or editor-only aliases | type/build gates |
| `eslint.config.mjs`, Prettier configuration | Flat environment-aware lint and deterministic formatting | authorization/security claims | format/lint gates |
| `vitest.workspace.ts` or current supported workspace configuration | Discover package-local Vitest projects | empty success tests or browser/database fixtures | runner discovery |
| `dependency-cruiser.config.mjs`, `tools/check-architecture.mjs` | Enforce Section 11 | semantic financial/authorization proof | architecture gate |
| `apps/web/package.json`, config, `src/app` minimal entry | Buildable Next shell displaying no product journey | high-fidelity UI, API calls, Business data, routes beyond framework minimum | type/lint/Next build |
| `apps/server/package.json`, `src/main.ts`, `src/app.ts` | Buildable Fastify composition skeleton with health-independent boot boundary only if needed for build validation | business routes, sessions, DB connection, contracts | type/lint/Fastify build |
| `packages/domain`, `application`, `contracts`, `persistence-postgres` manifests and `src/index.ts` | Empty or nominal public exports proving boundaries | domain behavior, DTO schemas, repositories, SQL | exports/type/build/architecture |
| `tools/database/package.json`, runner entry/config boundary, empty `migrations/` | Compileable reviewed migration command boundary | migration files, executable SQL, schema history creation, database mutation in scaffold validation | static migration/type/build gate |
| `apps/server/.env.example`, `apps/web/.env.example`, `tools/database/.env.example` | Names and safe placeholders only where a boundary already needs them | credentials, tokens, provider/deployment choices | secret/artifact checks |
| README/architecture/quality/security/task updates | Record executed scaffold and actual gate evidence | claims that unrun tests passed | documentation gates |

No CI workflow, Docker/Compose file, OpenAPI artifact, generated client, mobile package, projection worker, provider adapter, Testcontainers harness, migration, SQL, repository implementation, session integration, or business feature is permitted in Cycle 014.

## 19. Security and supply-chain considerations

- Exact package-manager/runtime pins and one reviewed lockfile establish reproducibility; trusted CI caches must not receive writes from untrusted jobs.
- pnpm's release-age, strict build-script allow-list, exotic-subdependency block, lockfile integrity, strict peers, and frozen CI install are required.
- Direct dependencies need an explicit package responsibility, official maintenance evidence, compatible engine/peer metadata, and license/security review proportional to runtime exposure.
- Production dependencies stay package-local and minimal. Test, lint, formatting, architecture, and migration-development tools remain development dependencies of their owner.
- No secret enters manifests, lockfiles, examples, logs, generated artifacts, browser bundles, or test snapshots. Provider and deployment credentials remain deferred.
- Container images are official and digest-pinned; digest/major updates run database gates. Generated code, future CI permissions, vulnerability scanning, SBOM/license automation, and update bots require later evidence and review.
- Overrides and lifecycle-script approvals are exceptional, exact, documented, and removable. Typosquatting, abandoned package, and transitive changes are reviewed in lockfile diffs.

## 20. Compatibility with accepted architecture

The selected topology preserves web as the complete responsive operational client and mobile as supporting responsive web. Fastify remains the only authoritative application boundary; Next.js and contracts remain presentation/transport concerns. PostgreSQL/node-postgres remain canonical persistence/access; migrations do not introduce an ORM. Domain/application packages remain framework-independent. Business ownership, server-side authorization, tenant-aware relational integrity, exact minor-unit money, immutable Sale Item snapshots, Payment/Allocation separation, Payment Request/Payment separation, durable outcomes, unknown-outcome recovery, transactional outbox intent, and non-authoritative projections remain unchanged.

No provider, deployment platform, product feature, native mobile mutation, financial rule, privacy retention period, or accessibility exception is selected. No contradiction or blocker was found.

## 21. Decision matrix summary

| Topic | Accepted | Rejected/deferred | Main risk and mitigation | Revisit trigger |
| --- | --- | --- | --- | --- |
| Workspace | Seven private members plus root tools | One app; many symmetric packages | Fragmentation; each member has one authority | Repeated cross-package friction without boundary value |
| Domain/application | Separate | Combined now | More build units; references enforce direction | Ceremony measurably dominates |
| Contracts | Dedicated browser-safe package | API-local DTOs | DTOs may become domain truth; forbid inward imports | Schema-generation ownership changes |
| Persistence | Dedicated node-postgres adapter | API-local SQL, ORM | Transaction composition; server is composition root | Cross-package transaction boundary proves unworkable |
| Configuration | Executable-local schemas | Universal config package | Duplication; extract only stable primitives | Repeated identical parsing need |
| Runtime | Node 24.19.0, pnpm 11.20.0 | Node current non-LTS, pnpm 12 beta | Drift; exact preflight | LTS/security/support change |
| Modules | ESM, NodeNext for Node packages | CommonJS, editor-only aliases | Third-party CJS friction; isolate compatibility | Required dependency cannot interoperate safely |
| Orchestration | pnpm + TS references | Turbo/Nx | Longer CI later; measure first | Measured cache/scheduling need |
| Tests | Vitest; RTL/Playwright/axe; real PG Testcontainers | SQLite/in-memory DB as persistence proof | Runtime availability/flakiness; pinned image/preflight | CI cannot provide compatible runtime |
| Architecture | Exports + TS + pnpm + ESLint + dependency-cruiser + script | Layout-only, large custom analyzer | False confidence; pair with semantic tests | Tool cannot model current ESM/TS graph |
| Migration | Dedicated node-pg-migrate tool | custom runner, dbmate, ORM migration | Runner/version coupling; rehearsal/checksums | Missing required PostgreSQL operation |
| Formatting | Prettier 3 + targeted Markdown checks | Bulk doc rewrite, no formatter | Tool churn; exact pin | Formatter conflicts with accepted source |
| Lockfile | One committed frozen lockfile | per-package/no lockfile | Merge/update noise; reviewed exact updates | Workspace release model changes |

## 22. ADR assessment

Cycle 013 creates three durable ADRs:

- ADR 0030 selects repository-wide ESM, environment-specific TypeScript resolution, project references, and explicit package exports.
- ADR 0031 selects node-pg-migrate in the dedicated database-tool workspace.
- ADR 0032 selects layered static architecture enforcement.

Exact patch versions, script names, ordinary paths, formatting fields, and Testcontainers pinning remain in this specification rather than ADRs because they are expected to evolve within the durable Cycle 010/ADR 0018/0019 decisions.

## 23. Risks, revisit triggers, and open questions

### 23.1 Risks and triggers

- Excessive fragmentation or a future generic shared package can obscure ownership. Revisit only with measured duplication and a named stable responsibility.
- Cycles, framework leakage, DTO/domain confusion, persistence leakage, server code in browser bundles, provider imports, or projection authority require immediate boundary correction.
- Version, Node/pnpm, ESM/CommonJS, alias/runtime, or build-order drift triggers the full compatibility gate before upgrade.
- Tooling or orchestrator complexity must remain below demonstrated project need; measured validation time, not fashion, is the trigger.
- Container absence, flaky integration tests, PostgreSQL divergence, unsafe database targeting, migration races/drift, destructive migration, or stale checksums block database progression.
- Lifecycle scripts, unreviewed overrides, lockfile churn, secret leakage, generated drift, and abandoned dependencies trigger supply-chain review.
- Architecture checks can provide false confidence; any semantic incident expands tests before adding more static rules.
- Any executable implementation hidden in configuration stops Cycle 014 scope and returns to specification/task review.

### 23.2 Questions required before scaffolding

No semantic blocker remains. Cycle 014 must reverify exact patch availability, package peer/engine metadata, and the official PostgreSQL image digest immediately before lockfile creation. It must decide the exact non-secret example variable names needed by its minimal server/database entrypoints without adding unused provider variables.

### 23.3 May wait until contract implementation

- Whether OpenAPI or Zod is the authored wire source and how deterministic derivatives are checked.
- Concrete schema file organization, request limits, cursor encoding, and correlation header spelling.

### 23.4 May wait until migration implementation

- First migration contents, exact advisory-lock key, checksum-ledger DDL, statement/lock timeouts, backfill batches, and reversible development migrations.

### 23.5 May wait until repository implementation

- SQL organization, transaction-context API, row mappers, constraint-name translation, test fixture builders, and projection query implementation.

### 23.6 May wait until authentication/provider integration

- Credential provider/algorithm, challenge/session durations, reauthentication, email/request delivery providers, callback verification, encryption/key custody, and provider retry limits.

### 23.7 May wait until mobile reconsideration

- Separate mobile application/framework and any additional mobile mutation responsibility.

### 23.8 May wait until CI/deployment

- CI provider/workflow, cloud, managed PostgreSQL, production secret manager, observability provider, image build, network/TLS, deployment migrations, backup/RPO/RTO, vulnerability/license/SBOM automation, and update bot.

### 23.9 Product and merchant-validation questions tooling must not resolve

- Fractional quantities; merchant terms; duplicate warnings; Payment method labels; visible numbering; SKU/barcode; durable drafts; Expense categories/permissions; mobile mutations; Product photos; Payment Request workflow; correction dates; shareable summaries; Home emphasis; debt wording; retention/anonymization/export/support/legal wording.

## 24. Implementation sequence and recommendation

The enabled order is:

1. Execute the bounded workspace scaffold and prove static/build gates.
2. Implement source transport schemas and contract mapping.
3. Implement framework-independent domain/application packages with tests.
4. Implement initial migrations and the PostgreSQL integration harness.
5. Implement repository ports/adapters and transaction/recovery behavior.
6. Integrate authentication/session boundaries.
7. Implement the critical journey through Fastify and responsive Next.js.
8. Implement projections and post-commit external delivery when their prerequisites are accepted.
9. Reconsider a separate mobile client only from new product evidence.
10. Specify and implement deployment architecture separately.

Recommended next cycle: **Cycle 014 — Executable Workspace Scaffolding**, **Task 001 — Create the Approved pnpm Workspace Skeleton and Run the Initial Static Validation Gates**. Its objective is to create only the Section 18 scaffold, lock the verified versions, and demonstrate install, format, lint, type, architecture, and production-build gates. It must not implement domain behavior, transport schemas, API routes, database migrations/SQL, repositories, sessions, providers, product UI, Testcontainers/database tests, deployment, or mobile expansion.
