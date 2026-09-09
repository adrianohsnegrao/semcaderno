import type { MigrationBuilder } from 'node-pg-migrate';

const schema = 'sem_caderno';
const table = (name: string) => ({ schema, name });

export const up = (pgm: MigrationBuilder): void => {
  pgm.addColumns(table('products'), {
    stock_quantity: { type: 'integer', notNull: true, default: 0 },
  });
  pgm.addConstraint(table('products'), 'products_stock_quantity_valid', {
    check: 'stock_quantity >= 0 AND stock_quantity <= 9999999',
  });
  pgm.sql(
    `CREATE UNIQUE INDEX products_business_normalized_name_unique
       ON sem_caderno.products (business_id, lower(btrim(display_name)))`,
  );
  pgm.sql(
    `CREATE UNIQUE INDEX customers_business_phone_unique
       ON sem_caderno.customers (business_id, phone)
       WHERE phone IS NOT NULL`,
  );
  pgm.dropConstraint(table('mvp_activities'), 'mvp_activities_kind_allowed');
  pgm.addConstraint(table('mvp_activities'), 'mvp_activities_kind_allowed', {
    check: "kind IN ('sale', 'payment', 'expense', 'collection', 'correction', 'stock')",
  });
};
