import { createHmac, timingSafeEqual } from 'node:crypto';

const DEFAULT_TOLERANCE_SECONDS = 300;

/** Parse `t=...,v1=...` signature headers shared by Stripe and PayBridge. */
function parseSignatureHeader(header: string): { timestamp: string; signatures: string[] } | null {
  const parts = header.split(',').map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2);
  const signatures = parts
    .filter((part) => part.startsWith('v1='))
    .map((part) => part.slice(3))
    .filter(Boolean);
  return timestamp && signatures.length > 0 ? { timestamp, signatures } : null;
}

/** Constant-time HMAC check over `timestamp.payload`, with a replay window. */
export function verifySignedPayload(
  payload: string,
  header: string | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
): boolean {
  if (!header || !secret) return false;
  const parsed = parseSignatureHeader(header);
  if (!parsed) return false;
  const timestamp = Number.parseInt(parsed.timestamp, 10);
  if (!Number.isInteger(timestamp) || Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false;

  const expected = createHmac('sha256', secret).update(`${parsed.timestamp}.${payload}`).digest();
  return parsed.signatures.some((signature) => {
    const provided = Buffer.from(signature, 'hex');
    return provided.length === expected.length && timingSafeEqual(provided, expected);
  });
}

/** A signed fixture header is useful in tests and local webhook replay. */
export function signPayload(payload: string, secret: string, timestamp = Math.floor(Date.now() / 1000)): string {
  const signature = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}
