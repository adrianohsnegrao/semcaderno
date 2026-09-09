export class FinancialRuleError extends Error {
  constructor(
    readonly code:
      | 'INVALID_MONEY'
      | 'EMPTY_SALE'
      | 'INVALID_QUANTITY'
      | 'PAYMENT_EXCEEDS_TOTAL'
      | 'CUSTOMER_REQUIRED'
      | 'OVERPAYMENT'
      | 'INSUFFICIENT_STOCK',
  ) {
    super(code);
  }
}

const assertNonNegativeCents = (value: number): number => {
  if (!Number.isSafeInteger(value) || value < 0) throw new FinancialRuleError('INVALID_MONEY');
  return value;
};

const assertPositiveCents = (value: number): number => {
  if (!Number.isSafeInteger(value) || value <= 0) throw new FinancialRuleError('INVALID_MONEY');
  return value;
};

export type SaleFinancialPreview = Readonly<{
  totalCents: number;
  paidCents: number;
  outstandingCents: number;
  status: 'open' | 'partial' | 'paid';
}>;

export const previewSale = (
  items: readonly Readonly<{ quantity: number; unitPriceCents: number }>[],
  amountPaidCents: number,
  hasCustomer: boolean,
): SaleFinancialPreview => {
  if (items.length < 1) throw new FinancialRuleError('EMPTY_SALE');
  const totalCents = items.reduce((sum, item) => {
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0)
      throw new FinancialRuleError('INVALID_QUANTITY');
    return sum + item.quantity * assertPositiveCents(item.unitPriceCents);
  }, 0);
  assertPositiveCents(totalCents);
  assertNonNegativeCents(amountPaidCents);
  if (amountPaidCents > totalCents) throw new FinancialRuleError('PAYMENT_EXCEEDS_TOTAL');
  if (amountPaidCents < totalCents && !hasCustomer)
    throw new FinancialRuleError('CUSTOMER_REQUIRED');
  return Object.freeze({
    totalCents,
    paidCents: amountPaidCents,
    outstandingCents: totalCents - amountPaidCents,
    status: amountPaidCents === totalCents ? 'paid' : amountPaidCents === 0 ? 'open' : 'partial',
  });
};

export const applyPayment = (
  totalCents: number,
  alreadyPaidCents: number,
  paymentCents: number,
): Readonly<{ paidCents: number; outstandingCents: number; status: 'partial' | 'paid' }> => {
  assertPositiveCents(totalCents);
  assertNonNegativeCents(alreadyPaidCents);
  assertPositiveCents(paymentCents);
  if (alreadyPaidCents > totalCents || paymentCents > totalCents - alreadyPaidCents)
    throw new FinancialRuleError('OVERPAYMENT');
  const paidCents = alreadyPaidCents + paymentCents;
  return Object.freeze({
    paidCents,
    outstandingCents: totalCents - paidCents,
    status: paidCents === totalCents ? 'paid' : 'partial',
  });
};

export const simpleCashResult = (receivedCents: number, expenseCents: number): number =>
  assertNonNegativeCents(receivedCents) - assertNonNegativeCents(expenseCents);

export const assertStockAvailable = (available: number, requested: number): void => {
  if (
    !Number.isSafeInteger(available) ||
    available < 0 ||
    !Number.isSafeInteger(requested) ||
    requested <= 0
  )
    throw new FinancialRuleError('INVALID_QUANTITY');
  if (requested > available) throw new FinancialRuleError('INSUFFICIENT_STOCK');
};
