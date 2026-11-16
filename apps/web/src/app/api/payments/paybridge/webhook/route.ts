import { CommerceError, markOrderPaid, markOrderRefunded } from '@pathshala/db';
import { verifyPayBridgeSignature } from '@/lib/payments/paybridge';

export const dynamic = 'force-dynamic';

type PayBridgeEvent = {
  id?: string;
  type?: string;
  data?: { orderId?: string; sessionId?: string };
};

/** Verify the merchant HMAC, then apply a PayBridge success or refund once. */
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.PAYBRIDGE_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ error: { code: 'not_configured', message: 'PayBridge webhook secret is missing.' } }, { status: 503 });
  }
  const payload = await request.text();
  const header = request.headers.get('x-paybridge-signature');
  if (!verifyPayBridgeSignature(payload, header, secret)) {
    return Response.json({ error: { code: 'invalid_signature', message: 'Signature verification failed.' } }, { status: 400 });
  }

  let event: PayBridgeEvent;
  try {
    event = JSON.parse(payload) as PayBridgeEvent;
  } catch {
    return Response.json({ error: { code: 'invalid_json', message: 'Body is not JSON.' } }, { status: 400 });
  }
  const orderId = event.data?.orderId;
  const providerRef = event.data?.sessionId;
  if (!event.id || !orderId || !providerRef) {
    return Response.json({ error: { code: 'invalid_event', message: 'Event is missing its order.' } }, { status: 400 });
  }

  try {
    if (event.type === 'payment.succeeded') {
      const result = await markOrderPaid({ orderId, provider: 'paybridge', providerRef, eventId: event.id, eventType: event.type });
      return Response.json({ received: true, duplicate: result.duplicate });
    }
    if (event.type === 'payment.refunded') {
      const result = await markOrderRefunded({ orderId, provider: 'paybridge', providerRef, eventId: event.id, eventType: event.type });
      return Response.json({ received: true, duplicate: result.duplicate });
    }
    return Response.json({ received: true, ignored: true });
  } catch (error) {
    const message = error instanceof CommerceError ? error.message : 'Event could not be recorded.';
    return Response.json({ error: { code: 'payment_failed', message } }, { status: 400 });
  }
}
