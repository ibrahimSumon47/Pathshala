import { describe, expect, it } from 'vitest';
import { ratingBreakdownFor, totalDurationMinutes } from './catalog';

describe('ratingBreakdownFor', () => {
  it('counts each star and ignores values outside the scale', () => {
    expect(ratingBreakdownFor([5, 5, 4, 3, 1, 0, 9, 4.4])).toEqual({ 5: 2, 4: 2, 3: 1, 2: 0, 1: 1 });
  });

  it('returns an empty histogram rather than undefined for an unreviewed course', () => {
    expect(ratingBreakdownFor([])).toEqual({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
  });
});

describe('totalDurationMinutes', () => {
  it('adds published study time and treats a missing duration as zero', () => {
    expect(totalDurationMinutes([{ durationMinutes: 12 }, { durationMinutes: 0 }, { durationMinutes: 8 }])).toBe(20);
  });
});
