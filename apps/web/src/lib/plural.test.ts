import { describe, expect, it } from 'vitest';
import { plural } from './plural';

describe('plural', () => {
  it('uses the singular form for exactly one', () => {
    expect(plural(1, 'review', 'reviews')).toBe('review');
  });

  it('uses the plural form for zero and many', () => {
    expect(plural(0, 'course', 'courses')).toBe('courses');
    expect(plural(6, 'course', 'courses')).toBe('courses');
  });
});
