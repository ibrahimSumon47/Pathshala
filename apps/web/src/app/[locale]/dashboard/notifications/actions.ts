'use server';

import { markAllNotificationsRead, markNotificationRead } from '@pathshala/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/guard';

function back(form: FormData): never {
  redirect(`${form.get('locale') === 'en' ? '/en' : ''}/dashboard/notifications`);
}

/** Mark one message read. */
export async function readNotificationAction(form: FormData): Promise<void> {
  const user = await requireUser();
  await markNotificationRead(String(form.get('id') ?? ''), user.id);
  revalidatePath('/dashboard/notifications');
  back(form);
}

/** Clear the unread count in one go. */
export async function readAllNotificationsAction(form: FormData): Promise<void> {
  const user = await requireUser();
  await markAllNotificationsRead(user.id);
  revalidatePath('/dashboard/notifications');
  back(form);
}
