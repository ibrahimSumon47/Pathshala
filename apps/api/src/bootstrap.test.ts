import { describe, expect, it } from 'vitest';
import { methodNotAllowed } from './bootstrap';

function response() {
  const calls: { status?: number; body?: unknown; headers?: Record<string, string> } = { headers: {} };
  return {
    calls,
    setHeader(name: string, value: string) {
      calls.headers![name] = value;
    },
    status(code: number) {
      calls.status = code;
      return { json: (body: unknown) => (calls.body = body) };
    },
  };
}

describe('methodNotAllowed', () => {
  it('answers an unsupported method on a real route with 405', () => {
    const reply = response();
    expect(methodNotAllowed({ method: 'TRACE', path: '/health' }, reply)).toBe(true);
    expect(reply.calls.status).toBe(405);
    expect(reply.calls.headers?.Allow).toBe('GET, HEAD, OPTIONS');
    expect(reply.calls.body).toEqual({
      error: { code: 'method_not_allowed', message: 'That method is not allowed on this route.' },
    });
  });

  it('leaves reads and unknown paths to the router', () => {
    const reply = response();
    expect(methodNotAllowed({ method: 'GET', path: '/courses' }, reply)).toBe(false);
    expect(methodNotAllowed({ method: 'POST', path: '/nope' }, reply)).toBe(false);
    expect(reply.calls.status).toBeUndefined();
  });

  it('ignores the query string when matching', () => {
    const reply = response();
    expect(methodNotAllowed({ method: 'POST', url: '/courses?q=js' }, reply)).toBe(true);
  });
});
