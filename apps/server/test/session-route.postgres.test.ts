import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PostgresSessionResolutionAdapter } from '@sem-caderno/persistence-postgres';
import type { FastifyInstance } from 'fastify';
import { Pool } from 'pg';

import { buildApp } from '../src/app.js';
import { deriveSessionLookupKey } from '../src/session-credential-lookup.js';
import { loadSessionHttpConfiguration } from '../src/session-http-configuration.js';

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, '../../..');
const postgresImage =
  'postgres:18.4-bookworm@sha256:1961f96e6029a02c3812d7cb329a3b03a3ac2bb067058dec17b0f5596aca9296';
const cookieName = 'sem-caderno-session';
const hmacKey = Uint8Array.from({ length: 32 }, (_, index) => 255 - index);
const encodedKey = Buffer.from(hmacKey).toString('base64url');
const activeEvidence = `v1.${Buffer.alloc(32, 1).toString('base64url')}`;
const unknownEvidence = `v1.${Buffer.alloc(32, 2).toString('base64url')}`;
const revokedEvidence = `v1.${Buffer.alloc(32, 3).toString('base64url')}`;
const createdAt = new Date('2026-08-05T12:00:00Z');
const expiresAt = new Date('2099-08-05T12:00:00Z');

let container: StartedPostgreSqlContainer | undefined;
let pool: Pool | undefined;
let app: FastifyInstance | undefined;

const currentPool = (): Pool => {
  if (pool === undefined) throw new Error('HTTP integration pool is unavailable.');
  return pool;
};

const digestFor = (evidence: string): Buffer => {
  const lookup = deriveSessionLookupKey(evidence, hmacKey);
  if (lookup === undefined) throw new Error('Synthetic session evidence is invalid.');
  return Buffer.from(lookup.digestBase64Url, 'base64url');
};

const insertUser = async (): Promise<string> => {
  const email = 'session-http-user@example.invalid';
  const result = await currentPool().query<{ id: string }>(
    `INSERT INTO sem_caderno.users (
       email_original, email_normalized, email_verified_at, disabled_at,
       created_at, updated_at, version
     ) VALUES ($1, $1, $2, $3, $4, $4, $5)
     RETURNING id`,
    [email, createdAt, null, createdAt, 1],
  );
  const userId = result.rows[0]?.id;
  if (userId === undefined) throw new Error('Synthetic HTTP User fixture insertion failed.');
  return userId;
};

const insertSession = async (userId: string, evidence: string, revokedAt?: Date): Promise<void> => {
  await currentPool().query(
    `INSERT INTO sem_caderno.sessions (
       digest_version, credential_digest, user_id, selected_business_id,
       created_at, expires_at, revoked_at, updated_at, version
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      1,
      digestFor(evidence),
      userId,
      null,
      createdAt,
      expiresAt,
      revokedAt ?? null,
      revokedAt ?? createdAt,
      1,
    ],
  );
};

beforeAll(async () => {
  container = await new PostgreSqlContainer(postgresImage)
    .withDatabase('sem_caderno_test_session_http')
    .withUsername('sem_caderno_test')
    .withPassword(randomBytes(24).toString('base64url'))
    .start();

  const databaseUrl = container.getConnectionUri();
  await execFileAsync(process.execPath, [resolve(root, 'tools/database/dist/src/main.js')], {
    cwd: resolve(root, 'tools/database'),
    env: { ...process.env, SEM_CADERNO_TEST_DATABASE_URL: databaseUrl },
  });

  pool = new Pool({ connectionString: databaseUrl });
  const userId = await insertUser();
  await insertSession(userId, activeEvidence);
  await insertSession(userId, revokedEvidence, new Date('2026-08-05T13:00:00Z'));

  app = buildApp({
    sessionConfiguration: loadSessionHttpConfiguration({
      SEM_CADERNO_SESSION_COOKIE_PROFILE: 'local-development',
      SEM_CADERNO_SESSION_HMAC_KEY_V1_BASE64URL: encodedKey,
    }),
    sessionResolution: new PostgresSessionResolutionAdapter(pool),
  });
}, 180_000);

afterAll(async () => {
  await app?.close();
  await pool?.end();
  await container?.stop();
}, 30_000);

describe('current-session HTTP PostgreSQL composition', () => {
  it('resolves active, unknown, and inactive evidence through real PostgreSQL', async () => {
    if (app === undefined) throw new Error('HTTP integration application is unavailable.');

    const active = await app.inject({
      method: 'GET',
      url: '/api/v1/session',
      headers: { cookie: `${cookieName}=${activeEvidence}` },
    });
    expect(active.statusCode).toBe(200);
    expect(active.json()).toMatchObject({
      data: { state: 'authenticated', expiresAt: expiresAt.toISOString() },
    });

    for (const evidence of [unknownEvidence, revokedEvidence]) {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/session',
        headers: { cookie: `${cookieName}=${evidence}` },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ data: { state: 'anonymous' } });
    }
  });

  it('maps a real PostgreSQL failure to safe internal failure', async () => {
    if (app === undefined || pool === undefined) {
      throw new Error('HTTP integration application is unavailable.');
    }
    const closedPool = pool;
    pool = undefined;
    await closedPool.end();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/session',
      headers: { cookie: `${cookieName}=${activeEvidence}` },
    });

    expect(response.statusCode).toBe(500);
    expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.json()).toMatchObject({ code: 'INTERNAL_FAILURE', status: 500 });
    expect(response.body).not.toContain(activeEvidence);
    expect(response.body).not.toContain(encodedKey);
  });
});
