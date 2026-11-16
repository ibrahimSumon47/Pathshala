import mongoose, { type Model, type Types } from 'mongoose';
const { model, models, Schema } = mongoose;

export const LEDGER_ACCOUNTS = ['platform', 'instructor'] as const;
export const LEDGER_TYPES = ['sale', 'refund'] as const;
export type LedgerAccount = (typeof LEDGER_ACCOUNTS)[number];
export type LedgerType = (typeof LEDGER_TYPES)[number];

export type LedgerEntryDoc = {
  order: Types.ObjectId;
  instructor: Types.ObjectId;
  account: LedgerAccount;
  type: LedgerType;
  // Signed integer paisa: a sale is positive, a refund negative.
  amountPaisa: number;
  description: string;
  createdAt: Date;
  updatedAt: Date;
};

const ledgerEntrySchema = new Schema<LedgerEntryDoc>(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    instructor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    account: { type: String, enum: LEDGER_ACCOUNTS, required: true },
    type: { type: String, enum: LEDGER_TYPES, required: true },
    amountPaisa: {
      type: Number,
      required: true,
      validate: { validator: (value: number) => Number.isInteger(value), message: 'Ledger amounts are whole paisa' },
    },
    description: { type: String, required: true, maxlength: 200 },
  },
  { timestamps: true },
);

// A retried webhook must not double-post the instructor's earnings.
ledgerEntrySchema.index({ order: 1, account: 1, type: 1 }, { unique: true });
ledgerEntrySchema.index({ instructor: 1, createdAt: -1 });

export const LedgerEntry =
  (models.LedgerEntry as Model<LedgerEntryDoc> | undefined) ?? model<LedgerEntryDoc>('LedgerEntry', ledgerEntrySchema);
