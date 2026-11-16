import { randomUUID } from 'node:crypto';
import type { Types } from 'mongoose';
import { connectToDatabase } from './connection';
import { Course } from './models/course';
import { Coupon, type CouponDoc } from './models/coupon';
import { Enrolment } from './models/enrolment';
import { LedgerEntry } from './models/ledger-entry';
import { Order, type OrderDoc, type PaymentProvider } from './models/order';
import { Payment } from './models/payment';
import { WebhookEvent } from './models/webhook-event';

export class CommerceError extends Error {
  constructor(
    public readonly code:
      | 'course_not_found'
      | 'not_for_sale'
      | 'already_enrolled'
      | 'order_not_found'
      | 'order_not_pending'
      | 'provider_not_set'
      | 'coupon_invalid'
      | 'coupon_expired'
      | 'coupon_exhausted'
      | 'coupon_minimum'
      | 'coupon_course',
    message: string,
  ) {
    super(message);
    this.name = 'CommerceError';
  }
}

/** Discount is computed once, in integer paisa, from a coupon-shaped value. */
export function discountFor(coupon: Pick<CouponDoc, 'type' | 'value'>, subtotalPaisa: number): number {
  if (subtotalPaisa <= 0) return 0;
  const raw = coupon.type === 'percent' ? Math.floor((subtotalPaisa * coupon.value) / 100) : coupon.value;
  return Math.max(0, Math.min(subtotalPaisa, Math.round(raw)));
}

/** Instructor keeps 80 percent; the platform keeps the exact remainder so paisa reconcile. */
export function splitPayment(totalPaisa: number, instructorPercent = 80): { instructorPaisa: number; platformPaisa: number } {
  const safePercent = Math.max(0, Math.min(100, instructorPercent));
  const instructorPaisa = Math.round((totalPaisa * safePercent) / 100);
  return { instructorPaisa, platformPaisa: totalPaisa - instructorPaisa };
}

/** Human-facing order numbers are dated and random; receipt numbers come only after payment. */
export function orderNumberFor(now = new Date()): string {
  const date = now.toISOString().slice(0, 10).replaceAll('-', '');
  return `PS-${date}-${randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`;
}

export type CouponQuote = {
  coupon: CouponDoc | null;
  discountPaisa: number;
  totalPaisa: number;
};

/** Validate an active coupon against a course and subtotal, including its cap and expiry. */
export async function quoteCoupon(
  code: string,
  subtotalPaisa: number,
  courseId: string,
  now = new Date(),
): Promise<CouponQuote> {
  const clean = code.trim().toUpperCase();
  if (!clean) return { coupon: null, discountPaisa: 0, totalPaisa: subtotalPaisa };
  const coupon = await Coupon.findOne({ code: clean }).lean();
  if (!coupon || !coupon.active) throw new CommerceError('coupon_invalid', 'That coupon is not valid.');
  if (coupon.expiresAt && coupon.expiresAt.getTime() <= now.getTime()) {
    throw new CommerceError('coupon_expired', 'That coupon has expired.');
  }
  if (coupon.redeemedCount >= coupon.maxRedemptions) {
    throw new CommerceError('coupon_exhausted', 'That coupon has been used up.');
  }
  if (coupon.minAmountPaisa > subtotalPaisa) {
    throw new CommerceError('coupon_minimum', 'This coupon needs a larger order.');
  }
  if (coupon.course && String(coupon.course) !== courseId) {
    throw new CommerceError('coupon_course', 'This coupon is for a different course.');
  }
  const discountPaisa = discountFor(coupon, subtotalPaisa);
  return { coupon, discountPaisa, totalPaisa: subtotalPaisa - discountPaisa };
}

export type CreateOrderInput = {
  userId: string;
  courseId: string;
  couponCode?: string;
  idempotencyKey?: string;
};

/** Create a pending order for a paid course; free courses enrol directly instead. */
export async function createOrder({
  userId,
  courseId,
  couponCode = '',
  idempotencyKey = randomUUID(),
}: CreateOrderInput): Promise<OrderDoc> {
  await connectToDatabase();
  const course = await Course.findOne({ _id: courseId, status: 'published' }).lean();
  if (!course) throw new CommerceError('course_not_found', 'Course not found.');
  if (course.pricePaisa <= 0) throw new CommerceError('not_for_sale', 'This course is free; enrol directly.');

  const enrolled = await Enrolment.exists({ student: userId, course: course._id, status: { $ne: 'refunded' } });
  if (enrolled) throw new CommerceError('already_enrolled', 'You are already enrolled in this course.');

  const quote = await quoteCoupon(couponCode, course.pricePaisa, String(course._id));
  const order = await Order.create({
    user: userId,
    course: course._id,
    instructor: course.instructor,
    orderNumber: orderNumberFor(),
    courseSlug: course.slug,
    courseTitle: course.title,
    amountPaisa: course.pricePaisa,
    discountPaisa: quote.discountPaisa,
    totalPaisa: quote.totalPaisa,
    currency: 'BDT',
    provider: null,
    idempotencyKey,
    status: 'pending',
    ...(quote.coupon?.code ? { couponCode: quote.coupon.code } : {}),
    paidAt: null,
    refundedAt: null,
  });
  return order.toObject();
}

/** Re-price a pending order with a new coupon, or clear it when the code is empty. */
export async function applyCouponToOrder(
  orderNumber: string,
  userId: string,
  code: string,
): Promise<OrderDoc> {
  await connectToDatabase();
  const order = await Order.findOne({ orderNumber, user: userId, status: 'pending' });
  if (!order) throw new CommerceError('order_not_pending', 'This order is no longer editable.');
  const quote = await quoteCoupon(code, order.amountPaisa, String(order.course));
  order.couponCode = quote.coupon ? quote.coupon.code : undefined;
  order.discountPaisa = quote.discountPaisa;
  order.totalPaisa = quote.totalPaisa;
  await order.save();
  return order.toObject();
}

/** The checkout session selects the rail; the order keeps that choice for the webhook. */
export async function setOrderProvider(orderNumber: string, userId: string, provider: PaymentProvider): Promise<OrderDoc> {
  await connectToDatabase();
  const order = await Order.findOneAndUpdate(
    { orderNumber, user: userId, status: 'pending' },
    { provider },
    { returnDocument: 'after' },
  ).lean();
  if (!order) throw new CommerceError('order_not_pending', 'This order cannot be paid.');
  return order;
}

export type PaidOrderInput = {
  orderId: string;
  provider: PaymentProvider;
  providerRef: string;
  eventId: string;
  eventType: string;
};

/** Mark a signed payment event paid exactly once and post both ledger sides. */
export async function markOrderPaid({
  orderId,
  provider,
  providerRef,
  eventId,
  eventType,
}: PaidOrderInput): Promise<{ order: OrderDoc; duplicate: boolean }> {
  await connectToDatabase();
  const order = await findOrder(orderId);
  if (!order) throw new CommerceError('order_not_found', 'Order not found.');

  try {
    await WebhookEvent.create({ provider, eventId, type: eventType });
  } catch (error) {
    if (isDuplicateKey(error)) {
      return { order: order.toObject(), duplicate: true };
    }
    throw error;
  }

  if (order.status === 'paid') return { order: order.toObject(), duplicate: true };

  const paidAt = new Date();
  const receiptNumber = `RCPT-${paidAt.toISOString().slice(0, 10).replaceAll('-', '')}-${String(order._id).slice(-6).toUpperCase()}`;
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: { $ne: 'paid' } },
    { status: 'paid', paidAt, receiptNumber, provider, providerRef },
    { returnDocument: 'after' },
  );
  if (!updated) {
    const current = await Order.findById(order._id).lean();
    if (!current) throw new CommerceError('order_not_found', 'Order not found.');
    return { order: current, duplicate: true };
  }

  await Payment.updateOne(
    { provider, providerRef },
    { $setOnInsert: { order: order._id, provider, providerRef, amountPaisa: updated.totalPaisa, status: 'succeeded', paidAt } },
    { upsert: true },
  );

  const { instructorPaisa, platformPaisa } = splitPayment(updated.totalPaisa);
  await Promise.all([
    LedgerEntry.updateOne(
      { order: order._id, account: 'instructor', type: 'sale' },
      {
        $setOnInsert: {
          instructor: updated.instructor,
          amountPaisa: instructorPaisa,
          description: `Course sale — ${updated.courseTitle.en ?? updated.courseTitle.bn ?? updated.courseSlug}`,
        },
      },
      { upsert: true },
    ),
    LedgerEntry.updateOne(
      { order: order._id, account: 'platform', type: 'sale' },
      {
        $setOnInsert: {
          instructor: updated.instructor,
          amountPaisa: platformPaisa,
          description: 'Platform share',
        },
      },
      { upsert: true },
    ),
  ]);

  await Enrolment.updateOne(
    { student: updated.user, course: updated.course },
    {
      $setOnInsert: { enrolledAt: paidAt, progressPercent: 0, completedLessonIds: [] },
      $set: { status: 'active', completedAt: null },
    },
    { upsert: true },
  );

  if (updated.couponCode) {
    await Coupon.updateOne({ code: updated.couponCode }, { $inc: { redeemedCount: 1 } });
  }

  return { order: updated.toObject(), duplicate: false };
}

/** Reverse a paid order after a signed refund event. */
export async function markOrderRefunded({
  orderId,
  provider,
  providerRef,
  eventId,
  eventType,
}: PaidOrderInput): Promise<{ order: OrderDoc; duplicate: boolean }> {
  await connectToDatabase();
  const order = await findOrder(orderId);
  if (!order) throw new CommerceError('order_not_found', 'Order not found.');

  try {
    await WebhookEvent.create({ provider, eventId, type: eventType });
  } catch (error) {
    if (isDuplicateKey(error)) return { order: order.toObject(), duplicate: true };
    throw error;
  }

  if (order.status === 'refunded') return { order: order.toObject(), duplicate: true };
  if (order.status !== 'paid') throw new CommerceError('order_not_pending', 'Only paid orders can be refunded.');

  const refundedAt = new Date();
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: 'paid' },
    { status: 'refunded', refundedAt },
    { returnDocument: 'after' },
  );
  if (!updated) return { order: order.toObject(), duplicate: true };

  await Payment.updateOne({ provider, providerRef }, { status: 'refunded', refundedAt });
  const { instructorPaisa, platformPaisa } = splitPayment(updated.totalPaisa);
  await Promise.all([
    LedgerEntry.updateOne(
      { order: order._id, account: 'instructor', type: 'refund' },
      {
        $setOnInsert: {
          instructor: updated.instructor,
          amountPaisa: -instructorPaisa,
          description: `Refund — ${updated.courseTitle.en ?? updated.courseTitle.bn ?? updated.courseSlug}`,
        },
      },
      { upsert: true },
    ),
    LedgerEntry.updateOne(
      { order: order._id, account: 'platform', type: 'refund' },
      {
        $setOnInsert: {
          instructor: updated.instructor,
          amountPaisa: -platformPaisa,
          description: 'Refunded platform share',
        },
      },
      { upsert: true },
    ),
    Enrolment.updateOne({ student: updated.user, course: updated.course }, { status: 'refunded' }),
  ]);
  if (updated.couponCode) {
    await Coupon.updateOne({ code: updated.couponCode, redeemedCount: { $gt: 0 } }, { $inc: { redeemedCount: -1 } });
  }

  return { order: updated.toObject(), duplicate: false };
}

export type OrderView = {
  id: string;
  orderNumber: string;
  courseSlug: string;
  courseTitle: { bn?: string; en?: string };
  amountPaisa: number;
  discountPaisa: number;
  totalPaisa: number;
  status: string;
  provider: string | null;
  providerRef: string | null;
  couponCode: string | null;
  receiptNumber: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  createdAt: string;
};

/** A pending payment surface only needs the order's number, not its Mongo id. */
export function toOrderView(order: OrderDoc & { _id: Types.ObjectId }): OrderView {
  return {
    id: String(order._id),
    orderNumber: order.orderNumber,
    courseSlug: order.courseSlug,
    courseTitle: order.courseTitle,
    amountPaisa: order.amountPaisa,
    discountPaisa: order.discountPaisa,
    totalPaisa: order.totalPaisa,
    status: order.status,
    provider: order.provider ?? null,
    providerRef: order.providerRef ?? null,
    couponCode: order.couponCode ?? null,
    receiptNumber: order.receiptNumber ?? null,
    paidAt: order.paidAt?.toISOString() ?? null,
    refundedAt: order.refundedAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
  };
}

/** Load one order for its owner by the public order number. */
export async function getOrderForUser(orderNumber: string, userId: string): Promise<OrderView | null> {
  await connectToDatabase();
  const order = await Order.findOne({ orderNumber, user: userId }).lean();
  return order ? toOrderView(order as OrderDoc & { _id: Types.ObjectId }) : null;
}

/** The student's receipt list, newest first. */
export async function getStudentOrders(userId: string): Promise<OrderView[]> {
  await connectToDatabase();
  const orders = await Order.find({ user: userId, orderNumber: { $exists: true } }).sort({ createdAt: -1 }).limit(50).lean();
  return orders.map((order) => toOrderView(order as OrderDoc & { _id: Types.ObjectId }));
}

/** Instructor earnings are the sum of signed ledger entries, so refunds subtract. */
export async function getInstructorEarnings(instructorId: string): Promise<{ totalPaisa: number; sales: number }> {
  await connectToDatabase();
  const entries = await LedgerEntry.find({ instructor: instructorId, account: 'instructor' })
    .select('amountPaisa type')
    .lean();
  return {
    totalPaisa: entries.reduce((total, entry) => total + entry.amountPaisa, 0),
    sales: entries.filter((entry) => entry.type === 'sale').length,
  };
}

/** Gateways may send our order number while local fixtures send the Mongo id. */
async function findOrder(orderId: string) {
  return /^[a-f0-9]{24}$/i.test(orderId) ? Order.findById(orderId) : Order.findOne({ orderNumber: orderId });
}

/** Mongo duplicate-key errors are the expected race between two identical webhooks. */
function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000;
}
