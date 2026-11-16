import { type CanActivate, type ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;
const MAX_KEYS = 10_000;

type Window = { count: number; resetAt: number };

type RequestLike = {
  ip?: string;
  socket?: { remoteAddress?: string };
};

/**
 * Limits each client address to 60 requests a minute. The window lives in the process,
 * so a serverless deployment gets one window per warm instance; a shared store replaces
 * it when the API needs strict global limits.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly windows = new Map<string, Window>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestLike>();
    const key = request.ip ?? request.socket?.remoteAddress ?? 'unknown';
    const now = Date.now();
    const current = this.windows.get(key);

    if (!current || current.resetAt <= now) {
      this.windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
      this.prune(now);
      return true;
    }

    current.count += 1;
    if (current.count > MAX_REQUESTS) {
      throw new HttpException(
        { code: 'rate_limited', message: 'Too many requests. Try again in a minute.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /** Drop expired windows and, under extreme cardinality, start clean. */
  private prune(now: number): void {
    if (this.windows.size < MAX_KEYS) return;

    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) this.windows.delete(key);
    }
    if (this.windows.size >= MAX_KEYS) this.windows.clear();
  }
}
