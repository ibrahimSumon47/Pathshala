import mongoose, { type Model, type Types } from 'mongoose';

const { model, models, Schema } = mongoose;

export type ReviewDoc = {
  course: Types.ObjectId;
  student: Types.ObjectId;
  rating: number;
  body: string;
  /** Hidden by an operator: kept for the record, out of averages and the public list. */
  hidden: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const reviewSchema = new Schema<ReviewDoc>(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    body: { type: String, trim: true, maxlength: 1200, default: '' },
    hidden: { type: Boolean, default: false },
  },
  { timestamps: true },
);

reviewSchema.index({ course: 1, student: 1 }, { unique: true });
reviewSchema.index({ course: 1, createdAt: -1 });
reviewSchema.index({ hidden: 1, createdAt: -1 });

export const Review = (models.Review as Model<ReviewDoc> | undefined) ?? model<ReviewDoc>('Review', reviewSchema);