import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const generatedPaths = [
  'apps/server/dist',
  'apps/web/.next',
  'apps/web/tsconfig.tsbuildinfo',
  'packages/application/dist',
  'packages/contracts/dist',
  'packages/domain/dist',
  'packages/persistence-postgres/dist',
  'tools/database/dist',
  'coverage',
  'test-results',
  'playwright-report',
];

for (const path of generatedPaths) {
  rmSync(resolve(root, path), { force: true, recursive: true });
}

console.log('Removed known reproducible build and test outputs.');
