'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  Category,
  connectToDatabase,
  decideRefundRequest,
  recordAuditEvent,
  setCertificateRevoked,
  setCourseStatus,
  setInstructorAccess,
  setQuestionHidden,
  setQuestionsHidden,
  setReviewHidden,
  setReviewsHidden,
  setStatementPaid,
} from '@pathshala/db';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/guard';

const categorySchema = z.object({
  nameBn: z.string().trim().min(2).max(80),
  nameEn: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  order: z.coerce.number().int().min(0).max(999),
});

function localePath(form: FormData, path: string): string {
  return `${form.get('locale') === 'en' ? '/en' : ''}${path}`;
}

/** Admin approval: publish, unpublish or archive a course, with an audit row. */
export async function setCourseStatusAction(form: FormData): Promise<void> {
  const user = await requireRole('admin');
  const courseId = String(form.get('courseId') ?? '');
  const status = String(form.get('status') ?? '');
  if (!['draft', 'pending', 'published', 'archived'].includes(status)) {
    redirect(`${localePath(form, '/admin')}?error=${encodeURIComponent('Unknown course status.')}`);
  }
  const ok = await setCourseStatus(courseId, status as 'draft' | 'pending' | 'published' | 'archived', user.id);
  if (!ok) redirect(`${localePath(form, '/admin')}?error=${encodeURIComponent('Course not found.')}`);
  revalidatePath('/admin');
  revalidatePath('/courses');
  redirect(`${localePath(form, '/admin')}?saved=1`);
}

/** Grant or revoke instructor access for a normal account; admins cannot be changed here. */
export async function setInstructorAccessAction(form: FormData): Promise<void> {
  const user = await requireRole('admin');
  const userId = String(form.get('userId') ?? '');
  const grant = form.get('grant') === 'true';
  const ok = await setInstructorAccess(userId, grant, user.id);
  if (!ok) redirect(`${localePath(form, '/admin')}?error=${encodeURIComponent('That account cannot be changed.')}`);
  revalidatePath('/admin');
  redirect(`${localePath(form, '/admin')}?saved=1`);
}

/** Add a subject category; both languages are required because categories are navigation. */
export async function createCategoryAction(form: FormData): Promise<void> {
  await requireRole('admin');
  const parsed = categorySchema.safeParse({
    nameBn: String(form.get('nameBn') ?? ''),
    nameEn: String(form.get('nameEn') ?? ''),
    slug: String(form.get('slug') ?? ''),
    order: String(form.get('order') ?? '0'),
  });
  if (!parsed.success) {
    redirect(`${localePath(form, '/admin')}?error=${encodeURIComponent('Check the category fields.')}`);
  }

  await connectToDatabase();
  try {
    await Category.create({
      name: { bn: parsed.data.nameBn, en: parsed.data.nameEn },
      slug: parsed.data.slug,
      order: parsed.data.order,
      isActive: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate key')) {
      redirect(`${localePath(form, '/admin')}?error=${encodeURIComponent('That slug already exists.')}`);
    }
    throw error;
  }
  revalidatePath('/admin');
  revalidatePath('/courses');
  redirect(`${localePath(form, '/admin')}?saved=1`);
}

/** Hide or restore a review; hiding also removes it from the course rating. */
export async function setReviewVisibilityAction(form: FormData): Promise<void> {
  const user = await requireRole('admin');
  const reviewId = String(form.get('reviewId') ?? '');
  const hidden = form.get('hidden') === 'true';
  const ok = await setReviewHidden(reviewId, hidden);
  if (!ok) redirect(`${localePath(form, '/admin')}?error=${encodeURIComponent('Review not found.')}`);
  await recordAuditEvent({
    actor: user.id,
    action: hidden ? 'review.hide' : 'review.restore',
    entityType: 'review',
    entityId: reviewId,
  });
  revalidatePath('/admin');
  revalidatePath('/courses');
  redirect(`${localePath(form, '/admin')}?saved=1`);
}

/** Hide or restore several reviews or questions in one request. */
export async function bulkModerationAction(form: FormData): Promise<void> {
  const user = await requireRole('admin');
  const kind = String(form.get('kind') ?? '');
  const hidden = form.get('hidden') === 'true';
  const ids = form.getAll('ids').map(String).filter(Boolean).slice(0, 200);
  if (ids.length === 0) {
    redirect(`${localePath(form, '/admin')}?error=${encodeURIComponent('Select at least one row.')}`);
  }
  if (kind !== 'review' && kind !== 'question') {
    redirect(`${localePath(form, '/admin')}?error=${encodeURIComponent('Unknown moderation type.')}`);
  }
  const count = kind === 'review' ? await setReviewsHidden(ids, hidden) : await setQuestionsHidden(ids, hidden);
  if (count === 0) {
    redirect(`${localePath(form, '/admin')}?error=${encodeURIComponent('Nothing matched those rows.')}`);
  }
  await Promise.all(
    ids.map((id) =>
      recordAuditEvent({
        actor: user.id,
        action: `${kind}.${hidden ? 'hide' : 'restore'}`,
        entityType: kind,
        entityId: id,
      }),
    ),
  );
  revalidatePath('/admin');
  revalidatePath('/courses');
  revalidatePath('/learn');
  redirect(`${localePath(form, '/admin')}?saved=1`);
}

/** Mark a teacher's month settled, or reopen it if the transfer did not happen. */
export async function setStatementPaidAction(form: FormData): Promise<void> {
  const user = await requireRole('admin');
  const instructorId = String(form.get('instructorId') ?? '');
  const month = String(form.get('month') ?? '');
  const amountPaisa = Number(form.get('amountPaisa') ?? 0);
  const paid = form.get('paid') === 'true';
  const ok = await setStatementPaid({ instructorId, month, amountPaisa, adminId: user.id, paid });
  if (!ok) redirect(`${localePath(form, '/admin/payouts')}?error=${encodeURIComponent('Statement not found.')}`);
  await recordAuditEvent({
    actor: user.id,
    action: paid ? 'payout.mark' : 'payout.reopen',
    entityType: 'payout',
    entityId: instructorId,
    metadata: { month, amountPaisa },
  });
  revalidatePath('/admin/payouts');
  revalidatePath('/studio/earnings');
  redirect(`${localePath(form, '/admin/payouts')}?saved=1`);
}

/** Approve or decline one learner refund request; approval reverses the paid order. */
export async function decideRefundAction(form: FormData): Promise<void> {
  const user = await requireRole('admin');
  const requestId = String(form.get('requestId') ?? '');
  const approve = form.get('approve') === 'true';
  const result = await decideRefundRequest({ requestId, adminId: user.id, approve });
  if (result !== 'approved' && result !== 'declined') {
    const message =
      result === 'already'
        ? 'That request was already decided.'
        : result === 'order_not_paid'
          ? 'Only a paid order can be refunded.'
          : 'Refund request not found.';
    redirect(`${localePath(form, '/admin/refunds')}?error=${encodeURIComponent(message)}`);
  }
  await recordAuditEvent({
    actor: user.id,
    action: approve ? 'refund.approve' : 'refund.decline',
    entityType: 'refund',
    entityId: requestId,
  });
  revalidatePath('/admin/refunds');
  revalidatePath('/admin');
  revalidatePath('/dashboard/orders');
  redirect(`${localePath(form, '/admin/refunds')}?saved=1`);
}

/** Revoke or restore one certificate; the public verification row is the same record. */
export async function setCertificateRevokedAction(form: FormData): Promise<void> {
  const user = await requireRole('admin');
  const certificateId = String(form.get('certificateId') ?? '');
  const revoked = form.get('revoked') === 'true';
  const ok = await setCertificateRevoked(certificateId, revoked);
  if (!ok) redirect(`${localePath(form, '/admin/certificates')}?error=${encodeURIComponent('Certificate not found.')}`);
  await recordAuditEvent({
    actor: user.id,
    action: revoked ? 'certificate.revoke' : 'certificate.restore',
    entityType: 'certificate',
    entityId: certificateId,
  });
  revalidatePath('/admin/certificates');
  revalidatePath('/verify');
  redirect(`${localePath(form, '/admin/certificates')}?saved=1`);
}

/** Hide or restore a lesson question without deleting the conversation. */
export async function setQuestionVisibilityAction(form: FormData): Promise<void> {
  const user = await requireRole('admin');
  const questionId = String(form.get('questionId') ?? '');
  const hidden = form.get('hidden') === 'true';
  const ok = await setQuestionHidden(questionId, hidden);
  if (!ok) redirect(`${localePath(form, '/admin')}?error=${encodeURIComponent('Question not found.')}`);
  await recordAuditEvent({
    actor: user.id,
    action: hidden ? 'question.hide' : 'question.restore',
    entityType: 'question',
    entityId: questionId,
  });
  revalidatePath('/admin');
  revalidatePath('/learn');
  redirect(`${localePath(form, '/admin')}?saved=1`);
}
