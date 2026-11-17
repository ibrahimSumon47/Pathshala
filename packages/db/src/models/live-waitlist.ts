import mongoose, { type Model, type Types } from 'mongoose';
const { model, models, Schema } = mongoose;

export type LiveWaitlistDoc = {
  session: Types.ObjectId;
  course: Types.ObjectId;
  student: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const liveWaitlistSchema = new Schema<LiveWaitlistDoc>(
  {
    session: { type: Schema.Types.ObjectId, ref: 'LiveSession', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

// One place in line per learner per session; joining twice is the same place.
liveWaitlistSchema.index({ session: 1, student: 1 }, { unique: true });
// Position is counted in arrival order.
liveWaitlistSchema.index({ session: 1, createdAt: 1 });

export const LiveWaitlist =
  (models.LiveWaitlist as Model<LiveWaitlistDoc> | undefined) ??
  model<LiveWaitlistDoc>('LiveWaitlist', liveWaitlistSchema);
