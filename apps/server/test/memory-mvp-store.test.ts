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

    const sale = await store.createSale(
      session,
      {
        amountPaidCents: 2500,
        paymentMethod: 'pix',
        items: [{ description: 'Compra no balcão', quantity: 1, unitPriceCents: 2500 }],
      },
      'paid_sale_001',
    );
    const state = await store.snapshot(session);

    expect(sale).toMatchObject({ totalCents: 2500, outstandingCents: 0, status: 'paid' });
    expect(state.payments.some((payment) => payment.saleId === sale.id)).toBe(true);
  });

  it('requires a customer whenever a sale leaves debt', async () => {
    const store = new MemoryMvpStore();
    const session = await signIn(store);

    await expect(
      store.createSale(
        session,
        {
          amountPaidCents: 0,
          paymentMethod: 'cash',
          items: [{ description: 'Fiado sem cliente', quantity: 1, unitPriceCents: 1000 }],
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
    const sale = await store.createSale(
      session,
      {
        customerId,
        amountPaidCents: 500,
        paymentMethod: 'cash',
        items: [{ description: 'Compra parcial', quantity: 1, unitPriceCents: 2000 }],
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
});
