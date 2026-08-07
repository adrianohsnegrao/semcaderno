import type {
  AuthenticatedCsrfDigest,
  IssueSessionInput,
  PreSessionCsrfDigest,
  SessionCredentialDigest,
  SessionIssuanceResult,
  SessionIssuanceTransactionPort,
  SignInRateLimitAccountKey,
} from '@sem-caderno/application';
import type { Pool, PoolClient } from 'pg';

const canonicalDigestPattern = /^[A-Za-z0-9_-]{43}$/;
const sessionDurationMilliseconds = 12 * 60 * 60 * 1_000;
const sessionCredentialConstraint = 'sessions_digest_unique';
const authenticatedCsrfConstraint = 'sessions_authenticated_csrf_digest_unique';

type VersionedDigest =
  | SessionCredentialDigest
  | PreSessionCsrfDigest
  | AuthenticatedCsrfDigest
  | SignInRateLimitAccountKey;

type PostgreSqlError = Readonly<{
  code?: unknown;
  constraint?: unknown;
}>;

const decodeDigest = (value: VersionedDigest): Buffer => {
  if (value.digestVersion !== 1 || !canonicalDigestPattern.test(value.digestBase64Url)) {
    throw new Error('Session issuance input is invalid.');
  }

  const digest = Buffer.from(value.digestBase64Url, 'base64url');
  if (digest.byteLength !== 32 || digest.toString('base64url') !== value.digestBase64Url) {
    throw new Error('Session issuance input is invalid.');
  }
  return digest;
};

const instantMilliseconds = (value: Date): number => {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error('Session issuance input is invalid.');
  }
  return value.getTime();
};

const isDigestCollision = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as PostgreSqlError;
  return (
    candidate.code === '23505' &&
    (candidate.constraint === sessionCredentialConstraint ||
      candidate.constraint === authenticatedCsrfConstraint)
  );
};

const rollback = async (client: PoolClient): Promise<void> => {
  await client.query('ROLLBACK');
};

export class PostgresSessionIssuanceAdapter implements SessionIssuanceTransactionPort {
  constructor(private readonly pool: Pool) {}

  async issue(input: IssueSessionInput): Promise<SessionIssuanceResult> {
    const issuedAtMilliseconds = instantMilliseconds(input.issuedAt);
    const expiresAtMilliseconds = instantMilliseconds(input.expiresAt);
    if (expiresAtMilliseconds - issuedAtMilliseconds !== sessionDurationMilliseconds) {
      throw new Error('Session issuance input is invalid.');
    }

    const accountKeyDigest = decodeDigest(input.signInRateLimitAccountKey);
    const sessionCredentialDigest = decodeDigest(input.sessionCredentialDigest);
    const preSessionCsrfDigest = decodeDigest(input.preSessionCsrfDigest);
    const authenticatedCsrfDigest = decodeDigest(input.authenticatedCsrfDigest);
    const priorSessionCredentialDigest =
      input.priorSessionCredentialDigest === undefined
        ? undefined
        : decodeDigest(input.priorSessionCredentialDigest);
    const issuedAt = new Date(issuedAtMilliseconds);
    const expiresAt = new Date(expiresAtMilliseconds);

    let client: PoolClient | undefined;
    let transactionOpen = false;
    try {
      client = await this.pool.connect();
      await client.query('BEGIN');
      transactionOpen = true;
      await client.query('SELECT pg_advisory_xact_lock($1::bigint)', [
        accountKeyDigest.readBigInt64BE(0).toString(),
      ]);

      const user = await client.query(
        `SELECT id
           FROM sem_caderno.users
          WHERE id = $1
            AND disabled_at IS NULL
            AND email_verified_at IS NOT NULL
          FOR UPDATE`,
        [input.userId],
      );
      if (user.rowCount === 0) {
        await rollback(client);
        transactionOpen = false;
        return Object.freeze({ outcome: 'userRejected' });
      }
      if (user.rowCount !== 1) throw new Error('Session issuance User row is invalid.');

      const challenge = await client.query(
        `UPDATE sem_caderno.pre_session_challenges
            SET consumed_at = $3,
                version = version + 1
          WHERE digest_version = $1
            AND challenge_digest = $2
            AND consumed_at IS NULL
            AND created_at <= $3
            AND $3 < expires_at
        RETURNING id`,
        [input.preSessionCsrfDigest.digestVersion, preSessionCsrfDigest, issuedAt],
      );
      if (challenge.rowCount === 0) {
        await rollback(client);
        transactionOpen = false;
        return Object.freeze({ outcome: 'preSessionChallengeRejected' });
      }
      if (challenge.rowCount !== 1) {
        throw new Error('Session issuance challenge row is invalid.');
      }

      if (priorSessionCredentialDigest !== undefined) {
        await client.query(
          `UPDATE sem_caderno.sessions
              SET revoked_at = $3,
                  updated_at = $3,
                  version = version + 1
            WHERE digest_version = $1
              AND credential_digest = $2
              AND revoked_at IS NULL
              AND created_at <= $3
              AND $3 < expires_at`,
          [
            input.priorSessionCredentialDigest?.digestVersion,
            priorSessionCredentialDigest,
            issuedAt,
          ],
        );
      }

      try {
        await client.query(
          `INSERT INTO sem_caderno.sessions (
             digest_version, credential_digest, user_id, selected_business_id,
             created_at, expires_at, revoked_at, updated_at, version,
             authenticated_csrf_digest_version, authenticated_csrf_digest
           ) VALUES ($1, $2, $3, NULL, $4, $5, NULL, $4, 1, $6, $7)`,
          [
            input.sessionCredentialDigest.digestVersion,
            sessionCredentialDigest,
            input.userId,
            issuedAt,
            expiresAt,
            input.authenticatedCsrfDigest.digestVersion,
            authenticatedCsrfDigest,
          ],
        );
      } catch (error) {
        if (!isDigestCollision(error)) throw error;
        await rollback(client);
        transactionOpen = false;
        return Object.freeze({ outcome: 'digestCollision' });
      }

      await client.query(
        `INSERT INTO sem_caderno.audit_events (
           actor_user_id, action_code, outcome_code, occurred_at
         ) VALUES ($1, 'session_issued', 'succeeded', $2)`,
        [input.userId, issuedAt],
      );
      await client.query(
        `DELETE FROM sem_caderno.sign_in_rate_limits
          WHERE account_key_version = $1 AND account_key_digest = $2`,
        [input.signInRateLimitAccountKey.digestVersion, accountKeyDigest],
      );
      await client.query('COMMIT');
      transactionOpen = false;
      return Object.freeze({
        outcome: 'issued',
        userId: input.userId,
        expiresAt: new Date(expiresAtMilliseconds),
      });
    } catch {
      if (client !== undefined && transactionOpen) {
        try {
          await rollback(client);
        } catch {
          throw new Error('Session issuance persistence failed.');
        }
      }
      throw new Error('Session issuance persistence failed.');
    } finally {
      client?.release();
    }
  }
}
