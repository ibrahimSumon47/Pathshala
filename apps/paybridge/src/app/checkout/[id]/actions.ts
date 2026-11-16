'use server';

import { redirect } from 'next/navigation';
import {
  CheckoutSession,
  GatewayLedger,
  Merchant,
  connectGateway,
  type CheckoutSessionRecord,
  type MerchantRecord,
} from '@/lib/models';
import { deliverEvent } from '@/lib/webhooks';

/** Append the success flag without discarding a merchant's own query parameters. */
function returnWith(url: string, sessionId: string): string {
  const target = new URL(url);
  target.searchParams.set('paid', '1');
  target.searchParams.set('order', sessionId);
  return target.toString();
}

/** Complete a test payment after validating the demo card and mark the session paid once. */
export async function payAction(form: FormData): Promise<void> {
  const sessionId = String(form.get('sessionId') ?? '');
  const card = String(form.get('card') ?? '').replaceAll(' ', '');
  const expiry = String(form.get('expiry') ?? '').trim();
  const cvc = String(form.get('cvc') ?? '').trim();
  if (!/^[a-f0-9]{24}$/i.test(sessionId)) redirect('/dashboard');
  if (card !== '4242424242424242') redirect(`/checkout/${sessionId}?error=${encodeURIComponent('Use the test card 4242 4242 4242 4242.')}`);
  if (!/^\d{2}\/\d{2}$/.test(expiry)) redirect(`/checkout/${sessionId}?error=${encodeURIComponent('Expiry must look like 12/34.')}`);
  if (!/^\d{3,4}$/.test(cvc)) redirect(`/checkout/${sessionId}?error=${encodeURIComponent('CVC must be 3 or 4 digits.')}`);

  await connectGateway();
  const session = (await CheckoutSession.findOneAndUpdate(
    { _id: sessionId, status: 'pending' },
    { status: 'paid', paidAt: new Date(), cardLast4: card.slice(-4) },
    { returnDocument: 'after' },
  )) as unknown as CheckoutSessionRecord | null;
  const current = session ?? ((await CheckoutSession.findById(sessionId).lean()) as unknown as CheckoutSessionRecord | null);
  if (!current) redirect('/dashboard');
  if (session) {
    await GatewayLedger.updateOne(
      { session: session._id, type: 'charge' },
      { $setOnInsert: { merchant: session.merchant, amountPaisa: session.amountPaisa, description: `Charge for ${session.orderRef}` } },
      { upsert: true },
    );
    const merchant = (await Merchant.findById(session.merchant).lean()) as unknown as MerchantRecord | null;
    if (merchant) await deliverEvent(merchant, session, 'payment.succeeded');
  }
  redirect(returnWith(current.returnUrl, String(current._id)));
}
