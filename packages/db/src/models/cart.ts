import mongoose, { type Model, type Types } from 'mongoose';
const { model, models, Schema } = mongoose;

export type CartDoc = {
  user: Types.ObjectId;
  courses: Types.ObjectId[];
  couponCode?: string;
  createdAt: Date;
  updatedAt: Date;
};

const cartSchema = new Schema<CartDoc>(
  {
    // One cart per learner, so a second tab edits the same list.
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    courses: { type: [Schema.Types.ObjectId], ref: 'Course', default: [] },
    couponCode: { type: String, trim: true, uppercase: true },
  },
  { timestamps: true },
);

export const Cart = (models.Cart as Model<CartDoc> | undefined) ?? model<CartDoc>('Cart', cartSchema);
