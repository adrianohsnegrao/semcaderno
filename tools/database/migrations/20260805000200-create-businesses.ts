import type { MigrationBuilder } from 'node-pg-migrate';

const businesses = { schema: 'sem_caderno', name: 'businesses' } as const;

export const up = (pgm: MigrationBuilder): void => {
  pgm.createTable(businesses, {
    id: { type: 'uuid', primaryKey: true, notNull: true, default: pgm.func('uuidv7()') },
    state: { type: 'text', notNull: true },
    created_by_user_id: { type: 'uuid', notNull: true },
    deactivated_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true },
    updated_at: { type: 'timestamptz', notNull: true },
    version: { type: 'bigint', notNull: true },
  });

  pgm.addConstraint(businesses, 'businesses_created_by_user_fk', {
    foreignKeys: {
      columns: 'created_by_user_id',
      references: { schema: 'sem_caderno', name: 'users' },
      onDelete: 'RESTRICT',
      onUpdate: 'RESTRICT',
    },
  });
  pgm.addConstraint(businesses, 'businesses_state_allowed', {
    check: "state IN ('active', 'deactivated')",
  });
  pgm.addConstraint(businesses, 'businesses_deactivation_state_consistent', {
    check:
      "(state = 'active' AND deactivated_at IS NULL) OR " +
      "(state = 'deactivated' AND deactivated_at IS NOT NULL)",
  });
  pgm.addConstraint(businesses, 'businesses_deactivated_at_not_before_created_at', {
    check: 'deactivated_at IS NULL OR deactivated_at >= created_at',
  });
  pgm.addConstraint(businesses, 'businesses_updated_at_not_before_created_at', {
    check: 'updated_at >= created_at',
  });
  pgm.addConstraint(businesses, 'businesses_version_positive', { check: 'version > 0' });
};
