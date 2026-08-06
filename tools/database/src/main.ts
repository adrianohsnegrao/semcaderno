import { resolve } from 'node:path';

import { runMigrations } from './run-migrations.js';

const databaseUrl = process.env['SEM_CADERNO_TEST_DATABASE_URL'];
if (databaseUrl === undefined) {
  throw new Error('The isolated test database URL is required.');
}

const target = new URL(databaseUrl);
const databaseName = target.pathname.slice(1);
if (
  !['postgres:', 'postgresql:'].includes(target.protocol) ||
  !['127.0.0.1', 'localhost', '::1'].includes(target.hostname) ||
  !databaseName.startsWith('sem_caderno_test_')
) {
  throw new Error('Migration execution refused a non-test database target.');
}

await runMigrations(databaseUrl, resolve('migrations'));
