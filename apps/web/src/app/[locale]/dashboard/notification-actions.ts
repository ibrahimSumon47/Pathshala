'use server';

import { markNotificationRead } from '@pathshala/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/guard';

/** Dismiss one reminder notification for its owner. */
export async function markNotificationReadAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(form.get('id') ?? '');
  await markNotificationRead(id, user.id);
  revalidatePath('/dashboard');
  redirect(`${form.get('locale') === 'en' ? '/en' : ''}/dashboard`);
}
