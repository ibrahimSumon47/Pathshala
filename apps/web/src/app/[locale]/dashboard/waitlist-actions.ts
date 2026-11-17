'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { leaveWaitlist } from '@pathshala/db';
import { requireUser } from '@/lib/auth/guard';

function dashboardPath(form: FormData): string {
  return `${form.get('locale') === 'en' ? '/en' : ''}/dashboard`;
}

/** Remove the signed-in learner's place in one live-class queue. */
export async function leaveWaitlistAction(form: FormData): Promise<void> {
  const user = await requireUser();
  await leaveWaitlist(String(form.get('sessionId') ?? ''), user.id);
  revalidatePath('/dashboard');
  redirect(dashboardPath(form));
}
