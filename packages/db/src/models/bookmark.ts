import mongoose, { type Model, type Types } from 'mongoose';
const { model, models, Schema } = mongoose;

export type BookmarkDoc = {
  student: Types.ObjectId;
  course: Types.ObjectId;
  lesson: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const bookmarkSchema = new Schema<BookmarkDoc>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
  },
  { timestamps: true },
);

// One bookmark per lesson per learner; toggling is an upsert or a delete.
bookmarkSchema.index({ student: 1, lesson: 1 }, { unique: true });
bookmarkSchema.index({ student: 1, createdAt: -1 });

export const Bookmark = (models.Bookmark as Model<BookmarkDoc> | undefined) ?? model<BookmarkDoc>('Bookmark', bookmarkSchema);
