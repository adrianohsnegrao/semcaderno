import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

import { PG_MIGRATE_LOCK_ID, runner } from 'node-pg-migrate';
import { Client } from 'pg';

const applicationSchema = 'sem_caderno';
const historyTable = 'schema_migrations';
const migrationNamePattern = /^\d{14}-[a-z0-9]+(?:-[a-z0-9]+)*\.ts$/;

type MigrationChecksum = Readonly<{
  name: string;
  checksum: string;
}>;

const readChecksums = async (directory: string): Promise<MigrationChecksum[]> => {
  const entries = (await readdir(directory)).filter((entry) => !entry.startsWith('.')).sort();

  return Promise.all(
    entries.map(async (entry) => {
      if (!migrationNamePattern.test(entry)) {
        throw new Error('Migration filename is invalid.');
      }
      const content = await readFile(resolve(directory, entry));
      return {
        name: basename(entry, '.ts'),
        checksum: createHash('sha256').update(content).digest('hex'),
      };
    }),
  );
};

const verifyAppliedChecksums = async (
  client: Client,
  checksums: ReadonlyMap<string, string>,
): Promise<void> => {
  const historyExists = await client.query<{ exists: boolean }>(
    'SELECT to_regclass($1) IS NOT NULL AS exists',
    [`${applicationSchema}.${historyTable}`],
  );
  if (historyExists.rows[0]?.exists !== true) {
    return;
  }

  const applied = await client.query<{ name: string; checksum: string | null }>(
    `SELECT history.name, checksum.checksum_sha256 AS checksum
       FROM sem_caderno.schema_migrations AS history
       LEFT JOIN sem_caderno.schema_migration_checksums AS checksum
         ON checksum.name = history.name
      ORDER BY history.id`,
  );

  for (const migration of applied.rows) {
    const expected = checksums.get(migration.name);
    if (expected === undefined || migration.checksum !== expected) {
      throw new Error('Applied migration checksum mismatch.');
    }
  }
};

const recordChecksums = async (
  client: Client,
  checksums: ReadonlyMap<string, string>,
): Promise<void> => {
  const applied = await client.query<{ name: string }>(
    'SELECT name FROM sem_caderno.schema_migrations ORDER BY id',
  );

  await client.query('BEGIN');
  try {
    for (const migration of applied.rows) {
      const checksum = checksums.get(migration.name);
      if (checksum === undefined) {
        throw new Error('Applied migration source is missing.');
      }
      await client.query(
        `INSERT INTO sem_caderno.schema_migration_checksums (name, checksum_sha256)
         VALUES ($1, $2)
         ON CONFLICT (name) DO NOTHING`,
        [migration.name, checksum],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
};

export const runMigrations = async (databaseUrl: string, directory: string): Promise<void> => {
  const migrationChecksums = await readChecksums(directory);
  const checksums = new Map(
    migrationChecksums.map((migration) => [migration.name, migration.checksum]),
  );
  const client = new Client({ connectionString: databaseUrl });

  await client.connect();
  try {
    const lock = await client.query<{ obtained: boolean }>(
      'SELECT pg_try_advisory_lock($1::bigint) AS obtained',
      [PG_MIGRATE_LOCK_ID],
    );
    if (lock.rows[0]?.obtained !== true) {
      throw new Error('Another migration runner holds the application migration lock.');
    }

    try {
      await client.query('CREATE SCHEMA IF NOT EXISTS sem_caderno');
      await client.query(
        `CREATE TABLE IF NOT EXISTS sem_caderno.schema_migration_checksums (
           name varchar(255) PRIMARY KEY,
           checksum_sha256 char(64) NOT NULL,
           recorded_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
           CONSTRAINT schema_migration_checksums_sha256_length
             CHECK (length(checksum_sha256) = 64)
         )`,
      );
      await verifyAppliedChecksums(client, checksums);

      await runner({
        dbClient: client,
        direction: 'up',
        dir: directory,
        schema: applicationSchema,
        migrationsSchema: applicationSchema,
        migrationsTable: historyTable,
        checkOrder: true,
        singleTransaction: true,
        noLock: true,
        log: () => undefined,
      });

      await recordChecksums(client, checksums);
      await verifyAppliedChecksums(client, checksums);
    } finally {
      await client.query('SELECT pg_advisory_unlock($1::bigint)', [PG_MIGRATE_LOCK_ID]);
    }
  } finally {
    await client.end();
  }
};
