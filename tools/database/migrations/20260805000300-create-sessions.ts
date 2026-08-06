import type { MigrationBuilder } from 'node-pg-migrate';

const sessions = { schema: 'sem_caderno', name: 'sessions' } as const;

export const up = (pgm: MigrationBuilder): void => {
  pgm.createTable(sessions, {
    id: { type: 'uuid', primaryKey: true, notNull: true, default: pgm.func('uuidv7()') },
    digest_version: { type: 'smallint', notNull: true },
    credential_digest: { type: 'bytea', notNull: true },
    user_id: { type: 'uuid', notNull: true },
    selected_business_id: { type: 'uuid' },
    created_at: { type: 'timestamptz', notNull: true },
    expires_at: { type: 'timestamptz', notNull: true },
    revoked_at: { type: 'timestamptz' },
    updated_at: { type: 'timestamptz', notNull: true },
    version: { type: 'bigint', notNull: true },
  });

  pgm.addConstraint(sessions, 'sessions_user_fk', {
    foreignKeys: {
      columns: 'user_id',
      references: { schema: 'sem_caderno', name: 'users' },
      onDelete: 'RESTRICT',
      onUpdate: 'RESTRICT',
    },
  });
  pgm.addConstraint(sessions, 'sessions_selected_business_fk', {
    foreignKeys: {
      columns: 'selected_business_id',
      references: { schema: 'sem_caderno', name: 'businesses' },
      onDelete: 'RESTRICT',
      onUpdate: 'RESTRICT',
    },
  });
  pgm.addConstraint(sessions, 'sessions_digest_version_supported', {
    check: 'digest_version = 1',
  });
  pgm.addConstraint(sessions, 'sessions_credential_digest_length', {
    check: 'octet_length(credential_digest) = 32',
  });
  pgm.addConstraint(sessions, 'sessions_digest_unique', {
    unique: ['digest_version', 'credential_digest'],
  });
  pgm.addConstraint(sessions, 'sessions_expiry_after_creation', {
    check: 'expires_at > created_at',
  });
  pgm.addConstraint(sessions, 'sessions_revoked_at_not_before_created_at', {
    check: 'revoked_at IS NULL OR revoked_at >= created_at',
  });
  pgm.addConstraint(sessions, 'sessions_updated_at_not_before_created_at', {
    check: 'updated_at >= created_at',
  });
  pgm.addConstraint(sessions, 'sessions_version_positive', { check: 'version > 0' });
};
