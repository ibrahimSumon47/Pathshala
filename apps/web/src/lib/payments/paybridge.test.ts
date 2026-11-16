import { describe, expect, it } from 'vitest';
import { verifyPayBridgeSignature } from './paybridge';
import { signPayload } from './signatures';

describe('verifyPayBridgeSignature', () => {
  const payload = JSON.stringify({ id: 'pbe_1', type: 'payment.succeeded' });
  const secret = 'pb_whsec_fixture';
  const now = 1_765_000_000;

  it('accepts the merchant signature over the raw body', () => {
    expect(verifyPayBridgeSignature(payload, signPayload(payload, secret, now), secret, now)).toBe(true);
  });

  it('rejects another merchant secret', () => {
    expect(verifyPayBridgeSignature(payload, signPayload(payload, secret, now), 'pb_whsec_other', now)).toBe(false);
  });
});
