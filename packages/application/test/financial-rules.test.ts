import { FinancialRuleError, applyPayment, previewSale, simpleCashResult } from '../src/index.js';

describe('financial rules', () => {
  it('uses integer cents to preview a partially paid sale', () => {
    expect(previewSale([{ quantity: 2, unitPriceCents: 1250 }], 1000, true)).toEqual({
      totalCents: 2500,
      paidCents: 1000,
      outstandingCents: 1500,
      status: 'partial',
    });
  });

  it('requires a customer whenever debt remains', () => {
    expect(() => previewSale([{ quantity: 1, unitPriceCents: 1000 }], 0, false)).toThrow(
      FinancialRuleError,
    );
  });

  it('prevents overpayment and calculates the simple cash result', () => {
    expect(() => applyPayment(2000, 1500, 501)).toThrow(FinancialRuleError);
    expect(applyPayment(2000, 1500, 500)).toEqual({
      paidCents: 2000,
      outstandingCents: 0,
      status: 'paid',
    });
    expect(simpleCashResult(5000, 1200)).toBe(3800);
  });
});
