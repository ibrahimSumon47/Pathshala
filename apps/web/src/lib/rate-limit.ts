export type RateLimitResult = { ok: true; remaining: number } | { ok: false; retryAfterSeconds: number };

export type RateLimiter = {
  check: (key: string, now?: number) => RateLimitResult;
};

/**
 * Fixed-window limiter for one server instance. Vercel may run several instances,
 * so this raises the cost of a burst rather than promising a global quota.
 */
export function createRateLimiter(limit: number, windowMs: number, maxKeys = 5000): RateLimiter {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return {
    check(key, now = Date.now()) {
      const safeKey = key || 'unknown';
      let entry = hits.get(safeKey);
      if (!entry || now >= entry.resetAt) {
        entry = { count: 0, resetAt: now + windowMs };
        hits.set(safeKey, entry);
      }
      if (entry.count >= limit) {
        return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
      }
      entry.count += 1;

      // Keep the map bounded: drop expired windows first, then the oldest key.
      if (hits.size > maxKeys) {
        for (const [candidate, value] of hits) {
          if (now >= value.resetAt) hits.delete(candidate);
        }
        while (hits.size > maxKeys) {
          const oldest = hits.keys().next().value;
          if (oldest === undefined) break;
          hits.delete(oldest);
        }
      }
      return { ok: true, remaining: Math.max(0, limit - entry.count) };
    },
  };
}

/** Search is cheap but public; thirty type-aheads a minute is enough for one reader. */
export const searchLimiter = createRateLimiter(30, 60_000);
