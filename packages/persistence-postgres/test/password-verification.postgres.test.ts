import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import { normalizePrimaryEmail, type PasswordVerificationPort } from '@sem-caderno/application';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { argon2id, hash, verify } from 'argon2';
import { Pool } from 'pg';

import { PostgresPasswordVerificationAdapter } from '../src/index.js';

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, '../../..');
const postgresImage =
  'postgres:18.4-bookworm@sha256:1961f96e6029a02c3812d7cb329a3b03a3ac2bb067058dec17b0f5596aca9296';
const fixtureInstant = new Date('2026-08-06T12:00:00Z');
const argon2Options = {
  type: argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  hashLength: 32,
} as const;

let container: StartedPostgreSqlContainer | undefined;
let pool: Pool | undefined;
let fixtureSequence = 0;

const currentPool = (): Pool => {
  if (pool === undefined) throw new Error('PostgreSQL integration pool is unavailable.');
  return pool;
};

type InsertUserOptions = Readonly<{
  emailVerified?: boolean;
  disabled?: boolean;
  password?: string;
  passwordVerifier?: string;
}>;

const insertUser = async (
  options: InsertUserOptions = {},
): Promise<{
  userId: string;
  email: string;
}> => {
  fixtureSequence += 1;
  const email = `credential-user-${fixtureSequence}@example.invalid`;
  const user = await currentPool().query<{ id: string }>(
    `INSERT INTO sem_caderno.users (
       email_original, email_normalized, email_verified_at, disabled_at,
       created_at, updated_at, version
     ) VALUES ($1, $2, $3, $4, $5, $5, $6)
     RETURNING id`,
    [
      email,
      email,
      options.emailVerified === false ? null : fixtureInstant,
      options.disabled === true ? fixtureInstant : null,
      fixtureInstant,
      1,
    ],
  );
  const userId = user.rows[0]?.id;
  if (userId === undefined) throw new Error('Synthetic User fixture insertion failed.');

  if (options.password !== undefined || options.passwordVerifier !== undefined) {
    const passwordVerifier =
      options.passwordVerifier ?? (await hash(options.password ?? '', argon2Options));
    await currentPool().query(
      `INSERT INTO sem_caderno.user_password_credentials (
         user_id, password_verifier, created_at, updated_at, version
       ) VALUES ($1, $2, $3, $3, $4)`,
      [userId, passwordVerifier, fixtureInstant, 1],
    );
  }

  return { userId, email };
};

const verifyPassword = (adapter: PasswordVerificationPort, email: string, password: string) =>
  adapter.verify({
    normalizedEmail: normalizePrimaryEmail(email),
    normalizedPassword: password,
  });

const expectPostgresCode = async (operation: Promise<unknown>, code: string): Promise<void> => {
  await expect(operation).rejects.toMatchObject({ code });
};

beforeAll(async () => {
  container = await new PostgreSqlContainer(postgresImage)
    .withDatabase('sem_caderno_test_password_verification')
    .withUsername('sem_caderno_test')
    .withPassword(randomBytes(24).toString('base64url'))
    .start();

  const databaseUrl = container.getConnectionUri();
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

describe('password credential migration', () => {
  it('creates only the authorized credential columns and records all migration checksums', async () => {
    const columns = await currentPool().query<{ columnName: string }>(
      `SELECT column_name AS "columnName"
         FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position`,
      ['sem_caderno', 'user_password_credentials'],
    );
    expect(columns.rows.map((row) => row.columnName)).toEqual([
      'user_id',
      'password_verifier',
      'created_at',
      'updated_at',
      'version',
    ]);

    const applied = await currentPool().query<{ name: string; checksum: string }>(
      `SELECT history.name, checksum.checksum_sha256 AS checksum
         FROM sem_caderno.schema_migrations AS history
         INNER JOIN sem_caderno.schema_migration_checksums AS checksum USING (name)
        ORDER BY history.id`,
    );
    expect(applied.rows).toHaveLength(4);
    expect(applied.rows.at(-1)?.name).toBe('20260806000100-create-user-password-credentials');
    expect(applied.rows.every((row) => /^[a-f0-9]{64}$/.test(row.checksum))).toBe(true);
  });

  it('enforces one Argon2id verifier row per User, chronology, version, and restrictive User ownership', async () => {
    const password = 'synthetic-correct-password';
    const { userId } = await insertUser({ password });
    const verifier = await hash('synthetic-second-password', argon2Options);

    await expectPostgresCode(
      currentPool().query(
        `INSERT INTO sem_caderno.user_password_credentials (
           user_id, password_verifier, created_at, updated_at, version
         ) VALUES ($1, $2, $3, $3, $4)`,
        [userId, verifier, fixtureInstant, 1],
      ),
      '23505',
    );
    await expectPostgresCode(
      currentPool().query(
        `INSERT INTO sem_caderno.user_password_credentials (
           user_id, password_verifier, created_at, updated_at, version
         ) VALUES ($1, $2, $3, $3, $4)`,
        ['0198f000-0000-7000-8000-000000000001', verifier, fixtureInstant, 1],
      ),
      '23503',
    );
    await expectPostgresCode(
      currentPool().query(
        `UPDATE sem_caderno.user_password_credentials
            SET password_verifier = $1
          WHERE user_id = $2`,
        ['$argon2i$v=19$m=19456,t=2,p=1$synthetic$synthetic', userId],
      ),
      '23514',
    );
    await expectPostgresCode(
      currentPool().query(
        `UPDATE sem_caderno.user_password_credentials
            SET version = $1
          WHERE user_id = $2`,
        [0, userId],
      ),
      '23514',
    );
    await expectPostgresCode(
      currentPool().query(
        `UPDATE sem_caderno.user_password_credentials
            SET updated_at = $1
          WHERE user_id = $2`,
        [new Date('2026-08-06T11:59:59Z'), userId],
      ),
      '23514',
    );
    await expectPostgresCode(
      currentPool().query('DELETE FROM sem_caderno.users WHERE id = $1', [userId]),
      '23001',
    );
  });

  it('stores an Argon2id PHC verifier without a raw-password column or persisted raw value', async () => {
    const password = 'synthetic-transient-password';
    const { userId } = await insertUser({ password });
    const stored = await currentPool().query<{ passwordVerifier: string }>(
      `SELECT password_verifier AS "passwordVerifier"
         FROM sem_caderno.user_password_credentials
        WHERE user_id = $1`,
      [userId],
    );

    expect(stored.rows[0]?.passwordVerifier).toMatch(
      /^\$argon2id\$v=19\$m=19456,p=1,t=2\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$/,
    );
    expect(stored.rows[0]?.passwordVerifier).not.toContain(password);
  });
});

describe('PostgresPasswordVerificationAdapter', () => {
  it('verifies a normalized primary email and correct Argon2id password', async () => {
    const password = 'synthetic-correct-password';
    const { userId, email } = await insertUser({ password });
    const adapter: PasswordVerificationPort = new PostgresPasswordVerificationAdapter(
      currentPool(),
    );

    await expect(verifyPassword(adapter, email.toUpperCase(), password)).resolves.toEqual({
      outcome: 'verified',
      userId,
    });
  });

  it('returns invalid for an incorrect password', async () => {
    const { email } = await insertUser({ password: 'synthetic-correct-password' });

    await expect(
      verifyPassword(
        new PostgresPasswordVerificationAdapter(currentPool()),
        email,
        'synthetic-incorrect-password',
      ),
    ).resolves.toEqual({ outcome: 'invalid' });
  });

  it('requires email verification only after the password verifies', async () => {
    const password = 'synthetic-correct-password';
    const { userId, email } = await insertUser({ password, emailVerified: false });
    const adapter = new PostgresPasswordVerificationAdapter(currentPool());

    await expect(verifyPassword(adapter, email, password)).resolves.toEqual({
      outcome: 'emailVerificationRequired',
      userId,
    });
    await expect(verifyPassword(adapter, email, 'synthetic-incorrect-password')).resolves.toEqual({
      outcome: 'invalid',
    });
  });

  it('performs the same fixed dummy Argon2id class of work for unknown and missing credentials', async () => {
    const seenVerifiers: string[] = [];
    const observedVerifier = async (verifier: string, password: string): Promise<boolean> => {
      seenVerifiers.push(verifier);
      return verify(verifier, password);
    };
    const adapter = new PostgresPasswordVerificationAdapter(currentPool(), observedVerifier);
    const { email } = await insertUser();

    await expect(
      verifyPassword(adapter, 'unknown-credential@example.invalid', 'synthetic-password'),
    ).resolves.toEqual({ outcome: 'invalid' });
    await expect(verifyPassword(adapter, email, 'synthetic-password')).resolves.toEqual({
      outcome: 'invalid',
    });

    expect(seenVerifiers).toHaveLength(2);
    expect(seenVerifiers[0]).toBe(seenVerifiers[1]);
    expect(seenVerifiers[0]).toMatch(/^\$argon2id\$v=19\$m=19456,p=1,t=2\$/);
  });

  it('uses dummy work and returns invalid for a disabled User', async () => {
    const realPassword = 'synthetic-disabled-password';
    const { email, userId } = await insertUser({ password: realPassword, disabled: true });
    const stored = await currentPool().query<{ passwordVerifier: string }>(
      `SELECT password_verifier AS "passwordVerifier"
         FROM sem_caderno.user_password_credentials
        WHERE user_id = $1`,
      [userId],
    );
    const seenVerifiers: string[] = [];
    const adapter = new PostgresPasswordVerificationAdapter(
      currentPool(),
      async (verifier, password) => {
        seenVerifiers.push(verifier);
        return verify(verifier, password);
      },
    );

    await expect(verifyPassword(adapter, email, realPassword)).resolves.toEqual({
      outcome: 'invalid',
    });
    expect(seenVerifiers).toHaveLength(1);
    expect(seenVerifiers[0]).not.toBe(stored.rows[0]?.passwordVerifier);
  });

  it('rejects malformed stored verifier evidence instead of returning invalid', async () => {
    const { email } = await insertUser({ passwordVerifier: '$argon2id$malformed' });

    await expect(
      verifyPassword(
        new PostgresPasswordVerificationAdapter(currentPool()),
        email,
        'synthetic-password',
      ),
    ).rejects.toThrow('Password credential persistence row is invalid.');
  });

  it('propagates verifier failure instead of returning invalid', async () => {
    const { email } = await insertUser({ password: 'synthetic-correct-password' });
    const adapter = new PostgresPasswordVerificationAdapter(currentPool(), () =>
      Promise.reject(new Error('synthetic verifier failure')),
    );

    await expect(verifyPassword(adapter, email, 'synthetic-correct-password')).rejects.toThrow(
      'Password verification failed.',
    );
  });

  it('propagates database failure instead of returning invalid', async () => {
    const failedPool = new Pool({ connectionString: container?.getConnectionUri() });
    await failedPool.end();

    await expect(
      verifyPassword(
        new PostgresPasswordVerificationAdapter(failedPool),
        'database-failure@example.invalid',
        'synthetic-password',
      ),
    ).rejects.toThrow('Password verification persistence failed.');
  });
});
