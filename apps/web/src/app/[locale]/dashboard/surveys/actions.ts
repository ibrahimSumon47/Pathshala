'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { submitCompletionSurvey } from '@pathshala/db';
import { requireUser } from '@/lib/auth/guard';

function base(form: FormData): string {
  return `${form.get('locale') === 'en' ? '/en' : ''}/dashboard/surveys`;
}

/** Save one short survey for a completed course; a resubmission edits the same answer. */
export async function submitSurveyAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const result = await submitCompletionSurvey(user.id, String(form.get('courseId') ?? ''), {
    difficulty: Number(form.get('difficulty') ?? 0),
    pace: Number(form.get('pace') ?? 0),
    confidence: Number(form.get('confidence') ?? 0),
    comment: String(form.get('comment') ?? ''),
  });
  if (result === 'not_completed') {
    redirect(`${base(form)}?error=${encodeURIComponent('Only a completed course can be reviewed here.')}`);
  }
  if (result === 'invalid') {
    redirect(`${base(form)}?error=${encodeURIComponent('Answer every scale from 1 to 5.')}`);
  }
  revalidatePath('/dashboard/surveys');
  revalidatePath('/studio');
  redirect(`${base(form)}?saved=1`);
}
