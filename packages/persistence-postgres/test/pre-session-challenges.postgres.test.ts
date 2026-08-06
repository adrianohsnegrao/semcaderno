import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import type { PreSessionChallengePort, PreSessionCsrfDigest } from '@sem-caderno/application';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';

import { PostgresPreSessionChallengeAdapter } from '../src/index.js';

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, '../../..');
const postgresImage =
  'postgres:18.4-bookworm@sha256:1961f96e6029a02c3812d7cb329a3b03a3ac2bb067058dec17b0f5596aca9296';
const createdAt = new Date('2026-08-06T12:00:00Z');
const expiresAt = new Date('2026-08-06T12:10:00Z');

let container: StartedPostgreSqlContainer | undefined;
let pool: Pool | undefined;
let fixtureSequence = 0;

const currentPool = (): Pool => {
  if (pool === undefined) throw new Error('PostgreSQL integration pool is unavailable.');
  return pool;
};

const nextDigest = (): PreSessionCsrfDigest => {
  fixtureSequence += 1;
  const digest = Buffer.alloc(32);
  digest.writeUInt32BE(fixtureSequence, 28);
  return {
    digestVersion: 1,
    digestBase64Url: digest.toString('base64url'),
  } as PreSessionCsrfDigest;
};

const createChallenge = (
  adapter: PreSessionChallengePort,
  challengeDigest: PreSessionCsrfDigest,
  challengeExpiresAt = expiresAt,
) =>
  adapter.create({
    challengeDigest,
    createdAt,
    expiresAt: challengeExpiresAt,
  });

beforeAll(async () => {
  container = await new PostgreSqlContainer(postgresImage)
    .withDatabase('sem_caderno_test_pre_session_challenges')
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

describe('pre-session challenge migration', () => {
  it('creates only the digest and lifecycle columns and records the ordered checksum', async () => {
    const columns = await currentPool().query<{ columnName: string }>(
      `SELECT column_name AS "columnName"
         FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position`,
      ['sem_caderno', 'pre_session_challenges'],
    );
    expect(columns.rows.map((row) => row.columnName)).toEqual([
      'id',
      'digest_version',
      'challenge_digest',
      'created_at',
      'expires_at',
      'consumed_at',
      'version',
    ]);

    const applied = await currentPool().query<{ name: string; checksum: string }>(
      `SELECT history.name, checksum.checksum_sha256 AS checksum
         FROM sem_caderno.schema_migrations AS history
         INNER JOIN sem_caderno.schema_migration_checksums AS checksum USING (name)
        ORDER BY history.id`,
    );
    expect(applied.rows).toHaveLength(5);
    expect(applied.rows.at(-1)?.name).toBe('20260806000200-create-pre-session-challenges');
    expect(applied.rows.every((row) => /^[a-f0-9]{64}$/.test(row.checksum))).toBe(true);
  });

  it('enforces canonical lifecycle, digest uniqueness, and positive version', async () => {
    const adapter = new PostgresPreSessionChallengeAdapter(currentPool());
    const digest = nextDigest();
    await createChallenge(adapter, digest);

    await expect(createChallenge(adapter, digest)).rejects.toThrow(
      'Pre-session challenge creation persistence failed.',
    );
    await expect(
      currentPool().query(
        `INSERT INTO sem_caderno.pre_session_challenges (
           digest_version, challenge_digest, created_at, expires_at, consumed_at, version
         ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [1, Buffer.alloc(31), createdAt, expiresAt, null, 1],
      ),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      currentPool().query(
        `INSERT INTO sem_caderno.pre_session_challenges (
           digest_version, challenge_digest, created_at, expires_at, consumed_at, version
         ) VALUES ($1, $2, $3, $3, $4, $5)`,
        [1, Buffer.alloc(32, 1), createdAt, null, 1],
      ),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      currentPool().query(
        `INSERT INTO sem_caderno.pre_session_challenges (
           digest_version, challenge_digest, created_at, expires_at, consumed_at, version
         ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [1, Buffer.alloc(32, 2), createdAt, expiresAt, expiresAt, 1],
      ),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      currentPool().query(
        `INSERT INTO sem_caderno.pre_session_challenges (
           digest_version, challenge_digest, created_at, expires_at, consumed_at, version
         ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [2, Buffer.alloc(32, 3), createdAt, expiresAt, null, 1],
      ),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      currentPool().query(
        `INSERT INTO sem_caderno.pre_session_challenges (
           digest_version, challenge_digest, created_at, expires_at, consumed_at, version
         ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [1, Buffer.alloc(32, 4), createdAt, expiresAt, null, 0],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });
});

describe('PostgresPreSessionChallengeAdapter', () => {
  it('persists only the keyed digest and explicit lifecycle state', async () => {
    const adapter = new PostgresPreSessionChallengeAdapter(currentPool());
    const challengeDigest = nextDigest();
    await createChallenge(adapter, challengeDigest);

    const stored = await currentPool().query<{
      challengeDigest: Buffer;
      digestVersion: number;
      createdAt: Date;
      expiresAt: Date;
      consumedAt: Date | null;
      version: string;
    }>(
      `SELECT
         challenge_digest AS "challengeDigest",
         digest_version AS "digestVersion",
         created_at AS "createdAt",
         expires_at AS "expiresAt",
         consumed_at AS "consumedAt",
         version
       FROM sem_caderno.pre_session_challenges
       WHERE digest_version = $1 AND challenge_digest = $2`,
      [challengeDigest.digestVersion, Buffer.from(challengeDigest.digestBase64Url, 'base64url')],
    );

    expect(stored.rows).toEqual([
      {
        challengeDigest: Buffer.from(challengeDigest.digestBase64Url, 'base64url'),
        digestVersion: 1,
        createdAt,
        expiresAt,
        consumedAt: null,
        version: '1',
      },
    ]);
  });

  it('consumes an active challenge once and rejects replay', async () => {
    const adapter = new PostgresPreSessionChallengeAdapter(currentPool());
    const challengeDigest = nextDigest();
    await createChallenge(adapter, challengeDigest);
    const consumedAt = new Date('2026-08-06T12:05:00Z');

    await expect(adapter.consume({ challengeDigest, consumedAt })).resolves.toBe(true);
    await expect(adapter.consume({ challengeDigest, consumedAt })).resolves.toBe(false);

    const stored = await currentPool().query<{ consumedAt: Date; version: string }>(
      `SELECT consumed_at AS "consumedAt", version
         FROM sem_caderno.pre_session_challenges
        WHERE digest_version = $1 AND challenge_digest = $2`,
      [challengeDigest.digestVersion, Buffer.from(challengeDigest.digestBase64Url, 'base64url')],
    );
    expect(stored.rows).toEqual([{ consumedAt, version: '2' }]);
  });

  it('rejects unknown, expired, equal-expiry, and pre-creation consumption uniformly', async () => {
    const adapter = new PostgresPreSessionChallengeAdapter(currentPool());
    const expiredDigest = nextDigest();
    const equalExpiryDigest = nextDigest();
    const activeDigest = nextDigest();
    await createChallenge(adapter, expiredDigest, new Date('2026-08-06T12:04:00Z'));
    await createChallenge(adapter, equalExpiryDigest);
    await createChallenge(adapter, activeDigest);

    await expect(
      adapter.consume({
        challengeDigest: nextDigest(),
        consumedAt: new Date('2026-08-06T12:05:00Z'),
      }),
    ).resolves.toBe(false);
    await expect(
      adapter.consume({
        challengeDigest: expiredDigest,
        consumedAt: new Date('2026-08-06T12:05:00Z'),
      }),
    ).resolves.toBe(false);
    await expect(
      adapter.consume({ challengeDigest: equalExpiryDigest, consumedAt: expiresAt }),
    ).resolves.toBe(false);
    await expect(
      adapter.consume({
        challengeDigest: activeDigest,
        consumedAt: new Date('2026-08-06T11:59:59Z'),
      }),
    ).resolves.toBe(false);
  });

  it('allows exactly one winner under concurrent consumption', async () => {
    const adapter = new PostgresPreSessionChallengeAdapter(currentPool());
    const challengeDigest = nextDigest();
    await createChallenge(adapter, challengeDigest);
    const consumedAt = new Date('2026-08-06T12:05:00Z');

    const outcomes = await Promise.all(
      Array.from({ length: 8 }, () => adapter.consume({ challengeDigest, consumedAt })),
    );

    expect(outcomes.filter(Boolean)).toHaveLength(1);
    expect(outcomes.filter((outcome) => !outcome)).toHaveLength(7);
  });

  it('propagates invalid digest and database failures instead of returning rejection', async () => {
    const adapter = new PostgresPreSessionChallengeAdapter(currentPool());
    const invalidDigest = {
      digestVersion: 1,
      digestBase64Url: 'not-a-canonical-digest',
    } as PreSessionCsrfDigest;
    await expect(
      adapter.consume({ challengeDigest: invalidDigest, consumedAt: createdAt }),
    ).rejects.toThrow('Pre-session CSRF digest is invalid.');

    const failedPool = new Pool({ connectionString: container?.getConnectionUri() });
    await failedPool.end();
    await expect(
      new PostgresPreSessionChallengeAdapter(failedPool).consume({
        challengeDigest: nextDigest(),
        consumedAt: createdAt,
      }),
    ).rejects.toThrow('Pre-session challenge consumption persistence failed.');
  });
});
