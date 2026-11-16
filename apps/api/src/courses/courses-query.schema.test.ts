import { describe, expect, it } from 'vitest';
import { coursesQuerySchema } from './courses-query.schema';

describe('coursesQuerySchema', () => {
  it('defaults to 20 rows', () => {
    expect(coursesQuerySchema.parse({})).toEqual({ limit: 20 });
  });

  it('coerces a numeric limit from the query string', () => {
    expect(coursesQuerySchema.parse({ limit: '12' })).toEqual({ limit: 12 });
  });

  it.each(['0', '51', 'ten', '-3'])('rejects limit=%s', (limit) => {
    expect(coursesQuerySchema.safeParse({ limit }).success).toBe(false);
  });

  it('rejects unknown query parameters', () => {
    expect(coursesQuerySchema.safeParse({ limit: '5', sort: 'price' }).success).toBe(false);
  });
});
