'use server';

import { redirect } from 'next/navigation';
import { generateApiKey, requireMerchant } from '@/lib/auth';
import {
  CheckoutSession,
  Delivery,
  GatewayLedger,
  KeyReveal,
  Merchant,
  connectGateway,
  type CheckoutSessionRecord,
  type DeliveryRecord,
} from '@/lib/models';
import { deliverEvent, sendDelivery } from '@/lib/webhooks';

/** Rotate the merchant key; the plaintext is shown once on its own page. */
export async function rotateKeyAction(): Promise<void> {
  const merchant = await requireMerchant();
  await connectGateway();
  const { key, hash, prefix } = generateApiKey();
  await Merchant.updateOne({ _id: merchant._id }, { apiKeyHash: hash, apiKeyPrefix: prefix });
  const reveal = await KeyReveal.create({ merchant: merchant._id, apiKey: key });
  redirect(`/dashboard/key/${String(reveal._id)}`);
}

/** Refund a paid test charge and notify the merchant. */
export async function refundAction(form: FormData): Promise<void> {
  const merchant = await requireMerchant();
  const sessionId = String(form.get('sessionId') ?? '');
  await connectGateway();
  const session = (await CheckoutSession.findOneAndUpdate(
    { _id: sessionId, merchant: merchant._id, status: 'paid' },
    { status: 'refunded', refundedAt: new Date() },
    { returnDocument: 'after' },
  )) as unknown as CheckoutSessionRecord | null;
  if (!session) redirect(`/dashboard?error=${encodeURIComponent('Only a paid charge can be refunded.')}`);
  await GatewayLedger.updateOne(
    { session: session._id, type: 'refund' },
    { $setOnInsert: { merchant: merchant._id, amountPaisa: -session.amountPaisa, description: `Refund for ${session.orderRef}` } },
    { upsert: true },
  );
  await deliverEvent(merchant, session, 'payment.refunded');
  redirect('/dashboard?refunded=1');
}

/** Retry a failed webhook without creating a new event id. */
export async function resendAction(form: FormData): Promise<void> {
  const merchant = await requireMerchant();
  const deliveryId = String(form.get('deliveryId') ?? '');
  await connectGateway();
  const delivery = (await Delivery.findOne({ _id: deliveryId, merchant: merchant._id })) as unknown as DeliveryRecord | null;
  if (!delivery) redirect(`/dashboard?error=${encodeURIComponent('Delivery not found.')}`);
  await sendDelivery(String(delivery._id));
  redirect('/dashboard?resent=1');
}
