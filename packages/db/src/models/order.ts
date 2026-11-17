import mongoose, { type Model, type Types } from 'mongoose';
const { model, models, Schema } = mongoose;

export const PAYMENT_PROVIDERS = ['stripe', 'paybridge'] as const;
export const ORDER_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** One course inside an order; a cart checkout pays for several in one payment. */
export type OrderItem = {
  course: Types.ObjectId;
  instructor: Types.ObjectId;
  slug: string;
  title: { bn?: string; en?: string };
  pricePaisa: number;
};

export type OrderDoc = {
  user: Types.ObjectId;
  /** Legacy single-course pointer, kept as the first item so older queries still work. */
  course: Types.ObjectId;
  instructor: Types.ObjectId;
  items: OrderItem[];
  orderNumber: string;
  courseSlug: string;
  courseTitle: { bn?: string; en?: string };
  // Subtotal before the coupon, then the discount, then what the reader actually pays.
  amountPaisa: number;
  discountPaisa: number;
  totalPaisa: number;
  /** The platform's share of `totalPaisa`, fixed when the payment is confirmed. */
  platformFeePaisa: number;
  currency: 'BDT';
  provider: PaymentProvider | null;
  providerRef?: string | undefined;
  idempotencyKey: string;
  status: OrderStatus;
  receiptNumber?: string | undefined;
  couponCode?: string | undefined;
  paidAt: Date | null;
  refundedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const orderSchema = new Schema<OrderDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    instructor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: {
      type: [
        new Schema<OrderItem>(
          {
            course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
            instructor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
            slug: { type: String, required: true, trim: true },
            title: { bn: { type: String, trim: true }, en: { type: String, trim: true } },
            pricePaisa: { type: Number, required: true, min: 0 },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    orderNumber: { type: String, required: true, unique: true, trim: true },
    courseSlug: { type: String, required: true, trim: true },
    courseTitle: {
      bn: { type: String, trim: true },
      en: { type: String, trim: true },
    },
    amountPaisa: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: (value: number) => Number.isInteger(value),
        message: 'Amount must be a whole number of paisa',
      },
    },
    discountPaisa: { type: Number, default: 0, min: 0 },
    platformFeePaisa: { type: Number, default: 0, min: 0 },
    totalPaisa: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: (value: number) => Number.isInteger(value),
        message: 'Total must be a whole number of paisa',
      },
    },
    currency: { type: String, enum: ['BDT'], default: 'BDT' },
    provider: { type: String, enum: PAYMENT_PROVIDERS, default: null },
    providerRef: { type: String, trim: true },
    // Supplied by the client per checkout attempt; a retry must not create a second order.
    idempotencyKey: { type: String, required: true, trim: true, unique: true },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending' },
    receiptNumber: { type: String, trim: true, unique: true, sparse: true },
    couponCode: { type: String, trim: true, uppercase: true },
    paidAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Payment webhooks look orders up by the gateway's own reference.
orderSchema.index({ provider: 1, providerRef: 1 });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ instructor: 1, status: 1, paidAt: -1 });

export const Order = (models.Order as Model<OrderDoc> | undefined) ?? model<OrderDoc>('Order', orderSchema);
