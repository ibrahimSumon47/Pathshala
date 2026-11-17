'use server';

import { joinSession } from '@pathshala/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/guard';

/** Record attendance once, then return to the room with a visible confirmation. */
export async function checkInAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const sessionId = String(form.get('sessionId') ?? '');
  const slug = String(form.get('slug') ?? '');
  if (!/^[a-f0-9]{24}$/i.test(sessionId)) redirect(`/live/${slug}?error=${encodeURIComponent('Session not found.')}`);
  const result = await joinSession(sessionId, user.id, user.roles);
  if (!result) redirect(`/live/${slug}?error=${encodeURIComponent('You need access to this course.')}`);
  revalidatePath(`/live/${slug}`);
  if (result.status === 'waitlisted') redirect(`/live/${slug}?waitlisted=${result.position}`);
  redirect(`/live/${slug}?checked=1`);
}
