# ADR 0030: Use ESM, TypeScript Project References, and Explicit Package Exports

## Status

Accepted.

## Context

Sem Caderno will use a pnpm workspace with separately built web, server, inner-layer, persistence, and migration boundaries. The selected Next.js, Fastify, Node.js, and TypeScript stack needs one module model that works at runtime and does not rely on editor-only aliases or source imports across package roots.

## Decision

Use ECMAScript modules throughout first-party workspace members. Packages declare `type: module`. Node-targeted packages use TypeScript `NodeNext` resolution and standards-correct relative import extensions; the Next.js application uses its supported bundler resolution. Strict TypeScript bases, composite project references for buildable packages, and explicit package exports define the supported dependency graph.

Cross-package imports use package names and public exports. Type-only imports obey the same dependency direction as runtime imports. Production Fastify runs compiled ESM JavaScript; Next.js owns web compilation. CommonJS is accepted only at isolated third-party compatibility boundaries.

## Consequences

- Build-time and runtime module behavior remain aligned.
- Package references and declarations make dependency order explicit.
- Deep imports and editor-only aliases are not supported.
- Node-targeted relative imports require runtime `.js` suffixes in TypeScript source.
- Some CommonJS dependencies may require narrowly documented interop.

## Alternatives Considered

- CommonJS throughout. Rejected because it conflicts with the current ESM direction of selected tooling and adds a second long-term module model.
- Bundler resolution for every package. Rejected because server and tool packages must match Node runtime behavior without a bundler.
- Source-level cross-package aliases. Rejected because aliases can type-check while failing at runtime or bypassing package exports.
- Let Next.js transpile all workspace source. Rejected because it would make a presentation framework responsible for inner-package build semantics.

## Risks and Revisit Triggers

- Revisit if a required maintained dependency cannot interoperate with ESM safely.
- Revisit TypeScript module settings when a supported major changes Node module semantics.
- A package that needs hidden deep imports indicates an inadequate public API and requires an explicit boundary review.

## Relationship to Existing Decisions and Specifications

This decision refines ADRs 0017 and 0019 without changing ADR 0016 authority boundaries. Exact compiler options and current versions are governed by the Cycle 013 workspace specification.

## Follow-up Work

- Create the approved TypeScript bases, package references, and package exports in Cycle 014.
- Add module-resolution and cross-package build checks to the initial validation gates.
