'use server';

import { redirect } from 'next/navigation';
import { requireMerchant } from '@/lib/auth';
import { KeyReveal, connectGateway } from '@/lib/models';

/** Delete the temporary plaintext key after the merchant confirms it was saved. */
export async function forgetKeyAction(form: FormData): Promise<void> {
  const merchant = await requireMerchant();
  const revealId = String(form.get('revealId') ?? '');
  await connectGateway();
  await KeyReveal.deleteOne({ _id: revealId, merchant: merchant._id });
  redirect('/dashboard');
}
