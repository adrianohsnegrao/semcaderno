import type { MigrationBuilder } from 'node-pg-migrate';

const signInRateLimits = { schema: 'sem_caderno', name: 'sign_in_rate_limits' } as const;

export const up = (pgm: MigrationBuilder): void => {
  pgm.createTable(signInRateLimits, {
    account_key_version: { type: 'smallint', notNull: true },
    account_key_digest: { type: 'bytea', notNull: true },
    window_started_at: { type: 'timestamptz', notNull: true },
    window_ends_at: { type: 'timestamptz', notNull: true },
    failure_count: { type: 'smallint', notNull: true },
    updated_at: { type: 'timestamptz', notNull: true },
    retention_expires_at: { type: 'timestamptz', notNull: true },
    version: { type: 'bigint', notNull: true },
  });

  pgm.addConstraint(signInRateLimits, 'sign_in_rate_limits_pk', {
    primaryKey: ['account_key_version', 'account_key_digest'],
  });
  pgm.addConstraint(signInRateLimits, 'sign_in_rate_limits_account_key_version_supported', {
    check: 'account_key_version = 1',
  });
  pgm.addConstraint(signInRateLimits, 'sign_in_rate_limits_account_key_digest_length', {
    check: 'octet_length(account_key_digest) = 32',
  });
  pgm.addConstraint(signInRateLimits, 'sign_in_rate_limits_window_duration', {
    check: "window_ends_at = window_started_at + interval '15 minutes'",
  });
  pgm.addConstraint(signInRateLimits, 'sign_in_rate_limits_failure_count_range', {
    check: 'failure_count BETWEEN 1 AND 10',
  });
  pgm.addConstraint(signInRateLimits, 'sign_in_rate_limits_updated_at_within_window', {
    check: 'window_started_at <= updated_at AND updated_at < window_ends_at',
  });
  pgm.addConstraint(signInRateLimits, 'sign_in_rate_limits_retention_duration', {
    check: "retention_expires_at = updated_at + interval '24 hours'",
  });
  pgm.addConstraint(signInRateLimits, 'sign_in_rate_limits_version_positive', {
    check: 'version > 0',
  });
  pgm.createIndex(signInRateLimits, 'retention_expires_at', {
    name: 'sign_in_rate_limits_retention_expires_at_idx',
  });
};
