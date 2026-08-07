import type { MigrationBuilder } from 'node-pg-migrate';

const sessions = { schema: 'sem_caderno', name: 'sessions' } as const;
const auditEvents = { schema: 'sem_caderno', name: 'audit_events' } as const;

export const up = (pgm: MigrationBuilder): void => {
  pgm.addColumns(sessions, {
    authenticated_csrf_digest_version: { type: 'smallint' },
    authenticated_csrf_digest: { type: 'bytea' },
  });

  pgm.addConstraint(sessions, 'sessions_authenticated_csrf_pair_complete', {
    check:
      '(authenticated_csrf_digest_version IS NULL AND authenticated_csrf_digest IS NULL) OR ' +
      '(authenticated_csrf_digest_version IS NOT NULL AND authenticated_csrf_digest IS NOT NULL)',
  });
  pgm.addConstraint(sessions, 'sessions_authenticated_csrf_digest_version_supported', {
    check: 'authenticated_csrf_digest_version IS NULL OR authenticated_csrf_digest_version = 1',
  });
  pgm.addConstraint(sessions, 'sessions_authenticated_csrf_digest_length', {
    check: 'authenticated_csrf_digest IS NULL OR octet_length(authenticated_csrf_digest) = 32',
  });
  pgm.createIndex(sessions, ['authenticated_csrf_digest_version', 'authenticated_csrf_digest'], {
    name: 'sessions_authenticated_csrf_digest_unique',
    unique: true,
    where: 'authenticated_csrf_digest_version IS NOT NULL',
  });

  pgm.createTable(auditEvents, {
    id: { type: 'uuid', primaryKey: true, notNull: true, default: pgm.func('uuidv7()') },
    actor_user_id: { type: 'uuid', notNull: true },
    action_code: { type: 'text', notNull: true },
    outcome_code: { type: 'text', notNull: true },
    occurred_at: { type: 'timestamptz', notNull: true },
  });
  pgm.addConstraint(auditEvents, 'audit_events_actor_user_fk', {
    foreignKeys: {
      columns: 'actor_user_id',
      references: { schema: 'sem_caderno', name: 'users' },
      onDelete: 'RESTRICT',
      onUpdate: 'RESTRICT',
    },
  });
  pgm.addConstraint(auditEvents, 'audit_events_action_code_supported', {
    check: "action_code = 'session_issued'",
  });
  pgm.addConstraint(auditEvents, 'audit_events_outcome_code_supported', {
    check: "outcome_code = 'succeeded'",
  });
};
