'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requestRefund } from '@pathshala/db';
import { requireUser } from '@/lib/auth/guard';

const MESSAGES = {
  not_found: 'That order could not be found.',
  not_paid: 'Only a paid order can be refunded.',
  window_closed: 'This order is outside the 14-day, under-a-quarter refund window.',
  duplicate: 'There is already a refund request for this order.',
} as const;

/** Ask an operator to review one paid order; approval is the only step that moves money. */
export async function requestRefundAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const orderNumber = String(form.get('orderNumber') ?? '');
  const reason = String(form.get('reason') ?? '').trim();
  const base = `${form.get('locale') === 'en' ? '/en' : ''}/dashboard/orders`;
  if (reason.length < 4) redirect(`${base}?error=${encodeURIComponent('Write a short reason first.')}`);

  const result = await requestRefund({ orderNumber, userId: user.id, reason });
  if (result !== 'created') redirect(`${base}?error=${encodeURIComponent(MESSAGES[result])}`);
  revalidatePath('/dashboard/orders');
  redirect(`${base}?refund=requested`);
}
