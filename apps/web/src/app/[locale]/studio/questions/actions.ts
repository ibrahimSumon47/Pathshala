'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { answerCourseQuestion } from '@pathshala/db';
import { requireRole } from '@/lib/auth/guard';

/** Answer one lesson question from the teacher's own question desk. */
export async function answerStudioQuestionAction(form: FormData): Promise<void> {
  const user = await requireRole('instructor', 'admin');
  const questionId = String(form.get('questionId') ?? '');
  const body = String(form.get('body') ?? '').trim();
  const base = `${form.get('locale') === 'en' ? '/en' : ''}/studio/questions`;
  if (body.length < 2) redirect(`${base}?error=${encodeURIComponent('Write a reply first.')}`);

  const ok = await answerCourseQuestion({
    questionId,
    instructorId: user.id,
    isAdmin: user.roles.includes('admin'),
    body,
  });
  if (!ok) redirect(`${base}?error=${encodeURIComponent('That question is not on your course.')}`);
  revalidatePath('/studio/questions');
  revalidatePath('/learn');
  redirect(`${base}?saved=1`);
}
