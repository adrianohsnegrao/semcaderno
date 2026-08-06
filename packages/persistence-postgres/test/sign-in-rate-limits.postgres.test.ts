import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import type { SignInRateLimitAccountKey, SignInRateLimitPort } from '@sem-caderno/application';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool, type PoolClient } from 'pg';

import { PostgresSignInRateLimitAdapter } from '../src/index.js';

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, '../../..');
const postgresImage =
  'postgres:18.4-bookworm@sha256:1961f96e6029a02c3812d7cb329a3b03a3ac2bb067058dec17b0f5596aca9296';
const t0 = new Date('2026-08-06T12:00:00Z');
const windowEnd = new Date('2026-08-06T12:15:00Z');
const retentionEnd = new Date('2026-08-07T12:00:00Z');

let container: StartedPostgreSqlContainer | undefined;
let pool: Pool | undefined;
let databaseUrl = '';
let fixtureSequence = 0;

const currentPool = (): Pool => {
  if (pool === undefined) throw new Error('PostgreSQL integration pool is unavailable.');
  return pool;
};

const nextAccountKey = (): SignInRateLimitAccountKey => {
  fixtureSequence += 1;
  const digest = Buffer.alloc(32);
  digest.writeUInt32BE(fixtureSequence, 28);
  return Object.freeze({
    digestVersion: 1,
    digestBase64Url: digest.toString('base64url'),
  }) as SignInRateLimitAccountKey;
};

const digestFor = (accountKey: SignInRateLimitAccountKey) =>
  Buffer.from(accountKey.digestBase64Url, 'base64url');

const lockIdFor = (accountKey: SignInRateLimitAccountKey) =>
  digestFor(accountKey).readBigInt64BE(0).toString();

type StoredState = Readonly<{
  failureCount: number;
  windowStartedAt: Date;
  windowEndsAt: Date;
  updatedAt: Date;
  retentionExpiresAt: Date;
  version: string;
}>;

const storedState = async (accountKey: SignInRateLimitAccountKey) => {
  const result = await currentPool().query<StoredState>(
    `SELECT
       failure_count AS "failureCount",
       window_started_at AS "windowStartedAt",
       window_ends_at AS "windowEndsAt",
       updated_at AS "updatedAt",
       retention_expires_at AS "retentionExpiresAt",
       version
     FROM sem_caderno.sign_in_rate_limits
     WHERE account_key_version = $1 AND account_key_digest = $2`,
    [accountKey.digestVersion, digestFor(accountKey)],
  );
  return result.rows[0];
};

const recordFailures = async (
  adapter: SignInRateLimitPort,
  accountKey: SignInRateLimitAccountKey,
  count: number,
  occurredAt = t0,
) => {
  const outcomes = [];
  for (let index = 0; index < count; index += 1) {
    outcomes.push(await adapter.recordFailure({ accountKey, occurredAt }));
  }
  return outcomes;
};

const expectPostgresCode = async (operation: Promise<unknown>, code: string): Promise<void> => {
  await expect(operation).rejects.toMatchObject({ code });
};

const holdAccountLock = async (accountKey: SignInRateLimitAccountKey): Promise<PoolClient> => {
  const client = await currentPool().connect();
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock($1::bigint)', [lockIdFor(accountKey)]);
  return client;
};

const waitForAdvisoryWait = async (applicationName: string): Promise<void> => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const waiting = await currentPool().query<{ waiting: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM pg_stat_activity
          WHERE application_name = $1 AND wait_event = 'advisory'
       ) AS waiting`,
      [applicationName],
    );
    if (waiting.rows[0]?.waiting === true) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 10));
  }
  throw new Error('Synthetic operation did not reach the advisory-lock wait point.');
};

beforeAll(async () => {
  container = await new PostgreSqlContainer(postgresImage)
    .withDatabase('sem_caderno_test_sign_in_rate_limits')
    .withUsername('sem_caderno_test')
    .withPassword(randomBytes(24).toString('base64url'))
    .start();
  databaseUrl = container.getConnectionUri();
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

beforeEach(async () => {
  await currentPool().query('TRUNCATE sem_caderno.sign_in_rate_limits');
});

describe('sign-in rate-limit migration', () => {
  it('creates the exact aggregate-only shape and ordered checksum', async () => {
    const columns = await currentPool().query<{ columnName: string }>(
      `SELECT column_name AS "columnName"
         FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position`,
      ['sem_caderno', 'sign_in_rate_limits'],
    );
    expect(columns.rows.map((row) => row.columnName)).toEqual([
      'account_key_version',
      'account_key_digest',
      'window_started_at',
      'window_ends_at',
      'failure_count',
      'updated_at',
      'retention_expires_at',
      'version',
    ]);

    const applied = await currentPool().query<{ name: string; checksum: string }>(
      `SELECT history.name, checksum.checksum_sha256 AS checksum
         FROM sem_caderno.schema_migrations AS history
         INNER JOIN sem_caderno.schema_migration_checksums AS checksum USING (name)
        ORDER BY history.id`,
    );
    expect(applied.rows).toHaveLength(6);
    expect(applied.rows.at(-1)?.name).toBe('20260806000300-create-sign-in-rate-limits');
    expect(applied.rows.every((row) => /^[a-f0-9]{64}$/.test(row.checksum))).toBe(true);

    const indexes = await currentPool().query<{ indexName: string }>(
      `SELECT indexname AS "indexName"
         FROM pg_indexes
        WHERE schemaname = $1 AND tablename = $2
        ORDER BY indexname`,
      ['sem_caderno', 'sign_in_rate_limits'],
    );
    expect(indexes.rows.map((row) => row.indexName)).toEqual([
      'sign_in_rate_limits_pk',
      'sign_in_rate_limits_retention_expires_at_idx',
    ]);
  });

  it('enforces key, fixed-window, count, chronology, retention, and version constraints', async () => {
    const insert = (overrides: Partial<Record<string, unknown>> = {}) => {
      const values = {
        accountKeyVersion: 1,
        accountKeyDigest: randomBytes(32),
        windowStartedAt: t0,
        windowEndsAt: windowEnd,
        failureCount: 1,
        updatedAt: t0,
        retentionExpiresAt: retentionEnd,
        version: 1,
        ...overrides,
      };
      return currentPool().query(
        `INSERT INTO sem_caderno.sign_in_rate_limits (
           account_key_version, account_key_digest, window_started_at, window_ends_at,
           failure_count, updated_at, retention_expires_at, version
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        Object.values(values),
      );
    };

    await insert();
    await expectPostgresCode(insert({ accountKeyVersion: 2 }), '23514');
    await expectPostgresCode(insert({ accountKeyDigest: randomBytes(31) }), '23514');
    await expectPostgresCode(
      insert({ windowEndsAt: new Date('2026-08-06T12:14:59.999Z') }),
      '23514',
    );
    await expectPostgresCode(insert({ failureCount: 0 }), '23514');
    await expectPostgresCode(insert({ failureCount: 11 }), '23514');
    await expectPostgresCode(insert({ updatedAt: windowEnd }), '23514');
    await expectPostgresCode(
      insert({ retentionExpiresAt: new Date('2026-08-07T11:59:59.999Z') }),
      '23514',
    );
    await expectPostgresCode(insert({ version: 0 }), '23514');
  });
});

describe('PostgresSignInRateLimitAdapter', () => {
  it('checks absent state, records the tenth failure, and limits only subsequent checks', async () => {
    const adapter = new PostgresSignInRateLimitAdapter(currentPool());
    const accountKey = nextAccountKey();
    await expect(adapter.check({ accountKey, evaluatedAt: t0 })).resolves.toEqual({
      outcome: 'allowed',
    });

    const outcomes = await recordFailures(adapter, accountKey, 10);
    expect(outcomes.slice(0, 9)).toEqual(Array.from({ length: 9 }, () => ({ outcome: 'allowed' })));
    expect(outcomes[9]).toEqual({ outcome: 'limited', retryAt: windowEnd });
    await expect(adapter.check({ accountKey, evaluatedAt: t0 })).resolves.toEqual({
      outcome: 'limited',
      retryAt: windowEnd,
    });
    expect(await storedState(accountKey)).toEqual({
      failureCount: 10,
      windowStartedAt: t0,
      windowEndsAt: windowEnd,
      updatedAt: t0,
      retentionExpiresAt: retentionEnd,
      version: '10',
    });
  });

  it('treats exact window expiry as allowed and replaces it with a fresh count-one window', async () => {
    const adapter = new PostgresSignInRateLimitAdapter(currentPool());
    const accountKey = nextAccountKey();
    await recordFailures(adapter, accountKey, 10);
    await expect(adapter.check({ accountKey, evaluatedAt: windowEnd })).resolves.toEqual({
      outcome: 'allowed',
    });
    await expect(adapter.recordFailure({ accountKey, occurredAt: windowEnd })).resolves.toEqual({
      outcome: 'allowed',
    });
    expect(await storedState(accountKey)).toEqual({
      failureCount: 1,
      windowStartedAt: windowEnd,
      windowEndsAt: new Date('2026-08-06T12:30:00Z'),
      updatedAt: windowEnd,
      retentionExpiresAt: new Date('2026-08-07T12:15:00Z'),
      version: '11',
    });
  });

  it('keeps saturated records non-mutating and clears present or absent state idempotently', async () => {
    const adapter = new PostgresSignInRateLimitAdapter(currentPool());
    const accountKey = nextAccountKey();
    await recordFailures(adapter, accountKey, 10);
    await expect(
      adapter.recordFailure({ accountKey, occurredAt: new Date('2026-08-06T12:10:00Z') }),
    ).resolves.toEqual({ outcome: 'limited', retryAt: windowEnd });
    expect((await storedState(accountKey))?.updatedAt).toEqual(t0);
    expect((await storedState(accountKey))?.version).toBe('10');

    await expect(adapter.clear({ accountKey })).resolves.toBeUndefined();
    await expect(adapter.clear({ accountKey })).resolves.toBeUndefined();
    expect(await storedState(accountKey)).toBeUndefined();
  });

  it('rejects temporal regression and database failure instead of failing open', async () => {
    const adapter = new PostgresSignInRateLimitAdapter(currentPool());
    const accountKey = nextAccountKey();
    await adapter.recordFailure({ accountKey, occurredAt: new Date('2026-08-06T12:05:00Z') });
    await expect(adapter.check({ accountKey, evaluatedAt: t0 })).rejects.toThrow(
      'Sign-in rate-limit persistence failed.',
    );
    await expect(adapter.recordFailure({ accountKey, occurredAt: t0 })).rejects.toThrow(
      'Sign-in rate-limit persistence failed.',
    );

    const failedPool = new Pool({ connectionString: databaseUrl });
    await failedPool.end();
    await expect(
      new PostgresSignInRateLimitAdapter(failedPool).check({ accountKey, evaluatedAt: t0 }),
    ).rejects.toThrow('Sign-in rate-limit persistence failed.');
  });

  it('deletes only bounded rows at exact retention equality', async () => {
    const adapter = new PostgresSignInRateLimitAdapter(currentPool());
    const keys = [nextAccountKey(), nextAccountKey(), nextAccountKey()];
    await Promise.all(
      keys.map((accountKey) => adapter.recordFailure({ accountKey, occurredAt: t0 })),
    );

    await expect(
      adapter.deleteExpired({
        evaluatedAt: new Date('2026-08-07T11:59:59.999Z'),
        limit: 2,
      }),
    ).resolves.toBe(0);
    await expect(adapter.deleteExpired({ evaluatedAt: retentionEnd, limit: 2 })).resolves.toBe(2);
    await expect(adapter.deleteExpired({ evaluatedAt: retentionEnd, limit: 2 })).resolves.toBe(1);
    await expect(adapter.deleteExpired({ evaluatedAt: retentionEnd, limit: 2 })).resolves.toBe(0);
  });

  it('serializes concurrent creation and increments without loss or values above ten', async () => {
    const adapter = new PostgresSignInRateLimitAdapter(currentPool());
    const accountKey = nextAccountKey();
    const outcomes = await Promise.all(
      Array.from({ length: 14 }, () => adapter.recordFailure({ accountKey, occurredAt: t0 })),
    );

    expect(outcomes.filter((outcome) => outcome.outcome === 'allowed')).toHaveLength(9);
    expect(outcomes.filter((outcome) => outcome.outcome === 'limited')).toHaveLength(5);
    expect((await storedState(accountKey))?.failureCount).toBe(10);
    expect((await storedState(accountKey))?.version).toBe('10');
  });

  it.each([
    { first: 'check', expectedFirst: 'allowed', expectedSecond: 'limited' },
    { first: 'record', expectedFirst: 'limited', expectedSecond: 'limited' },
  ] as const)(
    'forces the $first-first check/threshold-record linearization order',
    async ({ first, expectedFirst, expectedSecond }) => {
      const accountKey = nextAccountKey();
      const setup = new PostgresSignInRateLimitAdapter(currentPool());
      await recordFailures(setup, accountKey, 9);
      const blocker = await holdAccountLock(accountKey);
      const firstName = `rate-limit-${first}-threshold-first-${fixtureSequence}`;
      const secondName = `rate-limit-${first}-threshold-second-${fixtureSequence}`;
      const firstPool = new Pool({
        connectionString: databaseUrl,
        application_name: firstName,
        max: 1,
      });
      const secondPool = new Pool({
        connectionString: databaseUrl,
        application_name: secondName,
        max: 1,
      });
      const firstAdapter = new PostgresSignInRateLimitAdapter(firstPool);
      const secondAdapter = new PostgresSignInRateLimitAdapter(secondPool);
      const check = (adapter: PostgresSignInRateLimitAdapter) =>
        adapter.check({ accountKey, evaluatedAt: t0 });
      const record = (adapter: PostgresSignInRateLimitAdapter) =>
        adapter.recordFailure({ accountKey, occurredAt: t0 });

      const firstOperation = first === 'check' ? check(firstAdapter) : record(firstAdapter);
      await waitForAdvisoryWait(firstName);
      const secondOperation = first === 'check' ? record(secondAdapter) : check(secondAdapter);
      await waitForAdvisoryWait(secondName);
      await blocker.query('COMMIT');
      blocker.release();

      const [firstResult, secondResult] = await Promise.all([firstOperation, secondOperation]);
      await firstPool.end();
      await secondPool.end();

      expect(firstResult.outcome).toBe(expectedFirst);
      expect(secondResult.outcome).toBe(expectedSecond);
      expect((await storedState(accountKey))?.failureCount).toBe(10);
    },
  );

  it('atomically replaces one expired window under concurrent recording', async () => {
    const adapter = new PostgresSignInRateLimitAdapter(currentPool());
    const accountKey = nextAccountKey();
    await adapter.recordFailure({ accountKey, occurredAt: t0 });
    await Promise.all(
      Array.from({ length: 7 }, () => adapter.recordFailure({ accountKey, occurredAt: windowEnd })),
    );

    expect(await storedState(accountKey)).toEqual({
      failureCount: 7,
      windowStartedAt: windowEnd,
      windowEndsAt: new Date('2026-08-06T12:30:00Z'),
      updatedAt: windowEnd,
      retentionExpiresAt: new Date('2026-08-07T12:15:00Z'),
      version: '8',
    });
  });

  it.each([
    { first: 'clear', expectedCount: 1 },
    { first: 'record', expectedCount: undefined },
  ] as const)(
    'forces the $first-first concurrent clear/record ordering',
    async ({ first, expectedCount }) => {
      const accountKey = nextAccountKey();
      const setup = new PostgresSignInRateLimitAdapter(currentPool());
      await setup.recordFailure({ accountKey, occurredAt: t0 });
      const blocker = await holdAccountLock(accountKey);
      const firstName = `rate-limit-${first}-first-${fixtureSequence}`;
      const secondName = `rate-limit-${first}-second-${fixtureSequence}`;
      const firstPool = new Pool({
        connectionString: databaseUrl,
        application_name: firstName,
        max: 1,
      });
      const secondPool = new Pool({
        connectionString: databaseUrl,
        application_name: secondName,
        max: 1,
      });
      const firstAdapter = new PostgresSignInRateLimitAdapter(firstPool);
      const secondAdapter = new PostgresSignInRateLimitAdapter(secondPool);

      const clear = (adapter: PostgresSignInRateLimitAdapter) => adapter.clear({ accountKey });
      const record = (adapter: PostgresSignInRateLimitAdapter) =>
        adapter.recordFailure({ accountKey, occurredAt: t0 });
      const firstOperation = first === 'clear' ? clear(firstAdapter) : record(firstAdapter);
      await waitForAdvisoryWait(firstName);
      const secondOperation = first === 'clear' ? record(secondAdapter) : clear(secondAdapter);
      await waitForAdvisoryWait(secondName);

      await blocker.query('COMMIT');
      blocker.release();
      await Promise.all([firstOperation, secondOperation]);
      await firstPool.end();
      await secondPool.end();

      expect((await storedState(accountKey))?.failureCount).toBe(expectedCount);
    },
  );
});
