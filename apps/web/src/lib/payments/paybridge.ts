import { verifySignedPayload } from './signatures';

export type PayBridgeSessionInput = {
  orderRef: string;
  amountPaisa: number;
  description: string;
  customerName: string;
  customerEmail: string;
  returnUrl: string;
  webhookUrl: string;
};

/** Ask the PayBridge merchant API for a hosted test-mode checkout session. */
export async function createPayBridgeSession(
  config: { baseUrl: string; apiKey: string },
  input: PayBridgeSessionInput,
): Promise<{ id: string; url: string }> {
  const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/api/v1/checkout/sessions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`PayBridge checkout failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  const data = (await response.json()) as { id?: string; url?: string };
  if (!data.id || !data.url) throw new Error('PayBridge returned no checkout URL');
  return { id: data.id, url: data.url };
}

/** PayBridge signs `timestamp.body` with the merchant webhook secret. */
export function verifyPayBridgeSignature(
  payload: string,
  header: string | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  return verifySignedPayload(payload, header, secret, nowSeconds);
}
