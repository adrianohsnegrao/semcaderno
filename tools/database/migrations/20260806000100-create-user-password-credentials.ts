import type { MigrationBuilder } from 'node-pg-migrate';

const userPasswordCredentials = {
  schema: 'sem_caderno',
  name: 'user_password_credentials',
} as const;

export const up = (pgm: MigrationBuilder): void => {
  pgm.createTable(userPasswordCredentials, {
    user_id: { type: 'uuid', primaryKey: true, notNull: true },
    password_verifier: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true },
    updated_at: { type: 'timestamptz', notNull: true },
    version: { type: 'bigint', notNull: true },
  });

  pgm.addConstraint(userPasswordCredentials, 'user_password_credentials_user_fk', {
    foreignKeys: {
      columns: 'user_id',
      references: { schema: 'sem_caderno', name: 'users' },
      onDelete: 'RESTRICT',
      onUpdate: 'RESTRICT',
    },
  });
  pgm.addConstraint(userPasswordCredentials, 'user_password_credentials_argon2id', {
    check: "password_verifier LIKE '$argon2id$%'",
  });
  pgm.addConstraint(
    userPasswordCredentials,
    'user_password_credentials_updated_at_not_before_created_at',
    { check: 'updated_at >= created_at' },
  );
  pgm.addConstraint(userPasswordCredentials, 'user_password_credentials_version_positive', {
    check: 'version > 0',
  });
};
