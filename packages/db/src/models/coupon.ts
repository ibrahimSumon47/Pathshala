import mongoose, { type Model, type Types } from 'mongoose';
const { model, models, Schema } = mongoose;

export const COUPON_TYPES = ['percent', 'fixed'] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export type CouponDoc = {
  code: string;
  type: CouponType;
  // Percent is 1-100; fixed is integer paisa.
  value: number;
  minAmountPaisa: number;
  maxRedemptions: number;
  /** 0 means unlimited; the default stops one account reusing a platform-wide code. */
  maxPerLearner: number;
  redeemedCount: number;
  active: boolean;
  course: Types.ObjectId | null;
  createdBy: Types.ObjectId;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const couponSchema = new Schema<CouponDoc>(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 32 },
    type: { type: String, enum: COUPON_TYPES, required: true },
    value: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: (value: number) => Number.isInteger(value), message: 'Coupon value must be a whole number' },
    },
    minAmountPaisa: { type: Number, default: 0, min: 0 },
    maxRedemptions: { type: Number, default: 100, min: 1 },
    maxPerLearner: { type: Number, default: 1, min: 0, max: 100 },
    redeemedCount: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Coupon = (models.Coupon as Model<CouponDoc> | undefined) ?? model<CouponDoc>('Coupon', couponSchema);
