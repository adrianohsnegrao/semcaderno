import { randomBytes } from 'node:crypto';

import { Pool } from 'pg';
import { PostgresMvpStore } from '@sem-caderno/persistence-postgres';

import { buildApp } from './app.js';
import { MemoryMvpStore } from './memory-mvp-store.js';
import type { MvpStore } from '@sem-caderno/application';

const port = Number.parseInt(process.env['PORT'] ?? '3001', 10);
const host = process.env['HOST'] ?? '127.0.0.1';
const webOrigin = process.env['SEM_CADERNO_WEB_ORIGIN'] ?? 'http://127.0.0.1:3000';
const databaseUrl = process.env['DATABASE_URL'];
const production = process.env['NODE_ENV'] === 'production';

if (production && !databaseUrl) {
  throw new Error('DATABASE_URL is required in production.');
}

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      max: Number.parseInt(process.env['SEM_CADERNO_DATABASE_POOL_SIZE'] ?? '10', 10),
      statement_timeout: 10_000,
      query_timeout: 12_000,
      ssl:
        process.env['SEM_CADERNO_DATABASE_SSL'] === 'require'
          ? { rejectUnauthorized: true }
          : false,
    })
  : undefined;
const mvpStore: MvpStore = pool ? new PostgresMvpStore(pool) : new MemoryMvpStore();

const app = buildApp({
  sessionConfiguration: {
    cookieName: 'sem-caderno-session',
    hmacKey: randomBytes(32),
  },
  sessionResolution: { resolve: () => Promise.resolve(undefined) },
  mvpStore,
  webOrigin,
  secureCookies: production && process.env['SEM_CADERNO_SECURE_COOKIES'] !== 'false',
  logger: production,
});

try {
  await app.listen({ host, port });
  app.log.info(`Sem Caderno API disponível em http://${host}:${port}`);
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}

const shutdown = async () => {
  await app.close();
  await pool?.end();
};
process.once('SIGTERM', () => void shutdown());
process.once('SIGINT', () => void shutdown());
