import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const expectedMembers = new Map([
  ['apps/web', '@sem-caderno/web'],
  ['apps/server', '@sem-caderno/server'],
  ['packages/domain', '@sem-caderno/domain'],
  ['packages/application', '@sem-caderno/application'],
  ['packages/contracts', '@sem-caderno/contracts'],
  ['packages/persistence-postgres', '@sem-caderno/persistence-postgres'],
  ['tools/database', '@sem-caderno/database-migrations'],
]);

const allowedWorkspaceDependencies = new Map([
  ['@sem-caderno/web', new Set(['@sem-caderno/contracts'])],
  [
    '@sem-caderno/server',
    new Set([
      '@sem-caderno/application',
      '@sem-caderno/contracts',
      '@sem-caderno/persistence-postgres',
    ]),
  ],
  ['@sem-caderno/domain', new Set()],
  ['@sem-caderno/application', new Set(['@sem-caderno/domain'])],
  ['@sem-caderno/contracts', new Set()],
  [
    '@sem-caderno/persistence-postgres',
    new Set(['@sem-caderno/application', '@sem-caderno/domain']),
  ],
  ['@sem-caderno/database-migrations', new Set()],
]);

const allowedExternalDependencies = new Map([
  ['@sem-caderno/web', new Set(['next', 'react', 'react-dom', '@types/react', '@types/react-dom'])],
  [
    '@sem-caderno/server',
    new Set(['@fastify/cookie', '@testcontainers/postgresql', '@types/pg', 'fastify', 'pg']),
  ],
  ['@sem-caderno/domain', new Set()],
  ['@sem-caderno/application', new Set()],
  ['@sem-caderno/contracts', new Set(['zod'])],
  [
    '@sem-caderno/persistence-postgres',
    new Set(['argon2', 'pg', '@types/pg', '@testcontainers/postgresql']),
  ],
  ['@sem-caderno/database-migrations', new Set(['node-pg-migrate', 'pg', '@types/pg'])],
]);

const sourceExtensions = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx']);
const importPattern =
  /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\sfrom\s*)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const sqlPattern =
  /\b(?:SELECT\s+.+\s+FROM|INSERT\s+INTO|UPDATE\s+.+\s+SET|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE)\b/i;

const toPosix = (path) => path.split(sep).join('/');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const collectFiles = (directory) => {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (['node_modules', 'dist', '.next', 'coverage'].includes(entry.name)) return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  });
};

const packageNameFromSpecifier = (specifier) => {
  if (specifier.startsWith('@')) return specifier.split('/').slice(0, 2).join('/');
  return specifier.split('/')[0];
};

const findWorkspaceManifests = () => {
  const manifests = new Map();
  for (const parent of ['apps', 'packages', 'tools']) {
    const parentPath = join(root, parent);
    if (!existsSync(parentPath)) continue;
    for (const entry of readdirSync(parentPath, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const relativePath = `${parent}/${entry.name}`;
      const manifestPath = join(parentPath, entry.name, 'package.json');
      if (existsSync(manifestPath)) manifests.set(relativePath, readJson(manifestPath));
    }
  }
  return manifests;
};

const allDeclaredDependencies = (manifest) => ({
  ...(manifest.dependencies ?? {}),
  ...(manifest.devDependencies ?? {}),
  ...(manifest.peerDependencies ?? {}),
  ...(manifest.optionalDependencies ?? {}),
});

const findCycle = (graph) => {
  const visiting = new Set();
  const visited = new Set();

  const visit = (node, trail) => {
    if (visiting.has(node)) return [...trail, node];
    if (visited.has(node)) return undefined;
    visiting.add(node);
    for (const dependency of graph.get(node) ?? []) {
      const cycle = visit(dependency, [...trail, node]);
      if (cycle) return cycle;
    }
    visiting.delete(node);
    visited.add(node);
    return undefined;
  };

  for (const node of graph.keys()) {
    const cycle = visit(node, []);
    if (cycle) return cycle;
  }
  return undefined;
};

const validateManifestModel = (manifests) => {
  const errors = [];
  const names = new Set([...manifests.values()].map((manifest) => manifest.name));
  const graph = new Map();

  for (const [path, expectedName] of expectedMembers) {
    const manifest = manifests.get(path);
    if (!manifest) {
      errors.push(`Missing approved workspace member: ${path}`);
      continue;
    }
    if (manifest.name !== expectedName) errors.push(`${path} must be named ${expectedName}`);
    if (manifest.private !== true) errors.push(`${path} must remain private`);
    if (manifest.type !== 'module') errors.push(`${path} must use ESM`);
    if (path !== 'apps/web' && !manifest.exports)
      errors.push(`${path} must declare package exports`);

    const declared = allDeclaredDependencies(manifest);
    const workspaceEdges = [];
    for (const [dependency, version] of Object.entries(declared)) {
      if (dependency.startsWith('@sem-caderno/')) {
        workspaceEdges.push(dependency);
        if (!names.has(dependency))
          errors.push(`${path} declares unknown workspace package ${dependency}`);
        if (!String(version).startsWith('workspace:')) {
          errors.push(`${path} must use workspace protocol for ${dependency}`);
        }
        if (!allowedWorkspaceDependencies.get(expectedName)?.has(dependency)) {
          errors.push(`${expectedName} may not depend on ${dependency}`);
        }
      } else if (!allowedExternalDependencies.get(expectedName)?.has(dependency)) {
        errors.push(`${expectedName} has unapproved external dependency ${dependency}`);
      }
    }
    graph.set(expectedName, workspaceEdges);
  }

  for (const path of manifests.keys()) {
    if (!expectedMembers.has(path)) errors.push(`Unexpected workspace member: ${path}`);
    if (/(?:^|\/)(?:shared|common|utils)$/.test(path)) {
      errors.push(`Generic workspace boundary is prohibited: ${path}`);
    }
  }

  const cycle = findCycle(graph);
  if (cycle) errors.push(`Circular workspace dependency: ${cycle.join(' -> ')}`);
  return errors;
};

const validateSourceImports = (manifests) => {
  const errors = [];
  for (const [packagePath, manifest] of manifests) {
    const packageRoot = join(root, packagePath);
    const declared = allDeclaredDependencies(manifest);
    for (const file of collectFiles(packageRoot)) {
      if (!sourceExtensions.has(extname(file)) || file.endsWith('.d.ts')) continue;
      const content = readFileSync(file, 'utf8');
      const relativeFile = toPosix(relative(root, file));
      const isServerPostgresTest = /^apps\/server\/test\/[^/]+\.postgres\.test\.ts$/.test(
        relativeFile,
      );
      if (
        sqlPattern.test(content) &&
        packagePath !== 'packages/persistence-postgres' &&
        packagePath !== 'tools/database' &&
        !isServerPostgresTest
      ) {
        errors.push(`${relativeFile} contains raw SQL outside an approved database boundary`);
      }
      for (const match of content.matchAll(importPattern)) {
        const specifier = match[1] ?? match[2];
        if (!specifier) continue;
        if (specifier.startsWith('.')) {
          const target = resolve(dirname(file), specifier);
          if (!target.startsWith(`${packageRoot}${sep}`) && target !== packageRoot) {
            errors.push(`${relativeFile} crosses its package root with ${specifier}`);
          }
          continue;
        }

        const dependency = packageNameFromSpecifier(specifier);
        if (dependency.startsWith('@sem-caderno/')) {
          if (specifier !== dependency) {
            errors.push(`${relativeFile} deep-imports ${specifier}`);
          }
          if (!declared[dependency]) {
            errors.push(`${relativeFile} imports undeclared workspace package ${dependency}`);
          }
        } else if (!dependency.startsWith('node:') && !declared[dependency]) {
          errors.push(`${relativeFile} imports undeclared dependency ${dependency}`);
        }

        if (
          (packagePath === 'apps/web' || packagePath === 'packages/contracts') &&
          specifier.startsWith('node:')
        ) {
          errors.push(`${relativeFile} imports Node-only module ${specifier}`);
        }
      }
    }
  }
  return errors;
};

const validateRepositoryShape = () => {
  const errors = [];
  const allFiles = collectFiles(root).map((file) => toPosix(relative(root, file)));
  const forbidden = [
    /^apps\/mobile\//,
    /(?:^|\/)projection-worker(?:\/|$)/,
    /(?:^|\/)(?:provider|providers|integrations)(?:\/|$)/,
    /^\.github\/workflows\//,
    /(?:^|\/)(?:Dockerfile|compose[^/]*\.ya?ml)$/i,
    /\.sql$/i,
  ];
  for (const file of allFiles) {
    if (forbidden.some((pattern) => pattern.test(file)))
      errors.push(`Forbidden scaffold artifact: ${file}`);
    const name = file.split('/').at(-1);
    if (name === '.env' || (name?.startsWith('.env.') && name !== '.env.example')) {
      errors.push(`Active environment file is prohibited: ${file}`);
    }
  }

  return errors;
};

const runSelfTest = () => {
  const valid = new Map(
    [...expectedMembers].map(([path, name]) => [
      path,
      {
        name,
        private: true,
        type: 'module',
        ...(path === 'apps/web' ? {} : { exports: { '.': './dist/index.js' } }),
      },
    ]),
  );
  const validErrors = validateManifestModel(valid);
  if (validErrors.length > 0) throw new Error(`Valid fixture failed: ${validErrors.join('; ')}`);

  const invalid = new Map(valid);
  invalid.set('packages/domain', {
    ...invalid.get('packages/domain'),
    dependencies: { fastify: '5.11.2' },
  });
  invalid.set('packages/shared', {
    name: '@sem-caderno/shared',
    private: true,
    type: 'module',
    exports: { '.': './dist/index.js' },
  });
  const invalidErrors = validateManifestModel(invalid);
  if (!invalidErrors.some((error) => error.includes('unapproved external dependency fastify'))) {
    throw new Error('Invalid framework dependency fixture was not rejected.');
  }
  if (!invalidErrors.some((error) => error.includes('Unexpected workspace member'))) {
    throw new Error('Unexpected workspace fixture was not rejected.');
  }
  console.log('Architecture validator self-test passed valid and controlled-invalid fixtures.');
};

if (process.argv.includes('--self-test')) {
  runSelfTest();
} else {
  const manifests = findWorkspaceManifests();
  const errors = [
    ...validateManifestModel(manifests),
    ...validateSourceImports(manifests),
    ...validateRepositoryShape(),
  ];
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
  } else {
    console.log(
      'Architecture verified: seven approved private workspaces and no structural violations.',
    );
  }
}
