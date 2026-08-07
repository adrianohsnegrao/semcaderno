import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import type {
  AuthenticatedCsrfDigest,
  IssueSessionInput,
  PreSessionCsrfDigest,
  SessionCredentialDigest,
  SignInRateLimitAccountKey,
} from '@sem-caderno/application';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool, type PoolClient } from 'pg';

import { PostgresSessionIssuanceAdapter, PostgresSignInRateLimitAdapter } from '../src/index.js';

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, '../../..');
const postgresImage =
  'postgres:18.4-bookworm@sha256:1961f96e6029a02c3812d7cb329a3b03a3ac2bb067058dec17b0f5596aca9296';
const issuedAt = new Date('2026-08-06T12:05:00Z');
const expiresAt = new Date('2026-08-07T00:05:00Z');
const challengeCreatedAt = new Date('2026-08-06T12:00:00Z');
const challengeExpiresAt = new Date('2026-08-06T12:10:00Z');
const priorSessionCreatedAt = new Date('2026-08-06T11:00:00Z');
const priorSessionExpiresAt = new Date('2026-08-07T11:00:00Z');

let container: StartedPostgreSqlContainer | undefined;
let pool: Pool | undefined;
let databaseUrl = '';
let fixtureSequence = 0;

const currentPool = (): Pool => {
  if (pool === undefined) throw new Error('PostgreSQL integration pool is unavailable.');
  return pool;
};

const nextDigestBuffer = (): Buffer => {
  fixtureSequence += 1;
  const digest = Buffer.alloc(32);
  digest.writeUInt32BE(fixtureSequence, 28);
  return digest;
};

const versionedDigest = (digest = nextDigestBuffer()) =>
  Object.freeze({ digestVersion: 1 as const, digestBase64Url: digest.toString('base64url') });

const nextSessionDigest = (): SessionCredentialDigest =>
  versionedDigest() as SessionCredentialDigest;
const nextChallengeDigest = (): PreSessionCsrfDigest => versionedDigest() as PreSessionCsrfDigest;
const nextAuthenticatedCsrfDigest = (): AuthenticatedCsrfDigest =>
  versionedDigest() as AuthenticatedCsrfDigest;
const nextAccountKey = (): SignInRateLimitAccountKey =>
  versionedDigest() as SignInRateLimitAccountKey;
const bytes = (digest: { digestBase64Url: string }): Buffer =>
  Buffer.from(digest.digestBase64Url, 'base64url');

type UserState = 'verified' | 'unverified' | 'disabled';

const insertUser = async (state: UserState = 'verified'): Promise<string> => {
  fixtureSequence += 1;
  const email = `issuance-user-${fixtureSequence}@example.invalid`;
  const result = await currentPool().query<{ id: string }>(
    `INSERT INTO sem_caderno.users (
       email_original, email_normalized, email_verified_at, disabled_at,
       created_at, updated_at, version
     ) VALUES ($1, $1, $2, $3, $4, $4, 1)
     RETURNING id`,
    [
      email,
      state === 'unverified' ? null : priorSessionCreatedAt,
      state === 'disabled' ? priorSessionCreatedAt : null,
      priorSessionCreatedAt,
    ],
  );
  const id = result.rows[0]?.id;
  if (id === undefined) throw new Error('Synthetic User fixture insertion failed.');
  return id;
};

const insertChallenge = async (
  digest: PreSessionCsrfDigest,
  options: Readonly<{ expiresAt?: Date; consumedAt?: Date }> = {},
): Promise<void> => {
  await currentPool().query(
    `INSERT INTO sem_caderno.pre_session_challenges (
       digest_version, challenge_digest, created_at, expires_at, consumed_at, version
     ) VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      digest.digestVersion,
      bytes(digest),
      challengeCreatedAt,
      options.expiresAt ?? challengeExpiresAt,
      options.consumedAt ?? null,
      options.consumedAt === undefined ? 1 : 2,
    ],
  );
};

const insertRateState = async (accountKey: SignInRateLimitAccountKey): Promise<void> => {
  await currentPool().query(
    `INSERT INTO sem_caderno.sign_in_rate_limits (
       account_key_version, account_key_digest, window_started_at, window_ends_at,
       failure_count, updated_at, retention_expires_at, version
     ) VALUES ($1, $2, $3, $4, 3, $3, $5, 1)`,
    [
      accountKey.digestVersion,
      bytes(accountKey),
      challengeCreatedAt,
      new Date('2026-08-06T12:15:00Z'),
      new Date('2026-08-07T12:00:00Z'),
    ],
  );
};

type InsertSessionOptions = Readonly<{
  userId: string;
  credentialDigest: SessionCredentialDigest;
  authenticatedCsrfDigest?: AuthenticatedCsrfDigest;
  revokedAt?: Date;
}>;

const insertSession = async (options: InsertSessionOptions): Promise<string> => {
  const result = await currentPool().query<{ id: string }>(
    `INSERT INTO sem_caderno.sessions (
       digest_version, credential_digest, user_id, selected_business_id,
       created_at, expires_at, revoked_at, updated_at, version,
       authenticated_csrf_digest_version, authenticated_csrf_digest
     ) VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, 1, $8, $9)
     RETURNING id`,
    [
      options.credentialDigest.digestVersion,
      bytes(options.credentialDigest),
      options.userId,
      priorSessionCreatedAt,
      priorSessionExpiresAt,
      options.revokedAt ?? null,
      options.revokedAt ?? priorSessionCreatedAt,
      options.authenticatedCsrfDigest?.digestVersion ?? null,
      options.authenticatedCsrfDigest === undefined ? null : bytes(options.authenticatedCsrfDigest),
    ],
  );
  const id = result.rows[0]?.id;
  if (id === undefined) throw new Error('Synthetic Session fixture insertion failed.');
  return id;
};

type InputOptions = Readonly<{
  userId: string;
  challengeDigest: PreSessionCsrfDigest;
  accountKey: SignInRateLimitAccountKey;
  sessionDigest?: SessionCredentialDigest;
  authenticatedCsrfDigest?: AuthenticatedCsrfDigest;
  priorSessionDigest?: SessionCredentialDigest;
}>;

const issueInput = (options: InputOptions): IssueSessionInput => {
  const base = {
    userId: options.userId,
    issuedAt: new Date(issuedAt),
    expiresAt: new Date(expiresAt),
    signInRateLimitAccountKey: options.accountKey,
    sessionCredentialDigest: options.sessionDigest ?? nextSessionDigest(),
    preSessionCsrfDigest: options.challengeDigest,
    authenticatedCsrfDigest: options.authenticatedCsrfDigest ?? nextAuthenticatedCsrfDigest(),
  } satisfies Omit<IssueSessionInput, 'priorSessionCredentialDigest'>;
  return options.priorSessionDigest === undefined
    ? Object.freeze(base)
    : Object.freeze({ ...base, priorSessionCredentialDigest: options.priorSessionDigest });
};

const scalarCount = async (table: 'audit_events' | 'sessions' | 'sign_in_rate_limits') => {
  const result = await currentPool().query<{ count: string }>(
    `SELECT count(*)::text AS count FROM sem_caderno.${table}`,
  );
  return Number(result.rows[0]?.count);
};

const waitForAdvisoryWait = async (applicationName: string): Promise<void> => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const result = await currentPool().query<{ waiting: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM pg_stat_activity
          WHERE application_name = $1 AND wait_event = 'advisory'
       ) AS waiting`,
      [applicationName],
    );
    if (result.rows[0]?.waiting === true) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 10));
  }
  throw new Error('Synthetic issuance did not reach the account advisory lock.');
};

const holdAccountLock = async (accountKey: SignInRateLimitAccountKey): Promise<PoolClient> => {
  const client = await currentPool().connect();
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock($1::bigint)', [
    bytes(accountKey).readBigInt64BE(0).toString(),
  ]);
  return client;
};

beforeAll(async () => {
  container = await new PostgreSqlContainer(postgresImage)
    .withDatabase('sem_caderno_test_session_issuance')
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
  await currentPool().query(
    `DROP TRIGGER IF EXISTS synthetic_session_insert_failure ON sem_caderno.sessions;
     DROP FUNCTION IF EXISTS sem_caderno.synthetic_session_insert_failure();
     DROP TRIGGER IF EXISTS synthetic_rate_delete_failure ON sem_caderno.sign_in_rate_limits;
     DROP FUNCTION IF EXISTS sem_caderno.synthetic_rate_delete_failure();
     TRUNCATE sem_caderno.audit_events, sem_caderno.sessions,
              sem_caderno.pre_session_challenges, sem_caderno.sign_in_rate_limits,
              sem_caderno.user_password_credentials, sem_caderno.businesses,
              sem_caderno.users;`,
  );
});

describe('session issuance migration', () => {
  it('adds the compatibility pair, minimal audit profile, and seventh checksum', async () => {
    const columns = await currentPool().query<{ columnName: string; isNullable: string }>(
      `SELECT column_name AS "columnName", is_nullable AS "isNullable"
         FROM information_schema.columns
        WHERE table_schema = 'sem_caderno' AND table_name = 'sessions'
        ORDER BY ordinal_position`,
    );
    expect(columns.rows.slice(-2)).toEqual([
      { columnName: 'authenticated_csrf_digest_version', isNullable: 'YES' },
      { columnName: 'authenticated_csrf_digest', isNullable: 'YES' },
    ]);

    const auditColumns = await currentPool().query<{ columnName: string }>(
      `SELECT column_name AS "columnName"
         FROM information_schema.columns
        WHERE table_schema = 'sem_caderno' AND table_name = 'audit_events'
        ORDER BY ordinal_position`,
    );
    expect(auditColumns.rows.map((row) => row.columnName)).toEqual([
      'id',
      'actor_user_id',
      'action_code',
      'outcome_code',
      'occurred_at',
    ]);

    const applied = await currentPool().query<{ name: string; checksum: string }>(
      `SELECT history.name, checksum.checksum_sha256 AS checksum
         FROM sem_caderno.schema_migrations AS history
         INNER JOIN sem_caderno.schema_migration_checksums AS checksum USING (name)
        ORDER BY history.id`,
    );
    expect(applied.rows).toHaveLength(7);
    expect(applied.rows.at(-1)?.name).toBe('20260806000400-add-session-issuance-foundation');
    expect(applied.rows.every((row) => /^[a-f0-9]{64}$/.test(row.checksum))).toBe(true);
  });

  it('keeps historical null pairs and enforces complete version-1 unique digests', async () => {
    const userId = await insertUser();
    await insertSession({ userId, credentialDigest: nextSessionDigest() });
    const authenticatedCsrfDigest = nextAuthenticatedCsrfDigest();
    await insertSession({
      userId,
      credentialDigest: nextSessionDigest(),
      authenticatedCsrfDigest,
    });

    await expect(
      currentPool().query(
        `UPDATE sem_caderno.sessions
            SET authenticated_csrf_digest_version = 1
          WHERE authenticated_csrf_digest_version IS NULL`,
      ),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      currentPool().query(
        `INSERT INTO sem_caderno.sessions (
           digest_version, credential_digest, user_id, created_at, expires_at, updated_at,
           version, authenticated_csrf_digest_version, authenticated_csrf_digest
         ) VALUES (1, $1, $2, $3, $4, $3, 1, 2, $5)`,
        [
          nextDigestBuffer(),
          userId,
          priorSessionCreatedAt,
          priorSessionExpiresAt,
          nextDigestBuffer(),
        ],
      ),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      currentPool().query(
        `INSERT INTO sem_caderno.sessions (
           digest_version, credential_digest, user_id, created_at, expires_at, updated_at,
           version, authenticated_csrf_digest_version, authenticated_csrf_digest
         ) VALUES (1, $1, $2, $3, $4, $3, 1, 1, $5)`,
        [
          nextDigestBuffer(),
          userId,
          priorSessionCreatedAt,
          priorSessionExpiresAt,
          Buffer.alloc(31),
        ],
      ),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      insertSession({
        userId,
        credentialDigest: nextSessionDigest(),
        authenticatedCsrfDigest,
      }),
    ).rejects.toMatchObject({
      code: '23505',
      constraint: 'sessions_authenticated_csrf_digest_unique',
    });

    const audit = await currentPool().query<{ id: string }>(
      `INSERT INTO sem_caderno.audit_events (
         actor_user_id, action_code, outcome_code, occurred_at
       ) VALUES ($1, 'session_issued', 'succeeded', $2)
       RETURNING id`,
      [userId, issuedAt],
    );
    const uuidVersion = await currentPool().query<{ version: number }>(
      'SELECT uuid_extract_version($1::uuid) AS version',
      [audit.rows[0]?.id],
    );
    expect(uuidVersion.rows[0]?.version).toBe(7);
    await expect(
      currentPool().query(
        `INSERT INTO sem_caderno.audit_events (
           actor_user_id, action_code, outcome_code, occurred_at
         ) VALUES ($1, 'unexpected', 'succeeded', $2)`,
        [userId, issuedAt],
      ),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      currentPool().query(
        `INSERT INTO sem_caderno.audit_events (
           actor_user_id, action_code, outcome_code, occurred_at
         ) VALUES ($1, 'session_issued', 'unexpected', $2)`,
        [userId, issuedAt],
      ),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      currentPool().query(
        `INSERT INTO sem_caderno.audit_events (
           actor_user_id, action_code, outcome_code, occurred_at
         ) VALUES ($1, 'session_issued', 'succeeded', $2)`,
        ['0198f000-0000-7000-8000-000000000031', issuedAt],
      ),
    ).rejects.toMatchObject({ code: '23503' });
  });
});

describe('PostgresSessionIssuanceAdapter', () => {
  it('commits challenge, prior-session revocation, digests, audit, and rate clear atomically', async () => {
    const adapter = new PostgresSessionIssuanceAdapter(currentPool());
    const userId = await insertUser();
    const challengeDigest = nextChallengeDigest();
    const accountKey = nextAccountKey();
    const priorSessionDigest = nextSessionDigest();
    const otherSessionDigest = nextSessionDigest();
    const sessionDigest = nextSessionDigest();
    const authenticatedCsrfDigest = nextAuthenticatedCsrfDigest();
    await insertChallenge(challengeDigest);
    await insertRateState(accountKey);
    await insertSession({ userId, credentialDigest: priorSessionDigest });
    await insertSession({ userId, credentialDigest: otherSessionDigest });

    await expect(
      adapter.issue(
        issueInput({
          userId,
          challengeDigest,
          accountKey,
          priorSessionDigest,
          sessionDigest,
          authenticatedCsrfDigest,
        }),
      ),
    ).resolves.toEqual({ outcome: 'issued', userId, expiresAt });

    const challenge = await currentPool().query<{ consumedAt: Date; version: string }>(
      `SELECT consumed_at AS "consumedAt", version
         FROM sem_caderno.pre_session_challenges
        WHERE challenge_digest = $1`,
      [bytes(challengeDigest)],
    );
    expect(challenge.rows).toEqual([{ consumedAt: issuedAt, version: '2' }]);

    const sessions = await currentPool().query<{
      credentialDigest: Buffer;
      authenticatedCsrfDigest: Buffer | null;
      selectedBusinessId: string | null;
      createdAt: Date;
      expiresAt: Date;
      revokedAt: Date | null;
    }>(
      `SELECT credential_digest AS "credentialDigest",
              authenticated_csrf_digest AS "authenticatedCsrfDigest",
              selected_business_id AS "selectedBusinessId", created_at AS "createdAt",
              expires_at AS "expiresAt", revoked_at AS "revokedAt"
         FROM sem_caderno.sessions
        ORDER BY credential_digest`,
    );
    const issued = sessions.rows.find((row) => row.credentialDigest.equals(bytes(sessionDigest)));
    expect(issued).toEqual({
      credentialDigest: bytes(sessionDigest),
      authenticatedCsrfDigest: bytes(authenticatedCsrfDigest),
      selectedBusinessId: null,
      createdAt: issuedAt,
      expiresAt,
      revokedAt: null,
    });
    expect(
      sessions.rows.find((row) => row.credentialDigest.equals(bytes(priorSessionDigest)))
        ?.revokedAt,
    ).toEqual(issuedAt);
    expect(
      sessions.rows.find((row) => row.credentialDigest.equals(bytes(otherSessionDigest)))
        ?.revokedAt,
    ).toBeNull();

    const audit = await currentPool().query(
      `SELECT actor_user_id AS "actorUserId", action_code AS "actionCode",
              outcome_code AS "outcomeCode", occurred_at AS "occurredAt"
         FROM sem_caderno.audit_events`,
    );
    expect(audit.rows).toEqual([
      {
        actorUserId: userId,
        actionCode: 'session_issued',
        outcomeCode: 'succeeded',
        occurredAt: issuedAt,
      },
    ]);
    expect(await scalarCount('sign_in_rate_limits')).toBe(0);
  });

  it.each(['disabled', 'unverified'] as const)(
    'returns userRejected for a %s User without changing challenge or rate state',
    async (state) => {
      const adapter = new PostgresSessionIssuanceAdapter(currentPool());
      const userId = await insertUser(state);
      const challengeDigest = nextChallengeDigest();
      const accountKey = nextAccountKey();
      await insertChallenge(challengeDigest);
      await insertRateState(accountKey);

      await expect(
        adapter.issue(issueInput({ userId, challengeDigest, accountKey })),
      ).resolves.toEqual({ outcome: 'userRejected' });
      expect(await scalarCount('sessions')).toBe(0);
      expect(await scalarCount('audit_events')).toBe(0);
      expect(await scalarCount('sign_in_rate_limits')).toBe(1);
      const challenge = await currentPool().query<{ consumedAt: Date | null }>(
        `SELECT consumed_at AS "consumedAt" FROM sem_caderno.pre_session_challenges`,
      );
      expect(challenge.rows).toEqual([{ consumedAt: null }]);
    },
  );

  it('returns userRejected for a missing User without consuming available evidence', async () => {
    const adapter = new PostgresSessionIssuanceAdapter(currentPool());
    const challengeDigest = nextChallengeDigest();
    const accountKey = nextAccountKey();
    await insertChallenge(challengeDigest);
    await insertRateState(accountKey);

    await expect(
      adapter.issue(
        issueInput({
          userId: '0198f000-0000-7000-8000-000000000031',
          challengeDigest,
          accountKey,
        }),
      ),
    ).resolves.toEqual({ outcome: 'userRejected' });
    expect(await scalarCount('sign_in_rate_limits')).toBe(1);
  });

  it('uniformly rejects unknown, expired-at-equality, and consumed challenges', async () => {
    const adapter = new PostgresSessionIssuanceAdapter(currentPool());
    const userId = await insertUser();
    const unknown = nextChallengeDigest();
    const expired = nextChallengeDigest();
    const consumed = nextChallengeDigest();
    await insertChallenge(expired, { expiresAt: issuedAt });
    await insertChallenge(consumed, { consumedAt: challengeCreatedAt });

    for (const challengeDigest of [unknown, expired, consumed]) {
      const accountKey = nextAccountKey();
      await insertRateState(accountKey);
      await expect(
        adapter.issue(issueInput({ userId, challengeDigest, accountKey })),
      ).resolves.toEqual({ outcome: 'preSessionChallengeRejected' });
    }
    expect(await scalarCount('sessions')).toBe(0);
    expect(await scalarCount('audit_events')).toBe(0);
    expect(await scalarCount('sign_in_rate_limits')).toBe(3);
  });

  it('treats absent prior-session and rate rows as idempotent issuance no-ops', async () => {
    const adapter = new PostgresSessionIssuanceAdapter(currentPool());
    const userId = await insertUser();
    const challengeDigest = nextChallengeDigest();
    const accountKey = nextAccountKey();
    await insertChallenge(challengeDigest);

    await expect(
      adapter.issue(
        issueInput({
          userId,
          challengeDigest,
          accountKey,
          priorSessionDigest: nextSessionDigest(),
        }),
      ),
    ).resolves.toMatchObject({ outcome: 'issued' });
    expect(await scalarCount('sessions')).toBe(1);
    expect(await scalarCount('audit_events')).toBe(1);
    expect(await scalarCount('sign_in_rate_limits')).toBe(0);
  });

  it.each(['session', 'authenticatedCsrf'] as const)(
    'returns digestCollision only for the named %s digest uniqueness conflict',
    async (collisionKind) => {
      const adapter = new PostgresSessionIssuanceAdapter(currentPool());
      const userId = await insertUser();
      const challengeDigest = nextChallengeDigest();
      const accountKey = nextAccountKey();
      const existingSessionDigest = nextSessionDigest();
      const existingCsrfDigest = nextAuthenticatedCsrfDigest();
      await insertChallenge(challengeDigest);
      await insertRateState(accountKey);
      await insertSession({
        userId,
        credentialDigest: existingSessionDigest,
        authenticatedCsrfDigest: existingCsrfDigest,
      });

      await expect(
        adapter.issue(
          issueInput({
            userId,
            challengeDigest,
            accountKey,
            sessionDigest:
              collisionKind === 'session' ? existingSessionDigest : nextSessionDigest(),
            authenticatedCsrfDigest:
              collisionKind === 'authenticatedCsrf'
                ? existingCsrfDigest
                : nextAuthenticatedCsrfDigest(),
          }),
        ),
      ).resolves.toEqual({ outcome: 'digestCollision' });
      expect(await scalarCount('sessions')).toBe(1);
      expect(await scalarCount('audit_events')).toBe(0);
      expect(await scalarCount('sign_in_rate_limits')).toBe(1);
      const challenge = await currentPool().query<{ consumedAt: Date | null }>(
        `SELECT consumed_at AS "consumedAt" FROM sem_caderno.pre_session_challenges`,
      );
      expect(challenge.rows).toEqual([{ consumedAt: null }]);
    },
  );

  it('rejects an unrelated uniqueness failure and rolls back every earlier effect', async () => {
    const adapter = new PostgresSessionIssuanceAdapter(currentPool());
    const userId = await insertUser();
    const challengeDigest = nextChallengeDigest();
    const accountKey = nextAccountKey();
    await insertChallenge(challengeDigest);
    await insertRateState(accountKey);
    await currentPool().query(
      `CREATE FUNCTION sem_caderno.synthetic_session_insert_failure()
         RETURNS trigger LANGUAGE plpgsql AS $$
       BEGIN
         RAISE unique_violation USING CONSTRAINT = 'synthetic_unrelated_unique';
       END $$;
       CREATE TRIGGER synthetic_session_insert_failure
         BEFORE INSERT ON sem_caderno.sessions
         FOR EACH ROW EXECUTE FUNCTION sem_caderno.synthetic_session_insert_failure();`,
    );

    await expect(
      adapter.issue(issueInput({ userId, challengeDigest, accountKey })),
    ).rejects.toThrow('Session issuance persistence failed.');
    expect(await scalarCount('sessions')).toBe(0);
    expect(await scalarCount('audit_events')).toBe(0);
    expect(await scalarCount('sign_in_rate_limits')).toBe(1);
    const challenge = await currentPool().query<{ consumedAt: Date | null }>(
      `SELECT consumed_at AS "consumedAt" FROM sem_caderno.pre_session_challenges`,
    );
    expect(challenge.rows).toEqual([{ consumedAt: null }]);
  });

  it('rolls back session, audit, challenge, prior revocation, and rate clear on a late failure', async () => {
    const adapter = new PostgresSessionIssuanceAdapter(currentPool());
    const userId = await insertUser();
    const challengeDigest = nextChallengeDigest();
    const accountKey = nextAccountKey();
    const priorSessionDigest = nextSessionDigest();
    await insertChallenge(challengeDigest);
    await insertRateState(accountKey);
    await insertSession({ userId, credentialDigest: priorSessionDigest });
    await currentPool().query(
      `CREATE FUNCTION sem_caderno.synthetic_rate_delete_failure()
         RETURNS trigger LANGUAGE plpgsql AS $$
       BEGIN
         RAISE EXCEPTION 'synthetic rate delete failure' USING ERRCODE = 'XX000';
       END $$;
       CREATE TRIGGER synthetic_rate_delete_failure
         BEFORE DELETE ON sem_caderno.sign_in_rate_limits
         FOR EACH ROW EXECUTE FUNCTION sem_caderno.synthetic_rate_delete_failure();`,
    );

    await expect(
      adapter.issue(issueInput({ userId, challengeDigest, accountKey, priorSessionDigest })),
    ).rejects.toThrow('Session issuance persistence failed.');
    expect(await scalarCount('sessions')).toBe(1);
    expect(await scalarCount('audit_events')).toBe(0);
    expect(await scalarCount('sign_in_rate_limits')).toBe(1);
    const state = await currentPool().query<{ consumedAt: Date | null; revokedAt: Date | null }>(
      `SELECT challenge.consumed_at AS "consumedAt", session.revoked_at AS "revokedAt"
         FROM sem_caderno.pre_session_challenges AS challenge
         CROSS JOIN sem_caderno.sessions AS session`,
    );
    expect(state.rows).toEqual([{ consumedAt: null, revokedAt: null }]);
  });

  it('allows exactly one concurrent issuance for one pre-session challenge', async () => {
    const adapter = new PostgresSessionIssuanceAdapter(currentPool());
    const userId = await insertUser();
    const challengeDigest = nextChallengeDigest();
    const accountKey = nextAccountKey();
    await insertChallenge(challengeDigest);
    await insertRateState(accountKey);

    const results = await Promise.all([
      adapter.issue(issueInput({ userId, challengeDigest, accountKey })),
      adapter.issue(issueInput({ userId, challengeDigest, accountKey })),
    ]);
    expect(results.map((result) => result.outcome).sort()).toEqual([
      'issued',
      'preSessionChallengeRejected',
    ]);
    expect(await scalarCount('sessions')).toBe(1);
    expect(await scalarCount('audit_events')).toBe(1);
    expect(await scalarCount('sign_in_rate_limits')).toBe(0);
  });

  it.each([
    { first: 'issuance', expectedCount: 1 },
    { first: 'record', expectedCount: undefined },
  ] as const)(
    'forces the $first-first issuance-clear/rate-record linearization order',
    async ({ first, expectedCount }) => {
      const userId = await insertUser();
      const challengeDigest = nextChallengeDigest();
      const accountKey = nextAccountKey();
      await insertChallenge(challengeDigest);
      await insertRateState(accountKey);
      const blocker = await holdAccountLock(accountKey);
      const firstName = `issuance-rate-${first}-first-${fixtureSequence}`;
      const secondName = `issuance-rate-${first}-second-${fixtureSequence}`;
      const firstPool = new Pool({ connectionString: databaseUrl, application_name: firstName });
      const secondPool = new Pool({ connectionString: databaseUrl, application_name: secondName });
      const issuancePool = first === 'issuance' ? firstPool : secondPool;
      const ratePool = first === 'record' ? firstPool : secondPool;
      const issuanceAdapter = new PostgresSessionIssuanceAdapter(issuancePool);
      const rateAdapter = new PostgresSignInRateLimitAdapter(ratePool);
      const issue = () =>
        issuanceAdapter.issue(issueInput({ userId, challengeDigest, accountKey }));
      const record = () => rateAdapter.recordFailure({ accountKey, occurredAt: issuedAt });

      try {
        const firstOperation = first === 'issuance' ? issue() : record();
        await waitForAdvisoryWait(firstName);
        const secondOperation = first === 'issuance' ? record() : issue();
        await waitForAdvisoryWait(secondName);
        await blocker.query('COMMIT');
        await Promise.all([firstOperation, secondOperation]);

        const stored = await currentPool().query<{ failureCount: number }>(
          `SELECT failure_count AS "failureCount"
             FROM sem_caderno.sign_in_rate_limits
            WHERE account_key_version = $1 AND account_key_digest = $2`,
          [accountKey.digestVersion, bytes(accountKey)],
        );
        expect(stored.rows[0]?.failureCount).toBe(expectedCount);
      } finally {
        try {
          await blocker.query('ROLLBACK');
        } finally {
          blocker.release();
          await firstPool.end();
          await secondPool.end();
        }
      }
    },
  );

  it('rejects invalid lifecycle input before opening a transaction', async () => {
    let connected = false;
    const connect = () => {
      connected = true;
      return Promise.reject(new Error('Synthetic connection must not be used.'));
    };
    const adapter = new PostgresSessionIssuanceAdapter({ connect } as unknown as Pool);
    const input = issueInput({
      userId: '0198f000-0000-7000-8000-000000000031',
      challengeDigest: nextChallengeDigest(),
      accountKey: nextAccountKey(),
    });

    await expect(
      adapter.issue({ ...input, expiresAt: new Date(expiresAt.getTime() + 1) }),
    ).rejects.toThrow('Session issuance input is invalid.');
    expect(connected).toBe(false);
  });

  it('does not return an expected outcome when rollback itself fails', async () => {
    const query = (statement: string) => {
      if (statement === 'ROLLBACK') {
        return Promise.reject(new Error('synthetic rollback failure'));
      }
      if (statement.includes('FROM sem_caderno.users')) {
        return Promise.resolve({ rowCount: 0, rows: [] });
      }
      return Promise.resolve({ rowCount: null, rows: [] });
    };
    let released = false;
    const release = () => {
      released = true;
    };
    const adapter = new PostgresSessionIssuanceAdapter({
      connect: () => Promise.resolve({ query, release } as unknown as PoolClient),
    } as unknown as Pool);

    await expect(
      adapter.issue(
        issueInput({
          userId: '0198f000-0000-7000-8000-000000000031',
          challengeDigest: nextChallengeDigest(),
          accountKey: nextAccountKey(),
        }),
      ),
    ).rejects.toThrow('Session issuance persistence failed.');
    expect(released).toBe(true);
  });
});
