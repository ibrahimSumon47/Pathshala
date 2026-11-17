import { Types } from 'mongoose';
import { connectToDatabase } from './connection';
import { Course } from './models/course';
import { Coupon, type CouponType } from './models/coupon';

export type PromoCourse = { id: string; slug: string; title: { bn?: string; en?: string } };

export type InstructorCouponRow = {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  courseTitle: { bn?: string; en?: string };
  courseId: string | null;
  active: boolean;
  redeemedCount: number;
  maxRedemptions: number;
  maxPerLearner: number;
  expiresAt: string | null;
};

export type PromotionsView = {
  courses: PromoCourse[];
  coupons: InstructorCouponRow[];
};

export const PROMO_CODE = /^[A-Z0-9][A-Z0-9-]{2,31}$/;

/** The teacher's own courses and the codes they made for them. Admins see every code. */
export async function listInstructorPromotions(instructorId: string, isAdmin = false): Promise<PromotionsView> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(instructorId)) return { courses: [], coupons: [] };
  const courses = await Course.find(isAdmin ? {} : { instructor: instructorId })
    .select('title slug instructor')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  const owned = isAdmin ? courses : courses.filter((course) => String(course.instructor) === instructorId);
  const coupons = await Coupon.find(isAdmin ? { course: { $ne: null } } : { createdBy: instructorId })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  const titles = new Map(courses.map((course) => [String(course._id), course.title]));
  return {
    courses: owned.map((course) => ({ id: String(course._id), slug: course.slug, title: course.title })),
    coupons: coupons.map((coupon) => ({
      id: String(coupon._id),
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      courseTitle: coupon.course ? titles.get(String(coupon.course)) ?? {} : {},
      courseId: coupon.course ? String(coupon.course) : null,
      active: coupon.active,
      redeemedCount: coupon.redeemedCount,
      maxRedemptions: coupon.maxRedemptions,
      maxPerLearner: coupon.maxPerLearner ?? 1,
      expiresAt: coupon.expiresAt?.toISOString() ?? null,
    })),
  };
}

export type CreateCouponResult = { ok: true; code: string } | { ok: false; error: 'course' | 'code' | 'value' | 'duplicate' };

/** A teacher may discount only a course they own; the code is scoped to that course. */
export async function createInstructorCoupon(input: {
  instructorId: string;
  isAdmin: boolean;
  code: string;
  type: CouponType;
  value: number;
  courseId: string;
  maxRedemptions: number;
  maxPerLearner?: number;
  days: number;
  now?: Date;
}): Promise<CreateCouponResult> {
  await connectToDatabase();
  const code = input.code.trim().toUpperCase();
  if (!PROMO_CODE.test(code)) return { ok: false, error: 'code' };
  if (!Types.ObjectId.isValid(input.courseId)) return { ok: false, error: 'course' };
  const course = await Course.findById(input.courseId).select('instructor').lean();
  if (!course) return { ok: false, error: 'course' };
  if (!input.isAdmin && String(course.instructor) !== input.instructorId) return { ok: false, error: 'course' };

  if (!Number.isInteger(input.value) || input.value < 1) return { ok: false, error: 'value' };
  if (input.type === 'percent' ? input.value > 100 : input.value > 5_000_000) return { ok: false, error: 'value' };
  if (!Number.isInteger(input.maxRedemptions) || input.maxRedemptions < 1 || input.maxRedemptions > 5000) {
    return { ok: false, error: 'value' };
  }
  const maxPerLearner = input.maxPerLearner ?? 1;
  if (!Number.isInteger(maxPerLearner) || maxPerLearner < 0 || maxPerLearner > 10) {
    return { ok: false, error: 'value' };
  }
  if (!Number.isInteger(input.days) || input.days < 0 || input.days > 365) return { ok: false, error: 'value' };

  const now = input.now ?? new Date();
  try {
    await Coupon.create({
      code,
      type: input.type,
      value: input.value,
      course: course._id,
      createdBy: input.instructorId,
      maxRedemptions: input.maxRedemptions,
      maxPerLearner,
      minAmountPaisa: 0,
      active: true,
      expiresAt: input.days > 0 ? new Date(now.getTime() + input.days * 24 * 60 * 60 * 1000) : null,
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000) {
      return { ok: false, error: 'duplicate' };
    }
    throw error;
  }
  return { ok: true, code };
}

/** Turn a code on or off; only its author (or an admin) may do it. */
export async function setInstructorCouponActive(input: {
  couponId: string;
  instructorId: string;
  isAdmin: boolean;
  active: boolean;
}): Promise<boolean> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(input.couponId)) return false;
  const filter = input.isAdmin ? { _id: input.couponId } : { _id: input.couponId, createdBy: input.instructorId };
  const result = await Coupon.updateOne(filter, { active: input.active });
  return result.matchedCount > 0;
}
