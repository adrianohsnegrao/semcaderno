import { MemoryMvpStore } from '../src/memory-mvp-store.js';
import { MvpConflictError, MvpValidationError } from '@sem-caderno/application';

const signIn = async (store: MemoryMvpStore) => {
  const session = await store.signIn({ email: 'demo@semcaderno.app', password: 'semcaderno' });
  if (!session) throw new Error('Demo session was not created.');
  return session;
};

describe('MemoryMvpStore', () => {
  it('records a paid anonymous sale and its payment atomically', async () => {
    const store = new MemoryMvpStore();
    const session = await signIn(store);
    const product = (await store.snapshot(session)).products[0]!;
    const stockBefore = product.stockQuantity;

    const sale = await store.createSale(
      session,
      {
        amountPaidCents: product.priceCents,
        paymentMethod: 'pix',
        items: [{ productId: product.id, quantity: 1 }],
      },
      'paid_sale_001',
    );
    const state = await store.snapshot(session);

    expect(sale).toMatchObject({
      totalCents: product.priceCents,
      outstandingCents: 0,
      status: 'paid',
    });
    expect(state.payments.some((payment) => payment.saleId === sale.id)).toBe(true);
    expect(state.products.find((item) => item.id === product.id)?.stockQuantity).toBe(
      stockBefore - 1,
    );
  });

  it('requires a customer whenever a sale leaves debt', async () => {
    const store = new MemoryMvpStore();
    const session = await signIn(store);
    const product = (await store.snapshot(session)).products[0]!;

    await expect(
      store.createSale(
        session,
        {
          amountPaidCents: 0,
          paymentMethod: 'cash',
          items: [{ productId: product.id, quantity: 1 }],
        },
        'unowned_debt_001',
      ),
    ).rejects.toThrow(MvpValidationError);
  });

  it('records partial payments without allowing overpayment', async () => {
    const store = new MemoryMvpStore();
    const session = await signIn(store);
    const state = await store.snapshot(session);
    const customerId = state.customers[0]!.id;
    const product = await store.createProduct(
      session,
      { name: 'Compra parcial', priceCents: 2_000, stockQuantity: 3 },
      'partial_product_001',
    );
    const sale = await store.createSale(
      session,
      {
        customerId,
        amountPaidCents: 500,
        paymentMethod: 'cash',
        items: [{ productId: product.id, quantity: 1 }],
      },
      'partial_sale_001',
    );

    await store.recordPayment(
      session,
      { saleId: sale.id, amountCents: 1000, method: 'pix' },
      'partial_payment_001',
    );
    await expect(
      store.recordPayment(
        session,
        { saleId: sale.id, amountCents: 501, method: 'pix' },
        'overpayment_001',
      ),
    ).rejects.toThrow(MvpValidationError);
  });

  it('replays the same idempotent request and rejects changed intent', async () => {
    const store = new MemoryMvpStore();
    const session = await signIn(store);
    const first = await store.createCustomer(
      session,
      { name: 'Cliente único' },
      'customer_once_001',
    );
    const replay = await store.createCustomer(
      session,
      { name: 'Cliente único' },
      'customer_once_001',
    );

    expect(replay.id).toBe(first.id);
    await expect(
      store.createCustomer(session, { name: 'Outro cliente' }, 'customer_once_001'),
    ).rejects.toThrow(MvpConflictError);
  });

  it('keeps debt unchanged when preparing a collection reminder', async () => {
    const store = new MemoryMvpStore();
    const session = await signIn(store);
    const before = await store.snapshot(session);
    const debtor = before.customers.find((customer) =>
      before.sales.some((sale) => sale.customerId === customer.id && sale.outstandingCents > 0),
    )!;
    const debtBefore = before.sales
      .filter((sale) => sale.customerId === debtor.id)
      .reduce((sum, sale) => sum + sale.outstandingCents, 0);

    await store.createCollection(
      session,
      { customerId: debtor.id, amountCents: debtBefore },
      'collection_001',
    );
    const after = await store.snapshot(session);
    const debtAfter = after.sales
      .filter((sale) => sale.customerId === debtor.id)
      .reduce((sum, sale) => sum + sale.outstandingCents, 0);

    expect(debtAfter).toBe(debtBefore);
    expect(after.activities[0]).toMatchObject({ kind: 'collection' });
  });

  it('keeps cancelled sales in history while removing their outstanding debt', async () => {
    const store = new MemoryMvpStore();
    const session = await signIn(store);
    const state = await store.snapshot(session);
    const sale = state.sales.find((candidate) => candidate.outstandingCents > 0)!;

    const cancelled = await store.cancelSale(
      session,
      { saleId: sale.id, reason: 'Registro duplicado no balcão' },
      'cancel_sale_001',
    );
    const after = await store.snapshot(session);

    expect(cancelled).toMatchObject({ status: 'cancelled', outstandingCents: 0 });
    expect(after.sales.some((candidate) => candidate.id === sale.id)).toBe(true);
  });

  it('edits catalog data, rejects duplicates, and restores stock after cancellation', async () => {
    const store = new MemoryMvpStore();
    const session = await signIn(store);
    const created = await store.createProduct(
      session,
      { name: 'Água mineral', priceCents: 350, stockQuantity: 4 },
      'new_product_001',
    );
    await expect(
      store.createProduct(
        session,
        { name: '  água MINERAL ', priceCents: 400, stockQuantity: 2 },
        'duplicate_product_001',
      ),
    ).rejects.toThrow(MvpConflictError);
    const updated = await store.updateProduct(
      session,
      created.id,
      { name: 'Água mineral 500 ml', priceCents: 400, stockQuantity: 5 },
      'update_product_001',
    );
    expect(updated).toMatchObject({ priceCents: 400, stockQuantity: 5 });

    const sale = await store.createSale(
      session,
      {
        amountPaidCents: 800,
        paymentMethod: 'pix',
        items: [{ productId: created.id, quantity: 2 }],
      },
      'stock_sale_001',
    );
    expect(
      (await store.snapshot(session)).products.find((item) => item.id === created.id),
    ).toMatchObject({ stockQuantity: 3 });
    await expect(
      store.createSale(
        session,
        {
          amountPaidCents: 1_600,
          paymentMethod: 'pix',
          items: [{ productId: created.id, quantity: 4 }],
        },
        'stock_sale_too_large_001',
      ),
    ).rejects.toThrow(MvpValidationError);
    await store.cancelSale(
      session,
      { saleId: sale.id, reason: 'Teste de devolução ao estoque' },
      'stock_cancel_001',
    );
    expect(
      (await store.snapshot(session)).products.find((item) => item.id === created.id),
    ).toMatchObject({ stockQuantity: 5 });
  });

  it('normalizes WhatsApp numbers and prevents duplicate customer contacts', async () => {
    const store = new MemoryMvpStore();
    const session = await signIn(store);
    const customer = await store.createCustomer(
      session,
      { name: 'Pessoa nova', phone: '(92) 98165-9847' },
      'phone_customer_001',
    );
    expect(customer.phone).toBe('5592981659847');
    await expect(
      store.createCustomer(
        session,
        { name: 'Pessoa duplicada', phone: '+55 92 98165-9847' },
        'phone_customer_duplicate_001',
      ),
    ).rejects.toThrow(MvpConflictError);
    const edited = await store.updateCustomer(
      session,
      customer.id,
      { name: 'Pessoa editada', phone: '(92) 98888-7777', note: 'Cliente frequente' },
      'phone_customer_update_001',
    );
    expect(edited).toMatchObject({
      name: 'Pessoa editada',
      phone: '5592988887777',
      note: 'Cliente frequente',
    });
  });
});
