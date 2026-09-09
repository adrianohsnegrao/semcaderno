import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import { MvpConflictError, MvpNotFoundError, MvpValidationError } from '@sem-caderno/application';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';

import { PostgresMvpStore } from '../src/index.js';

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, '../../..');
const postgresImage =
  'postgres:18.4-bookworm@sha256:1961f96e6029a02c3812d7cb329a3b03a3ac2bb067058dec17b0f5596aca9296';

let container: StartedPostgreSqlContainer | undefined;
let pool: Pool | undefined;

const currentPool = (): Pool => {
  if (!pool) throw new Error('PostgreSQL integration pool is unavailable.');
  return pool;
};

beforeAll(async () => {
  container = await new PostgreSqlContainer(postgresImage)
    .withDatabase('sem_caderno_test_mvp')
    .withUsername('sem_caderno_test')
    .withPassword(randomBytes(24).toString('base64url'))
    .start();

  const databaseUrl = container.getConnectionUri();
  await execFileAsync(process.execPath, [resolve(root, 'tools/database/dist/src/main.js')], {
    cwd: resolve(root, 'tools/database'),
    env: { ...process.env, SEM_CADERNO_TEST_DATABASE_URL: databaseUrl },
  });
  pool = new Pool({ connectionString: databaseUrl });
}, 180_000);

afterAll(async () => {
  await pool?.end();
  await container?.stop();
}, 30_000);

describe('PostgresMvpStore', () => {
  it('persists the complete owner workflow and returns the same result on an idempotent replay', async () => {
    const store = new PostgresMvpStore(currentPool());
    const session = await store.register({
      name: 'Maria Silva',
      email: 'maria.mvp@example.invalid',
      password: 'senha-segura-123',
      businessName: 'Mercearia da Maria',
    });

    const customerInput = { name: 'João Souza', phone: '5592988887777', note: 'Vizinho' };
    const customer = await store.createCustomer(session, customerInput, 'customer-key-001');
    const replay = await store.createCustomer(session, customerInput, 'customer-key-001');
    expect(replay).toEqual(customer);
    await expect(
      store.createCustomer(session, { ...customerInput, name: 'Outra pessoa' }, 'customer-key-001'),
    ).rejects.toBeInstanceOf(MvpConflictError);

    const product = await store.createProduct(
      session,
      { name: 'Cesta básica', priceCents: 12_500, stockQuantity: 10 },
      'product-key-001',
    );
    const sale = await store.createSale(
      session,
      {
        customerId: customer.id,
        amountPaidCents: 5_000,
        paymentMethod: 'pix',
        items: [{ productId: product.id, quantity: 1 }],
      },
      'sale-key-000001',
    );
    expect(sale).toMatchObject({ totalCents: 12_500, paidCents: 5_000, status: 'partial' });

    await store.recordPayment(
      session,
      { saleId: sale.id, amountCents: 7_500, method: 'cash' },
      'payment-key-001',
    );
    await store.createExpense(
      session,
      { description: 'Conta de energia', amountCents: 2_000, occurredOn: '2026-09-09' },
      'expense-key-001',
    );
    await store.updateSettings(session, {
      businessName: 'Mercadinho da Maria',
      pixKey: 'maria.mvp@example.invalid',
    });
    const collection = await store.createCollection(
      session,
      { customerId: customer.id, amountCents: 1_000 },
      'collection-key-1',
    );
    expect(collection.whatsappUrl).toContain('wa.me/5592988887777');

    const snapshot = await store.snapshot(session);
    expect(snapshot.business).toMatchObject({ name: 'Mercadinho da Maria', demo: false });
    expect(snapshot.sales[0]).toMatchObject({ id: sale.id, paidCents: 12_500, status: 'paid' });
    expect(snapshot.expenses).toHaveLength(1);
    expect(snapshot.activities.map((activity) => activity.kind)).toEqual(
      expect.arrayContaining(['sale', 'payment', 'expense', 'collection']),
    );
    expect(snapshot.products[0]).toMatchObject({ id: product.id, stockQuantity: 9 });

    expect(await store.session(session.token)).toMatchObject({ userId: session.userId });
    await store.signOut(session.token);
    expect(await store.session(session.token)).toBeUndefined();
  });

  it('rejects a cross-business customer reference', async () => {
    const store = new PostgresMvpStore(currentPool());
    const ownerA = await store.register({
      name: 'Pessoa A',
      email: 'tenant-a@example.invalid',
      password: 'senha-segura-a',
      businessName: 'Negócio A',
    });
    const ownerB = await store.register({
      name: 'Pessoa B',
      email: 'tenant-b@example.invalid',
      password: 'senha-segura-b',
      businessName: 'Negócio B',
    });
    const customerA = await store.createCustomer(
      ownerA,
      { name: 'Cliente exclusivo A' },
      'tenant-customer-a',
    );
    const productB = await store.createProduct(
      ownerB,
      { name: 'Item B', priceCents: 1_000, stockQuantity: 2 },
      'tenant-product-b',
    );

    await expect(
      store.createSale(
        ownerB,
        {
          customerId: customerA.id,
          amountPaidCents: 0,
          paymentMethod: 'other',
          items: [{ productId: productB.id, quantity: 1 }],
        },
        'tenant-sale-key-b',
      ),
    ).rejects.toBeInstanceOf(MvpNotFoundError);
  });

  it('enforces normalized uniqueness and inventory changes in PostgreSQL', async () => {
    const store = new PostgresMvpStore(currentPool());
    const session = await store.register({
      name: 'Dona Ana',
      email: 'catalog-owner@example.invalid',
      password: 'senha-segura-catalogo',
      businessName: 'Lanche da Ana',
    });
    const customer = await store.createCustomer(
      session,
      { name: 'Cliente um', phone: '(92) 98165-9847' },
      'catalog-customer-001',
    );
    await expect(
      store.createCustomer(
        session,
        { name: 'Cliente dois', phone: '+55 92 98165-9847' },
        'catalog-customer-002',
      ),
    ).rejects.toBeInstanceOf(MvpConflictError);
    await store.updateCustomer(
      session,
      customer.id,
      { name: 'Cliente editado', phone: '(92) 98888-7777', note: 'Busca no balcão' },
      'catalog-customer-update',
    );

    const product = await store.createProduct(
      session,
      { name: 'Suco de cupuaçu', priceCents: 700, stockQuantity: 5 },
      'catalog-product-001',
    );
    await expect(
      store.createProduct(
        session,
        { name: '  SUCO DE CUPUAÇU ', priceCents: 750, stockQuantity: 1 },
        'catalog-product-002',
      ),
    ).rejects.toBeInstanceOf(MvpConflictError);
    await store.updateProduct(
      session,
      product.id,
      { name: 'Suco de cupuaçu 500 ml', priceCents: 800, stockQuantity: 6 },
      'catalog-product-update',
    );

    const sale = await store.createSale(
      session,
      {
        amountPaidCents: 1_600,
        paymentMethod: 'pix',
        items: [{ productId: product.id, quantity: 2 }],
      },
      'catalog-sale-001',
    );
    expect((await store.snapshot(session)).products[0]).toMatchObject({ stockQuantity: 4 });
    await expect(
      store.createSale(
        session,
        {
          amountPaidCents: 4_000,
          paymentMethod: 'pix',
          items: [{ productId: product.id, quantity: 5 }],
        },
        'catalog-sale-002',
      ),
    ).rejects.toBeInstanceOf(MvpValidationError);
    await store.cancelSale(
      session,
      { saleId: sale.id, reason: 'Venda registrada por engano' },
      'catalog-sale-cancel',
    );
    const after = await store.snapshot(session);
    expect(after.products[0]).toMatchObject({ stockQuantity: 6 });
    expect(after.customers[0]).toMatchObject({
      name: 'Cliente editado',
      phone: '5592988887777',
    });
  });
});
