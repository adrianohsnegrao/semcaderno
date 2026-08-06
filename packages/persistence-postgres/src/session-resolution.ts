import type {
  AuthenticatedSessionInspection,
  ResolveSessionInput,
  SessionResolutionPort,
} from '@sem-caderno/application';
import type { Pool } from 'pg';

type SessionResolutionRow = Readonly<{
  userId: string;
  expiresAt: Date;
  selectedBusinessId: string | null;
}>;

const canonicalDigestPattern = /^[A-Za-z0-9_-]{43}$/;

const decodeDigest = (digestBase64Url: string): Buffer => {
  if (!canonicalDigestPattern.test(digestBase64Url)) {
    throw new Error('Session lookup evidence is invalid.');
  }

  const digest = Buffer.from(digestBase64Url, 'base64url');
  if (digest.byteLength !== 32 || digest.toString('base64url') !== digestBase64Url) {
    throw new Error('Session lookup evidence is invalid.');
  }

  return digest;
};

const mapRow = (row: SessionResolutionRow): AuthenticatedSessionInspection => {
  if (
    typeof row.userId !== 'string' ||
    !(row.expiresAt instanceof Date) ||
    !Number.isFinite(row.expiresAt.getTime()) ||
    (row.selectedBusinessId !== null && typeof row.selectedBusinessId !== 'string')
  ) {
    throw new Error('Session persistence row is invalid.');
  }

  return Object.freeze({
    state: 'authenticated',
    userId: row.userId,
    expiresAt: new Date(row.expiresAt.getTime()),
    ...(row.selectedBusinessId === null ? {} : { selectedBusinessId: row.selectedBusinessId }),
  });
};

export class PostgresSessionResolutionAdapter implements SessionResolutionPort {
  constructor(private readonly pool: Pool) {}

  async resolve(input: ResolveSessionInput): Promise<AuthenticatedSessionInspection | undefined> {
    const digest = decodeDigest(input.sessionLookup.digestBase64Url);

    let rows: SessionResolutionRow[];
    try {
      const result = await this.pool.query<SessionResolutionRow>(
        `SELECT
           resolved_session.user_id AS "userId",
           resolved_session.expires_at AS "expiresAt",
           resolved_session.selected_business_id AS "selectedBusinessId"
         FROM sem_caderno.sessions AS resolved_session
         INNER JOIN sem_caderno.users AS resolved_user
           ON resolved_user.id = resolved_session.user_id
          AND resolved_user.disabled_at IS NULL
         WHERE resolved_session.digest_version = $1
           AND resolved_session.credential_digest = $2
           AND resolved_session.revoked_at IS NULL
           AND $3::timestamptz < resolved_session.expires_at
         LIMIT 2`,
        [input.sessionLookup.digestVersion, digest, input.evaluatedAt],
      );
      rows = result.rows;
    } catch {
      throw new Error('Session resolution persistence failed.');
    }

    const row = rows[0];
    if (row === undefined) {
      return undefined;
    }
    if (rows.length !== 1) {
      throw new Error('Session persistence row is invalid.');
    }

    return mapRow(row);
  }
}
