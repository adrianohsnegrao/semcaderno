import { resolve } from 'node:path';

import { runMigrations } from './run-migrations.js';

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run production migrations.');
}

await runMigrations(databaseUrl, resolve('migrations'));
