import { createHmac } from 'node:crypto';
import {
  Delivery,
  Merchant,
  connectGateway,
  type CheckoutSessionRecord,
  type DeliveryRecord,
  type MerchantRecord,
} from './models';

/** PayBridge signs `timestamp.rawBody`; receivers must verify before parsing. */
function signWebhook(secret: string, timestamp: string, payload: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
}

function eventPayload(session: CheckoutSessionRecord, event: string): string {
  return JSON.stringify({
    id: `pbe_${String(session._id)}_${event}`,
    type: event,
    created: Math.floor(Date.now() / 1000),
    data: {
      orderId: session.orderRef,
      sessionId: String(session._id),
      amountPaisa: session.amountPaisa,
      currency: session.currency,
      status: event === 'payment.refunded' ? 'refunded' : 'paid',
    },
  });
}

/** Attempt a signed delivery up to three times and persist the outcome. */
export async function sendDelivery(deliveryId: string): Promise<void> {
  await connectGateway();
  const delivery = (await Delivery.findById(deliveryId)) as unknown as DeliveryRecord | null;
  if (!delivery) return;
  const merchant = (await Merchant.findById(delivery.merchant).lean()) as unknown as MerchantRecord | null;
  if (!merchant) return;

  let attempts = delivery.attempts;
  let lastError: string | null = delivery.lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const timestamp = String(Math.floor(Date.now() / 1000));
    attempts += 1;
    try {
      const response = await fetch(delivery.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-paybridge-timestamp': timestamp,
          'x-paybridge-signature': `t=${timestamp},v1=${signWebhook(merchant.webhookSecret, timestamp, delivery.payload)}`,
          'x-paybridge-event-id': JSON.parse(delivery.payload).id as string,
        },
        body: delivery.payload,
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        await Delivery.updateOne({ _id: delivery._id }, { attempts, status: 'delivered', lastError: null });
        return;
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'network error';
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 200));
  }
  await Delivery.updateOne({ _id: delivery._id }, { attempts, status: 'failed', lastError });
}

/** Create the delivery row once, then send it; refunds reuse the same event key. */
export async function deliverEvent(
  merchant: MerchantRecord,
  session: CheckoutSessionRecord,
  event: 'payment.succeeded' | 'payment.refunded',
): Promise<void> {
  await connectGateway();
  const payload = eventPayload(session, event);
  const delivery = (await Delivery.findOneAndUpdate(
    { session: session._id, event },
    {
      $setOnInsert: {
        merchant: merchant._id,
        session: session._id,
        event,
        url: session.webhookUrl,
        payload,
      },
    },
    { upsert: true, returnDocument: 'after' },
  )) as unknown as DeliveryRecord | null;
  if (!delivery) return;
  await sendDelivery(String(delivery._id));
}
