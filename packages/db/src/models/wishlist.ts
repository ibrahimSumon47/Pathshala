import mongoose, { type Model, type Types } from 'mongoose';

const { model, models, Schema } = mongoose;

export type WishlistDoc = {
  student: Types.ObjectId;
  course: Types.ObjectId;
  createdAt: Date;
};

const wishlistSchema = new Schema<WishlistDoc>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

wishlistSchema.index({ student: 1, course: 1 }, { unique: true });

export const Wishlist = (models.Wishlist as Model<WishlistDoc> | undefined) ?? model<WishlistDoc>('Wishlist', wishlistSchema);