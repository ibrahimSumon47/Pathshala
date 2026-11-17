import { describe, expect, it } from 'vitest';
import { createRateLimiter } from './rate-limit';

describe('createRateLimiter', () => {
  it('allows the limit, blocks the next call, then opens a fresh window', () => {
    const limiter = createRateLimiter(2, 60_000);
    expect(limiter.check('1.2.3.4', 1_000)).toMatchObject({ ok: true, remaining: 1 });
    expect(limiter.check('1.2.3.4', 1_001)).toMatchObject({ ok: true, remaining: 0 });
    expect(limiter.check('1.2.3.4', 1_002)).toEqual({ ok: false, retryAfterSeconds: 60 });
    expect(limiter.check('1.2.3.4', 61_000)).toMatchObject({ ok: true });
  });

  it('keeps a separate count for each address', () => {
    const limiter = createRateLimiter(1, 60_000);
    expect(limiter.check('a', 1_000).ok).toBe(true);
    expect(limiter.check('a', 1_000).ok).toBe(false);
    expect(limiter.check('b', 1_000).ok).toBe(true);
  });

  it('drops the oldest key when the map is capped', () => {
    const limiter = createRateLimiter(2, 60_000, 1);
    expect(limiter.check('first', 1_000).ok).toBe(true);
    expect(limiter.check('second', 1_000).ok).toBe(true);
    expect(limiter.check('first', 1_000).ok).toBe(true);
  });
});
