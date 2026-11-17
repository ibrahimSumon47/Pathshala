import mongoose, { type Model, type Types } from 'mongoose';

const { model, models, Schema } = mongoose;

export const REFUND_STATUSES = ['pending', 'approved', 'declined'] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export type RefundRequestDoc = {
  order: Types.ObjectId;
  user: Types.ObjectId;
  reason: string;
  status: RefundStatus;
  decidedBy: Types.ObjectId | null;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const refundRequestSchema = new Schema<RefundRequestDoc>(
  {
    // One request per order: a declined order needs a human, not a second queue row.
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true, trim: true, maxlength: 1000 },
    status: { type: String, enum: REFUND_STATUSES, default: 'pending' },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

refundRequestSchema.index({ status: 1, createdAt: -1 });
refundRequestSchema.index({ user: 1, createdAt: -1 });

export const RefundRequest =
  (models.RefundRequest as Model<RefundRequestDoc> | undefined) ??
  model<RefundRequestDoc>('RefundRequest', refundRequestSchema);
