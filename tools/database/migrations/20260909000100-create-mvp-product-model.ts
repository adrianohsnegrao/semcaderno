import type { MigrationBuilder } from 'node-pg-migrate';

const schema = 'sem_caderno';
const table = (name: string) => ({ schema, name });

export const up = (pgm: MigrationBuilder): void => {
  pgm.addColumns(table('users'), {
    display_name: { type: 'text', notNull: true, default: 'Responsável' },
  });
  pgm.addConstraint(table('users'), 'users_display_name_not_blank', {
    check: "btrim(display_name) <> ''",
  });
  pgm.addColumns(table('businesses'), {
    display_name: { type: 'text', notNull: true, default: 'Meu estabelecimento' },
    time_zone: { type: 'text', notNull: true, default: 'America/Manaus' },
    pix_key: { type: 'text' },
  });
  pgm.addConstraint(table('businesses'), 'businesses_display_name_not_blank', {
    check: "btrim(display_name) <> ''",
  });
  pgm.addConstraint(table('businesses'), 'businesses_time_zone_not_blank', {
    check: "btrim(time_zone) <> ''",
  });

  pgm.createTable(table('business_memberships'), {
    business_id: { type: 'uuid', notNull: true },
    user_id: { type: 'uuid', notNull: true },
    role: { type: 'text', notNull: true },
    state: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true },
  });
  pgm.addConstraint(table('business_memberships'), 'business_memberships_pk', {
    primaryKey: ['business_id', 'user_id'],
  });
  pgm.addConstraint(table('business_memberships'), 'business_memberships_business_fk', {
    foreignKeys: { columns: 'business_id', references: table('businesses'), onDelete: 'RESTRICT' },
  });
  pgm.addConstraint(table('business_memberships'), 'business_memberships_user_fk', {
    foreignKeys: { columns: 'user_id', references: table('users'), onDelete: 'RESTRICT' },
  });
  pgm.addConstraint(table('business_memberships'), 'business_memberships_role_allowed', {
    check: "role IN ('owner', 'staff')",
  });
  pgm.addConstraint(table('business_memberships'), 'business_memberships_state_allowed', {
    check: "state IN ('active', 'suspended', 'removed')",
  });

  pgm.createTable(table('mvp_sessions'), {
    id: { type: 'uuid', primaryKey: true, notNull: true, default: pgm.func('uuidv7()') },
    token_digest: { type: 'bytea', notNull: true, unique: true },
    csrf_digest: { type: 'bytea', notNull: true },
    user_id: { type: 'uuid', notNull: true },
    business_id: { type: 'uuid', notNull: true },
    created_at: { type: 'timestamptz', notNull: true },
    expires_at: { type: 'timestamptz', notNull: true },
    revoked_at: { type: 'timestamptz' },
  });
  pgm.addConstraint(table('mvp_sessions'), 'mvp_sessions_user_fk', {
    foreignKeys: { columns: 'user_id', references: table('users'), onDelete: 'RESTRICT' },
  });
  pgm.addConstraint(table('mvp_sessions'), 'mvp_sessions_business_fk', {
    foreignKeys: { columns: 'business_id', references: table('businesses'), onDelete: 'RESTRICT' },
  });
  pgm.addConstraint(table('mvp_sessions'), 'mvp_sessions_digest_lengths', {
    check: 'octet_length(token_digest) = 32 AND octet_length(csrf_digest) = 32',
  });
  pgm.addConstraint(table('mvp_sessions'), 'mvp_sessions_expiry_after_creation', {
    check: 'expires_at > created_at',
  });
  pgm.createIndex(table('mvp_sessions'), ['user_id', 'expires_at']);

  pgm.createTable(table('customers'), {
    id: { type: 'uuid', primaryKey: true, notNull: true, default: pgm.func('uuidv7()') },
    business_id: { type: 'uuid', notNull: true },
    display_name: { type: 'text', notNull: true },
    phone: { type: 'text' },
    note: { type: 'text' },
    active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true },
  });
  pgm.addConstraint(table('customers'), 'customers_business_fk', {
    foreignKeys: { columns: 'business_id', references: table('businesses'), onDelete: 'RESTRICT' },
  });
  pgm.addConstraint(table('customers'), 'customers_name_not_blank', {
    check: "btrim(display_name) <> ''",
  });
  pgm.createIndex(table('customers'), ['business_id', 'display_name']);

  pgm.createTable(table('products'), {
    id: { type: 'uuid', primaryKey: true, notNull: true, default: pgm.func('uuidv7()') },
    business_id: { type: 'uuid', notNull: true },
    display_name: { type: 'text', notNull: true },
    price_cents: { type: 'bigint', notNull: true },
    active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true },
  });
  pgm.addConstraint(table('products'), 'products_business_fk', {
    foreignKeys: { columns: 'business_id', references: table('businesses'), onDelete: 'RESTRICT' },
  });
  pgm.addConstraint(table('products'), 'products_values_valid', {
    check: "btrim(display_name) <> '' AND price_cents > 0",
  });
  pgm.createIndex(table('products'), ['business_id', 'display_name']);

  pgm.createTable(table('sales'), {
    id: { type: 'uuid', primaryKey: true, notNull: true, default: pgm.func('uuidv7()') },
    business_id: { type: 'uuid', notNull: true },
    customer_id: { type: 'uuid' },
    total_cents: { type: 'bigint', notNull: true },
    paid_cents: { type: 'bigint', notNull: true },
    status: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true },
    cancelled_at: { type: 'timestamptz' },
    cancellation_reason: { type: 'text' },
  });
  pgm.addConstraint(table('sales'), 'sales_business_fk', {
    foreignKeys: { columns: 'business_id', references: table('businesses'), onDelete: 'RESTRICT' },
  });
  pgm.addConstraint(table('sales'), 'sales_customer_fk', {
    foreignKeys: { columns: 'customer_id', references: table('customers'), onDelete: 'RESTRICT' },
  });
  pgm.addConstraint(table('sales'), 'sales_amounts_valid', {
    check: 'total_cents > 0 AND paid_cents >= 0 AND paid_cents <= total_cents',
  });
  pgm.addConstraint(table('sales'), 'sales_status_allowed', {
    check: "status IN ('open', 'partial', 'paid', 'cancelled')",
  });
  pgm.addConstraint(table('sales'), 'sales_debt_requires_customer', {
    check: "status IN ('paid', 'cancelled') OR customer_id IS NOT NULL",
  });
  pgm.addConstraint(table('sales'), 'sales_cancellation_pair', {
    check:
      "(status = 'cancelled') = (cancelled_at IS NOT NULL AND cancellation_reason IS NOT NULL)",
  });
  pgm.createIndex(table('sales'), ['business_id', 'created_at']);
  pgm.createIndex(table('sales'), ['business_id', 'customer_id']);

  pgm.createTable(table('sale_items'), {
    id: { type: 'uuid', primaryKey: true, notNull: true, default: pgm.func('uuidv7()') },
    sale_id: { type: 'uuid', notNull: true },
    product_id: { type: 'uuid' },
    description_snapshot: { type: 'text', notNull: true },
    quantity: { type: 'integer', notNull: true },
    unit_price_cents: { type: 'bigint', notNull: true },
    total_cents: { type: 'bigint', notNull: true },
  });
  pgm.addConstraint(table('sale_items'), 'sale_items_sale_fk', {
    foreignKeys: { columns: 'sale_id', references: table('sales'), onDelete: 'RESTRICT' },
  });
  pgm.addConstraint(table('sale_items'), 'sale_items_product_fk', {
    foreignKeys: { columns: 'product_id', references: table('products'), onDelete: 'RESTRICT' },
  });
  pgm.addConstraint(table('sale_items'), 'sale_items_values_valid', {
    check:
      "btrim(description_snapshot) <> '' AND quantity > 0 AND unit_price_cents > 0 AND total_cents = quantity * unit_price_cents",
  });
  pgm.createIndex(table('sale_items'), 'sale_id');

  pgm.createTable(table('payments'), {
    id: { type: 'uuid', primaryKey: true, notNull: true, default: pgm.func('uuidv7()') },
    business_id: { type: 'uuid', notNull: true },
    sale_id: { type: 'uuid', notNull: true },
    amount_cents: { type: 'bigint', notNull: true },
    method: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true },
    reversed_at: { type: 'timestamptz' },
    reversal_reason: { type: 'text' },
  });
  pgm.addConstraint(table('payments'), 'payments_business_fk', {
    foreignKeys: { columns: 'business_id', references: table('businesses'), onDelete: 'RESTRICT' },
  });
  pgm.addConstraint(table('payments'), 'payments_sale_fk', {
    foreignKeys: { columns: 'sale_id', references: table('sales'), onDelete: 'RESTRICT' },
  });
  pgm.addConstraint(table('payments'), 'payments_values_valid', {
    check: "amount_cents > 0 AND method IN ('cash', 'pix', 'card', 'other')",
  });
  pgm.addConstraint(table('payments'), 'payments_reversal_pair', {
    check: '(reversed_at IS NULL) = (reversal_reason IS NULL)',
  });
  pgm.createIndex(table('payments'), ['business_id', 'created_at']);

  pgm.createTable(table('expenses'), {
    id: { type: 'uuid', primaryKey: true, notNull: true, default: pgm.func('uuidv7()') },
    business_id: { type: 'uuid', notNull: true },
    description: { type: 'text', notNull: true },
    amount_cents: { type: 'bigint', notNull: true },
    occurred_on: { type: 'date', notNull: true },
    created_at: { type: 'timestamptz', notNull: true },
  });
  pgm.addConstraint(table('expenses'), 'expenses_business_fk', {
    foreignKeys: { columns: 'business_id', references: table('businesses'), onDelete: 'RESTRICT' },
  });
  pgm.addConstraint(table('expenses'), 'expenses_values_valid', {
    check: "btrim(description) <> '' AND amount_cents > 0",
  });
  pgm.createIndex(table('expenses'), ['business_id', 'occurred_on']);

  pgm.createTable(table('mvp_activities'), {
    id: { type: 'uuid', primaryKey: true, notNull: true, default: pgm.func('uuidv7()') },
    business_id: { type: 'uuid', notNull: true },
    actor_user_id: { type: 'uuid', notNull: true },
    kind: { type: 'text', notNull: true },
    title: { type: 'text', notNull: true },
    detail: { type: 'text', notNull: true },
    amount_cents: { type: 'bigint' },
    created_at: { type: 'timestamptz', notNull: true },
  });
  pgm.addConstraint(table('mvp_activities'), 'mvp_activities_business_fk', {
    foreignKeys: { columns: 'business_id', references: table('businesses'), onDelete: 'RESTRICT' },
  });
  pgm.addConstraint(table('mvp_activities'), 'mvp_activities_actor_fk', {
    foreignKeys: { columns: 'actor_user_id', references: table('users'), onDelete: 'RESTRICT' },
  });
  pgm.addConstraint(table('mvp_activities'), 'mvp_activities_kind_allowed', {
    check: "kind IN ('sale', 'payment', 'expense', 'collection', 'correction')",
  });
  pgm.addConstraint(table('mvp_activities'), 'mvp_activities_content_not_blank', {
    check:
      "btrim(title) <> '' AND btrim(detail) <> '' AND (amount_cents IS NULL OR amount_cents > 0)",
  });
  pgm.createIndex(table('mvp_activities'), ['business_id', 'created_at']);

  pgm.createTable(table('mvp_idempotency_records'), {
    business_id: { type: 'uuid', notNull: true },
    operation_key: { type: 'text', notNull: true },
    fingerprint: { type: 'text', notNull: true },
    response_json: { type: 'jsonb', notNull: true },
    created_at: { type: 'timestamptz', notNull: true },
  });
  pgm.addConstraint(table('mvp_idempotency_records'), 'mvp_idempotency_records_pk', {
    primaryKey: ['business_id', 'operation_key'],
  });
  pgm.addConstraint(table('mvp_idempotency_records'), 'mvp_idempotency_records_business_fk', {
    foreignKeys: { columns: 'business_id', references: table('businesses'), onDelete: 'RESTRICT' },
  });
  pgm.addConstraint(table('mvp_idempotency_records'), 'mvp_idempotency_records_key_not_blank', {
    check: "btrim(operation_key) <> '' AND btrim(fingerprint) <> ''",
  });
};
