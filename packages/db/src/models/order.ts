import mongoose, { type Model, type Types } from 'mongoose';
const { model, models, Schema } = mongoose;

export const PAYMENT_PROVIDERS = ['stripe', 'paybridge'] as const;
export const ORDER_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderDoc = {
  user: Types.ObjectId;
  course: Types.ObjectId;
  amountPaisa: number;
  currency: 'BDT';
  provider: PaymentProvider;
  providerRef?: string;
  idempotencyKey: string;
  status: OrderStatus;
  receiptNumber?: string;
  couponCode?: string;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const orderSchema = new Schema<OrderDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    amountPaisa: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: (value: number) => Number.isInteger(value),
        message: 'Amount must be a whole number of paisa',
      },
    },
    currency: { type: String, enum: ['BDT'], default: 'BDT' },
    provider: { type: String, enum: PAYMENT_PROVIDERS, required: true },
    providerRef: { type: String, trim: true },
    // Supplied by the client per checkout attempt; a retry must not create a second order.
    idempotencyKey: { type: String, required: true, trim: true, unique: true },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending' },
    receiptNumber: { type: String, trim: true, unique: true, sparse: true },
    couponCode: { type: String, trim: true, uppercase: true },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Payment webhooks look orders up by the gateway's own reference.
orderSchema.index({ provider: 1, providerRef: 1 });

export const Order = (models.Order as Model<OrderDoc> | undefined) ?? model<OrderDoc>('Order', orderSchema);
