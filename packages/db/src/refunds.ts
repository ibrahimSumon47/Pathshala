import { Types } from 'mongoose';
import { connectToDatabase } from './connection';
import { markOrderRefunded, orderItems } from './commerce';
import { Enrolment } from './models/enrolment';
import { Notification } from './models/notification';
import { Order } from './models/order';
import { RefundRequest, type RefundStatus } from './models/refund-request';
import { User } from './models/user';

/** The published policy: ask within two weeks and before a quarter of the lessons. */
export const REFUND_WINDOW_DAYS = 14;
export const REFUND_MAX_PROGRESS_PERCENT = 25;

export function refundWindowOpen(paidAt: Date | null, now = new Date()): boolean {
  if (!paidAt) return false;
  const elapsed = now.getTime() - paidAt.getTime();
  return elapsed >= 0 && elapsed <= REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

/** Progress is the stored percentage per course; a quarter or more closes the window. */
export function refundProgressOpen(progressPercents: number[]): boolean {
  return progressPercents.every((percent) => percent < REFUND_MAX_PROGRESS_PERCENT);
}

export type RefundRequestResult = 'created' | 'not_found' | 'not_paid' | 'window_closed' | 'duplicate';

export type StudentRefundRow = {
  orderNumber: string;
  status: RefundStatus;
  reason: string;
  createdAt: string;
  decidedAt: string | null;
};

/** A learner asks for one paid order to be reviewed; no money moves until an operator decides. */
export async function requestRefund(input: {
  orderNumber: string;
  userId: string;
  reason: string;
  now?: Date;
}): Promise<RefundRequestResult> {
  await connectToDatabase();
  const reason = input.reason.trim().slice(0, 1000);
  if (reason.length < 4) return 'not_found';
  const order = await Order.findOne({ orderNumber: input.orderNumber, user: input.userId }).lean();
  if (!order) return 'not_found';
  if (order.status !== 'paid') return 'not_paid';
  if (!refundWindowOpen(order.paidAt ?? null, input.now)) return 'window_closed';

  const items = orderItems(order);
  const enrolments = await Enrolment.find({
    student: input.userId,
    course: { $in: items.map((item) => item.course) },
  })
    .select('progressPercent')
    .lean();
  if (!refundProgressOpen(enrolments.map((enrolment) => enrolment.progressPercent))) return 'window_closed';
  if (await RefundRequest.exists({ order: order._id })) return 'duplicate';

  try {
    await RefundRequest.create({ order: order._id, user: input.userId, reason, status: 'pending' });
  } catch (error) {
    if (typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000) {
      return 'duplicate';
    }
    throw error;
  }
  return 'created';
}

/** The learner's own requests, keyed by order number for the receipts page. */
export async function getStudentRefundRequests(userId: string): Promise<StudentRefundRow[]> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(userId)) return [];
  const requests = await RefundRequest.find({ user: userId }).sort({ createdAt: -1 }).limit(50).lean();
  const orders = await Order.find({ _id: { $in: requests.map((request) => request.order) } })
    .select('orderNumber')
    .lean();
  const numbers = new Map(orders.map((order) => [String(order._id), order.orderNumber]));
  return requests.flatMap((request) => {
    const orderNumber = numbers.get(String(request.order));
    if (!orderNumber) return [];
    return [
      {
        orderNumber,
        status: request.status,
        reason: request.reason,
        createdAt: request.createdAt.toISOString(),
        decidedAt: request.decidedAt?.toISOString() ?? null,
      },
    ];
  });
}

export type AdminRefundRow = {
  id: string;
  orderNumber: string;
  buyerName: string;
  buyerEmail: string;
  courseTitle: { bn?: string; en?: string };
  totalPaisa: number;
  reason: string;
  status: RefundStatus;
  createdAt: string;
  decidedAt: string | null;
};

/** The operator queue: pending first, then the recent decisions, with buyer and course context. */
export async function listRefundRequests(): Promise<AdminRefundRow[]> {
  await connectToDatabase();
  const requests = await RefundRequest.find().sort({ createdAt: -1 }).limit(100).lean();
  const [orders, buyers] = await Promise.all([
    Order.find({ _id: { $in: requests.map((request) => request.order) } })
      .select('orderNumber courseTitle totalPaisa')
      .lean(),
    User.find({ _id: { $in: requests.map((request) => request.user) } })
      .select('name email')
      .lean(),
  ]);
  const orderMap = new Map(orders.map((order) => [String(order._id), order]));
  const buyerMap = new Map(buyers.map((buyer) => [String(buyer._id), buyer]));
  const rows = requests.flatMap((request) => {
    const order = orderMap.get(String(request.order));
    const buyer = buyerMap.get(String(request.user));
    if (!order) return [];
    return [
      {
        id: String(request._id),
        orderNumber: order.orderNumber,
        buyerName: buyer?.name ?? 'Learner',
        buyerEmail: buyer?.email ?? '',
        courseTitle: order.courseTitle,
        totalPaisa: order.totalPaisa,
        reason: request.reason,
        status: request.status,
        createdAt: request.createdAt.toISOString(),
        decidedAt: request.decidedAt?.toISOString() ?? null,
      },
    ];
  });
  // Pending work belongs at the top; the rest keep newest-first order.
  return rows.sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending'));
}

export type RefundDecision = 'approved' | 'declined' | 'missing' | 'already' | 'order_not_paid';

/** Approving reverses the order through the same signed-refund path a gateway would use. */
export async function decideRefundRequest(input: {
  requestId: string;
  adminId: string;
  approve: boolean;
}): Promise<RefundDecision> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(input.requestId)) return 'missing';
  const request = await RefundRequest.findById(input.requestId);
  if (!request) return 'missing';
  if (request.status !== 'pending') return 'already';
  const order = await Order.findById(request.order);
  if (!order) return 'missing';
  if (input.approve && order.status !== 'paid') return 'order_not_paid';

  if (input.approve) {
    await markOrderRefunded({
      orderId: String(order._id),
      provider: order.provider ?? 'paybridge',
      providerRef: order.providerRef ?? order.orderNumber,
      eventId: `refund-request-${input.requestId}`,
      eventType: 'refund.request',
    });
  }

  const status: RefundStatus = input.approve ? 'approved' : 'declined';
  request.status = status;
  request.decidedBy = new Types.ObjectId(input.adminId);
  request.decidedAt = new Date();
  await request.save();

  await Notification.create({
    user: request.user,
    kind: 'system',
    title: {
      bn: input.approve ? 'রিফান্ড অনুমোদিত' : 'রিফান্ড অনুরোধ দেখা হয়েছে',
      en: input.approve ? 'Refund approved' : 'Refund request reviewed',
    },
    body: {
      bn: input.approve
        ? `${order.orderNumber} — টাকা ফেরতের অনুরোধ অনুমোদিত হয়েছে।`
        : `${order.orderNumber} — অনুরোধটি দেখা হয়েছে; বিস্তারিত অর্ডার পাতায় আছে।`,
      en: input.approve
        ? `${order.orderNumber} — your refund request was approved.`
        : `${order.orderNumber} — your request was reviewed; the order page has the details.`,
    },
    href: '/dashboard/orders',
  }).catch(() => undefined);

  return input.approve ? 'approved' : 'declined';
}
