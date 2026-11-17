import { describe, expect, it } from 'vitest';
import { allocateNet, discountFor, orderNumberFor, payablePaisa, splitPayment } from './commerce';

describe('discountFor', () => {
  it('takes a whole-paisa percentage discount', () => {
    expect(discountFor({ type: 'percent', value: 20 }, 120000)).toBe(24000);
    expect(discountFor({ type: 'percent', value: 15 }, 999)).toBe(149);
  });

  it('takes a fixed discount but never more than the subtotal', () => {
    expect(discountFor({ type: 'fixed', value: 20000 }, 120000)).toBe(20000);
    expect(discountFor({ type: 'fixed', value: 20000 }, 5000)).toBe(5000);
  });

  it('returns zero for an empty or invalid subtotal', () => {
    expect(discountFor({ type: 'percent', value: 20 }, 0)).toBe(0);
    expect(discountFor({ type: 'fixed', value: 20000 }, -1)).toBe(0);
  });
});

describe('splitPayment', () => {
  it('gives the instructor 80 percent and keeps every paisa accounted for', () => {
    expect(splitPayment(120000)).toEqual({ instructorPaisa: 96000, platformPaisa: 24000 });
    expect(splitPayment(999)).toEqual({ instructorPaisa: 799, platformPaisa: 200 });
  });

  it('clamps the instructor share to 0-100', () => {
    expect(splitPayment(1000, 120)).toEqual({ instructorPaisa: 1000, platformPaisa: 0 });
    expect(splitPayment(1000, -5)).toEqual({ instructorPaisa: 0, platformPaisa: 1000 });
  });
});

describe('orderNumberFor', () => {
  it('uses the date and a short random suffix', () => {
    const number = orderNumberFor(new Date('2026-11-16T10:00:00Z'));
    expect(number).toMatch(/^PS-20261116-[A-F0-9]{8}$/);
  });
});

describe('payablePaisa', () => {
  it('prefers a lower sale price and ignores a sale above the list price', () => {
    expect(payablePaisa({ pricePaisa: 120000, salePricePaisa: 96000 })).toBe(96000);
    expect(payablePaisa({ pricePaisa: 120000, salePricePaisa: null })).toBe(120000);
    expect(payablePaisa({ pricePaisa: 120000, salePricePaisa: 150000 })).toBe(120000);
  });
});

describe('allocateNet', () => {
  it('splits a discounted total in proportion and keeps every paisa', () => {
    const shares = allocateNet([{ pricePaisa: 120000 }, { pricePaisa: 150000 }], 216000);
    expect(shares.reduce((total, share) => total + share, 0)).toBe(216000);
    expect(shares[0]).toBe(96000);
    expect(shares[1]).toBe(120000);
  });

  it('puts a rounding remainder on the last item', () => {
    const shares = allocateNet([{ pricePaisa: 100 }, { pricePaisa: 100 }, { pricePaisa: 100 }], 100);
    expect(shares.reduce((total, share) => total + share, 0)).toBe(100);
    expect(shares).toEqual([33, 33, 34]);
  });

  it('returns zeros for an empty or unpriced order', () => {
    expect(allocateNet([], 500)).toEqual([]);
    expect(allocateNet([{ pricePaisa: 0 }], 500)).toEqual([0]);
  });
});
