import { describe, expect, it, vi } from 'vitest';
import { RateLimitGuard } from './rate-limit.guard';

function contextFor(ip: string) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ ip }) }),
  } as unknown as Parameters<RateLimitGuard['canActivate']>[0];
}

describe('RateLimitGuard', () => {
  it('allows 60 requests and blocks the 61st from the same address', () => {
    const guard = new RateLimitGuard();
    for (let index = 0; index < 60; index += 1) {
      expect(guard.canActivate(contextFor('203.0.113.5'))).toBe(true);
    }

    expect(() => guard.canActivate(contextFor('203.0.113.5'))).toThrowError(/Too many requests/);
  });

  it('keeps a separate window for each address', () => {
    const guard = new RateLimitGuard();
    for (let index = 0; index < 60; index += 1) guard.canActivate(contextFor('203.0.113.5'));

    expect(guard.canActivate(contextFor('203.0.113.6'))).toBe(true);
  });

  it('starts a fresh window after the minute expires', () => {
    vi.useFakeTimers();
    try {
      const guard = new RateLimitGuard();
      for (let index = 0; index < 60; index += 1) guard.canActivate(contextFor('203.0.113.5'));
      vi.advanceTimersByTime(60_001);
      expect(guard.canActivate(contextFor('203.0.113.5'))).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
