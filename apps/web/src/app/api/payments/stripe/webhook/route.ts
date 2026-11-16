import { CommerceError, markOrderPaid } from '@pathshala/db';
import { paidOrderFromStripeEvent, type StripeCheckoutEvent } from '@/lib/payments/stripe';
import { verifySignedPayload } from '@/lib/payments/signatures';

export const dynamic = 'force-dynamic';

/** Verify Stripe's signature over the raw body, then fulfil exactly once. */
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ error: { code: 'not_configured', message: 'Stripe webhook secret is missing.' } }, { status: 503 });
  }
  const payload = await request.text();
  if (!verifySignedPayload(payload, request.headers.get('stripe-signature'), secret)) {
    return Response.json({ error: { code: 'invalid_signature', message: 'Signature verification failed.' } }, { status: 400 });
  }

  let event: StripeCheckoutEvent;
  try {
    event = JSON.parse(payload) as StripeCheckoutEvent;
  } catch {
    return Response.json({ error: { code: 'invalid_json', message: 'Body is not JSON.' } }, { status: 400 });
  }

  const paid = paidOrderFromStripeEvent(event);
  if (!paid) return Response.json({ received: true, ignored: true });
  try {
    const result = await markOrderPaid({
      orderId: paid.orderId,
      provider: 'stripe',
      providerRef: paid.providerRef,
      eventId: event.id,
      eventType: event.type,
    });
    return Response.json({ received: true, duplicate: result.duplicate });
  } catch (error) {
    const message = error instanceof CommerceError ? error.message : 'Payment could not be recorded.';
    return Response.json({ error: { code: 'payment_failed', message } }, { status: 400 });
  }
}
