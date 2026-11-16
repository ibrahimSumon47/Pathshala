import mongoose, { type Model, type Types } from 'mongoose';
const { model, models, Schema } = mongoose;

export const PAYMENT_STATUSES = ['succeeded', 'refunded', 'failed'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type PaymentDoc = {
  order: Types.ObjectId;
  provider: 'stripe' | 'paybridge';
  providerRef: string;
  amountPaisa: number;
  status: PaymentStatus;
  paidAt: Date | null;
  refundedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const paymentSchema = new Schema<PaymentDoc>(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    provider: { type: String, enum: ['stripe', 'paybridge'], required: true },
    providerRef: { type: String, required: true, trim: true },
    amountPaisa: { type: Number, required: true, min: 0 },
    status: { type: String, enum: PAYMENT_STATUSES, default: 'succeeded' },
    paidAt: { type: Date, default: Date.now },
    refundedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// One gateway payment can fulfil exactly one order; this is the idempotency backstop.
paymentSchema.index({ provider: 1, providerRef: 1 }, { unique: true });

export const Payment = (models.Payment as Model<PaymentDoc> | undefined) ?? model<PaymentDoc>('Payment', paymentSchema);
