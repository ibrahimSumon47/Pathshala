'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { announceToCourse, replyToCourseReview } from '@pathshala/db';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/guard';

const replySchema = z.object({
  reviewId: z.string().trim().min(1),
  body: z.string().trim().min(2).max(1200),
});

const announcementSchema = z.object({
  courseId: z.string().trim().min(1),
  message: z.string().trim().min(2).max(1000),
});

function localePath(form: FormData, path: string): string {
  return `${form.get('locale') === 'en' ? '/en' : ''}${path}`;
}

/** Answer a learner review as the course instructor. */
export async function replyToReviewAction(form: FormData): Promise<void> {
  const user = await requireRole('instructor', 'admin');
  const parsed = replySchema.safeParse({
    reviewId: String(form.get('reviewId') ?? ''),
    body: String(form.get('body') ?? ''),
  });
  if (!parsed.success) {
    redirect(`${localePath(form, '/studio/community')}?error=${encodeURIComponent('Write a reply first.')}`);
  }
  const ok = await replyToCourseReview({
    reviewId: parsed.data.reviewId,
    instructorId: user.id,
    isAdmin: user.roles.includes('admin'),
    body: parsed.data.body,
  });
  if (!ok) {
    redirect(`${localePath(form, '/studio/community')}?error=${encodeURIComponent('That review is not on your course.')}`);
  }
  revalidatePath('/studio/community');
  revalidatePath('/courses');
  redirect(`${localePath(form, '/studio/community')}?saved=1`);
}

/** Send one inbox announcement to everyone enrolled in a course. */
export async function announceAction(form: FormData): Promise<void> {
  const user = await requireRole('instructor', 'admin');
  const parsed = announcementSchema.safeParse({
    courseId: String(form.get('courseId') ?? ''),
    message: String(form.get('message') ?? ''),
  });
  if (!parsed.success) {
    redirect(`${localePath(form, '/studio/community')}?error=${encodeURIComponent('Choose a course and write a message.')}`);
  }
  const sent = await announceToCourse({
    courseId: parsed.data.courseId,
    instructorId: user.id,
    isAdmin: user.roles.includes('admin'),
    message: parsed.data.message,
  });
  if (sent === null) {
    redirect(`${localePath(form, '/studio/community')}?error=${encodeURIComponent('That course is not yours to announce.')}`);
  }
  revalidatePath('/studio/community');
  revalidatePath('/notifications');
  redirect(`${localePath(form, '/studio/community')}?sent=${sent}`);
}
