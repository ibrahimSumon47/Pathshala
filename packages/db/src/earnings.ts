import { Types } from 'mongoose';
import { connectToDatabase } from './connection';
import { LedgerEntry } from './models/ledger-entry';
import { Coupon } from './models/coupon';
import { Order, type OrderDoc } from './models/order';
import { PayoutBatch } from './models/payout-batch';
import { PLATFORM_SHARE_PERCENT } from './commerce';
import { User } from './models/user';

export type PayoutStatement = {
  month: string;
  salesPaisa: number;
  refundsPaisa: number;
  netPaisa: number;
  sales: number;
  refunds: number;
  /** Set when an operator records the month as settled; null while it is open. */
  paidAt: string | null;
};

/** Turn signed ledger rows into one statement per calendar month, newest first. */
export function statementsFromEntries(
  entries: Array<{ amountPaisa: number; type: 'sale' | 'refund'; createdAt: Date }>,
): PayoutStatement[] {
  const months = new Map<string, PayoutStatement>();
  for (const entry of entries) {
    const month = entry.createdAt.toISOString().slice(0, 7);
    const statement = months.get(month) ?? { month, salesPaisa: 0, refundsPaisa: 0, netPaisa: 0, sales: 0, refunds: 0, paidAt: null };
    if (entry.type === 'refund') {
      statement.refundsPaisa += Math.abs(entry.amountPaisa);
      statement.refunds += 1;
    } else {
      statement.salesPaisa += entry.amountPaisa;
      statement.sales += 1;
    }
    statement.netPaisa = statement.salesPaisa - statement.refundsPaisa;
    months.set(month, statement);
  }
  return [...months.values()].sort((a, b) => b.month.localeCompare(a.month));
}

/** A teacher's monthly payouts, built from the same signed ledger the earnings desk uses. */
export async function getInstructorStatements(instructorId: string): Promise<PayoutStatement[]> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(instructorId)) return [];
  const entries = await LedgerEntry.find({ instructor: instructorId, account: 'instructor' })
    .select('amountPaisa type createdAt')
    .sort({ createdAt: -1 })
    .limit(2000)
    .lean();
  const statements = statementsFromEntries(
    entries.map((entry) => ({ amountPaisa: entry.amountPaisa, type: entry.type, createdAt: entry.createdAt })),
  );
  return withPaidState(instructorId, statements);
}

/** Attach the operator's payout records to computed statements. */
async function withPaidState(instructorId: string, statements: PayoutStatement[]): Promise<PayoutStatement[]> {
  if (statements.length === 0) return statements;
  const payouts = await PayoutBatch.find({ instructor: instructorId, month: { $in: statements.map((row) => row.month) } })
    .select('month paidAt')
    .lean();
  const paid = new Map(payouts.map((payout) => [payout.month, payout.paidAt.toISOString()]));
  return statements.map((statement) => ({ ...statement, paidAt: paid.get(statement.month) ?? null }));
}

export type AdminPayoutRow = PayoutStatement & { instructorId: string; instructorName: string };

/** Every teacher's statements, so an operator can settle a month from one table. */
export async function listPayoutStatements(): Promise<AdminPayoutRow[]> {
  await connectToDatabase();
  const entries = await LedgerEntry.find({ account: 'instructor', instructor: { $ne: null } })
    .select('instructor amountPaisa type createdAt')
    .sort({ createdAt: -1 })
    .limit(5000)
    .lean();
  const byInstructor = new Map<string, Array<{ amountPaisa: number; type: 'sale' | 'refund'; createdAt: Date }>>();
  for (const entry of entries) {
    const key = String(entry.instructor);
    const rows = byInstructor.get(key) ?? [];
    rows.push({ amountPaisa: entry.amountPaisa, type: entry.type, createdAt: entry.createdAt });
    byInstructor.set(key, rows);
  }
  if (byInstructor.size === 0) return [];

  const [users, payouts] = await Promise.all([
    User.find({ _id: { $in: [...byInstructor.keys()] } }).select('name').lean(),
    PayoutBatch.find({ instructor: { $in: [...byInstructor.keys()] } }).select('instructor month paidAt').lean(),
  ]);
  const names = new Map(users.map((user) => [String(user._id), user.name]));
  const paid = new Map(payouts.map((payout) => [`${String(payout.instructor)}|${payout.month}`, payout.paidAt.toISOString()]));

  return [...byInstructor.entries()]
    .flatMap(([instructorId, rows]) =>
      statementsFromEntries(rows).map((statement) => ({
        ...statement,
        instructorId,
        instructorName: names.get(instructorId) ?? 'Teacher',
        paidAt: paid.get(`${instructorId}|${statement.month}`) ?? null,
      })),
    )
    .sort((a, b) => b.month.localeCompare(a.month) || a.instructorName.localeCompare(b.instructorName));
}

/** Mark a month settled, or reopen it by removing the record. */
export async function setStatementPaid(input: {
  instructorId: string;
  month: string;
  amountPaisa: number;
  adminId: string;
  paid: boolean;
  note?: string;
}): Promise<boolean> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(input.instructorId) || !Types.ObjectId.isValid(input.adminId)) return false;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month)) return false;
  if (!Number.isInteger(input.amountPaisa) || input.amountPaisa < 0) return false;

  if (!input.paid) {
    const result = await PayoutBatch.deleteOne({ instructor: input.instructorId, month: input.month });
    return result.deletedCount > 0;
  }

  await PayoutBatch.findOneAndUpdate(
    { instructor: input.instructorId, month: input.month },
    {
      $set: {
        amountPaisa: input.amountPaisa,
        note: input.note?.trim().slice(0, 400) ?? '',
        markedBy: input.adminId,
        paidAt: new Date(),
      },
    },
    { upsert: true, returnDocument: 'after' },
  );
  return true;
}

export type AdminOrderRow = {
  id: string;
  orderNumber: string;
  buyerName: string;
  buyerEmail: string;
  courseTitle: { bn?: string; en?: string };
  totalPaisa: number;
  discountPaisa: number;
  platformFeePaisa: number;
  provider: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
};

/** Recent orders with the platform's own cut, filtered by order number or buyer. */
export async function listAdminOrders(query = '', limit = 100): Promise<AdminOrderRow[]> {
  await connectToDatabase();
  const cleaned = query.trim().slice(0, 80);
  const filter: Record<string, unknown> = {};
  if (cleaned) {
    const buyers = await User.find({
      $or: [
        { email: new RegExp(cleaned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { name: new RegExp(cleaned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      ],
    })
      .select('_id')
      .limit(50)
      .lean();
    filter.$or = [
      { orderNumber: new RegExp(cleaned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      { user: { $in: buyers.map((buyer) => buyer._id) } },
    ];
  }
  const orders = (await Order.find(filter).sort({ createdAt: -1 }).limit(Math.max(1, Math.min(200, limit))).lean()) as unknown as Array<
    OrderDoc & { _id: Types.ObjectId }
  >;
  const buyers = await User.find({ _id: { $in: orders.map((order) => order.user) } })
    .select('name email')
    .lean();
  const people = new Map(buyers.map((buyer) => [String(buyer._id), buyer]));
  return orders.map((order) => ({
    id: String(order._id),
    orderNumber: order.orderNumber,
    buyerName: people.get(String(order.user))?.name ?? 'Learner',
    buyerEmail: people.get(String(order.user))?.email ?? '',
    courseTitle: order.courseTitle,
    totalPaisa: order.totalPaisa,
    discountPaisa: order.discountPaisa,
    platformFeePaisa: order.platformFeePaisa || Math.round((order.totalPaisa * PLATFORM_SHARE_PERCENT) / 100),
    provider: order.provider ?? '—',
    status: order.status,
    createdAt: new Date(order.createdAt).toISOString(),
    paidAt: order.paidAt?.toISOString() ?? null,
  }));
}

export type CouponReportRow = {
  code: string;
  type: string;
  value: number;
  active: boolean;
  maxRedemptions: number;
  used: number;
  discountPaisa: number;
  revenuePaisa: number;
  expired: boolean;
};

export type CouponRedemptionRow = {
  orderNumber: string;
  code: string;
  buyerName: string;
  buyerEmail: string;
  courseTitle: { bn?: string; en?: string };
  discountPaisa: number;
  totalPaisa: number;
  paidAt: string;
};

/** Every paid order that used a code, newest first: the actual timeline behind a campaign. */
export async function getCouponRedemptionTimeline(limit = 50): Promise<CouponRedemptionRow[]> {
  await connectToDatabase();
  const orders = await Order.find({ status: 'paid', couponCode: { $exists: true, $ne: null } })
    .sort({ paidAt: -1 })
    .limit(Math.max(1, Math.min(200, limit)))
    .select('orderNumber couponCode courseTitle discountPaisa totalPaisa paidAt user')
    .lean();
  if (orders.length === 0) return [];
  const buyers = await User.find({ _id: { $in: orders.map((order) => order.user) } })
    .select('name email')
    .lean();
  const people = new Map(buyers.map((buyer) => [String(buyer._id), buyer]));
  return orders.flatMap((order) => {
    if (!order.couponCode || !order.paidAt) return [];
    const buyer = people.get(String(order.user));
    return [
      {
        orderNumber: order.orderNumber,
        code: order.couponCode,
        buyerName: buyer?.name ?? 'Learner',
        buyerEmail: buyer?.email ?? '',
        courseTitle: order.courseTitle,
        discountPaisa: order.discountPaisa,
        totalPaisa: order.totalPaisa,
        paidAt: order.paidAt.toISOString(),
      },
    ];
  });
}

/** Coupon performance from paid orders, so the code's cost and revenue sit side by side. */
export async function getCouponReport(): Promise<CouponReportRow[]> {
  await connectToDatabase();
  const [coupons, usage] = await Promise.all([
    Coupon.find().sort({ createdAt: -1 }).limit(100).lean(),
    Order.aggregate<{ _id: string; used: number; discount: number; revenue: number }>([
      { $match: { status: 'paid', couponCode: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$couponCode',
          used: { $sum: 1 },
          discount: { $sum: '$discountPaisa' },
          revenue: { $sum: '$totalPaisa' },
        },
      },
    ]),
  ]);
  const byCode = new Map(usage.map((row) => [row._id, row]));
  const now = Date.now();
  return coupons.map((coupon) => {
    const row = byCode.get(coupon.code);
    return {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      active: coupon.active,
      maxRedemptions: coupon.maxRedemptions,
      used: row?.used ?? coupon.redeemedCount,
      discountPaisa: row?.discount ?? 0,
      revenuePaisa: row?.revenue ?? 0,
      expired: Boolean(coupon.expiresAt && coupon.expiresAt.getTime() < now),
    };
  });
}
