import { describe, expect, it } from 'vitest';
import { normalizeTheme } from './theme';

describe('normalizeTheme', () => {
  it('accepts dark', () => {
    expect(normalizeTheme('dark')).toBe('dark');
  });

  it('falls back to light for light and missing values', () => {
    expect(normalizeTheme('light')).toBe('light');
    expect(normalizeTheme(undefined)).toBe('light');
  });

  it('ignores unknown values', () => {
    expect(normalizeTheme('sepia')).toBe('light');
  });
});
