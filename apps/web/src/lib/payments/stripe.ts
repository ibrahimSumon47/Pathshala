import type { OrderView } from '@pathshala/db';

const STRIPE_API = 'https://api.stripe.com/v1/checkout/sessions';

/** Build the form body Stripe expects for a one-time BDT checkout. */
export function stripeCheckoutBody(order: OrderView, successUrl: string, cancelUrl: string): URLSearchParams {
  const body = new URLSearchParams();
  body.set('mode', 'payment');
  body.set('success_url', successUrl);
  body.set('cancel_url', cancelUrl);
  body.set('client_reference_id', order.orderNumber);
  body.set('metadata[orderId]', order.id);
  body.set('metadata[orderNumber]', order.orderNumber);
  body.set('line_items[0][quantity]', '1');
  body.set('line_items[0][price_data][currency]', 'bdt');
  body.set('line_items[0][price_data][unit_amount]', String(order.totalPaisa));
  body.set('line_items[0][price_data][product_data][name]', order.courseTitle.en ?? order.courseTitle.bn ?? 'Pathshala course');
  return body;
}

/** Create a Stripe Checkout Session through the REST API; returns null without a key. */
export async function createStripeCheckoutSession(
  secretKey: string | undefined,
  order: OrderView,
  successUrl: string,
  cancelUrl: string,
): Promise<{ id: string; url: string } | null> {
  if (!secretKey) return null;
  const response = await fetch(STRIPE_API, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secretKey}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: stripeCheckoutBody(order, successUrl, cancelUrl),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Stripe checkout failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  const data = (await response.json()) as { id?: string; url?: string };
  if (!data.id || !data.url) throw new Error('Stripe returned no checkout URL');
  return { id: data.id, url: data.url };
}

export type StripeCheckoutEvent = {
  id: string;
  type: string;
  data: {
    object: {
      id?: string;
      payment_intent?: string | null;
      metadata?: { orderId?: string; orderNumber?: string } | null;
    };
  };
};

/** Stripe session events we fulfil on; everything else is acknowledged and ignored. */
export function paidOrderFromStripeEvent(event: StripeCheckoutEvent): { orderId: string; providerRef: string } | null {
  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') return null;
  const orderId = event.data.object.metadata?.orderId;
  const providerRef = event.data.object.payment_intent ?? event.data.object.id;
  return orderId && providerRef ? { orderId, providerRef } : null;
}
