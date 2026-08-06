import type { MigrationBuilder } from 'node-pg-migrate';

const preSessionChallenges = {
  schema: 'sem_caderno',
  name: 'pre_session_challenges',
} as const;

export const up = (pgm: MigrationBuilder): void => {
  pgm.createTable(preSessionChallenges, {
    id: { type: 'uuid', primaryKey: true, notNull: true, default: pgm.func('uuidv7()') },
    digest_version: { type: 'smallint', notNull: true },
    challenge_digest: { type: 'bytea', notNull: true },
    created_at: { type: 'timestamptz', notNull: true },
    expires_at: { type: 'timestamptz', notNull: true },
    consumed_at: { type: 'timestamptz' },
    version: { type: 'bigint', notNull: true },
  });

  pgm.addConstraint(preSessionChallenges, 'pre_session_challenges_digest_version_supported', {
    check: 'digest_version = 1',
  });
  pgm.addConstraint(preSessionChallenges, 'pre_session_challenges_digest_length', {
    check: 'octet_length(challenge_digest) = 32',
  });
  pgm.addConstraint(preSessionChallenges, 'pre_session_challenges_digest_unique', {
    unique: ['digest_version', 'challenge_digest'],
  });
  pgm.addConstraint(preSessionChallenges, 'pre_session_challenges_expiry_after_creation', {
    check: 'expires_at > created_at',
  });
  pgm.addConstraint(preSessionChallenges, 'pre_session_challenges_consumption_within_lifetime', {
    check: 'consumed_at IS NULL OR (consumed_at >= created_at AND consumed_at < expires_at)',
  });
  pgm.addConstraint(preSessionChallenges, 'pre_session_challenges_version_positive', {
    check: 'version > 0',
  });
};
