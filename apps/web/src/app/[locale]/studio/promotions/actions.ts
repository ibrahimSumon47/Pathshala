'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createInstructorCoupon, setInstructorCouponActive } from '@pathshala/db';
import { toPaisa } from '@pathshala/shared';
import { requireRole } from '@/lib/auth/guard';

function localePath(form: FormData, path: string): string {
  return `${form.get('locale') === 'en' ? '/en' : ''}${path}`;
}

/** Create one course-scoped code as the signed-in teacher. */
export async function createPromotionAction(form: FormData): Promise<void> {
  const user = await requireRole('instructor', 'admin');
  const code = String(form.get('code') ?? '').trim().toUpperCase();
  const rawType = String(form.get('type') ?? '');
  const courseId = String(form.get('courseId') ?? '');
  const rawValue = Number(String(form.get('value') ?? '0'));
  const maxRedemptions = Number.parseInt(String(form.get('maxRedemptions') ?? '50'), 10);
  const maxPerLearner = Number.parseInt(String(form.get('maxPerLearner') ?? '1'), 10);
  const days = Number.parseInt(String(form.get('days') ?? '0'), 10);
  const base = localePath(form, '/studio/promotions');

  if (rawType !== 'percent' && rawType !== 'fixed') {
    redirect(`${base}?error=${encodeURIComponent('Choose a discount type.')}`);
  }
  const value = rawType === 'percent' ? Math.round(rawValue) : toPaisa(rawValue);
  const result = await createInstructorCoupon({
    instructorId: user.id,
    isAdmin: user.roles.includes('admin'),
    code,
    type: rawType,
    value,
    courseId,
    maxRedemptions,
    maxPerLearner,
    days,
  });
  if (!result.ok) {
    const messages = {
      course: 'That course is not yours to discount.',
      code: 'Use 3-32 letters, numbers or hyphens.',
      value: 'Check the discount, limit and expiry.',
      duplicate: 'That code already exists.',
    } as const;
    redirect(`${base}?error=${encodeURIComponent(messages[result.error])}`);
  }
  revalidatePath('/studio/promotions');
  redirect(`${base}?created=${encodeURIComponent(result.code)}`);
}

/** Turn one of the teacher's own codes on or off. */
export async function togglePromotionAction(form: FormData): Promise<void> {
  const user = await requireRole('instructor', 'admin');
  const couponId = String(form.get('couponId') ?? '');
  const active = form.get('active') === 'true';
  const ok = await setInstructorCouponActive({
    couponId,
    instructorId: user.id,
    isAdmin: user.roles.includes('admin'),
    active,
  });
  const base = localePath(form, '/studio/promotions');
  if (!ok) redirect(`${base}?error=${encodeURIComponent('That code is not yours to change.')}`);
  revalidatePath('/studio/promotions');
  redirect(`${base}?saved=1`);
}
