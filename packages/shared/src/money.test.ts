import { describe, expect, it } from 'vitest';
import { formatPaisa, toPaisa } from './money';

describe('toPaisa', () => {
  it('converts taka to integer paisa', () => {
    expect(toPaisa(1200)).toBe(120_000);
    expect(toPaisa(0.1 + 0.2)).toBe(30);
  });

  it('rounds to the nearest paisa', () => {
    expect(toPaisa(12.345)).toBe(1235);
  });

  it('rejects values that cannot be money', () => {
    expect(() => toPaisa(Number.NaN)).toThrow(RangeError);
    expect(() => toPaisa(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => toPaisa(Number.MAX_SAFE_INTEGER)).toThrow(RangeError);
  });
});

describe('formatPaisa', () => {
  it('drops decimals for whole taka', () => {
    expect(formatPaisa(120_000, 'en')).toBe('৳1,200');
  });

  it('keeps two decimals when paisa are present', () => {
    expect(formatPaisa(120_050, 'en')).toBe('৳1,200.50');
  });

  it('uses Bengali digits for Bangla', () => {
    expect(formatPaisa(120_000, 'bn')).toBe('৳১,২০০');
  });

  it('rejects fractional paisa', () => {
    expect(() => formatPaisa(10.5)).toThrow(RangeError);
  });
});
