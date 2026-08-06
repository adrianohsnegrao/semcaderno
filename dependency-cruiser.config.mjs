/** @type {import('dependency-cruiser').IConfiguration} */
const config = {
  forbidden: [
    {
      name: 'no-circular-workspace-dependencies',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'domain-does-not-import-outer-layers',
      severity: 'error',
      from: { path: '^packages/domain/' },
      to: { path: '^(apps|tools|packages/(application|contracts|persistence-postgres))/' },
    },
    {
      name: 'application-does-not-import-outer-layers',
      severity: 'error',
      from: { path: '^packages/application/' },
      to: { path: '^(apps|tools|packages/(contracts|persistence-postgres))/' },
    },
    {
      name: 'contracts-remain-independent',
      severity: 'error',
      from: { path: '^packages/contracts/' },
      to: { path: '^(apps|tools|packages/(domain|application|persistence-postgres))/' },
    },
    {
      name: 'web-remains-presentation-only',
      severity: 'error',
      from: { path: '^apps/web/' },
      to: { path: '^(apps/server|tools|packages/(domain|application|persistence-postgres))/' },
    },
    {
      name: 'persistence-does-not-import-presentation-or-transport',
      severity: 'error',
      from: { path: '^packages/persistence-postgres/' },
      to: { path: '^(apps|tools|packages/contracts)/' },
    },
    {
      name: 'database-tool-is-isolated',
      severity: 'error',
      from: { path: '^tools/database/' },
      to: { path: '^(apps|packages)/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: '(^|/)(dist|\\.next|coverage|node_modules)/',
    includeOnly: '^(apps|packages|tools/database)/',
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      conditionNames: ['types', 'import', 'default'],
      exportsFields: ['exports'],
    },
  },
};

export default config;
