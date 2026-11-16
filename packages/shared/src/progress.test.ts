import { describe, expect, it } from 'vitest';
import { calculateProgress } from './progress';

describe('calculateProgress', () => {
  it('rounds a partial course to a whole percent', () => {
    expect(calculateProgress(1, 3)).toBe(33);
    expect(calculateProgress(2, 3)).toBe(67);
  });

  it('caps at 100 and never goes below zero', () => {
    expect(calculateProgress(5, 3)).toBe(100);
    expect(calculateProgress(-1, 3)).toBe(0);
  });

  it('returns zero when the course has no lessons', () => {
    expect(calculateProgress(0, 0)).toBe(0);
  });
});
