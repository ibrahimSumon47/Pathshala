import mongoose, { type Model, type Types } from 'mongoose';
const { model, models, Schema } = mongoose;

export type PayoutBatchDoc = {
  instructor: Types.ObjectId;
  /** Calendar month in YYYY-MM, the same key the statement uses. */
  month: string;
  amountPaisa: number;
  note: string;
  markedBy: Types.ObjectId;
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

const payoutBatchSchema = new Schema<PayoutBatchDoc>(
  {
    instructor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    amountPaisa: { type: Number, required: true, min: 0 },
    note: { type: String, trim: true, maxlength: 400, default: '' },
    markedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// One settled statement per teacher per month; marking again updates that record.
payoutBatchSchema.index({ instructor: 1, month: 1 }, { unique: true });
payoutBatchSchema.index({ paidAt: -1 });

export const PayoutBatch =
  (models.PayoutBatch as Model<PayoutBatchDoc> | undefined) ??
  model<PayoutBatchDoc>('PayoutBatch', payoutBatchSchema);
