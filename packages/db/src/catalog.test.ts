import { describe, expect, it } from 'vitest';
import { PRICE_BUCKETS, escapedSearch, ratingBreakdownFor, searchFilter, sortSpec, totalDurationMinutes } from './catalog';

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

describe('escapedSearch', () => {
  it('neutralises regular expression punctuation a reader might type', () => {
    expect(escapedSearch('c++ (beginner)')).toBe('c\\+\\+ \\(beginner\\)');
    expect(searchFilter('a.*b')?.$or).toBeDefined();
  });

  it('trims, bounds and ignores a blank query', () => {
    expect(escapedSearch('  ')).toBe('');
    expect(escapedSearch('a'.repeat(200)).length).toBe(80);
    expect(searchFilter('   ')).toBeNull();
  });

  it('searches titles in both scripts', () => {
    const filter = searchFilter('ইংরেজি');
    const fields = (filter?.$or as Array<Record<string, unknown>>).map((clause) => Object.keys(clause)[0]);
    expect(fields).toContain('title.bn');
    expect(fields).toContain('title.en');
  });
});

describe('sortSpec', () => {
  it('maps every sort name to a stable database order', () => {
    expect(sortSpec('rating')).toEqual({ ratingAverage: -1, ratingCount: -1, publishedAt: -1 });
    expect(sortSpec('enrolled')).toEqual({ enrolmentCount: -1, publishedAt: -1 });
    expect(sortSpec('price-asc')).toEqual({ pricePaisa: 1, publishedAt: -1 });
    expect(sortSpec('price-desc')).toEqual({ pricePaisa: -1, publishedAt: -1 });
    expect(sortSpec('newest')).toEqual({ publishedAt: -1, _id: -1 });
    expect(sortSpec(undefined)).toEqual({ publishedAt: -1, _id: -1 });
  });
});

describe('PRICE_BUCKETS', () => {
  it('covers each price once and leaves no gap between buckets', () => {
    expect(PRICE_BUCKETS.free).toEqual({ min: 0, max: 0 });
    expect(PRICE_BUCKETS['under-500']).toEqual({ min: 1, max: 49999 });
    expect(PRICE_BUCKETS['500-1500']).toEqual({ min: 50000, max: 150000 });
    expect(PRICE_BUCKETS['over-1500']).toEqual({ min: 150001 });
  });
});
