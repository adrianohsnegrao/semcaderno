import type {
  ConsumePreSessionChallengeInput,
  PreSessionChallengePort,
  PreSessionCsrfDigest,
  StorePreSessionChallengeInput,
} from '@sem-caderno/application';
import type { Pool } from 'pg';

const canonicalDigestPattern = /^[A-Za-z0-9_-]{43}$/;

const decodeDigest = (challengeDigest: PreSessionCsrfDigest): Buffer => {
  if (challengeDigest.digestVersion !== 1) {
    throw new Error('Pre-session CSRF digest is invalid.');
  }

  const { digestBase64Url } = challengeDigest;
  if (!canonicalDigestPattern.test(digestBase64Url)) {
    throw new Error('Pre-session CSRF digest is invalid.');
  }

  const digest = Buffer.from(digestBase64Url, 'base64url');
  if (digest.byteLength !== 32 || digest.toString('base64url') !== digestBase64Url) {
    throw new Error('Pre-session CSRF digest is invalid.');
  }

  return digest;
};

const assertInstant = (instant: Date): void => {
  if (!(instant instanceof Date) || !Number.isFinite(instant.getTime())) {
    throw new Error('Pre-session challenge instant is invalid.');
  }
};

export class PostgresPreSessionChallengeAdapter implements PreSessionChallengePort {
  constructor(private readonly pool: Pool) {}

  async create(input: StorePreSessionChallengeInput): Promise<void> {
    const digest = decodeDigest(input.challengeDigest);
    assertInstant(input.createdAt);
    assertInstant(input.expiresAt);

    try {
      await this.pool.query(
        `INSERT INTO sem_caderno.pre_session_challenges (
           digest_version, challenge_digest, created_at, expires_at, consumed_at, version
         ) VALUES ($1, $2, $3, $4, NULL, $5)`,
        [input.challengeDigest.digestVersion, digest, input.createdAt, input.expiresAt, 1],
      );
    } catch {
      throw new Error('Pre-session challenge creation persistence failed.');
    }
  }

  async consume(input: ConsumePreSessionChallengeInput): Promise<boolean> {
    const digest = decodeDigest(input.challengeDigest);
    assertInstant(input.consumedAt);

    try {
      const result = await this.pool.query(
        `UPDATE sem_caderno.pre_session_challenges
            SET consumed_at = $3,
                version = version + 1
          WHERE digest_version = $1
            AND challenge_digest = $2
            AND consumed_at IS NULL
            AND $3::timestamptz >= created_at
            AND $3::timestamptz < expires_at
        RETURNING id`,
        [input.challengeDigest.digestVersion, digest, input.consumedAt],
      );

      return result.rowCount === 1;
    } catch {
      throw new Error('Pre-session challenge consumption persistence failed.');
    }
  }
}
