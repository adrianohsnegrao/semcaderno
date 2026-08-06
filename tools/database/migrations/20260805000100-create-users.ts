import type { MigrationBuilder } from 'node-pg-migrate';

const users = { schema: 'sem_caderno', name: 'users' } as const;

export const up = (pgm: MigrationBuilder): void => {
  pgm.createTable(users, {
    id: { type: 'uuid', primaryKey: true, notNull: true, default: pgm.func('uuidv7()') },
    email_original: { type: 'text', notNull: true },
    email_normalized: { type: 'text', notNull: true },
    email_verified_at: { type: 'timestamptz' },
    disabled_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true },
    updated_at: { type: 'timestamptz', notNull: true },
    version: { type: 'bigint', notNull: true },
  });

  pgm.addConstraint(users, 'users_email_original_not_blank', {
    check: "btrim(email_original) <> ''",
  });
  pgm.addConstraint(users, 'users_email_normalized_not_blank', {
    check: "btrim(email_normalized) <> ''",
  });
  pgm.addConstraint(users, 'users_email_normalized_unique', {
    unique: 'email_normalized',
  });
  pgm.addConstraint(users, 'users_updated_at_not_before_created_at', {
    check: 'updated_at >= created_at',
  });
  pgm.addConstraint(users, 'users_disabled_at_not_before_created_at', {
    check: 'disabled_at IS NULL OR disabled_at >= created_at',
  });
  pgm.addConstraint(users, 'users_version_positive', { check: 'version > 0' });
};
