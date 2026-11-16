import { describe, expect, it } from 'vitest';
import { signPayload, verifySignedPayload } from './signatures';

describe('verifySignedPayload', () => {
  const payload = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed' });
  const secret = 'whsec_test_fixture';
  const now = 1_765_000_000;

  it('accepts a fresh signature over the exact raw body', () => {
    expect(verifySignedPayload(payload, signPayload(payload, secret, now), secret, now)).toBe(true);
  });

  it('rejects a body changed after signing', () => {
    const header = signPayload(payload, secret, now);
    expect(verifySignedPayload(payload.replace('evt_1', 'evt_2'), header, secret, now)).toBe(false);
  });

  it('rejects an old signature outside the replay window', () => {
    expect(verifySignedPayload(payload, signPayload(payload, secret, now - 301), secret, now)).toBe(false);
  });

  it('rejects a missing or malformed header', () => {
    expect(verifySignedPayload(payload, null, secret, now)).toBe(false);
    expect(verifySignedPayload(payload, 'v1=abc', secret, now)).toBe(false);
  });

  it('rejects a signature made with a different secret', () => {
    expect(verifySignedPayload(payload, signPayload(payload, 'whsec_other', now), secret, now)).toBe(false);
  });
});
