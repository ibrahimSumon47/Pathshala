import { describe, expect, it } from 'vitest';
import { coursesQuerySchema } from './courses-query.schema';

describe('coursesQuerySchema', () => {
  it('defaults to page one, 20 rows and every price', () => {
    expect(coursesQuerySchema.parse({})).toEqual({ page: 1, limit: 20, price: 'all' });
  });

  it('coerces numeric pagination from the query string', () => {
    expect(coursesQuerySchema.parse({ limit: '12', page: '2', price: 'free', level: 'beginner' })).toEqual({
      limit: 12,
      page: 2,
      price: 'free',
      level: 'beginner',
    });
  });

  it.each(['0', '25', 'ten', '-3'])('rejects limit=%s', (limit) => {
    expect(coursesQuerySchema.safeParse({ limit }).success).toBe(false);
  });

  it('rejects an unknown language, level or price', () => {
    expect(coursesQuerySchema.safeParse({ language: 'fr' }).success).toBe(false);
    expect(coursesQuerySchema.safeParse({ level: 'expert' }).success).toBe(false);
    expect(coursesQuerySchema.safeParse({ price: 'cheap' }).success).toBe(false);
  });

  it('rejects unknown query parameters', () => {
    expect(coursesQuerySchema.safeParse({ limit: '5', sort: 'price' }).success).toBe(false);
  });
});
