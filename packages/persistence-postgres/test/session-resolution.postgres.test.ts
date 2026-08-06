import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';

import { PostgresSessionResolutionAdapter } from '../src/index.js';

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, '../../..');
const postgresImage =
  'postgres:18.4-bookworm@sha256:1961f96e6029a02c3812d7cb329a3b03a3ac2bb067058dec17b0f5596aca9296';
const createdAt = new Date('2026-08-05T12:00:00Z');
const activeExpiry = new Date('2026-08-06T12:00:00Z');

let container: StartedPostgreSqlContainer | undefined;
let pool: Pool | undefined;
let fixtureSequence = 0;

const currentPool = (): Pool => {
  if (pool === undefined) throw new Error('PostgreSQL integration pool is unavailable.');
  return pool;
};

const nextDigest = (): Buffer => {
  fixtureSequence += 1;
  const digest = Buffer.alloc(32);
  digest.writeUInt32BE(fixtureSequence, 28);
  return digest;
};

const insertUser = async (disabledAt?: Date): Promise<string> => {
  fixtureSequence += 1;
  const email = `session-user-${fixtureSequence}@example.invalid`;
  const result = await currentPool().query<{ id: string }>(
    `INSERT INTO sem_caderno.users (
       email_original, email_normalized, email_verified_at, disabled_at,
       created_at, updated_at, version
     ) VALUES ($1, $2, $3, $4, $5, $5, $6)
     RETURNING id`,
    [email, email, createdAt, disabledAt ?? null, createdAt, 1],
  );
  const id = result.rows[0]?.id;
  if (id === undefined) throw new Error('Synthetic User fixture insertion failed.');
  return id;
};

const insertBusiness = async (userId: string, state: 'active' | 'deactivated' = 'active') => {
  const deactivatedAt = state === 'deactivated' ? new Date('2026-08-05T13:00:00Z') : null;
  const result = await currentPool().query<{ id: string }>(
    `INSERT INTO sem_caderno.businesses (
       state, created_by_user_id, deactivated_at, created_at, updated_at, version
     ) VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [state, userId, deactivatedAt, createdAt, deactivatedAt ?? createdAt, 1],
  );
  const id = result.rows[0]?.id;
  if (id === undefined) throw new Error('Synthetic Business fixture insertion failed.');
  return id;
};

type InsertSessionOptions = Readonly<{
  userId: string;
  digest: Buffer;
  expiresAt?: Date;
  revokedAt?: Date;
  selectedBusinessId?: string;
}>;

const insertSession = async (options: InsertSessionOptions): Promise<string> => {
  const result = await currentPool().query<{ id: string }>(
    `INSERT INTO sem_caderno.sessions (
       digest_version, credential_digest, user_id, selected_business_id,
       created_at, expires_at, revoked_at, updated_at, version
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      1,
      options.digest,
      options.userId,
      options.selectedBusinessId ?? null,
      createdAt,
      options.expiresAt ?? activeExpiry,
      options.revokedAt ?? null,
      options.revokedAt ?? createdAt,
      1,
    ],
  );
  const id = result.rows[0]?.id;
  if (id === undefined) throw new Error('Synthetic Session fixture insertion failed.');
  return id;
};

const lookupFor = (digest: Buffer) => ({
  digestVersion: 1 as const,
  digestBase64Url: digest.toString('base64url'),
});

const expectPostgresCode = async (operation: Promise<unknown>, code: string): Promise<void> => {
  await expect(operation).rejects.toMatchObject({ code });
};

beforeAll(async () => {
  container = await new PostgreSqlContainer(postgresImage)
    .withDatabase('sem_caderno_test_session_resolution')
    .withUsername('sem_caderno_test')
    .withPassword(randomBytes(24).toString('base64url'))
    .start();

  const databaseUrl = container.getConnectionUri();
  await execFileAsync(process.execPath, [resolve(root, 'tools/database/dist/src/main.js')], {
    cwd: resolve(root, 'tools/database'),
    env: { ...process.env, SEM_CADERNO_TEST_DATABASE_URL: databaseUrl },
  });
  await execFileAsync(process.execPath, [resolve(root, 'tools/database/dist/src/main.js')], {
    cwd: resolve(root, 'tools/database'),
    env: { ...process.env, SEM_CADERNO_TEST_DATABASE_URL: databaseUrl },
  });

  pool = new Pool({ connectionString: databaseUrl });
}, 180_000);

afterAll(async () => {
  await pool?.end();
  await container?.stop();
}, 30_000);

describe('session migration foundation', () => {
  it('applies from zero with PostgreSQL 18.4, UUIDv7 defaults, history, and checksums', async () => {
    const version = await currentPool().query<{ version: string }>(
      'SELECT current_setting($1) AS version',
      ['server_version'],
    );
    expect(version.rows[0]?.version).toMatch(/^18\.4/);

    const tables = await currentPool().query<{ tableName: string }>(
      `SELECT table_name AS "tableName"
         FROM information_schema.tables
        WHERE table_schema = $1
        ORDER BY table_name`,
      ['sem_caderno'],
    );
    expect(tables.rows.map((row) => row.tableName)).toEqual([
      'businesses',
      'pre_session_challenges',
      'schema_migration_checksums',
      'schema_migrations',
      'sessions',
      'user_password_credentials',
      'users',
    ]);

    const applied = await currentPool().query<{ name: string; checksum: string }>(
      `SELECT history.name, checksum.checksum_sha256 AS checksum
         FROM sem_caderno.schema_migrations AS history
         INNER JOIN sem_caderno.schema_migration_checksums AS checksum USING (name)
        ORDER BY history.id`,
    );
    expect(applied.rows).toHaveLength(5);
    expect(applied.rows.every((row) => /^[a-f0-9]{64}$/.test(row.checksum))).toBe(true);

    const userId = await insertUser();
    const uuidVersion = await currentPool().query<{ version: number }>(
      'SELECT uuid_extract_version($1::uuid) AS version',
      [userId],
    );
    expect(uuidVersion.rows[0]?.version).toBe(7);
  });

  it('stores only the authorized session columns and no raw credential field', async () => {
    const columns = await currentPool().query<{ columnName: string }>(
      `SELECT column_name AS "columnName"
         FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position`,
      ['sem_caderno', 'sessions'],
    );

    expect(columns.rows.map((row) => row.columnName)).toEqual([
      'id',
      'digest_version',
      'credential_digest',
      'user_id',
      'selected_business_id',
      'created_at',
      'expires_at',
      'revoked_at',
      'updated_at',
      'version',
    ]);
  });

  it('enforces digest, lifecycle, uniqueness, and foreign-key constraints', async () => {
    const userId = await insertUser();
    const digest = nextDigest();
    await insertSession({ userId, digest });

    await expectPostgresCode(insertSession({ userId, digest }), '23505');
    await expectPostgresCode(insertSession({ userId, digest: Buffer.alloc(31) }), '23514');
    await expectPostgresCode(
      insertSession({
        userId,
        digest: nextDigest(),
        expiresAt: createdAt,
      }),
      '23514',
    );

    await expectPostgresCode(
      insertSession({
        userId: '0198f000-0000-7000-8000-000000000001',
        digest: nextDigest(),
      }),
      '23503',
    );
    await expectPostgresCode(
      insertSession({
        userId,
        digest: nextDigest(),
        selectedBusinessId: '0198f000-0000-7000-8000-000000000002',
      }),
      '23503',
    );
  });
});

describe('PostgresSessionResolutionAdapter', () => {
  it('resolves an active session without selected Business', async () => {
    const userId = await insertUser();
    const digest = nextDigest();
    await insertSession({ userId, digest });

    await expect(
      new PostgresSessionResolutionAdapter(currentPool()).resolve({
        sessionLookup: lookupFor(digest),
        evaluatedAt: new Date('2026-08-05T18:00:00Z'),
      }),
    ).resolves.toEqual({ state: 'authenticated', userId, expiresAt: activeExpiry });
  });

  it('returns selected Business as context without checking its lifecycle or Membership', async () => {
    const userId = await insertUser();
    const selectedBusinessId = await insertBusiness(userId, 'deactivated');
    const digest = nextDigest();
    await insertSession({ userId, digest, selectedBusinessId });

    await expect(
      new PostgresSessionResolutionAdapter(currentPool()).resolve({
        sessionLookup: lookupFor(digest),
        evaluatedAt: new Date('2026-08-05T18:00:00Z'),
      }),
    ).resolves.toEqual({
      state: 'authenticated',
      userId,
      expiresAt: activeExpiry,
      selectedBusinessId,
    });
  });

  it.each([
    { label: 'unknown', configure: () => Promise.resolve({ digest: nextDigest() }) },
    {
      label: 'revoked',
      configure: async () => {
        const userId = await insertUser();
        const digest = nextDigest();
        await insertSession({ userId, digest, revokedAt: new Date('2026-08-05T16:00:00Z') });
        return { digest };
      },
    },
    {
      label: 'expired',
      configure: async () => {
        const userId = await insertUser();
        const digest = nextDigest();
        await insertSession({
          userId,
          digest,
          expiresAt: new Date('2026-08-05T17:00:00Z'),
        });
        return { digest };
      },
    },
    {
      label: 'disabled User',
      configure: async () => {
        const userId = await insertUser(new Date('2026-08-05T16:00:00Z'));
        const digest = nextDigest();
        await insertSession({ userId, digest });
        return { digest };
      },
    },
  ])('resolves $label evidence to no active session', async ({ configure }) => {
    const { digest } = await configure();

    await expect(
      new PostgresSessionResolutionAdapter(currentPool()).resolve({
        sessionLookup: lookupFor(digest),
        evaluatedAt: new Date('2026-08-05T18:00:00Z'),
      }),
    ).resolves.toBeUndefined();
  });

  it('treats equality with the absolute expiry instant as expired', async () => {
    const userId = await insertUser();
    const digest = nextDigest();
    await insertSession({ userId, digest });

    await expect(
      new PostgresSessionResolutionAdapter(currentPool()).resolve({
        sessionLookup: lookupFor(digest),
        evaluatedAt: activeExpiry,
      }),
    ).resolves.toBeUndefined();
  });

  it('rejects non-canonical lookup evidence before a query', async () => {
    await expect(
      new PostgresSessionResolutionAdapter(currentPool()).resolve({
        sessionLookup: { digestVersion: 1, digestBase64Url: 'not-canonical' },
        evaluatedAt: new Date('2026-08-05T18:00:00Z'),
      }),
    ).rejects.toThrow('Session lookup evidence is invalid.');
  });

  it('propagates database failure instead of returning no active session', async () => {
    const failedPool = new Pool({ connectionString: container?.getConnectionUri() });
    await failedPool.end();

    await expect(
      new PostgresSessionResolutionAdapter(failedPool).resolve({
        sessionLookup: lookupFor(nextDigest()),
        evaluatedAt: new Date('2026-08-05T18:00:00Z'),
      }),
    ).rejects.toThrow('Session resolution persistence failed.');
  });
});
