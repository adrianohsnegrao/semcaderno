import type {
  CheckSignInRateLimitInput,
  ClearSignInRateLimitInput,
  RecordSignInRateLimitFailureInput,
  SignInRateLimitAccountKey,
  SignInRateLimitDecision,
  SignInRateLimitPort,
} from '@sem-caderno/application';
import type { Pool, PoolClient } from 'pg';

const canonicalDigestPattern = /^[A-Za-z0-9_-]{43}$/;
const windowDurationMilliseconds = 15 * 60 * 1_000;
const retentionDurationMilliseconds = 24 * 60 * 60 * 1_000;

type StoredRateLimit = Readonly<{
  failureCount: number;
  windowStartedAt: Date;
  windowEndsAt: Date;
  updatedAt: Date;
  retentionExpiresAt: Date;
}>;

type CleanupInput = Readonly<{
  evaluatedAt: Date;
  limit: number;
}>;

const decodeAccountKey = (accountKey: SignInRateLimitAccountKey): Buffer => {
  if (accountKey.digestVersion !== 1 || !canonicalDigestPattern.test(accountKey.digestBase64Url)) {
    throw new Error('Sign-in rate-limit account key is invalid.');
  }

  const digest = Buffer.from(accountKey.digestBase64Url, 'base64url');
  if (digest.byteLength !== 32 || digest.toString('base64url') !== accountKey.digestBase64Url) {
    throw new Error('Sign-in rate-limit account key is invalid.');
  }
  return digest;
};

const instantMilliseconds = (instant: Date): number => {
  if (!(instant instanceof Date) || !Number.isFinite(instant.getTime())) {
    throw new Error('Sign-in rate-limit instant is invalid.');
  }
  return instant.getTime();
};

const addMilliseconds = (instant: number, duration: number): Date => {
  const result = instant + duration;
  if (!Number.isFinite(result)) {
    throw new Error('Sign-in rate-limit instant is invalid.');
  }
  return new Date(result);
};

const allowed = (): SignInRateLimitDecision => Object.freeze({ outcome: 'allowed' });
const limited = (retryAt: Date): SignInRateLimitDecision =>
  Object.freeze({ outcome: 'limited', retryAt: new Date(retryAt.getTime()) });

const decodeStoredRateLimit = (row: StoredRateLimit): StoredRateLimit => {
  if (
    !Number.isInteger(row.failureCount) ||
    row.failureCount < 1 ||
    row.failureCount > 10 ||
    ![row.windowStartedAt, row.windowEndsAt, row.updatedAt, row.retentionExpiresAt].every(
      (value) => value instanceof Date && Number.isFinite(value.getTime()),
    )
  ) {
    throw new Error('Sign-in rate-limit persistence row is invalid.');
  }
  return row;
};

const lockId = (digest: Buffer): string => digest.readBigInt64BE(0).toString();

const selectStoredRateLimit = async (
  client: PoolClient,
  accountKey: SignInRateLimitAccountKey,
  digest: Buffer,
): Promise<StoredRateLimit | undefined> => {
  const result = await client.query<StoredRateLimit>(
    `SELECT
       failure_count AS "failureCount",
       window_started_at AS "windowStartedAt",
       window_ends_at AS "windowEndsAt",
       updated_at AS "updatedAt",
       retention_expires_at AS "retentionExpiresAt"
     FROM sem_caderno.sign_in_rate_limits
     WHERE account_key_version = $1 AND account_key_digest = $2
     FOR UPDATE`,
    [accountKey.digestVersion, digest],
  );
  if (result.rowCount === 0) return undefined;
  if (result.rowCount !== 1 || result.rows[0] === undefined) {
    throw new Error('Sign-in rate-limit persistence row is invalid.');
  }
  return decodeStoredRateLimit(result.rows[0]);
};

const decisionFor = (stored: StoredRateLimit | undefined, evaluatedAt: number) => {
  if (stored === undefined) return allowed();
  if (evaluatedAt < stored.updatedAt.getTime()) {
    throw new Error('Sign-in rate-limit temporal ordering is invalid.');
  }
  if (
    evaluatedAt >= stored.windowEndsAt.getTime() ||
    evaluatedAt >= stored.retentionExpiresAt.getTime() ||
    stored.failureCount < 10
  ) {
    return allowed();
  }
  return limited(stored.windowEndsAt);
};

export class PostgresSignInRateLimitAdapter implements SignInRateLimitPort {
  constructor(private readonly pool: Pool) {}

  private async withAccountLock<T>(digest: Buffer, operation: (client: PoolClient) => Promise<T>) {
    let client: PoolClient | undefined;
    try {
      client = await this.pool.connect();
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock($1::bigint)', [lockId(digest)]);
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch {
      if (client !== undefined) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // The original persistence failure remains authoritative.
        }
      }
      throw new Error('Sign-in rate-limit persistence failed.');
    } finally {
      client?.release();
    }
  }

  async check(input: CheckSignInRateLimitInput): Promise<SignInRateLimitDecision> {
    const digest = decodeAccountKey(input.accountKey);
    const evaluatedAt = instantMilliseconds(input.evaluatedAt);
    return this.withAccountLock(digest, async (client) =>
      decisionFor(await selectStoredRateLimit(client, input.accountKey, digest), evaluatedAt),
    );
  }

  async recordFailure(input: RecordSignInRateLimitFailureInput): Promise<SignInRateLimitDecision> {
    const digest = decodeAccountKey(input.accountKey);
    const occurredAt = instantMilliseconds(input.occurredAt);

    return this.withAccountLock(digest, async (client) => {
      const stored = await selectStoredRateLimit(client, input.accountKey, digest);
      if (stored !== undefined && occurredAt < stored.updatedAt.getTime()) {
        throw new Error('Sign-in rate-limit temporal ordering is invalid.');
      }

      const expired =
        stored === undefined ||
        occurredAt >= stored.windowEndsAt.getTime() ||
        occurredAt >= stored.retentionExpiresAt.getTime();
      if (expired) {
        const windowEndsAt = addMilliseconds(occurredAt, windowDurationMilliseconds);
        const retentionExpiresAt = addMilliseconds(occurredAt, retentionDurationMilliseconds);
        if (stored === undefined) {
          await client.query(
            `INSERT INTO sem_caderno.sign_in_rate_limits (
               account_key_version, account_key_digest, window_started_at, window_ends_at,
               failure_count, updated_at, retention_expires_at, version
             ) VALUES ($1, $2, $3, $4, $5, $3, $6, $7)`,
            [
              input.accountKey.digestVersion,
              digest,
              new Date(occurredAt),
              windowEndsAt,
              1,
              retentionExpiresAt,
              1,
            ],
          );
        } else {
          await client.query(
            `UPDATE sem_caderno.sign_in_rate_limits
                SET window_started_at = $3,
                    window_ends_at = $4,
                    failure_count = $5,
                    updated_at = $3,
                    retention_expires_at = $6,
                    version = version + 1
              WHERE account_key_version = $1 AND account_key_digest = $2`,
            [
              input.accountKey.digestVersion,
              digest,
              new Date(occurredAt),
              windowEndsAt,
              1,
              retentionExpiresAt,
            ],
          );
        }
        return allowed();
      }

      if (stored.failureCount === 10) return limited(stored.windowEndsAt);

      const failureCount = stored.failureCount + 1;
      await client.query(
        `UPDATE sem_caderno.sign_in_rate_limits
            SET failure_count = $3,
                updated_at = $4,
                retention_expires_at = $5,
                version = version + 1
          WHERE account_key_version = $1 AND account_key_digest = $2`,
        [
          input.accountKey.digestVersion,
          digest,
          failureCount,
          new Date(occurredAt),
          addMilliseconds(occurredAt, retentionDurationMilliseconds),
        ],
      );
      return failureCount === 10 ? limited(stored.windowEndsAt) : allowed();
    });
  }

  async clear(input: ClearSignInRateLimitInput): Promise<void> {
    const digest = decodeAccountKey(input.accountKey);
    await this.withAccountLock(digest, async (client) => {
      await client.query(
        `DELETE FROM sem_caderno.sign_in_rate_limits
          WHERE account_key_version = $1 AND account_key_digest = $2`,
        [input.accountKey.digestVersion, digest],
      );
    });
  }

  async deleteExpired(input: CleanupInput): Promise<number> {
    const evaluatedAt = instantMilliseconds(input.evaluatedAt);
    if (!Number.isSafeInteger(input.limit) || input.limit < 1) {
      throw new Error('Sign-in rate-limit cleanup limit is invalid.');
    }

    try {
      const result = await this.pool.query(
        `WITH candidates AS (
           SELECT account_key_version, account_key_digest
             FROM sem_caderno.sign_in_rate_limits
            WHERE retention_expires_at <= $1
            ORDER BY retention_expires_at, account_key_version, account_key_digest
            LIMIT $2
            FOR UPDATE SKIP LOCKED
         )
         DELETE FROM sem_caderno.sign_in_rate_limits AS target
          USING candidates
          WHERE target.account_key_version = candidates.account_key_version
            AND target.account_key_digest = candidates.account_key_digest
        RETURNING target.account_key_version`,
        [new Date(evaluatedAt), input.limit],
      );
      return result.rowCount ?? 0;
    } catch {
      throw new Error('Sign-in rate-limit cleanup persistence failed.');
    }
  }
}
